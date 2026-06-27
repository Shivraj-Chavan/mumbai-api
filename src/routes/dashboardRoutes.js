import express from "express";
import { getAdminDashboard, getAdminDashboardStats } from "../controller/dashboardController.js";

const router = express.Router();

router.get("/admin/dashboard", getAdminDashboard);
router.get("/admin/count",getAdminDashboardStats);

export default router;