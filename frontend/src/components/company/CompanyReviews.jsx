import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Star, ThumbsUp, Building, Calendar, CheckCircle, ChevronDown, ChevronUp, Send, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const CompanyReviews = ({ companyId }) => {
    const [reviews, setReviews] = useState([]);
    const [ratings, setRatings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showWriteModal, setShowWriteModal] = useState(false);
    const [expandedId, setExpandedId] = useState(null);

    const [reviewForm, setReviewForm] = useState({
        ratings: { overall: 5, workLifeBalance: 5, culture: 5, compensation: 5, management: 5, careerGrowth: 5 },
        title: "",
        pros: "",
        cons: "",
        advice: "",
        employmentStatus: "current",
        jobTitle: "",
        recommendToFriend: true,
        isAnonymous: true,
    });

    useEffect(() => {
        if (companyId) fetchReviews();
    }, [companyId]);

    const fetchReviews = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${API_URL}/api/v1/reviews/company/${companyId}`);
            setReviews(res.data.reviews || []);
            setRatings(res.data.ratings);
        } catch (error) {
            console.error("Fetch reviews error:", error);
        } finally {
            setLoading(false);
        }
    };

    const submitReview = async () => {
        if (!reviewForm.title || !reviewForm.pros || !reviewForm.cons) {
            toast.error("Fill all required fields");
            return;
        }
        try {
            await axios.post(`${API_URL}/api/v1/reviews`, { companyId, ...reviewForm }, { withCredentials: true });
            toast.success("Review submitted for moderation");
            setShowWriteModal(false);
            fetchReviews();
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to submit");
        }
    };

    const markHelpful = async (reviewId) => {
        try {
            await axios.post(`${API_URL}/api/v1/reviews/${reviewId}/helpful`, {}, { withCredentials: true });
            fetchReviews();
        } catch (error) {
            toast.error("Failed to mark helpful");
        }
    };

    const RatingBar = ({ label, value }) => (
        <div className="flex items-center gap-2">
            <span className="text-xs w-28">{label}</span>
            <Progress value={value * 20} className="flex-1 h-2" />
            <span className="text-xs font-medium w-8">{value?.toFixed(1)}</span>
        </div>
    );

    const StarInput = ({ value, onChange, label }) => (
        <div className="space-y-1">
            <Label className="text-xs">{label}</Label>
            <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                    <Star
                        key={i}
                        className={`h-5 w-5 cursor-pointer ${i <= value ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
                        onClick={() => onChange(i)}
                    />
                ))}
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Overall Ratings */}
            {ratings && (
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex flex-col md:flex-row gap-6">
                            <div className="text-center">
                                <div className="text-5xl font-bold text-primary">{ratings.overall?.toFixed(1)}</div>
                                <div className="flex justify-center mt-1">
                                    {[1, 2, 3, 4, 5].map((i) => (
                                        <Star key={i} className={`h-4 w-4 ${i <= Math.round(ratings.overall) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
                                    ))}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">{ratings.count} reviews</p>
                            </div>
                            <div className="flex-1 space-y-2">
                                <RatingBar label="Work-Life Balance" value={ratings.workLifeBalance} />
                                <RatingBar label="Culture" value={ratings.culture} />
                                <RatingBar label="Compensation" value={ratings.compensation} />
                                <RatingBar label="Management" value={ratings.management} />
                                <RatingBar label="Career Growth" value={ratings.careerGrowth} />
                            </div>
                            <div className="text-center">
                                <div className="text-3xl font-bold text-green-600">{Math.round((ratings.recommendPercent || 0) * 100)}%</div>
                                <p className="text-xs text-muted-foreground">Recommend to friend</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Write Review Button */}
            <div className="flex justify-end">
                <Button onClick={() => setShowWriteModal(true)} className="gap-2">
                    <Star className="h-4 w-4" />
                    Write a Review
                </Button>
            </div>

            {/* Reviews List */}
            {loading ? (
                <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
                </div>
            ) : reviews.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <Star className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">No reviews yet. Be the first to share your experience!</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {reviews.map((review) => (
                        <Card key={review._id}>
                            <CardContent className="pt-6">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <h3 className="font-semibold">{review.title}</h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <div className="flex">
                                                {[1, 2, 3, 4, 5].map((i) => (
                                                    <Star key={i} className={`h-3 w-3 ${i <= review.ratings.overall ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
                                                ))}
                                            </div>
                                            {review.jobTitle && <Badge variant="outline" className="text-xs">{review.jobTitle}</Badge>}
                                            <Badge variant={review.employmentStatus === "current" ? "default" : "secondary"} className="text-xs">
                                                {review.employmentStatus === "current" ? "Current Employee" : "Former Employee"}
                                            </Badge>
                                        </div>
                                    </div>
                                    <span className="text-xs text-muted-foreground">{new Date(review.createdAt).toLocaleDateString()}</span>
                                </div>

                                <div className="space-y-3">
                                    <div>
                                        <p className="text-xs font-medium text-green-600 mb-1">Pros</p>
                                        <p className="text-sm">{review.pros}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-red-600 mb-1">Cons</p>
                                        <p className="text-sm">{review.cons}</p>
                                    </div>
                                    {review.advice && expandedId === review._id && (
                                        <div>
                                            <p className="text-xs font-medium text-blue-600 mb-1">Advice to Management</p>
                                            <p className="text-sm">{review.advice}</p>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center justify-between mt-4 pt-3 border-t">
                                    <Button variant="ghost" size="sm" onClick={() => markHelpful(review._id)} className="gap-1">
                                        <ThumbsUp className="h-4 w-4" />
                                        Helpful ({review.helpfulCount || 0})
                                    </Button>
                                    {review.advice && (
                                        <Button variant="ghost" size="sm" onClick={() => setExpandedId(expandedId === review._id ? null : review._id)}>
                                            {expandedId === review._id ? "Show Less" : "Show More"}
                                            {expandedId === review._id ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
                                        </Button>
                                    )}
                                </div>

                                {review.companyResponse && (
                                    <div className="mt-4 p-3 bg-muted rounded-md">
                                        <p className="text-xs font-medium mb-1">Company Response</p>
                                        <p className="text-sm">{review.companyResponse.content}</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Write Review Modal */}
            <Dialog open={showWriteModal} onOpenChange={setShowWriteModal}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Write a Review</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-3 gap-4">
                            <StarInput label="Overall *" value={reviewForm.ratings.overall} onChange={(v) => setReviewForm({ ...reviewForm, ratings: { ...reviewForm.ratings, overall: v } })} />
                            <StarInput label="Work-Life Balance" value={reviewForm.ratings.workLifeBalance} onChange={(v) => setReviewForm({ ...reviewForm, ratings: { ...reviewForm.ratings, workLifeBalance: v } })} />
                            <StarInput label="Culture" value={reviewForm.ratings.culture} onChange={(v) => setReviewForm({ ...reviewForm, ratings: { ...reviewForm.ratings, culture: v } })} />
                            <StarInput label="Compensation" value={reviewForm.ratings.compensation} onChange={(v) => setReviewForm({ ...reviewForm, ratings: { ...reviewForm.ratings, compensation: v } })} />
                            <StarInput label="Management" value={reviewForm.ratings.management} onChange={(v) => setReviewForm({ ...reviewForm, ratings: { ...reviewForm.ratings, management: v } })} />
                            <StarInput label="Career Growth" value={reviewForm.ratings.careerGrowth} onChange={(v) => setReviewForm({ ...reviewForm, ratings: { ...reviewForm.ratings, careerGrowth: v } })} />
                        </div>

                        <div className="space-y-2">
                            <Label>Review Title *</Label>
                            <Input placeholder="Summarize your experience" value={reviewForm.title} onChange={(e) => setReviewForm({ ...reviewForm, title: e.target.value })} />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Your Job Title</Label>
                                <Input placeholder="e.g., Software Engineer" value={reviewForm.jobTitle} onChange={(e) => setReviewForm({ ...reviewForm, jobTitle: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Employment Status</Label>
                                <Select value={reviewForm.employmentStatus} onValueChange={(v) => setReviewForm({ ...reviewForm, employmentStatus: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="current">Current Employee</SelectItem>
                                        <SelectItem value="former">Former Employee</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Pros *</Label>
                            <Textarea placeholder="What do you like about working here?" rows={3} value={reviewForm.pros} onChange={(e) => setReviewForm({ ...reviewForm, pros: e.target.value })} />
                        </div>

                        <div className="space-y-2">
                            <Label>Cons *</Label>
                            <Textarea placeholder="What could be improved?" rows={3} value={reviewForm.cons} onChange={(e) => setReviewForm({ ...reviewForm, cons: e.target.value })} />
                        </div>

                        <div className="space-y-2">
                            <Label>Advice to Management (optional)</Label>
                            <Textarea placeholder="Any suggestions?" rows={2} value={reviewForm.advice} onChange={(e) => setReviewForm({ ...reviewForm, advice: e.target.value })} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowWriteModal(false)}>Cancel</Button>
                        <Button onClick={submitReview}>Submit Review</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default CompanyReviews;
