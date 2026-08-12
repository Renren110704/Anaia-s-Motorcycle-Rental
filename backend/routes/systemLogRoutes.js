import express from "express";
import {
	clearSystemLogs,
	getSystemLogs,
} from "../controllers/systemLogController.js";
import adminAuth from "../middlewares/adminAuth.js";

const systemLogRouter = express.Router();

systemLogRouter.get("/", adminAuth, getSystemLogs);
systemLogRouter.delete("/", adminAuth, clearSystemLogs);

export default systemLogRouter;
