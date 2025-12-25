import express from "express";
import { createBusiness , getBusinesses, getBusinessByUserId, getBusinessById, updateBusiness, deleteBusiness, getBusinessBySlug, verifyBusiness, getPendingUpdates, approveUpdate, rejectUpdate, incrementBusinessViewCount, getBusinessImages, uploadPhotosForBusiness, submitBusinessUpdate, uploadUpdatePhotos, getAdminActions, deleteImages} from "../controller/businessController.js";
import { validateAdmin, validateUser } from "../middlewares/auth.js";
import multer from "multer";
import { upload } from "../middlewares/uploads.js";
import { dynamicPlanBasedUpload } from "../middlewares/uploadMiddleware.js";

const router = express.Router();

router.post("/", validateUser, upload.array("photos", 5), createBusiness);
router.get("/", getBusinesses);
router.get("/user",validateUser, getBusinessByUserId);
router.get("/:id",validateUser, getBusinessById);
router.post("/:id",validateUser,upload.array("photos", 5), updateBusiness); 
router.delete("/:id",validateUser,deleteBusiness);
router.get("/s/:slug",getBusinessBySlug)
router.put("/verify/:id", verifyBusiness);
router.put('/:id/view', incrementBusinessViewCount);
router.get("/:id/photos", getBusinessImages); 
router.post("/:businessId/photos",dynamicPlanBasedUpload, uploadPhotosForBusiness);
router.delete('/:id/photos',deleteImages);


 // owner submits edit
router.put('/update/:id', validateUser, submitBusinessUpdate); //Owner submits business update
router.post('/update/:id/photos',validateUser,upload.array("photos", 5), uploadUpdatePhotos); // owner uploads photos


// ADMIN routes
router.get('/admin/pending', validateUser, validateAdmin, getPendingUpdates);
router.put('/admin/approve/:id', validateUser, validateAdmin, approveUpdate);
router.delete('/admin/reject/:id', validateUser, validateAdmin, rejectUpdate);
router.get("/admin/actions",validateAdmin, getAdminActions);

export default router;
