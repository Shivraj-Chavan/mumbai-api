import express from "express";
import userRoutes from "./userRoutes.js";
import otpRoutes from "./otpRoutes.js";
import businessRoutes from "./businessRoutes.js";
import countRoutes from "./countRoutes.js";
import categoryRoutes from "./categoryRoutes.js";
import feedbackRoutes from "./feedbackRoutes.js";
import enquiryRoutes from "./enquiryRoutes.js";
import contactRoutes from "./contactRoutes.js";
import servicesRoutes from "./servicesRoutes.js";
import dashboardRoutes from "./dashboardRoutes.js";

const router = express.Router();

router.use("/users", userRoutes);
router.use("/otp",otpRoutes);
router.use("/businesses", businessRoutes);
router.use("/count",countRoutes);
router.use("/categories", categoryRoutes);
router.use("/feedback", feedbackRoutes);
router.use("/enquiries", enquiryRoutes);
router.use("/contact", contactRoutes);
router.use("/services", servicesRoutes);
router.use("/dashboard",dashboardRoutes)

export default router;