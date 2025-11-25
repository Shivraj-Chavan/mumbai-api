import express from "express";
import {submitContactForm, getAllContacts, markedViewed} from '../controller/contactController.js';
import { validateAdmin } from "../middlewares/auth.js";

const router = express.Router();

router.post('/contact', submitContactForm);
router.get('/',validateAdmin, getAllContacts);
router.post("/:id/toggle-view",validateAdmin, markedViewed);

export default router;
