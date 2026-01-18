import express from "express";
import { createReview, getReviews, deleteReview, getAllReviews, getRaisedReviews, adminDeleteReview } from "../controller/feedbackController.js";
import { validateAdmin, validateUser } from "../middlewares/auth.js";

const router = express.Router();

router.get('/raised_reviews',validateAdmin, getRaisedReviews);
router.get("/:business_id", getReviews);
router.get('/',validateUser,getAllReviews);
router.post("/",validateUser, createReview);
router.delete("/:id",validateUser, deleteReview);
router.delete('/:review_id', validateAdmin, adminDeleteReview);

export default router;
