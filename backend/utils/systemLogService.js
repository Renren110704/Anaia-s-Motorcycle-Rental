import mongoose from "mongoose";
import SystemLog from "../models/systemLogModel.js";

const asObjectId = (value) => {
  if (!value) return null;
  const id = String(value);
  return mongoose.Types.ObjectId.isValid(id)
    ? new mongoose.Types.ObjectId(id)
    : null;
};

const resolveActor = (req, explicitActorType = "unknown") => {
  const actorFromReq = req?.user;
  const actorIdRaw = actorFromReq?._id || actorFromReq?.id || null;

  if (actorFromReq && actorIdRaw) {
    return {
      actorType: explicitActorType === "admin" ? "admin" : "user",
      actorId: asObjectId(actorIdRaw),
      actorName: actorFromReq?.name || "",
      actorEmail: actorFromReq?.email || "",
    };
  }

  return {
    actorType: explicitActorType,
    actorId: null,
    actorName: "",
    actorEmail: "",
  };
};

export const createSystemLog = async ({
  req,
  actorType = "unknown",
  action,
  targetType,
  targetId = "",
  summary,
  metadata = {},
}) => {
  try {
    if (!action || !targetType || !summary) return;

    const actor = resolveActor(req, actorType);

    await SystemLog.create({
      ...actor,
      action,
      targetType,
      targetId: targetId ? String(targetId) : "",
      summary,
      metadata,
    });
  } catch (err) {
    console.error("System log write failed:", err.message || err);
  }
};
