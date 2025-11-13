import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import fileType from "file-type";



const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.join(__dirname, "../../uploads", "business_photos");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
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
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
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
            const type = await fileType.fromFile(file.path);

            if (!type || !allowedMime.includes(type.mime)) {
              fs.unlinkSync(file.path);
              return res.status(400).json({ error: "🚫 Invalid or fake image file uploaded" });
            }
          }
          next(); 
        } catch (error) {
          console.log(error)
          return res.status(500).json({ error: "File type verification failed" });
        }
      });
    };
  },
};
