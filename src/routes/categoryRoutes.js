import express from "express";
import { addCategory, deleteCategory, getAllCategories, getAllCategoriesSubcategories, getCategories, updateCategory } from "../controller/categoryController.js";

const router = express.Router();

// router.get("/", getCategories);
router.get("/", getAllCategoriesSubcategories);

router.get("/", getAllCategories);
router.post("/", addCategory);
router.put("/:id", updateCategory);
router.delete("/:id", deleteCategory);

export default router;
