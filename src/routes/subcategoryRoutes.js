import express from "express";
import {  addSubcategory, deleteSubcategory, getSubcategoriesByCategorySlug, updateSubcategory} from "../controller/subcategoryController.js";

const router = express.Router();

router.get("/:slug", getSubcategoriesByCategorySlug);


router.post("/", addSubcategory);
router.put("/:id", updateSubcategory);
router.delete("/:id", deleteSubcategory);

export default router;
