import express from "express";
import { getAdminDashboard } from "../controller/dashboardController.js";

const router = express.Router();

router.get("/admin/dashboard", getAdminDashboard);

export default router;