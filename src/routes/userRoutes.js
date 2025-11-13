import express from 'express';
import {getAllUsers, getMyProfile, updateUserProfile, createUser,} from '../controller/userController.js';
import { validateAdmin, validateUser } from '../middlewares/auth.js';

const router = express.Router();

router.get("/", validateAdmin,getAllUsers);
router.get("/me", validateUser, getMyProfile);
router.put("/:id/profile", updateUserProfile);
router.post("/", validateAdmin,createUser);

export default router;
