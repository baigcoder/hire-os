import {
  uploadImage,
  uploadProfilePhoto,
  uploadCompanyLogo,
  uploadCompanyCover,
  deleteImage,
} from "../utils/cloudinary.js";
import { User } from "../models/user.model.js";
import { Company } from "../models/company.model.js";
import getDataUri from "../utils/datauri.js";

/**
 * Upload profile photo for current user
 */
export const uploadUserProfilePhoto = async (req, res) => {
  try {
    const userId = req.id;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    // Convert file to data URI
    const fileUri = getDataUri(file);

    // Upload to Cloudinary
    const result = await uploadProfilePhoto(fileUri.content, userId);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: "Failed to upload image",
        error: result.error,
      });
    }

    // Update user profile with new photo URL
    const user = await User.findByIdAndUpdate(
      userId,
      { "profile.profilePhoto": result.url },
      { new: true },
    );

    return res.status(200).json({
      success: true,
      message: "Profile photo uploaded successfully",
      url: result.url,
      user: {
        _id: user._id,
        fullname: user.fullname,
        email: user.email,
        profile: user.profile,
      },
    });
  } catch (error) {
    console.error("Upload profile photo error:", error);
    return res.status(500).json({
      success: false,
      message: "Error uploading profile photo",
    });
  }
};

/**
 * Upload company logo
 */
export const uploadCompanyLogoController = async (req, res) => {
  try {
    const userId = req.id;
    const { companyId } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    // Find company and verify ownership
    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }

    // Check if user is admin or recruiter of this company
    const isAdmin = company.adminUser.toString() === userId;
    const isRecruiter = company.recruiters.some(
      (r) => r.userId?.toString() === userId,
    );

    if (!isAdmin && !isRecruiter) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this company",
      });
    }

    // Convert file to data URI
    const fileUri = getDataUri(file);

    // Upload to Cloudinary
    const result = await uploadCompanyLogo(fileUri.content, companyId);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: "Failed to upload logo",
        error: result.error,
      });
    }

    // Update company with new logo URL
    company.logo = result.url;
    await company.save();

    return res.status(200).json({
      success: true,
      message: "Company logo uploaded successfully",
      url: result.url,
    });
  } catch (error) {
    console.error("Upload company logo error:", error);
    return res.status(500).json({
      success: false,
      message: "Error uploading company logo",
    });
  }
};

/**
 * Upload company cover image
 */
export const uploadCompanyCoverController = async (req, res) => {
  try {
    const userId = req.id;
    const { companyId } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    // Find company and verify ownership
    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }

    // Check authorization
    const isAdmin = company.adminUser.toString() === userId;
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Only company admin can update cover image",
      });
    }

    // Convert file to data URI
    const fileUri = getDataUri(file);

    // Upload to Cloudinary
    const result = await uploadCompanyCover(fileUri.content, companyId);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: "Failed to upload cover image",
        error: result.error,
      });
    }

    // Update company with new cover URL
    company.coverImage = result.url;
    await company.save();

    return res.status(200).json({
      success: true,
      message: "Company cover image uploaded successfully",
      url: result.url,
    });
  } catch (error) {
    console.error("Upload company cover error:", error);
    return res.status(500).json({
      success: false,
      message: "Error uploading company cover image",
    });
  }
};

/**
 * Generic image upload (for other purposes)
 */
export const uploadGenericImage = async (req, res) => {
  try {
    const file = req.file;
    const { folder } = req.body;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    // Single flat folder name only: no slashes, so a caller can't write into another
    // user's or company's folder.
    const safeFolder = typeof folder === "string" && /^[a-z0-9_-]{1,32}$/i.test(folder) ? folder : "general";

    // Convert file to data URI
    const fileUri = getDataUri(file);

    // Upload to Cloudinary
    const result = await uploadImage(fileUri.content, safeFolder);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: "Failed to upload image",
        error: result.error,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Image uploaded successfully",
      url: result.url,
      publicId: result.publicId,
    });
  } catch (error) {
    console.error("Upload image error:", error);
    return res.status(500).json({
      success: false,
      message: "Error uploading image",
    });
  }
};

/**
 * Delete an uploaded image
 */
export const deleteUploadedImage = async (req, res) => {
  try {
    const { publicId } = req.body;

    if (!publicId) {
      return res.status(400).json({
        success: false,
        message: "Public ID is required",
      });
    }

    // Callers may only delete assets under their own user folder, or the folder of the
    // company they administer. Public IDs are visible in public image URLs, so knowing
    // one must not be enough.
    let owned = typeof publicId === "string" && publicId.startsWith(`hireos/users/${req.id}/`);
    if (!owned && typeof publicId === "string" && publicId.startsWith("hireos/companies/")) {
      const company = await Company.findOne({ adminUser: req.id }).select("_id");
      owned = !!company && publicId.startsWith(`hireos/companies/${company._id}/`);
    }
    if (!owned || publicId.includes("..")) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own images",
      });
    }

    const result = await deleteImage(publicId);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: "Failed to delete image",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Image deleted successfully",
    });
  } catch (error) {
    console.error("Delete image error:", error);
    return res.status(500).json({
      success: false,
      message: "Error deleting image",
    });
  }
};
