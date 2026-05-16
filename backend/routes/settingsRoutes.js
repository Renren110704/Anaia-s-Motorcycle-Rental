import express from "express";
import { getQRCodes, updateQRCode } from "../controllers/settingsController.js";
import { uploads } from "../middlewares/uploads.js";

// Note: Import your authentication middleware here if you want to protect the POST route
// import { protect, admin } from "../middlewares/authMiddleware.js";

const settingsRouter = express.Router();

settingsRouter.get("/qrs", getQRCodes);

// If you have auth middlewares, use: settingsRouter.post("/qrs", protect, admin, uploads.single("image"), updateQRCode);
settingsRouter.post("/qrs", uploads.single("image"), updateQRCode);

export default settingsRouter;