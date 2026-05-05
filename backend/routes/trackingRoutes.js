import express from "express";
import {
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

export default trackingRouter;
