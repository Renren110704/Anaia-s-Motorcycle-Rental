import SystemLog from "../models/systemLogModel.js";

export const getSystemLogs = async (req, res, next) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 25, 1), 200);
    const search = String(req.query.search || "").trim();
    const action = String(req.query.action || "").trim();
    const actorType = String(req.query.actorType || "").trim();

    const query = {};

    if (action) query.action = action;
    if (actorType) query.actorType = actorType;

    if (search) {
      const rx = { $regex: search, $options: "i" };
      query.$or = [
        { summary: rx },
        { action: rx },
        { targetType: rx },
        { targetId: rx },
        { actorName: rx },
        { actorEmail: rx },
      ];
    }

    const total = await SystemLog.countDocuments(query);
    const data = await SystemLog.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return res.json({
      page,
      pages: Math.ceil(total / limit),
      total,
      data,
    });
  } catch (err) {
    next(err);
  }
};

export const clearSystemLogs = async (req, res, next) => {
  try {
    const result = await SystemLog.deleteMany({});

    return res.json({
      success: true,
      message: "System logs cleared successfully.",
      deletedCount: result?.deletedCount || 0,
    });
  } catch (err) {
    next(err);
  }
};
