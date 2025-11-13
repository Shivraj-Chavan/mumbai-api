import express from "express";
import { createBusiness , getBusinesses, getBusinessByUserId, getBusinessById, updateBusiness, deleteBusiness, getBusinessBySlug, verifyBusiness, getPendingUpdates, approveUpdate, rejectUpdate} from "../controller/businessController.js";
import { validateAdmin, validateUser } from "../middlewares/auth.js";
import multer from "multer";

const router = express.Router();

// Multer setup for photo uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/business_photos");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  }
});
const upload = multer({ storage });

router.post("/", validateUser, upload.array("photos", 10), createBusiness);
router.get("/", getBusinesses);
router.get("/user",validateUser, getBusinessByUserId);
router.get("/:id",validateUser, getBusinessById);
router.put("/:id",validateUser, updateBusiness); 
router.delete("/:id",validateUser,deleteBusiness);
router.get("/s/:slug",getBusinessBySlug)
router.put("/verify/:id", verifyBusiness);

// ADMIN routes
router.get('/admin/pending', validateUser, validateAdmin, getPendingUpdates);
router.put('/admin/approve/:id', validateUser, validateAdmin, approveUpdate);
router.delete('/admin/reject/:id', validateUser, validateAdmin, rejectUpdate);

export default router;
