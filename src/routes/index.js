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
import subCategoryRoutes from "./subcategoryRoutes.js";
import paymentRoutes from "./paymentRoutes.js";
import planRoutes from "./planRoutes.js";
import subadminRoutes from "./subadminRoutes.js";

const router = express.Router();

router.use("/users", userRoutes);
router.use("/otp",otpRoutes);
router.use("/businesses", businessRoutes);
router.use("/count",countRoutes);
router.use("/categories", categoryRoutes);
router.use("/subcategories", subCategoryRoutes);
router.use("/feedback", feedbackRoutes);
router.use("/enquiries", enquiryRoutes);
router.use("/contact", contactRoutes);
router.use("/services", servicesRoutes);
router.use("/dashboard",dashboardRoutes);
router.use("/payments", paymentRoutes);
router.use("/plans", planRoutes);
router.use("/subadmin",subadminRoutes)

export default router;