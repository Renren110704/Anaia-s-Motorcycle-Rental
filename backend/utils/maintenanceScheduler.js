import Motorcycle from "../models/motorcycleModel.js";

const MAINTENANCE_INTERVAL_MONTHS = 6;
const SWEEP_INTERVAL_MS = 60 * 60 * 1000;

const addMonths = (date, months) => {
  const next = new Date(date);
  if (Number.isNaN(next.getTime())) return null;
  next.setMonth(next.getMonth() + months);
  return next;
};

export const getDefaultMaintenanceScheduleAt = (baseDate = new Date()) =>
  addMonths(baseDate, MAINTENANCE_INTERVAL_MONTHS);

export const normalizeMaintenanceScheduleAt = (value) => {
  if (value === undefined || value === null || value === "") return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : new Date(value);
  }

  const raw = String(value).trim();
  if (!raw) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [year, month, day] = raw.split("-").map(Number);
    return new Date(year, month - 1, day, 12, 0, 0, 0);
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const backfillMaintenanceSchedules = async () => {
  // Backfill motorcycles that don't have the new start/end fields set. Prefer an existing
  // legacy `maintenanceScheduleAt` when present, otherwise compute a default.
  const motorcycles = await Motorcycle.find({
    $or: [
      { maintenanceScheduleStartAt: { $exists: false } },
      { maintenanceScheduleStartAt: null },
      { maintenanceScheduleStartAt: "" },
    ],
  });

  if (!motorcycles.length) return { matched: 0, updated: 0 };

  let updated = 0;
  for (const motorcycle of motorcycles) {
    const base = motorcycle.maintenanceScheduleAt || motorcycle.createdAt || new Date();
    const defaultDate = getDefaultMaintenanceScheduleAt(base);
    motorcycle.maintenanceScheduleAt = motorcycle.maintenanceScheduleAt || defaultDate;
    motorcycle.maintenanceScheduleStartAt = motorcycle.maintenanceScheduleStartAt || motorcycle.maintenanceScheduleAt || defaultDate;
    motorcycle.maintenanceScheduleEndAt = motorcycle.maintenanceScheduleEndAt || motorcycle.maintenanceScheduleStartAt || defaultDate;
    await motorcycle.save();
    updated += 1;
  }

  return { matched: motorcycles.length, updated };
};

export const sweepDueMaintenanceSchedules = async () => {
  const now = new Date();

  // Find motorcycles where the maintenance window includes 'now'. Support both new
  // `maintenanceScheduleStartAt`/`EndAt` and legacy `maintenanceScheduleAt`.
  const overdueMotorcycles = await Motorcycle.find({
    isDeleted: false,
    status: { $ne: "maintenance" },
    $or: [
      {
        $and: [
          { maintenanceScheduleStartAt: { $exists: true } },
          { maintenanceScheduleEndAt: { $exists: true } },
          { maintenanceScheduleStartAt: { $lte: now } },
          { maintenanceScheduleEndAt: { $gte: now } },
        ],
      },
      { maintenanceScheduleAt: { $lte: now } },
    ],
  });

  if (!overdueMotorcycles.length) return { matched: 0, updated: 0 };

  const result = await Motorcycle.updateMany(
    {
      _id: { $in: overdueMotorcycles.map((motorcycle) => motorcycle._id) },
    },
    { $set: { status: "maintenance" } },
  );

  return {
    matched: overdueMotorcycles.length,
    updated: result.modifiedCount ?? result.nModified ?? 0,
  };
};

export const startMaintenanceScheduler = () => {
  const run = async () => {
    try {
      await backfillMaintenanceSchedules();
      await sweepDueMaintenanceSchedules();
    } catch (error) {
      console.error("[maintenance-scheduler]", error);
    }
  };

  run();
  setInterval(run, SWEEP_INTERVAL_MS);
};
