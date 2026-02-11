import express from "express";
import {submitContactForm, getAllContacts, markedViewed, getAllLiveContacts} from '../controller/contactController.js';
import { validateAdmin } from "../middlewares/auth.js";

const router = express.Router();

router.post('/contact', submitContactForm);
router.get('/',validateAdmin, getAllContacts);
router.get('/live',validateAdmin, getAllLiveContacts);
router.post("/:id/toggle-view",validateAdmin, markedViewed);

export default router;
