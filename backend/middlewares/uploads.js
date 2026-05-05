import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.join(__dirname, "..", "uploads");

fs.mkdirSync(UPLOADS_DIR, { recursive: true });
console.log("[UPLOADS] backend upload storage initialized:", UPLOADS_DIR);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    console.log("[UPLOADS] saving incoming file:", file.originalname, "->", UPLOADS_DIR);
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || "";
    const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    console.log("[UPLOADS] generated filename:", name);
    cb(null, name);
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype && file.mimetype.startsWith("image/")) cb(null, true);
  else cb(new Error("Only image files are allowed"), false);
};

export const uploads = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter,
});