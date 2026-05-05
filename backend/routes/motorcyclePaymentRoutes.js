import express from "express";
import {
  verifyMotorcyclePaymentReceipt,
} from "../controllers/motorcyclePaymentController.js";
import { uploads } from "../middlewares/uploads.js";

const motorcyclePaymentRouter = express.Router();

motorcyclePaymentRouter.post(
  "/verify-receipt",
  uploads.single("receiptImage"),
  verifyMotorcyclePaymentReceipt,
);

export default motorcyclePaymentRouter;