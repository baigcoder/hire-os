import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Loader2,
  Send,
  FileText,
  DollarSign,
  Calendar,
  Briefcase,
  Gift,
  CheckCircle,
} from "lucide-react";
import axios from "axios";
import { Badge } from "@/components/ui/badge";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

const OfferLetterModal = ({
  isOpen,
  onClose,
  interviewId,
  candidateName,
  jobTitle,
  onOfferSent,
}) => {
  const [step, setStep] = useState("create"); // create, review, sending, success
  const [isLoading, setIsLoading] = useState(false);
  const [offerData, setOfferData] = useState({
    position: jobTitle || "",
    department: "",
    salary: "",
    joiningDate: "",
    benefits: "",
    additionalTerms: "",
  });
  const [createdOffer, setCreatedOffer] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setOfferData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateOffer = async () => {
    if (!offerData.salary || !offerData.joiningDate) {
      toast.error("Please fill in salary and joining date");
      return;
    }

    setIsLoading(true);
    try {
      const res = await axios.post(
        `${API_BASE}/interview/${interviewId}/offer/create`,
        {
          ...offerData,
          salary: parseInt(offerData.salary),
        },
        {
          withCredentials: true,
        },
      );

      if (res.data.success) {
        setCreatedOffer(res.data.offer);
        setStep("review");
        toast.success("Offer letter created!");
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Failed to create offer");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendOffer = async () => {
    setIsLoading(true);
    setStep("sending");
    try {
      const res = await axios.post(
        `${API_BASE}/interview/${interviewId}/offer/send`,
        {},
        {
          withCredentials: true,
        },
      );

      if (res.data.success) {
        setStep("success");
        toast.success("Offer letter sent to candidate!");
        if (onOfferSent) onOfferSent();
        setTimeout(() => {
          onClose();
          setStep("create");
          setOfferData({
            position: jobTitle || "",
            department: "",
            salary: "",
            joiningDate: "",
            benefits: "",
            additionalTerms: "",
          });
        }, 2500);
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Failed to send offer");
      setStep("review");
    } finally {
      setIsLoading(false);
    }
  };

  const formatSalary = (amount) => {
    return new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileText className="w-5 h-5 text-green-600" />
            {step === "success" ? "Offer Sent!" : "Create Offer Letter"}
          </DialogTitle>
          <DialogDescription>
            {step === "create" && `Prepare offer letter for ${candidateName}`}
            {step === "review" && "Review offer details before sending"}
            {step === "success" &&
              "The candidate will receive an email notification"}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {step === "create" && (
            <div className="space-y-4">
              {/* Position */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <Briefcase className="w-3 h-3" /> Position
                  </Label>
                  <Input
                    name="position"
                    value={offerData.position}
                    onChange={handleChange}
                    placeholder="e.g., Software Engineer"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Input
                    name="department"
                    value={offerData.department}
                    onChange={handleChange}
                    placeholder="e.g., Engineering"
                  />
                </div>
              </div>

              {/* Salary */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <DollarSign className="w-3 h-3" /> Monthly Salary (PKR) *
                </Label>
                <Input
                  name="salary"
                  type="number"
                  value={offerData.salary}
                  onChange={handleChange}
                  placeholder="e.g., 150000"
                  required
                />
              </div>

              {/* Joining Date */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Joining Date *
                </Label>
                <Input
                  name="joiningDate"
                  type="date"
                  value={offerData.joiningDate}
                  onChange={handleChange}
                  required
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>

              {/* Benefits */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Gift className="w-3 h-3" /> Benefits
                </Label>
                <Textarea
                  name="benefits"
                  value={offerData.benefits}
                  onChange={handleChange}
                  placeholder="Health insurance, Remote work, Annual bonus, etc."
                  className="min-h-[80px]"
                />
              </div>

              {/* Additional Terms */}
              <div className="space-y-2">
                <Label>Additional Terms</Label>
                <Textarea
                  name="additionalTerms"
                  value={offerData.additionalTerms}
                  onChange={handleChange}
                  placeholder="Any additional terms or conditions..."
                  className="min-h-[60px]"
                />
              </div>
            </div>
          )}

          {step === "review" && createdOffer && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-6">
                <h3 className="text-lg font-bold text-green-800 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5" /> Offer Summary for{" "}
                  {candidateName}
                </h3>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Position:</span>
                    <p className="font-semibold text-gray-900">
                      {createdOffer.position}
                    </p>
                  </div>
                  {createdOffer.department && (
                    <div>
                      <span className="text-gray-500">Department:</span>
                      <p className="font-semibold text-gray-900">
                        {createdOffer.department}
                      </p>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-500">Monthly Salary:</span>
                    <p className="font-bold text-green-600 text-lg">
                      {formatSalary(createdOffer.salary?.amount)}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">Joining Date:</span>
                    <p className="font-semibold text-gray-900">
                      {new Date(createdOffer.joiningDate).toLocaleDateString(
                        "en-US",
                        {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        },
                      )}
                    </p>
                  </div>
                </div>

                {createdOffer.benefits && (
                  <div className="mt-4 pt-4 border-t border-green-200">
                    <span className="text-gray-500 text-sm">Benefits:</span>
                    <p className="text-gray-700">{createdOffer.benefits}</p>
                  </div>
                )}
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
                <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 shrink-0 mt-0.5">
                  Note
                </Badge>
                <p className="text-sm text-yellow-800">
                  Once sent, the candidate will receive an email with these
                  offer details. The offer will expire in 7 days.
                </p>
              </div>
            </div>
          )}

          {step === "sending" && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="w-12 h-12 text-green-600 animate-spin" />
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900">
                  Sending Offer Letter...
                </h3>
                <p className="text-gray-500">
                  Preparing email for {candidateName}
                </p>
              </div>
            </div>
          )}

          {step === "success" && (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">
                Offer Sent Successfully! 🎉
              </h3>
              <p className="text-gray-500 max-w-sm">
                {candidateName} will receive an email with the offer details and
                can respond through their dashboard.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="border-t pt-4">
          {step === "create" && (
            <>
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateOffer}
                disabled={isLoading}
                className="bg-green-600 hover:bg-green-700"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <FileText className="w-4 h-4 mr-2" />
                )}
                Create Offer
              </Button>
            </>
          )}

          {step === "review" && (
            <>
              <Button variant="outline" onClick={() => setStep("create")}>
                Edit
              </Button>
              <Button
                onClick={handleSendOffer}
                disabled={isLoading}
                className="bg-green-600 hover:bg-green-700"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Send to Candidate
              </Button>
            </>
          )}

          {step === "success" && (
            <Button onClick={onClose} className="w-full">
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default OfferLetterModal;
