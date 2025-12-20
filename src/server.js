import express from "express";
import { config, securityMiddlewares, logger } from "./config/index.js";
import dotenv from "dotenv";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';
import router from "./routes/index.js";
import cors from "cors";
import bodyParser from "body-parser";
import fs from "fs";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
// console.log = (...args) =>
//   logger.info(args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : a).join(' '));

// console.info = console.log;
// console.warn = (...args) => logger.warn(args.join(' '));
// console.error = (...args) => logger.error(args.join(' '));

// app.use("/uploads", express.static("uploads"));
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.use((req, res, next) => {
  console.log(`📥 [${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// app.use(cors({
//   // origin: 'http://31.97.226.22:5005', 
//   origin: '*',
//   methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
//   credentials: true 
// }));


// app.use(cors())

app.use((err, req, res, next) => {
  if (err.status === 429) {
    console.error("⚠️ Rate limit hit:", err.message);
    return res.status(429).json({ error: "Custom Rate Limit Hit", detail: err.message });
  }
  next(err);
});
app.get("/uploads/:imageName", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");

  const imageName = req.params.imageName;
  const imagePath = path.join(__dirname, "uploads/business_photos", imageName);
  console.log("Full image path:", imagePath);

  const exists = fs.existsSync(imagePath);
  if (fs.existsSync(imagePath)) {
    console.log("File exists?", exists);

    const ext = path.extname(imageName).toLowerCase();

    switch (ext) {
      case ".jpg":
      case ".jpeg":
        res.setHeader("Content-Type", "image/jpeg");
        break;
      case ".png":
        res.setHeader("Content-Type", "image/png");
        break;
      case ".webp":
        res.setHeader("Content-Type", "image/webp");
        break;
      default:
        res.setHeader("Content-Type", "application/octet-stream");
    }

    console.log(" Sending file...");
    return res.sendFile(imagePath);
  } else {
    console.log("❌ Image not found:", imagePath);
    return res.status(404).json({ error: "Image not found" });
  }
});

securityMiddlewares(app);

app.use("/api", router);

app.use("/", (req, res) => {
  res.status(404).json({ error: "Route not found" });
})
app.listen(config.PORT,'0.0.0.0', () => {
  logger.info(` Server running on port  http://localhost:${config.PORT}`);
});
