import express from "express";
import { trackVisit } from "../controller/countController.js";
const router = express.Router();

router.get("/webview",trackVisit);

export default router;