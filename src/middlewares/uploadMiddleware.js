import pool from "../config/db.js";
import { upload } from "./upload.js";

export const dynamicPlanBasedUpload = async (req, res, next) => {
    try {
      const businessId = req.params.id;
      console.log("businessId",businessId);
      
  
      // Fetch the latest paid plan for this business
      const [planResult] = await pool.query(
        `SELECT plan FROM payments WHERE business_id = ? AND status = 'completed' ORDER BY id DESC LIMIT 1`,
        [businessId]
      );
  
      const selectedPlan = planResult?.[0]?.plan || "free";
  
      const planLimits = {
        free: 2,
        silver: 5,
        gold: 10,
        platinum: 20,
      };
  
      const maxCount = planLimits[selectedPlan.toLowerCase()] || 2;
  
      const multerMiddleware = upload.array("photos", maxCount);
  
      // Call multer middleware
      multerMiddleware(req, res, (err) => {
        if (err) {
          // multer error (too many files, file size, invalid files, etc.)
          return res.status(400).json({ msg: err.message });
        }
        next(); // multer done, pass control to controller
      });
    } catch (err) {
      console.error("Error fetching plan:", err);
      res.status(500).json({ msg: "Failed to fetch plan info" });
    }
  };
  