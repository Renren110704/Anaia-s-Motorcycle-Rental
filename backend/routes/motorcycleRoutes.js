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
import adminAuth from "../middlewares/adminAuth.js";

const motorcycleRouter = express.Router();

// Standard CRUD operations
motorcycleRouter.get("/", getMotorcycles);
motorcycleRouter.get("/unit/:unitId", getMotorcycleByUnitId);
motorcycleRouter.get("/:id", getMotorcycleById);
motorcycleRouter.post("/", adminAuth, uploads.single("image"), createMotorcycle);
motorcycleRouter.put("/:id", adminAuth, uploads.single("image"), updateMotorcycle);
motorcycleRouter.delete("/:id", adminAuth, deleteMotorcycle);

// Additional soft delete management routes
motorcycleRouter.get("/deleted/all", adminAuth, getDeletedMotorcycles);
motorcycleRouter.patch("/:id/restore", adminAuth, restoreMotorcycle);
motorcycleRouter.delete("/:id/permanent", adminAuth, hardDeleteMotorcycle);

export default motorcycleRouter;