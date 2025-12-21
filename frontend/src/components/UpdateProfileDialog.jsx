import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import {
  Loader2,
  X,
  Upload,
  FileText,
  Check,
  User,
  Mail,
  Phone,
  FileEdit,
  Sparkles,
  Camera,
  Image as ImageIcon,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import api from "@/utils/api";
import { setUser } from "@/redux/authSlice";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

const UpdateProfileDialog = ({ open = false, setOpen = () => { } }) => {
  const [loading, setLoading] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeUrl, setResumeUrl] = useState("");
  const [resumeName, setResumeName] = useState("");
  const [profilePhoto, setProfilePhoto] = useState("");
  const [profilePhotoFile, setProfilePhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const photoInputRef = useRef(null);

  const { user } = useSelector((store) => store.auth);
  const dispatch = useDispatch();

  const [input, setInput] = useState({
    fullname: "",
    email: "",
    phoneNumber: "",
    bio: "",
    skills: "",
  });

  // Initialize form with user data when dialog opens
  useEffect(() => {
    if (open && user) {
      setInput({
        fullname: user?.fullname || "",
        email: user?.email || "",
        phoneNumber: user?.phoneNumber || "",
        bio: user?.profile?.bio || "",
        skills: user?.profile?.skills?.join(", ") || "",
      });
      setResumeUrl(user?.profile?.resume || "");
      setResumeName(user?.profile?.resumeOriginalName || "");
      setProfilePhoto(user?.profile?.profilePhoto || "");
      setPhotoPreview("");
      setProfilePhotoFile(null);
      setResumeFile(null);
    }
  }, [open, user]);

  // Handle profile photo selection - AUTO UPLOAD immediately
  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (JPG, PNG, etc.)");
      return;
    }

    // Validate file size (2MB limit for images)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image size must be less than 2MB");
      return;
    }

    // Create preview URL immediately for instant feedback
    const previewUrl = URL.createObjectURL(file);
    setPhotoPreview(previewUrl);

    // Start upload immediately
    setPhotoLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await api.post(
        "/user/profile/photo",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );

      if (res.data.success) {
        setProfilePhoto(res.data.profilePhoto);
        setPhotoPreview("");
        setProfilePhotoFile(null);
        // Update user in Redux
        dispatch(
          setUser({
            ...user,
            profile: { ...user.profile, profilePhoto: res.data.profilePhoto },
          }),
        );
        toast.success("Profile photo updated!");
      }
    } catch (error) {
      console.error("Photo upload error:", error);
      toast.error(error.response?.data?.message || "Failed to upload photo");
      // Revert preview on error
      setPhotoPreview("");
    } finally {
      setPhotoLoading(false);
    }
  };

  // Legacy function - kept for compatibility but no longer needed
  const uploadProfilePhoto = async () => {
    // Auto-upload is now handled in handlePhotoChange
    // This is kept for any external callers
  };

  const changeEventHandler = (e) => {
    setInput({ ...input, [e.target.name]: e.target.value });
  };

  // Handle resume file selection
  const handleResumeChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    if (file.type !== "application/pdf") {
      toast.error("Please upload a PDF file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      // 5MB limit
      toast.error("File size must be less than 5MB");
      return;
    }

    setResumeFile(file);
    setResumeName(file.name); // Preview name immediately
  };

  const removeResume = () => {
    setResumeFile(null);
    // If there was an existing resume, we keep showing it until they save?
    // Or we allow clearing the resume?
    // For simplicity, clearing logic is:
    setResumeUrl("");
    setResumeName("");
  };

  const submitHandler = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      // Prepare update data
      const formData = new FormData();
      formData.append("fullname", input.fullname);
      formData.append("email", input.email);
      formData.append("phoneNumber", input.phoneNumber);
      formData.append("bio", input.bio);
      formData.append("skills", input.skills);

      // Append file if selected
      if (resumeFile) {
        formData.append("file", resumeFile);
      }
      // Passing original name isn't strictly necessary if backend handles it from file object,
      // but we can pass it if backend logic relies on it (it doesn't, it uses req.file.originalname)

      const res = await api.post(
        "/user/profile/update",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );

      if (res.data.success) {
        dispatch(setUser(res.data.user));
        toast.success(res.data.message);
        setOpen(false);
      }
    } catch (error) {
      console.error("Profile update error:", error);
      toast.error(error.response?.data?.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto p-0 gap-0 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl shadow-2xl">
        {/* Header */}
        <DialogHeader className="sticky top-0 z-10 bg-gradient-to-r from-emerald-600 to-emerald-500 p-5 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <FileEdit className="w-5 h-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-white">
                Update Profile
              </DialogTitle>
              <p className="text-sm text-emerald-100">
                Keep your information up to date
              </p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={submitHandler} className="p-5 space-y-5">
          {/* Profile Photo Section */}
          <div className="flex flex-col items-center mb-6">
            <div className="relative group">
              {/* Avatar Display with Loading Overlay */}
              <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-zinc-700 dark:to-zinc-800 border-4 border-white dark:border-zinc-700 shadow-lg relative">
                {photoPreview || profilePhoto ? (
                  <img
                    src={photoPreview || profilePhoto}
                    alt="Profile"
                    className={`w-full h-full object-cover transition-opacity ${photoLoading ? "opacity-50" : "opacity-100"}`}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User className="w-10 h-10 text-emerald-400 dark:text-zinc-500" />
                  </div>
                )}

                {/* Loading Overlay */}
                {photoLoading && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                  </div>
                )}
              </div>

              {/* Camera Overlay Button - disabled during upload */}
              <button
                type="button"
                onClick={() => !photoLoading && photoInputRef.current?.click()}
                disabled={photoLoading}
                className={`absolute bottom-0 right-0 w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-all border-2 border-white dark:border-zinc-800 ${photoLoading
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-emerald-500 hover:bg-emerald-600"
                  }`}
              >
                <Camera className="w-4 h-4 text-white" />
              </button>

              {/* Hidden File Input */}
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
                disabled={photoLoading}
              />
            </div>

            <p className="text-xs text-gray-400 mt-2">
              {photoLoading
                ? "Uploading photo..."
                : "Click the camera to change photo (auto-saves)"}
            </p>
          </div>

          {/* Full Name */}
          <div className="space-y-2">
            <Label
              htmlFor="fullname"
              className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2"
            >
              <User size={14} className="text-emerald-500" />
              Full Name
            </Label>
            <Input
              id="fullname"
              name="fullname"
              type="text"
              value={input.fullname}
              onChange={changeEventHandler}
              placeholder="John Doe"
              className="h-11 bg-gray-50 dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 focus:border-emerald-500 focus:ring-emerald-500 rounded-xl"
            />
          </div>

          {/* Email - Readonly */}
          <div className="space-y-2">
            <Label
              htmlFor="email"
              className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2"
            >
              <Mail size={14} className="text-emerald-500" />
              Email
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={input.email}
              className="h-11 bg-gray-100 dark:bg-zinc-800/50 border-gray-200 dark:border-zinc-700 rounded-xl text-gray-500 cursor-not-allowed"
              disabled
            />
            <p className="text-xs text-gray-400">Email cannot be changed</p>
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label
              htmlFor="phoneNumber"
              className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2"
            >
              <Phone size={14} className="text-emerald-500" />
              Phone Number
            </Label>
            <Input
              id="phoneNumber"
              name="phoneNumber"
              type="tel"
              value={input.phoneNumber}
              onChange={changeEventHandler}
              placeholder="+92 300 1234567"
              className="h-11 bg-gray-50 dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 focus:border-emerald-500 focus:ring-emerald-500 rounded-xl"
            />
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label
              htmlFor="bio"
              className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2"
            >
              <FileEdit size={14} className="text-emerald-500" />
              Bio
            </Label>
            <textarea
              id="bio"
              name="bio"
              value={input.bio}
              onChange={changeEventHandler}
              placeholder="Tell us about yourself..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none text-sm"
            />
          </div>

          {/* Skills */}
          <div className="space-y-2">
            <Label
              htmlFor="skills"
              className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2"
            >
              <Sparkles size={14} className="text-emerald-500" />
              Skills
            </Label>
            <Input
              id="skills"
              name="skills"
              value={input.skills}
              onChange={changeEventHandler}
              placeholder="React, Node.js, Python"
              className="h-11 bg-gray-50 dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 focus:border-emerald-500 focus:ring-emerald-500 rounded-xl"
            />
            <p className="text-xs text-gray-400">Separate skills with commas</p>
          </div>

          {/* Resume Upload */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <FileText size={14} className="text-emerald-500" />
              Resume
            </Label>

            {resumeFile || resumeUrl ? (
              // Show selected/existing resume
              <div className="flex items-center justify-between p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-800 flex items-center justify-center">
                    <FileText
                      size={24}
                      className="text-emerald-600 dark:text-emerald-400"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[180px]">
                      {resumeName || "Resume.pdf"}
                    </p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <Check size={12} />
                      {resumeFile
                        ? "Selected (Click Save to upload)"
                        : "Current Resume"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={removeResume}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            ) : (
              // Upload input
              <div className="relative">
                <input
                  type="file"
                  id="resume"
                  accept="application/pdf"
                  onChange={handleResumeChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 dark:border-zinc-700 hover:border-emerald-400 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 rounded-xl transition-all">
                  <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center mb-3">
                    <Upload size={24} className="text-gray-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Click to upload resume
                  </p>
                  <p className="text-xs text-gray-400">PDF only, max 5MB</p>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1 h-12 rounded-xl border-gray-200 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-800"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 h-12 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-semibold shadow-lg shadow-emerald-500/25 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default UpdateProfileDialog;
