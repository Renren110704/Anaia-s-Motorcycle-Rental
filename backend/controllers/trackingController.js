import MotorcycleBooking from "../models/motorcycleBookingModel.js";
import Motorcycle from "../models/motorcycleModel.js";
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

const reverseGeocodeCoordinates = async (lat, lng) => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        headers: { "User-Agent": "MotorcycleRentalSystem/1.0" },
        signal: controller.signal,
      },
    );
    clearTimeout(timeoutId);

    if (!response.ok) return null;

    const data = await response.json().catch(() => null);
    if (!data || !data.address) return null;

    const addr = data.address || {};
    const parts = [
      addr.road,
      addr.neighbourhood || addr.suburb || addr.village,
      addr.city || addr.town,
      addr.state || addr.province,
    ].filter(Boolean);

    const result = parts.length > 0 ? parts.join(", ") : null;
    console.log(`Reverse geocoded ${lat}, ${lng} to: ${result}`);
    return result;
  } catch (err) {
    if (err.name === "AbortError") {
      console.warn(`Reverse geocoding timeout for ${lat}, ${lng}`);
    } else {
      console.warn("Reverse geocoding failed:", err.message);
    }
    return null;
  }
};

const mergeByNewest = (entries = []) => {
  const merged = new Map();
  entries.forEach((entry) => {
    const key = getEntryKey(entry);
    if (!key) return;
    const prev = merged.get(key);
    if (!prev) { merged.set(key, { ...entry, key }); return; }
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

// Now accepts deviceUniqueId parameter for per-motorcycle tracking
const fetchTraccarLiveSnapshot = async ({ force = false, deviceUniqueId = TRACCAR_DEVICE_UNIQUE_ID } = {}) => {
  if (!deviceUniqueId || deviceUniqueId.trim() === "") {
    throw new Error("No Traccar device ID configured");
  }

  const refreshKey = force ? `&_ts=${Date.now()}` : "";

  const deviceRes = await fetch(
    `${TRACCAR_BASE_URL}/api/devices?uniqueId=${encodeURIComponent(deviceUniqueId)}&limit=1${refreshKey}`,
    { headers: buildTraccarHeaders(), cache: "no-store" },
  );
  const deviceJson = await deviceRes.json().catch(() => []);
  if (!deviceRes.ok) {
    throw new Error(deviceJson?.message || `Unable to load Traccar device ${deviceUniqueId}`);
  }

  const device = Array.isArray(deviceJson)
    ? deviceJson[0]
    : deviceJson?.data?.[0] || deviceJson?.devices?.[0] || deviceJson || null;

  if (!device) {
    throw new Error(`Traccar device ${deviceUniqueId} was not found`);
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

  const geocodedAddress = await reverseGeocodeCoordinates(lat, lng);
  const address = geocodedAddress || position.address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

  return {
    id: device.id || device.uniqueId || deviceUniqueId,
    motorcycleId: "",
    bookingId: "",
    unitId: device.uniqueId || deviceUniqueId,
    motorcycleName: `${device?.name || TRACCAR_DEVICE_LABEL}${device?.uniqueId ? ` · ${device.uniqueId}` : ""}`,
    customer: device.status || "Traccar device",
    status: device.status || (position.valid ? "online" : "unknown"),
    lat,
    lng,
    locationText: address,
    lastUpdatedAt: timestamp,
    source: "Traccar Live",
    resolvedLocation: address,
    device,
    position,
  };
};

// Now accepts ?deviceId= query param for per-motorcycle tracking
export const getTrackingLive = async (req, res, next) => {
  try {
    const force = req.query.force === "true";
    const deviceUniqueId = req.query.deviceId?.trim() || TRACCAR_DEVICE_UNIQUE_ID;

    if (!deviceUniqueId || deviceUniqueId.trim() === "") {
      return res.json({ success: false, message: "No tracker configured" });
    }

    const snapshot = await fetchTraccarLiveSnapshot({ force, deviceUniqueId });
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
        _id: 1, customer: 1, status: 1, updatedAt: 1, bookingDate: 1,
        createdAt: 1, pickupDate: 1, returnDate: 1, destination: 1,
        motorcycle: 1, details: 1,
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
        b?.details?.lastKnownLocation || b?.details?.location || b?.location || null;
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
        lastUpdatedAt: locationObj?.updatedAt || b?.updatedAt || b?.bookingDate || b?.createdAt || "",
        source: hasCoordinates ? "Booking GPS" : "Booking destination",
      };
    });

    let snapshotQuery = {};
    if (unitId) snapshotQuery.unitId = unitId;
    if (Object.keys(dateFilter).length > 0) snapshotQuery = { ...snapshotQuery, ...dateFilter };

    const snapshotsRaw = await LocationSnapshot.find(snapshotQuery)
      .sort({ lastUpdatedAt: -1 }).limit(limit).lean();

    const snapshots = snapshotsRaw
      .map((s) => ({
        key: s.key, id: s.id, motorcycleId: s.motorcycleId, bookingId: s.bookingId,
        unitId: s.unitId, motorcycleName: s.motorcycleName, customer: s.customer,
        status: s.status, lat: toNumberOrNull(s.lat), lng: toNumberOrNull(s.lng),
        locationText: s.locationText, lastUpdatedAt: s.lastUpdatedAt,
        source: s.source, resolvedLocation: s.resolvedLocation,
      }))
      .filter((s) => {
        if (deletedLocationBookingIds.has(String(s.bookingId || ""))) return false;
        return true;
      });

    // Per-motorcycle live tracker lookup using traccarDeviceId
    const liveSnapshotsByUnitId = new Map();
    for (const booking of bookings) {
      const motorcycleId = booking?.motorcycle?.id || booking?.motorcycle?._id;
      const bUnitId = booking?.motorcycle?.unitId || "";
      if (!motorcycleId || !bUnitId) continue;

      try {
        const motorcycle = await Motorcycle.findById(motorcycleId).select("traccarDeviceId").lean();
        const traccarDeviceId = motorcycle?.traccarDeviceId?.trim() || "";
        if (!traccarDeviceId) continue;

        console.log(`Fetching live tracker for ${bUnitId} with device ${traccarDeviceId}...`);
        const liveSnap = await fetchTraccarLiveSnapshot({ force: false, deviceUniqueId: traccarDeviceId });
        liveSnap.unitId = bUnitId; // tie the snapshot to the motorcycle's unit ID
        liveSnap.motorcycleId = String(motorcycleId);
        liveSnap.bookingId = String(booking._id);
        liveSnapshotsByUnitId.set(bUnitId, liveSnap);
        console.log(`Live tracker fetched for ${bUnitId}:`, { lat: liveSnap.lat, lng: liveSnap.lng });
      } catch (err) {
        console.warn(`Failed to fetch live tracker for ${bUnitId}:`, err.message);
      }
    }

    const geocodedBookingLogs = await Promise.all(
      bookingLogs.map(async (booking) => {
        const liveTrackerForUnit = liveSnapshotsByUnitId.get(String(booking.unitId || "").trim()) || null;

        const recentSnapshotsForUnit = snapshots
          .filter((s) => String(s.unitId || "").trim() === String(booking.unitId || "").trim())
          .sort((a, b) => (parseDate(b.lastUpdatedAt)?.getTime() || 0) - (parseDate(a.lastUpdatedAt)?.getTime() || 0));

        const mostRecentSnapshot = recentSnapshotsForUnit[0];

        let locationData = booking;
        if (liveTrackerForUnit) {
          let locationText = liveTrackerForUnit.resolvedLocation || liveTrackerForUnit.locationText;
          let resolvedLocation = liveTrackerForUnit.resolvedLocation || liveTrackerForUnit.locationText;

          if (locationText && locationText.includes(',') && !locationText.includes(' ')) {
            const address = await reverseGeocodeCoordinates(liveTrackerForUnit.lat, liveTrackerForUnit.lng);
            if (address) { locationText = address; resolvedLocation = address; }
          }

          locationData = {
            ...booking,
            lat: liveTrackerForUnit.lat,
            lng: liveTrackerForUnit.lng,
            locationText: locationText || `${liveTrackerForUnit.lat?.toFixed(5)}, ${liveTrackerForUnit.lng?.toFixed(5)}`,
            resolvedLocation,
            lastUpdatedAt: liveTrackerForUnit.lastUpdatedAt,
            source: liveTrackerForUnit.source || "Live GPS",
          };
        } else if (mostRecentSnapshot) {
          let locationText = mostRecentSnapshot.resolvedLocation || mostRecentSnapshot.locationText;
          let resolvedLocation = mostRecentSnapshot.resolvedLocation || mostRecentSnapshot.locationText;

          if (locationText && locationText.includes(',') && !locationText.includes(' ')) {
            const address = await reverseGeocodeCoordinates(mostRecentSnapshot.lat, mostRecentSnapshot.lng);
            if (address) { locationText = address; resolvedLocation = address; }
          }

          locationData = {
            ...booking,
            lat: mostRecentSnapshot.lat,
            lng: mostRecentSnapshot.lng,
            locationText: locationText || `${mostRecentSnapshot.lat?.toFixed(5)}, ${mostRecentSnapshot.lng?.toFixed(5)}`,
            resolvedLocation,
            lastUpdatedAt: mostRecentSnapshot.lastUpdatedAt,
            source: mostRecentSnapshot.source || "GPS Snapshot",
          };
        } else if (!Number.isFinite(booking.lat) || !Number.isFinite(booking.lng)) {
          if (booking.locationText && booking.locationText.includes(',')) {
            const address = await reverseGeocodeCoordinates(booking.lat, booking.lng);
            if (address) locationData = { ...booking, locationText: address, resolvedLocation: address };
          }
        }

        return locationData;
      })
    );

    const snapshotUnitIds = new Set(
      snapshots
        .filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lng))
        .map((s) => String(s.unitId || "").trim())
        .filter(Boolean),
    );

    const bookingLogsToUse = geocodedBookingLogs.filter((entry) => {
      const entryUnitId = String(entry.unitId || "").trim();
      if (snapshotUnitIds.has(entryUnitId)) {
        return Number.isFinite(entry.lat) && Number.isFinite(entry.lng);
      }
      return true;
    });

    let allEntries = [...bookingLogsToUse, ...snapshots];

    // Add all per-motorcycle live snapshots to allEntries
    for (const liveSnap of liveSnapshotsByUnitId.values()) {
      allEntries.push({
        key: liveSnap.key || liveSnap.unitId,
        id: liveSnap.id,
        motorcycleId: liveSnap.motorcycleId,
        bookingId: liveSnap.bookingId,
        unitId: liveSnap.unitId,
        motorcycleName: liveSnap.motorcycleName,
        customer: liveSnap.customer,
        status: liveSnap.status,
        lat: liveSnap.lat,
        lng: liveSnap.lng,
        locationText: liveSnap.locationText,
        lastUpdatedAt: liveSnap.lastUpdatedAt,
        source: liveSnap.source,
        resolvedLocation: liveSnap.resolvedLocation,
      });
    }

    const sortByTimeDesc = (entries) =>
      entries.sort((a, b) => {
        const ta = parseDate(b.lastUpdatedAt)?.getTime() || 0;
        const tb = parseDate(a.lastUpdatedAt)?.getTime() || 0;
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
        if (!prev || currentTime >= prevTime) latest.set(key, entry);
      });
      return Array.from(latest.values()).sort((a, b) => {
        const ta = parseDate(b.lastUpdatedAt)?.getTime() || 0;
        const tb = parseDate(a.lastUpdatedAt)?.getTime() || 0;
        return ta - tb;
      });
    };

    let filtered;
    if (unitId) {
      filtered = allEntries.filter((e) => e.unitId === unitId);
    } else {
      filtered = dedupeLatest(allEntries);
    }

    const sorted = unitId ? sortByTimeDesc(filtered) : filtered;
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