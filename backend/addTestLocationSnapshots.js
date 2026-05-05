// Script to insert test GPS data for tracker replay
import mongoose from "mongoose";
import LocationSnapshot from "./models/locationSnapshotModel.js";
import dotenv from "dotenv";
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/motorcycle_rental";

const unitId = "9210010703";
const motorcycleName = "T1 · 9210010703";
const testPoints = [
  { lat: 14.531525, lng: 121.008582, time: "2026-04-13T07:34:56.000Z" },
  { lat: 14.532000, lng: 121.009000, time: "2026-04-13T07:40:00.000Z" },
  { lat: 14.532500, lng: 121.009500, time: "2026-04-13T07:45:00.000Z" },
  { lat: 14.533000, lng: 121.010000, time: "2026-04-13T07:50:00.000Z" },
  { lat: 14.533500, lng: 121.010500, time: "2026-04-13T07:55:00.000Z" },
];

async function insertTestData() {
  await mongoose.connect(MONGO_URI);
  for (let i = 0; i < testPoints.length; i++) {
    const p = testPoints[i];
    await LocationSnapshot.create({
      key: `${unitId}_${i}`,
      id: `${unitId}_${i}`,
      motorcycleId: unitId,
      bookingId: "",
      unitId,
      motorcycleName,
      customer: "offline",
      status: "offline",
      lat: p.lat,
      lng: p.lng,
      locationText: `${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}`,
      lastUpdatedAt: p.time,
      source: "Test Data",
      resolvedLocation: "",
    });
  }
  await mongoose.disconnect();
  console.log("Test GPS data inserted.");
}

insertTestData().catch(console.error);
