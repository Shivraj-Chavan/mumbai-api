import express from "express";
import { createServices, deleteService, getAllServices, updateService, updateServiceStatus } from "../controller/servicesController.js";
import { validateUser } from "../middlewares/auth.js";

const router = express.Router();

router.get("/", getAllServices);
router.post("/bulk",validateUser, createServices);
router.put("/:id/status", updateServiceStatus);
router.delete("/:id", deleteService);
router.put("/:id", updateService);

export default router;
