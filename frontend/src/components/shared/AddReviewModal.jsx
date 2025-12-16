import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { toast } from 'sonner';
import { STATS_API_END_POINT } from '@/utils/constant';
import {
    Star, MessageSquare, Send, X, Loader2, CheckCircle2,
    PenLine, Quote
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

const AddReviewModal = ({ isOpen, onClose, onSuccess }) => {
    const [rating, setRating] = useState(5);
    const [hoverRating, setHoverRating] = useState(0);
    const [title, setTitle] = useState('');
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [existingReview, setExistingReview] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen) {
            checkExistingReview();
        }
    }, [isOpen]);

    const checkExistingReview = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await axios.get(`${STATS_API_END_POINT}/my-review`, {
                headers: { Authorization: `Bearer ${token}` },
                withCredentials: true
            });
            if (response.data.success && response.data.review) {
                setExistingReview(response.data.review);
                setRating(response.data.review.rating);
                setTitle(response.data.review.title || '');
                setComment(response.data.review.comment || '');
            }
        } catch (error) {
            // No existing review, that's fine
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!comment.trim()) {
            toast.error('Please write a comment');
            return;
        }

        setSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.post(
                `${STATS_API_END_POINT}/reviews`,
                { rating, title, comment: comment.trim() },
                {
                    headers: { Authorization: `Bearer ${token}` },
                    withCredentials: true
                }
            );

            if (response.data.success) {
                toast.success(response.data.message);
                onSuccess?.();
                onClose();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to submit review');
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 flex items-center justify-center p-4 overflow-hidden"
                style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.92)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    zIndex: 99999,
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    width: '100vw',
                    height: '100vh'
                }}
                onClick={(e) => e.target === e.currentTarget && onClose()}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="w-full max-w-lg bg-[#111111] border border-white/10 rounded-lg overflow-hidden max-h-[calc(100vh-2rem)] flex flex-col"
                >
                    {/* Header */}
                    <div className="p-4 border-b border-white/10 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Quote className="w-5 h-5 text-[#FFD700]" />
                            <h3 className="text-lg font-bold text-white">
                                {existingReview ? 'Update Your Review' : 'Share Your Experience'}
                            </h3>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1 hover:bg-white/10 rounded-sm transition-colors"
                        >
                            <X className="w-5 h-5 text-gray-400" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 overflow-y-auto">
                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="w-8 h-8 text-[#FFD700] animate-spin" />
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* Rating */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-3">
                                        Rating
                                    </label>
                                    <div className="flex items-center gap-2">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <button
                                                key={star}
                                                type="button"
                                                onClick={() => setRating(star)}
                                                onMouseEnter={() => setHoverRating(star)}
                                                onMouseLeave={() => setHoverRating(0)}
                                                className="transition-transform hover:scale-110"
                                            >
                                                <Star
                                                    className={`w-8 h-8 ${(hoverRating || rating) >= star
                                                        ? 'text-[#FFD700] fill-[#FFD700]'
                                                        : 'text-gray-600'
                                                        }`}
                                                />
                                            </button>
                                        ))}
                                        <span className="ml-3 text-sm text-gray-400">
                                            {rating}/5
                                        </span>
                                    </div>
                                </div>

                                {/* Title */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">
                                        Title (optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="Sum up your experience..."
                                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-sm text-white placeholder:text-gray-600 focus:border-[#FFD700]/50 focus:outline-none"
                                        maxLength={100}
                                    />
                                </div>

                                {/* Comment */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">
                                        Your Review
                                    </label>
                                    <textarea
                                        value={comment}
                                        onChange={(e) => setComment(e.target.value)}
                                        placeholder="Share your experience with HIRE.OS..."
                                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-sm text-white placeholder:text-gray-600 focus:border-[#FFD700]/50 focus:outline-none resize-none"
                                        rows={4}
                                        maxLength={500}
                                    />
                                    <p className="text-xs text-gray-600 mt-1">
                                        {comment.length}/500 characters
                                    </p>
                                </div>

                                {/* Info badge */}
                                <div className="flex items-center gap-2 p-3 bg-[#00FF94]/5 border border-[#00FF94]/20 rounded-sm">
                                    <CheckCircle2 className="w-4 h-4 text-[#00FF94] flex-shrink-0" />
                                    <p className="text-xs text-gray-400">
                                        Your review will be displayed on our landing page with your name
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-white/10 flex items-center justify-end gap-3">
                        <Button
                            variant="outline"
                            onClick={onClose}
                            className="px-4 py-2 text-sm border-white/10 text-gray-400 hover:bg-white/5"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={submitting || loading}
                            className="px-6 py-2 text-sm bg-[#FFD700] text-black hover:bg-[#FFE44D] font-bold"
                        >
                            {submitting ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</>
                            ) : (
                                <><Send className="w-4 h-4 mr-2" /> {existingReview ? 'Update Review' : 'Submit Review'}</>
                            )}
                        </Button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

// Review button component for dashboards
export const WriteReviewButton = ({ variant = 'default', className = '' }) => {
    const [showModal, setShowModal] = useState(false);

    if (variant === 'card') {
        return (
            <>
                <motion.div
                    whileHover={{ scale: 1.02 }}
                    onClick={() => setShowModal(true)}
                    className={`p-4 bg-gradient-to-br from-[#FFD700]/10 to-transparent border border-[#FFD700]/20 rounded-lg cursor-pointer hover:border-[#FFD700]/40 transition-all ${className}`}
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-[#FFD700]/10 rounded-sm">
                            <MessageSquare className="w-5 h-5 text-[#FFD700]" />
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-white">Share Your Experience</h4>
                            <p className="text-xs text-gray-500">Help others by writing a review</p>
                        </div>
                    </div>
                </motion.div>
                <AddReviewModal isOpen={showModal} onClose={() => setShowModal(false)} />
            </>
        );
    }

    return (
        <>
            <Button
                onClick={() => setShowModal(true)}
                className={`bg-[#FFD700]/10 border border-[#FFD700]/20 text-[#FFD700] hover:bg-[#FFD700]/20 ${className}`}
            >
                <PenLine className="w-4 h-4 mr-2" />
                Write a Review
            </Button>
            <AddReviewModal isOpen={showModal} onClose={() => setShowModal(false)} />
        </>
    );
};

export default AddReviewModal;
