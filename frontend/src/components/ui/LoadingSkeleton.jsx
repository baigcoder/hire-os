import React from "react";
import { motion } from "framer-motion";

/**
 * LoadingSkeleton - Hitr.io Industrial Theme
 * Shimmer effect loading placeholders with gold accents
 */

const shimmerVariants = {
  initial: { backgroundPosition: "-200% 0" },
  animate: {
    backgroundPosition: "200% 0",
    transition: { repeat: Infinity, duration: 1.5, ease: "linear" },
  },
};

const SkeletonBase = ({ className = "", ...props }) => (
  <motion.div
    variants={shimmerVariants}
    initial="initial"
    animate="animate"
    className={`bg-gradient-to-r from-white/5 via-[#FFD700]/10 to-white/5 bg-[length:200%_100%] rounded-sm ${className}`}
    {...props}
  />
);

// Job Card Skeleton
export const JobCardSkeleton = () => (
  <div className="bg-[#0a0a0a] border border-white/10 rounded-sm p-5 space-y-4">
    <div className="flex items-start gap-4">
      <SkeletonBase className="w-14 h-14 rounded-sm" />
      <div className="flex-1 space-y-2">
        <SkeletonBase className="h-5 w-3/4" />
        <SkeletonBase className="h-4 w-1/2" />
        <div className="flex gap-4 mt-3">
          <SkeletonBase className="h-3 w-20" />
          <SkeletonBase className="h-3 w-24" />
          <SkeletonBase className="h-3 w-16" />
        </div>
      </div>
      <SkeletonBase className="w-16 h-16 rounded-full" />
    </div>
    <div className="flex gap-2">
      <SkeletonBase className="h-6 w-16 rounded-sm" />
      <SkeletonBase className="h-6 w-20 rounded-sm" />
      <SkeletonBase className="h-6 w-14 rounded-sm" />
    </div>
  </div>
);

// Table Row Skeleton
export const TableRowSkeleton = ({ columns = 5 }) => (
  <div className="flex items-center gap-4 p-4 border-b border-white/5">
    {Array(columns)
      .fill(0)
      .map((_, i) => (
        <SkeletonBase key={i} className={`h-4 ${i === 0 ? "w-8" : "flex-1"}`} />
      ))}
  </div>
);

// Stats Card Skeleton
export const StatsCardSkeleton = () => (
  <div className="bg-[#0a0a0a] border border-white/10 rounded-sm p-5">
    <div className="flex items-center justify-between mb-3">
      <SkeletonBase className="w-10 h-10 rounded-sm" />
      <SkeletonBase className="w-12 h-5 rounded-sm" />
    </div>
    <SkeletonBase className="h-8 w-20 mb-2" />
    <SkeletonBase className="h-3 w-28" />
  </div>
);

// Profile Card Skeleton
export const ProfileCardSkeleton = () => (
  <div className="bg-[#0a0a0a] border border-white/10 rounded-sm p-5 space-y-4">
    <div className="flex items-center gap-4">
      <SkeletonBase className="w-16 h-16 rounded-sm" />
      <div className="space-y-2">
        <SkeletonBase className="h-5 w-32" />
        <SkeletonBase className="h-4 w-48" />
      </div>
    </div>
    <SkeletonBase className="h-2 w-full" />
    <SkeletonBase className="h-3 w-full" />
    <SkeletonBase className="h-3 w-4/5" />
  </div>
);

// Dashboard Skeleton
export const DashboardSkeleton = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-4 gap-4">
      {Array(4)
        .fill(0)
        .map((_, i) => (
          <StatsCardSkeleton key={i} />
        ))}
    </div>
    <div className="grid grid-cols-3 gap-6">
      <div className="col-span-2 space-y-4">
        {Array(3)
          .fill(0)
          .map((_, i) => (
            <JobCardSkeleton key={i} />
          ))}
      </div>
      <div className="space-y-4">
        <ProfileCardSkeleton />
        <SkeletonBase className="h-40 w-full rounded-sm" />
      </div>
    </div>
  </div>
);

// Applicant Row Skeleton
export const ApplicantRowSkeleton = () => (
  <div className="bg-[#0a0a0a] border border-white/10 rounded-sm p-4">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <SkeletonBase className="w-10 h-10 rounded-sm" />
        <SkeletonBase className="w-12 h-12 rounded-sm" />
        <div className="space-y-2">
          <SkeletonBase className="h-4 w-32" />
          <SkeletonBase className="h-3 w-48" />
        </div>
      </div>
      <div className="flex items-center gap-6">
        <SkeletonBase className="w-16 h-8" />
        <SkeletonBase className="w-24 h-6 rounded-sm" />
        <SkeletonBase className="w-5 h-5" />
      </div>
    </div>
  </div>
);

// Analytics Chart Skeleton
export const ChartSkeleton = ({ height = 200 }) => (
  <div className="bg-[#0a0a0a] border border-white/10 rounded-sm p-5">
    <div className="flex items-center gap-2 mb-4">
      <SkeletonBase className="w-4 h-4" />
      <SkeletonBase className="h-4 w-32" />
    </div>
    <SkeletonBase className={`w-full rounded-sm`} style={{ height }} />
  </div>
);

// Kanban Column Skeleton
export const KanbanColumnSkeleton = () => (
  <div className="flex-shrink-0 w-64">
    <SkeletonBase className="h-12 w-full rounded-t-sm mb-0" />
    <div className="min-h-[300px] p-2 space-y-2 bg-[#0a0a0a] border border-t-0 border-white/10 rounded-b-sm">
      {Array(3)
        .fill(0)
        .map((_, i) => (
          <div key={i} className="p-3 bg-white/5 rounded-sm space-y-2">
            <div className="flex items-center gap-3">
              <SkeletonBase className="w-9 h-9 rounded-sm" />
              <div className="flex-1 space-y-1">
                <SkeletonBase className="h-4 w-24" />
                <SkeletonBase className="h-3 w-32" />
              </div>
            </div>
          </div>
        ))}
    </div>
  </div>
);

// Text Line Skeleton
export const TextSkeleton = ({ width = "full", className = "" }) => (
  <SkeletonBase className={`h-4 w-${width} ${className}`} />
);

// Button Skeleton
export const ButtonSkeleton = ({ width = "24" }) => (
  <SkeletonBase className={`h-10 w-${width} rounded-sm`} />
);

// Generic loading container
export const LoadingContainer = ({ children, loading, skeleton }) => {
  if (loading) return skeleton;
  return children;
};

export default {
  JobCardSkeleton,
  TableRowSkeleton,
  StatsCardSkeleton,
  ProfileCardSkeleton,
  DashboardSkeleton,
  ApplicantRowSkeleton,
  ChartSkeleton,
  KanbanColumnSkeleton,
  TextSkeleton,
  ButtonSkeleton,
  LoadingContainer,
};
