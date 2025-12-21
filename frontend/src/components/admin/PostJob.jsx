import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "../shared/Navbar";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { Badge } from "../ui/badge";
import { useSelector, useDispatch } from "react-redux";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import axios from "axios";
import { JOB_API_END_POINT, COMPANY_API_END_POINT } from "@/utils/constant";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { setCompanies } from "@/redux/companySlice";
import {
  Loader2,
  MapPin,
  Building,
  Briefcase,
  Sparkles,
  Wand2,
  Terminal,
  ChevronRight,
  Check,
  AlertTriangle,
  Clock,
  DollarSign,
  Users,
  GraduationCap,
  FileText,
  Zap,
} from "lucide-react";

// Pakistan cities for the location dropdown
const pakistanCities = [
  "Karachi",
  "Lahore",
  "Islamabad",
  "Rawalpindi",
  "Faisalabad",
  "Multan",
  "Peshawar",
  "Quetta",
  "Sialkot",
  "Gujranwala",
  "Hyderabad",
  "Abbottabad",
  "Bahawalpur",
  "Sargodha",
  "Sukkur",
  "Larkana",
  "Sheikhupura",
  "Rahim Yar Khan",
  "Jhang",
  "Dera Ghazi Khan",
  "Remote",
];

// Job types
const jobTypes = [
  "Full-time",
  "Part-time",
  "Contract",
  "Internship",
  "Freelance",
  "Remote",
];

// Experience levels
const experienceLevels = [
  "Fresher",
  "1-2 years",
  "2-4 years",
  "4-6 years",
  "6+ years",
  "Senior Level",
];

const PostJob = () => {
  const [input, setInput] = useState({
    title: "",
    description: "",
    requirements: "",
    salary: "",
    location: "",
    jobType: "",
    experience: "",
    position: 1,
    companyId: "",
  });
  const [loading, setLoading] = useState(false);
  const [companiesLoading, setCompaniesLoading] = useState(true);
  const [localCompanies, setLocalCompanies] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiField, setAiField] = useState(null);
  const [aiSuggestions, setAiSuggestions] = useState({});
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { companies: reduxCompanies } = useSelector((store) => store.company);

  // Fetch companies directly from API
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        setCompaniesLoading(true);
        const res = await axios.get(`${COMPANY_API_END_POINT}/get`, {
          withCredentials: true,
        });
        if (res.data.success && res.data.companies?.length > 0) {
          setLocalCompanies(res.data.companies);
          dispatch(setCompanies(res.data.companies));
          // Auto-select first company
          setInput((prev) => ({
            ...prev,
            companyId: res.data.companies[0]._id,
          }));
        }
      } catch (error) {
        console.error("Error fetching companies:", error);
      } finally {
        setCompaniesLoading(false);
      }
    };
    fetchCompanies();
  }, []);

  // Use local companies if available, fallback to redux
  const companies = localCompanies.length > 0 ? localCompanies : reduxCompanies;
  const selectedCompany = companies.find((c) => c._id === input.companyId);

  const changeEventHandler = (e) => {
    setInput({ ...input, [e.target.name]: e.target.value });
  };

  const selectChangeHandler = (value) => {
    const selectedCompany = companies.find(
      (company) => company.name.toLowerCase() === value,
    );
    if (selectedCompany) {
      setInput({ ...input, companyId: selectedCompany._id });
    }
  };

  // Gemini AI suggestion generator
  const generateAISuggestion = async (field) => {
    if (!input.title && field !== "title") {
      toast.error("Please enter a job title first");
      return;
    }

    setAiLoading(true);
    setAiField(field);

    try {
      const prompts = {
        description: `Write a compelling, professional job description for a "${input.title}" position${input.jobType ? ` (${input.jobType})` : ""}${selectedCompany ? ` at ${selectedCompany.name}` : ""}. Keep it concise (3-4 paragraphs), highlighting role responsibilities, what the company offers, and why candidates should apply. Make it engaging and modern.`,
        requirements: `List 6-8 key requirements and qualifications for a "${input.title}" position${input.experience ? ` requiring ${input.experience} experience` : ""}. Format as comma-separated items. Include technical skills, soft skills, and education requirements.`,
        salary: `Suggest a competitive salary range in PKR for a "${input.title}" position in Pakistan${input.experience ? ` with ${input.experience} experience` : ""}. Return only the range like "80,000 - 120,000 PKR" or "150,000 - 200,000 PKR".`,
      };

      // Call Gemini API through backend proxy
      const response = await axios.post(
        "/api/v1/ai/generate",
        {
          prompt: prompts[field],
          maxTokens: field === "description" ? 500 : 200,
        },
        { withCredentials: true },
      );

      if (response.data.success && response.data.content) {
        setAiSuggestions((prev) => ({
          ...prev,
          [field]: response.data.content,
        }));
        toast.success(`AI suggestion generated for ${field}!`);
      } else {
        // Fallback suggestions if API fails
        const fallbackSuggestions = {
          description: `We are looking for a talented ${input.title} to join our dynamic team${selectedCompany ? ` at ${selectedCompany.name}` : ""}. In this role, you will work on cutting-edge projects, collaborate with cross-functional teams, and drive innovation.\n\nAs a ${input.title}, you will be responsible for designing, developing, and maintaining high-quality solutions that meet our business objectives. You'll have opportunities for professional growth and work with the latest technologies.\n\nWe offer a competitive package, flexible work arrangements, and a supportive team environment. If you're passionate about your craft and want to make an impact, we'd love to hear from you!`,
          requirements: `Bachelor's degree in relevant field, Strong communication skills, Team collaboration experience, Problem-solving abilities, ${input.title.toLowerCase().includes("developer") ? "Programming proficiency, Version control (Git), Agile methodology" : "Domain expertise, Analytical thinking, Project management"}`,
          salary: input.experience?.includes("Fresher")
            ? "50,000 - 80,000 PKR"
            : input.experience?.includes("Senior")
              ? "200,000 - 350,000 PKR"
              : "100,000 - 180,000 PKR",
        };
        setAiSuggestions((prev) => ({
          ...prev,
          [field]: fallbackSuggestions[field],
        }));
        toast.info("Using fallback suggestion");
      }
    } catch (error) {
      // Use intelligent fallback
      const fallbackSuggestions = {
        description: `We are seeking an exceptional ${input.title} to join our innovative team${selectedCompany ? ` at ${selectedCompany.name}` : ""}.\n\nIn this role, you will leverage your expertise to drive impactful projects, collaborate with talented professionals, and contribute to our growth story.\n\nWe offer competitive compensation, career development opportunities, and a vibrant work culture. Apply now to be part of something meaningful!`,
        requirements: `Bachelor's degree in relevant field, ${input.experience || "2+ years"} of experience, Strong analytical skills, Excellent communication, Team player mentality, Results-driven approach`,
        salary: "80,000 - 150,000 PKR",
      };
      setAiSuggestions((prev) => ({
        ...prev,
        [field]: fallbackSuggestions[field],
      }));
      toast.info("Using intelligent suggestion");
    } finally {
      setAiLoading(false);
      setAiField(null);
    }
  };

  const applySuggestion = (field) => {
    if (aiSuggestions[field]) {
      setInput((prev) => ({ ...prev, [field]: aiSuggestions[field] }));
      toast.success(`Applied AI suggestion to ${field}`);
    }
  };

  const submitHandler = async (e) => {
    e.preventDefault();

    if (!input.title || !input.description || !input.companyId) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setLoading(true);
      const res = await axios.post(`${JOB_API_END_POINT}/post`, input, {
        headers: { "Content-Type": "application/json" },
        withCredentials: true,
      });
      if (res.data.success) {
        toast.success(res.data.message);
        navigate("/admin/jobs");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create job post");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] font-['Space_Grotesk',sans-serif]">
      <Navbar />

      {/* Industrial Grid Background */}
      <div className="fixed inset-0 bg-grid opacity-30 pointer-events-none" />
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#FFD700]/5 rounded-full blur-[150px]" />
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 pt-24 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#FFD700] rounded-sm flex items-center justify-center">
              <Briefcase className="w-6 h-6 text-black" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white uppercase tracking-tight">
                Create Job Post
              </h1>
              <p className="text-gray-500 text-sm font-mono">
                AI-powered job creation
              </p>
            </div>
          </div>
          <Badge className="bg-[#FFD700]/10 text-[#FFD700] border-[#FFD700]/30 rounded-sm text-xs uppercase">
            <Sparkles className="w-3 h-3 mr-1" />
            AI Assist
          </Badge>
        </motion.div>

        {/* Company Card - Show registered company */}
        {companies.length > 0 && selectedCompany && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-6 p-4 bg-[#111111] border border-[#00FF94]/30 rounded-sm relative"
          >
            <div className="absolute top-0 right-0 w-6 h-6 border-t border-r border-[#00FF94]/30" />
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#00FF94] rounded-sm flex items-center justify-center">
                {selectedCompany.logo ? (
                  <img
                    src={selectedCompany.logo}
                    alt={selectedCompany.name}
                    className="w-full h-full object-cover rounded-sm"
                  />
                ) : (
                  <span className="text-lg font-bold text-black">
                    {selectedCompany.name?.charAt(0)}
                  </span>
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-white font-bold">
                    {selectedCompany.name}
                  </h3>
                  <Badge className="bg-[#00FF94]/10 text-[#00FF94] border-[#00FF94]/30 rounded-sm text-[10px]">
                    <Check className="w-3 h-3 mr-1" />
                    Registered
                  </Badge>
                </div>
                <p className="text-gray-500 text-xs font-mono">
                  Posting as company admin
                </p>
              </div>
              {companies.length > 1 && (
                <Select
                  onValueChange={selectChangeHandler}
                  value={selectedCompany.name.toLowerCase()}
                >
                  <SelectTrigger className="w-40 bg-transparent border-white/10 text-gray-400 rounded-sm">
                    <SelectValue placeholder="Switch company" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#111111] border-white/10">
                    <SelectGroup>
                      {companies.map((company) => (
                        <SelectItem
                          key={company._id}
                          value={company.name.toLowerCase()}
                        >
                          {company.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              )}
            </div>
          </motion.div>
        )}

        {/* Loading State */}
        {companiesLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-[#111111] border border-[#FFD700]/30 rounded-sm"
          >
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-[#FFD700] animate-spin" />
              <p className="text-gray-400 font-mono text-sm">
                Loading company data...
              </p>
            </div>
          </motion.div>
        )}

        {/* No Company Warning - only show after loading */}
        {!companiesLoading && companies.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-[#FFD700]/10 border border-[#FFD700]/30 rounded-sm"
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-[#FFD700]" />
              <div>
                <p className="text-[#FFD700] font-bold">
                  Complete Company Setup
                </p>
                <p className="text-[#FFD700]/70 text-sm">
                  You need to register your company before posting jobs.
                </p>
              </div>
              <Button
                onClick={() => navigate("/company/pricing")}
                className="ml-auto bg-[#FFD700] hover:bg-[#FFE44D] text-black rounded-sm"
              >
                Setup Company
              </Button>
            </div>
          </motion.div>
        )}

        {/* Main Form */}
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          onSubmit={submitHandler}
          className="bg-[#111111] border border-white/10 rounded-sm p-6 relative"
        >
          <div className="absolute top-0 right-0 w-8 h-8 border-t border-r border-[#FFD700]/30" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b border-l border-[#FFD700]/30" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Job Title */}
            <div className="md:col-span-2">
              <Label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">
                Job Title <span className="text-red-400">*</span>
              </Label>
              <Input
                type="text"
                name="title"
                value={input.title}
                onChange={changeEventHandler}
                placeholder="e.g. Senior React Developer"
                className="bg-[#0A0A0A] border-white/10 text-white rounded-sm focus:border-[#FFD700]/50 placeholder:text-gray-600"
              />
            </div>

            {/* Description with AI */}
            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs text-gray-500 uppercase tracking-wider">
                  Job Description <span className="text-red-400">*</span>
                </Label>
                <Button
                  type="button"
                  onClick={() => generateAISuggestion("description")}
                  disabled={aiLoading || !input.title}
                  className="bg-[#FFD700]/10 text-[#FFD700] hover:bg-[#FFD700]/20 border border-[#FFD700]/30 rounded-sm text-xs h-7 px-2"
                >
                  {aiLoading && aiField === "description" ? (
                    <Loader2 className="w-3 h-3 animate-spin mr-1" />
                  ) : (
                    <Wand2 className="w-3 h-3 mr-1" />
                  )}
                  AI Generate
                </Button>
              </div>
              <Textarea
                name="description"
                value={input.description}
                onChange={changeEventHandler}
                placeholder="Describe the role, responsibilities, and what you're looking for..."
                rows={5}
                className="bg-[#0A0A0A] border-white/10 text-white rounded-sm focus:border-[#FFD700]/50 placeholder:text-gray-600 resize-none"
              />
              <AnimatePresence>
                {aiSuggestions.description &&
                  input.description !== aiSuggestions.description && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-2 p-3 bg-[#FFD700]/5 border border-[#FFD700]/20 rounded-sm"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] text-[#FFD700] uppercase tracking-wider flex items-center">
                          <Sparkles className="w-3 h-3 mr-1" />
                          AI Suggestion
                        </span>
                        <Button
                          type="button"
                          onClick={() => applySuggestion("description")}
                          className="bg-[#FFD700] text-black hover:bg-[#FFE44D] rounded-sm text-[10px] h-6 px-2"
                        >
                          Apply
                        </Button>
                      </div>
                      <p className="text-gray-400 text-xs whitespace-pre-line">
                        {aiSuggestions.description}
                      </p>
                    </motion.div>
                  )}
              </AnimatePresence>
            </div>

            {/* Requirements with AI */}
            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs text-gray-500 uppercase tracking-wider">
                  Requirements
                </Label>
                <Button
                  type="button"
                  onClick={() => generateAISuggestion("requirements")}
                  disabled={aiLoading || !input.title}
                  className="bg-[#FFD700]/10 text-[#FFD700] hover:bg-[#FFD700]/20 border border-[#FFD700]/30 rounded-sm text-xs h-7 px-2"
                >
                  {aiLoading && aiField === "requirements" ? (
                    <Loader2 className="w-3 h-3 animate-spin mr-1" />
                  ) : (
                    <Wand2 className="w-3 h-3 mr-1" />
                  )}
                  AI Suggest
                </Button>
              </div>
              <Input
                type="text"
                name="requirements"
                value={input.requirements}
                onChange={changeEventHandler}
                placeholder="React, Node.js, MongoDB, 3+ years exp..."
                className="bg-[#0A0A0A] border-white/10 text-white rounded-sm focus:border-[#FFD700]/50 placeholder:text-gray-600"
              />
              <AnimatePresence>
                {aiSuggestions.requirements &&
                  input.requirements !== aiSuggestions.requirements && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-2 p-3 bg-[#FFD700]/5 border border-[#FFD700]/20 rounded-sm"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] text-[#FFD700] uppercase tracking-wider flex items-center">
                          <Sparkles className="w-3 h-3 mr-1" />
                          AI Suggestion
                        </span>
                        <Button
                          type="button"
                          onClick={() => applySuggestion("requirements")}
                          className="bg-[#FFD700] text-black hover:bg-[#FFE44D] rounded-sm text-[10px] h-6 px-2"
                        >
                          Apply
                        </Button>
                      </div>
                      <p className="text-gray-400 text-xs">
                        {aiSuggestions.requirements}
                      </p>
                    </motion.div>
                  )}
              </AnimatePresence>
            </div>

            {/* Salary with AI */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs text-gray-500 uppercase tracking-wider flex items-center gap-1">
                  <DollarSign className="w-3 h-3" />
                  Salary Range
                </Label>
                <Button
                  type="button"
                  onClick={() => generateAISuggestion("salary")}
                  disabled={aiLoading || !input.title}
                  className="bg-[#FFD700]/10 text-[#FFD700] hover:bg-[#FFD700]/20 border border-[#FFD700]/30 rounded-sm text-[10px] h-6 px-2"
                >
                  {aiLoading && aiField === "salary" ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Zap className="w-3 h-3" />
                  )}
                </Button>
              </div>
              <Input
                type="text"
                name="salary"
                value={input.salary}
                onChange={changeEventHandler}
                placeholder="80,000 - 120,000 PKR"
                className="bg-[#0A0A0A] border-white/10 text-white rounded-sm focus:border-[#FFD700]/50 placeholder:text-gray-600"
              />
              {aiSuggestions.salary &&
                input.salary !== aiSuggestions.salary && (
                  <button
                    type="button"
                    onClick={() => applySuggestion("salary")}
                    className="mt-1 text-[10px] text-[#FFD700] hover:underline"
                  >
                    Suggested: {aiSuggestions.salary}
                  </button>
                )}
            </div>

            {/* Location */}
            <div>
              <Label className="text-xs text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                Location
              </Label>
              <Select
                onValueChange={(value) =>
                  setInput({ ...input, location: value })
                }
                value={input.location}
              >
                <SelectTrigger className="bg-[#0A0A0A] border-white/10 text-white rounded-sm">
                  <SelectValue placeholder="Select city" />
                </SelectTrigger>
                <SelectContent className="bg-[#111111] border-white/10">
                  <SelectGroup>
                    {pakistanCities.map((city) => (
                      <SelectItem
                        key={city}
                        value={city}
                        className="text-white hover:bg-white/5"
                      >
                        {city}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            {/* Job Type */}
            <div>
              <Label className="text-xs text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Briefcase className="w-3 h-3" />
                Job Type
              </Label>
              <Select
                onValueChange={(value) =>
                  setInput({ ...input, jobType: value })
                }
                value={input.jobType}
              >
                <SelectTrigger className="bg-[#0A0A0A] border-white/10 text-white rounded-sm">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent className="bg-[#111111] border-white/10">
                  <SelectGroup>
                    {jobTypes.map((type) => (
                      <SelectItem
                        key={type}
                        value={type}
                        className="text-white hover:bg-white/5"
                      >
                        {type}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            {/* Experience */}
            <div>
              <Label className="text-xs text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                <GraduationCap className="w-3 h-3" />
                Experience Level
              </Label>
              <Select
                onValueChange={(value) =>
                  setInput({ ...input, experience: value })
                }
                value={input.experience}
              >
                <SelectTrigger className="bg-[#0A0A0A] border-white/10 text-white rounded-sm">
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent className="bg-[#111111] border-white/10">
                  <SelectGroup>
                    {experienceLevels.map((level) => (
                      <SelectItem
                        key={level}
                        value={level}
                        className="text-white hover:bg-white/5"
                      >
                        {level}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            {/* Positions */}
            <div>
              <Label className="text-xs text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Users className="w-3 h-3" />
                No. of Positions
              </Label>
              <Input
                type="number"
                name="position"
                value={input.position}
                onChange={changeEventHandler}
                min={1}
                className="bg-[#0A0A0A] border-white/10 text-white rounded-sm focus:border-[#FFD700]/50"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="mt-8 pt-6 border-t border-white/5">
            <Button
              type="submit"
              disabled={loading || companies.length === 0}
              className="w-full bg-[#FFD700] text-black hover:bg-[#FFE44D] rounded-sm h-12 font-bold text-sm uppercase tracking-wider"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Creating Job...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 mr-2" />
                  Post New Job
                </>
              )}
            </Button>
          </div>
        </motion.form>
      </div>
    </div>
  );
};

export default PostJob;
