import express from "express";
import {
  createMotorcycle,
  deleteMotorcycle,
  getMotorcycleById,
  getMotorcycleByUnitId,
  getMotorcycles,
  updateMotorcycle,
  hardDeleteMotorcycle,
  restoreMotorcycle,
  getDeletedMotorcycles,
} from "../controllers/motorcycleController.js";
import { uploads } from "../middlewares/uploads.js";

const motorcycleRouter = express.Router();

// Standard CRUD operations
motorcycleRouter.get("/", getMotorcycles);
motorcycleRouter.get("/unit/:unitId", getMotorcycleByUnitId);
motorcycleRouter.get("/:id", getMotorcycleById);
motorcycleRouter.post("/", uploads.single("image"), createMotorcycle);
motorcycleRouter.put("/:id", uploads.single("image"), updateMotorcycle);

// Soft delete (default delete operation)
motorcycleRouter.delete("/:id", deleteMotorcycle);

// Additional soft delete management routes
motorcycleRouter.get("/deleted/all", getDeletedMotorcycles); // Get all deleted motorcycles
motorcycleRouter.patch("/:id/restore", restoreMotorcycle); // Restore a soft-deleted motorcycle
motorcycleRouter.delete("/:id/permanent", hardDeleteMotorcycle); // Permanently delete (admin only)

export default motorcycleRouter;