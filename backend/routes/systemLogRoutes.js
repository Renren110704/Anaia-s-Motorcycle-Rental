import express from "express";
import {
	clearSystemLogs,
	getSystemLogs,
} from "../controllers/systemLogController.js";

const systemLogRouter = express.Router();

systemLogRouter.get("/", getSystemLogs);
systemLogRouter.delete("/", clearSystemLogs);

export default systemLogRouter;
