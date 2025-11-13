import express from "express";
import {  getSubcategoriesByCategorySlug} from "../controller/subcategoryController.js";

const router = express.Router();

router.get("/:slug", getSubcategoriesByCategorySlug);

export default router;
