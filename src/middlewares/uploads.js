import multer from "multer";
import path from "path";
import fs from "fs";
import { fileTypeFromFile } from "file-type";  


const uploadDir = path.join(process.cwd(), "uploads", "business_photos");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log("📁 Created:", uploadDir);
}

const allowedExt = [".jpg", ".jpeg", ".png", ".webp"];
const allowedMime = ["image/jpeg", "image/png", "image/webp"];

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowedExt.includes(ext) || !allowedMime.includes(file.mimetype)) {
    return cb(new Error("❌ Invalid file type"), false);
  }
  cb(null, true);
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueName =
      Date.now() +
      "-" +
      Math.round(Math.random() * 1e9) +
      path.extname(file.originalname);
    cb(null, uniqueName);
  },
});

const multerUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter,
});

export const upload = {
  array: (fieldName, maxCount) => {
    const handler = multerUpload.array(fieldName, maxCount);

    return async (req, res, next) => {
      handler(req, res, async (err) => {
        if (err) return res.status(400).json({ error: err.message });

        try {
          for (const file of req.files || []) {
            const type = await fileTypeFromFile(file.path); // ✅ FIXED

            if (!type || !allowedMime.includes(type.mime)) {
              fs.unlinkSync(file.path);
              return res.status(400).json({ error: "🚫 Invalid or fake image file" });
            }
          }

          next();
        } catch (error) {
          console.error(error);
          return res.status(500).json({ error: "File type verification failed" });
        }
      });
    };
  },
};
