import express from "express";
import { config, securityMiddlewares, logger } from "./config/index.js";
import dotenv from "dotenv";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';
import router from "./routes/index.js";
import cors from "cors";
import bodyParser from "body-parser";

const app = express();
dotenv.config();
app.use(express.json());
console.log = (...args) => logger.info(args.join(' '));
console.info = (...args) => logger.info(args.join(' '));
console.warn = (...args) => logger.warn(args.join(' '));
console.error = (...args) => logger.error(args.join(' '));
// app.use(bodyParser.json());
app.use("/uploads", express.static("uploads"));

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

  if (fs.existsSync(imagePath)) {
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

    return res.sendFile(imagePath);
  } else {
    console.log("❌ Image not found:", imagePath);
    return res.status(404).json({ error: "Image not found" });
  }
});

securityMiddlewares(app);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use("/api", router);

app.use("/", (req, res) => {
  res.status(404).json({ error: "Route not found" });
})
app.listen(config.PORT,'0.0.0.0', () => {
  logger.info(` Server running on port  http://localhost:${config.PORT}`);
});
