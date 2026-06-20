import express from "express";
import { initiatePayment, verifyPayment } from "../controller/paymentController.js";
import { validateUser } from "../middlewares/auth.js";

const router = express.Router();

router.post("/initiate", validateUser, initiatePayment);
router.post("/verify", validateUser, verifyPayment);
// router.get("/", getPayments);

export default router;
