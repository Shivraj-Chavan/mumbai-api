import express from "express";
import { validateAdmin, validateUser } from "../middlewares/auth.js";
import {  getAllEnquiriesForOwner, submitEnquiry ,getAllEnquiriesForAdmin} from "../controller/enquiryController.js";
const router = express.Router();

router.post("/",validateUser, submitEnquiry);
router.get("/owner",validateUser,getAllEnquiriesForOwner)
router.get('/all',validateAdmin, getAllEnquiriesForAdmin);
// router.get('/:id', getSingleEnquiry);
// router.put('/:id', updateEnquiry);
// router.delete('/:id', deleteEnquiry);

export default router;