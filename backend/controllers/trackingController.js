import MotorcycleBooking from "../models/motorcycleBookingModel.js";
import LocationSnapshot from "../models/locationSnapshotModel.js";
import {
  TRACCAR_BASE_URL,
  TRACCAR_DEVICE_LABEL,
  TRACCAR_DEVICE_UNIQUE_ID,
  buildTraccarHeaders,
} from "../config/traccar.js";

const parseDate = (value) => {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const getEntryKey = (entry = {}) =>
  String(entry.key || entry.id || entry.unitId || entry.motorcycleId || entry.bookingId || "").trim();

const toNumberOrNull = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const mergeByNewest = (entries = []) => {
  const merged = new Map();

  entries.forEach((entry) => {
    const key = getEntryKey(entry);
    if (!key) return;

    const prev = merged.get(key);
    if (!prev) {
      merged.set(key, { ...entry, key });
      return;
    }

    const prevTime = parseDate(prev.lastUpdatedAt)?.getTime() || 0;
    const currTime = parseDate(entry.lastUpdatedAt)?.getTime() || 0;
    merged.set(key, currTime >= prevTime ? { ...entry, key } : prev);
  });

  return Array.from(merged.values()).sort((a, b) => {
    const da = parseDate(a.lastUpdatedAt)?.getTime() || 0;
    const db = parseDate(b.lastUpdatedAt)?.getTime() || 0;
    return db - da;
  });
};

const fetchTraccarLiveSnapshot = async ({ force = false } = {}) => {
  const refreshKey = force ? `&_ts=${Date.now()}` : "";

  const deviceRes = await fetch(
    `${TRACCAR_BASE_URL}/api/devices?uniqueId=${encodeURIComponent(TRACCAR_DEVICE_UNIQUE_ID)}&limit=1${refreshKey}`,
    { headers: buildTraccarHeaders(), cache: "no-store" },
  );
  const deviceJson = await deviceRes.json().catch(() => []);
  if (!deviceRes.ok) {
    throw new Error(deviceJson?.message || `Unable to load Traccar device ${TRACCAR_DEVICE_UNIQUE_ID}`);
  }

  const device = Array.isArray(deviceJson)
    ? deviceJson[0]
    : deviceJson?.data?.[0] || deviceJson?.devices?.[0] || deviceJson || null;

  if (!device) {
    throw new Error(`Traccar device ${TRACCAR_DEVICE_UNIQUE_ID} was not found`);
  }

  let position = null;
  if (device.positionId) {
    const positionRes = await fetch(
      `${TRACCAR_BASE_URL}/api/positions?id=${encodeURIComponent(device.positionId)}${refreshKey}`,
      { headers: buildTraccarHeaders(), cache: "no-store" },
    );
    const positionJson = await positionRes.json().catch(() => []);
    if (!positionRes.ok) {
      throw new Error(positionJson?.message || "Unable to load Traccar position");
    }
    position = Array.isArray(positionJson)
      ? positionJson[0]
      : positionJson?.data?.[0] || positionJson?.positions?.[0] || positionJson || null;
  }

  if (!position) {
    const positionsRes = await fetch(
      `${TRACCAR_BASE_URL}/api/positions?limit=1000${refreshKey}`,
      { headers: buildTraccarHeaders(), cache: "no-store" },
    );
    const positionsJson = await positionsRes.json().catch(() => []);
    if (!positionsRes.ok) {
      throw new Error(positionsJson?.message || "Unable to load Traccar positions");
    }

    const positions = Array.isArray(positionsJson)
      ? positionsJson
      : positionsJson?.data || positionsJson?.positions || [];

    position = positions.find((entry) => Number(entry?.deviceId) === Number(device.id)) || null;
  }

  if (!position) {
    throw new Error("Traccar device is online but has no current position yet");
  }

  const lat = Number(position.latitude ?? position.lat);
  const lng = Number(position.longitude ?? position.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error("Could not normalize the live GPS coordinates");
  }

  const timestamp =
    position.serverTime ||
    position.deviceTime ||
    position.fixTime ||
    device.lastUpdate ||
    new Date().toISOString();

  return {
    id: device.id || device.uniqueId || TRACCAR_DEVICE_UNIQUE_ID,
    motorcycleId: "",
    bookingId: "",
    unitId: device.uniqueId || TRACCAR_DEVICE_UNIQUE_ID,
    motorcycleName: `${device?.name || TRACCAR_DEVICE_LABEL}${device?.uniqueId ? ` · ${device.uniqueId}` : ""}`,
    customer: device.status || "Traccar device",
    status: device.status || (position.valid ? "online" : "unknown"),
    lat,
    lng,
    locationText: position.address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
    lastUpdatedAt: timestamp,
    source: "Traccar Live",
    resolvedLocation: position.address || "",
    device,
    position,
  };
};

export const getTrackingLive = async (req, res, next) => {
  try {
    const force = req.query.force === "true";
    const snapshot = await fetchTraccarLiveSnapshot({ force });
    res.json({ success: true, data: snapshot });
  } catch (err) {
    next(err);
  }
};

export const syncTrackingSnapshots = async (req, res, next) => {
  try {
    const snapshots = Array.isArray(req.body?.snapshots) ? req.body.snapshots : [];

    if (snapshots.length === 0) {
      return res.status(400).json({ success: false, message: "snapshots[] is required" });
    }

    const docs = snapshots
      .map((raw) => {
        const lat = toNumberOrNull(raw.lat);
        const lng = toNumberOrNull(raw.lng);
        const lastUpdatedAt = parseDate(raw.lastUpdatedAt) || new Date();

        // Create unique key per snapshot using timestamp
        const key = `${getEntryKey(raw)}_${lastUpdatedAt.getTime()}`;

        return {
          key,
          id: String(raw.id || ""),
          motorcycleId: String(raw.motorcycleId || ""),
          bookingId: String(raw.bookingId || ""),
          unitId: String(raw.unitId || ""),
          motorcycleName: String(raw.motorcycleName || "Unknown unit"),
          customer: String(raw.customer || ""),
          status: String(raw.status || ""),
          lat,
          lng,
          locationText: String(raw.locationText || ""),
          lastUpdatedAt,
          source: String(raw.source || "GPS Snapshot"),
          resolvedLocation: String(raw.resolvedLocation || ""),
        };
      })
      .filter((doc) => doc.lat !== null && doc.lng !== null);

    if (docs.length === 0) {
      return res.status(400).json({ success: false, message: "No valid snapshots to sync" });
    }

    await LocationSnapshot.insertMany(docs, { ordered: false });

    res.json({ success: true, synced: docs.length });
  } catch (err) {
    next(err);
  }
};

export const getTrackingLocationLog = async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 300, 1000);
    const unitId = String(req.query.unitId || "").trim();
    const dateStr = String(req.query.date || "").trim();

    let dateFilter = {};
    if (dateStr) {
      const date = parseDate(dateStr);
      if (date) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        dateFilter = { lastUpdatedAt: { $gte: startOfDay, $lte: endOfDay } };
      }
    }

    const bookings = await MotorcycleBooking.find({
      isDeleted: { $ne: true },
      status: { $in: ["active", "rented"] },
      ...dateFilter,
    })
      .select({
        _id: 1,
        customer: 1,
        status: 1,
        updatedAt: 1,
        bookingDate: 1,
        createdAt: 1,
        pickupDate: 1,
        returnDate: 1,
        destination: 1,
        motorcycle: 1,
        details: 1,
      })
      .sort({ bookingDate: -1 })
      .limit(limit)
      .lean();

    const deletedLocationBookingIds = new Set(
      bookings
        .filter((b) => Boolean(b?.details?.locationLogDeletedAt))
        .map((b) => String(b?._id || ""))
        .filter(Boolean),
    );

    const bookingLogs = bookings.map((b) => {
      const locationObj =
        b?.details?.lastKnownLocation ||
        b?.details?.location ||
        b?.location ||
        null;

      const lat = toNumberOrNull(locationObj?.lat ?? locationObj?.latitude);
      const lng = toNumberOrNull(locationObj?.lng ?? locationObj?.longitude);
      const hasCoordinates = Number.isFinite(lat) && Number.isFinite(lng);

      const bUnitId = b?.motorcycle?.unitId || "";
      const motorcycleName = [b?.motorcycle?.make, b?.motorcycle?.model].filter(Boolean).join(" ").trim();

      return {
        key: `${bUnitId || b?.motorcycle?.id || b?._id || ""}`,
        id: bUnitId || b?.motorcycle?.id || String(b?._id || ""),
        motorcycleId: String(b?.motorcycle?.id || ""),
        bookingId: String(b?._id || ""),
        unitId: bUnitId,
        motorcycleName: motorcycleName || "Unknown unit",
        customer: b?.customer || "",
        status: b?.status || "",
        lat: hasCoordinates ? lat : null,
        lng: hasCoordinates ? lng : null,
        locationText: hasCoordinates
          ? `${lat.toFixed(5)}, ${lng.toFixed(5)}`
          : b?.destination || b?.details?.pickupLocation || "No location data available",
        lastUpdatedAt:
          locationObj?.updatedAt ||
          b?.updatedAt ||
          b?.bookingDate ||
          b?.createdAt ||
          "",
        source: hasCoordinates ? "Booking GPS" : "Booking destination",
      };
    });

    const now = new Date();
    const activeBookings = bookings.filter((b) => {
      const status = String(b?.status || "").toLowerCase();
      if (!["active", "rented"].includes(status)) return false;
      const pickup = parseDate(b.pickupDate);
      const ret = parseDate(b.returnDate);
      if (!pickup || !ret) return false;
      return pickup.getTime() <= now.getTime() && ret.getTime() >= now.getTime();
    });

    const activeBookingIds = new Set(
      activeBookings.map((b) => String(b._id)).filter(Boolean)
    );
    const activeUnitIds = new Set(
      activeBookings
        .map((b) => String(b?.motorcycle?.unitId || "").trim())
        .filter(Boolean)
    );

    let snapshotQuery = {};
    if (unitId) {
      snapshotQuery.unitId = unitId;
    }
    if (Object.keys(dateFilter).length > 0) {
      snapshotQuery = { ...snapshotQuery, ...dateFilter };
    }

    const snapshotsRaw = await LocationSnapshot.find(snapshotQuery).sort({ lastUpdatedAt: 1 }).limit(limit).lean();
    const snapshots = snapshotsRaw
      .map((s) => ({
        key: s.key,
        id: s.id,
        motorcycleId: s.motorcycleId,
        bookingId: s.bookingId,
        unitId: s.unitId,
        motorcycleName: s.motorcycleName,
        customer: s.customer,
        status: s.status,
        lat: toNumberOrNull(s.lat),
        lng: toNumberOrNull(s.lng),
        locationText: s.locationText,
        lastUpdatedAt: s.lastUpdatedAt,
        source: s.source,
        resolvedLocation: s.resolvedLocation,
      }))
      .filter((s) => {
        if (deletedLocationBookingIds.has(String(s.bookingId || ""))) return false;
        if (s.bookingId) return activeBookingIds.has(String(s.bookingId));
        return activeUnitIds.has(String(s.unitId || ""));
      });

    // For replay, we want all snapshots for the unitId, not merged.
    const allEntries = [...bookingLogs, ...snapshots];

    const sortByTimeAsc = (entries) =>
      entries.sort((a, b) => {
        const ta = parseDate(a.lastUpdatedAt)?.getTime() || 0;
        const tb = parseDate(b.lastUpdatedAt)?.getTime() || 0;
        return ta - tb;
      });

    const dedupeLatest = (entries) => {
      const latest = new Map();
      entries.forEach((entry) => {
        const key = getEntryKey(entry);
        if (!key) return;
        const prev = latest.get(key);
        const currentTime = parseDate(entry.lastUpdatedAt)?.getTime() || 0;
        const prevTime = parseDate(prev?.lastUpdatedAt)?.getTime() || 0;
        if (!prev || currentTime >= prevTime) {
          latest.set(key, entry);
        }
      });
      return Array.from(latest.values()).sort((a, b) => {
        const ta = parseDate(b.lastUpdatedAt)?.getTime() || 0;
        const tb = parseDate(a.lastUpdatedAt)?.getTime() || 0;
        return ta - tb;
      });
    };

    const isTrackerEntry = (entry) => {
      const unit = String(entry.unitId || entry.id || "").trim();
      const src = String(entry.source || "").toLowerCase();
      return (
        unit === String(TRACCAR_DEVICE_UNIQUE_ID).trim() ||
        src === "traccar live"
      );
    };

    const filtered = unitId
      ? allEntries.filter((e) => e.unitId === unitId)
      : dedupeLatest(allEntries.filter((e) => !isTrackerEntry(e)));

    const sorted = unitId ? sortByTimeAsc(filtered) : filtered;

    res.json({ success: true, data: sorted });
  } catch (err) {
    next(err);
  }
};

export const deleteTrackingLocationLog = async (req, res, next) => {
  try {
    const key = String(req.body?.key || "").trim();
    const bookingId = String(req.body?.bookingId || "").trim();
    const motorcycleId = String(req.body?.motorcycleId || "").trim();
    const unitId = String(req.body?.unitId || "").trim();

    if (!key && !bookingId && !motorcycleId && !unitId) {
      return res.status(400).json({ success: false, message: "Missing delete identifiers." });
    }

    let bookingUpdated = false;
    if (bookingId) {
      const booking = await MotorcycleBooking.findById(bookingId);
      if (booking) {
        booking.set({
          "details.lastKnownLocation": undefined,
          "details.location": undefined,
          "details.locationText": undefined,
          "details.locationLogDeletedAt": new Date(),
        });
        await booking.save();
        bookingUpdated = true;
      }
    }

    const orFilters = [
      key ? { key } : null,
      bookingId ? { bookingId } : null,
      motorcycleId ? { motorcycleId } : null,
      unitId ? { unitId } : null,
    ].filter(Boolean);

    const deleteResult =
      orFilters.length > 0
        ? await LocationSnapshot.deleteMany({ $or: orFilters })
        : { deletedCount: 0 };

    if (!bookingUpdated && Number(deleteResult?.deletedCount || 0) === 0) {
      return res.status(404).json({ success: false, message: "Location log entry not found." });
    }

    return res.json({
      success: true,
      message: "Location log deleted successfully.",
      bookingUpdated,
      deletedSnapshots: Number(deleteResult?.deletedCount || 0),
    });
  } catch (err) {
    return next(err);
  }
};
