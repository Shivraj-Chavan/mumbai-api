import express from 'express';
import { blockSubadmin, createSubadmin, getAllSubadmins, updateSubadmin } from "../controller/subadminController.js";
import { validateAdmin } from "../middlewares/auth.js";

const router = express.Router();


router.get("/", validateAdmin,getAllSubadmins);
router.post("/", validateAdmin,createSubadmin);
router.put("/:id", validateAdmin, updateSubadmin);
// router.delete("/:id", validateAdmin, deleteSubadmin);
router.patch("/:id/block", validateAdmin, blockSubadmin);

export default router;

