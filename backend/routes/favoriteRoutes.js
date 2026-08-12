import express from "express";
import {
  getFavorites,
  addFavorite,
  removeFavorite,
} from "../controllers/favoriteController.js";
import authMiddleware from "../middlewares/auth.js";

const router = express.Router();

router.use(authMiddleware); // every favorites route requires a logged-in user

router.get("/", getFavorites);
router.post("/:motorcycleId", addFavorite);
router.delete("/:motorcycleId", removeFavorite);

export default router;
