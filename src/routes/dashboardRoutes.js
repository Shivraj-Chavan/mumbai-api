import express from "express";
import { getAdminDashboard, getAdminDashboardStats } from "../controller/dashboardController.js";
import { validateAdmin } from "../middlewares/auth.js";

const router = express.Router();

router.get("/admin/dashboard",validateAdmin, getAdminDashboard);
router.get("/admin/count",getAdminDashboardStats);

export default router;