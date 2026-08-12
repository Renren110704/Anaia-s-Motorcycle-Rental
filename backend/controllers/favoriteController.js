import Favorite from "../models/favoriteModel.js";

// GET /api/favorites
// Returns the logged-in user's favorited motorcycles (populated).
export async function getFavorites(req, res) {
  try {
    const favorites = await Favorite.find({ user: req.user._id })
      .populate("motorcycle")
      .sort({ createdAt: -1 });

    const motorcycles = favorites
      .filter((f) => f.motorcycle) // drop entries whose motorcycle was deleted
      .map((f) => f.motorcycle);

    return res.status(200).json({ success: true, data: motorcycles });
  } catch (err) {
    console.error("[Favorites] getFavorites error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to load favorites" });
  }
}

// POST /api/favorites/:motorcycleId
export async function addFavorite(req, res) {
  try {
    const { motorcycleId } = req.params;
    await Favorite.updateOne(
      { user: req.user._id, motorcycle: motorcycleId },
      { $setOnInsert: { user: req.user._id, motorcycle: motorcycleId } },
      { upsert: true },
    );
    return res
      .status(201)
      .json({ success: true, message: "Added to favorites" });
  } catch (err) {
    console.error("[Favorites] addFavorite error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to add favorite" });
  }
}

// DELETE /api/favorites/:motorcycleId
export async function removeFavorite(req, res) {
  try {
    const { motorcycleId } = req.params;
    await Favorite.deleteOne({
      user: req.user._id,
      motorcycle: motorcycleId,
    });
    return res
      .status(200)
      .json({ success: true, message: "Removed from favorites" });
  } catch (err) {
    console.error("[Favorites] removeFavorite error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to remove favorite" });
  }
}
