import express from "express";
import {
  captureTrackingBaseline,
  deleteTrackingLocationLog,
  getTrackingLive,
  getTrackingLocationLog,
  syncTrackingSnapshots,
} from "../controllers/trackingController.js";

const trackingRouter = express.Router();

trackingRouter.get("/live", getTrackingLive);
trackingRouter.get("/location-log", getTrackingLocationLog);
trackingRouter.delete("/location-log", deleteTrackingLocationLog);
trackingRouter.post("/snapshots/sync", syncTrackingSnapshots);
trackingRouter.post("/baseline/:bookingId", captureTrackingBaseline);

export default trackingRouter;
