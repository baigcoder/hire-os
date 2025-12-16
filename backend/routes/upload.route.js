import express from 'express';
import isAuthenticated from '../middlewares/isAuthenticated.js';
import { singleUpload } from '../middlewares/mutler.js';
import {
    uploadUserProfilePhoto,
    uploadCompanyLogoController,
    uploadCompanyCoverController,
    uploadGenericImage,
    deleteUploadedImage
} from '../controllers/upload.controller.js';

const router = express.Router();

// User profile photo upload
router.post('/profile', isAuthenticated, singleUpload, uploadUserProfilePhoto);

// Company logo upload
router.post('/company/:companyId/logo', isAuthenticated, singleUpload, uploadCompanyLogoController);

// Company cover image upload
router.post('/company/:companyId/cover', isAuthenticated, singleUpload, uploadCompanyCoverController);

// Generic image upload
router.post('/image', isAuthenticated, singleUpload, uploadGenericImage);

// Delete image
router.delete('/image', isAuthenticated, deleteUploadedImage);

export default router;
