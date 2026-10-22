import { CheckCircle2, CircleDashed, XCircle } from "lucide-react";

/** Constants and helpers shared by the report and screening views. */

export const BAND_STYLES = {
  Excellent: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
  Good: "text-[#FFD700] border-[#FFD700]/30 bg-[#FFD700]/10",
  Fair: "text-orange-400 border-orange-500/30 bg-orange-500/10",
  Poor: "text-red-400 border-red-500/30 bg-red-500/10",
};

export const STATUS = {
  met: { icon: CheckCircle2, label: "Met", className: "text-emerald-400" },
  partial: {
    icon: CircleDashed,
    label: "Partial",
    className: "text-[#FFD700]",
  },
  missing: { icon: XCircle, label: "Missing", className: "text-red-400" },
};

/** id -> short label for every citable item in the profile */
export const buildItemLabels = (profile) => {
  const labels = new Map();
  if (!profile) return labels;
  labels.set("summary", "Summary");
  labels.set("skills", "Skills");
  for (const role of profile.experience || []) {
    const name = [role.title, role.company].filter(Boolean).join(" @ ");
    labels.set(role.id, name);
    role.bullets.forEach((b) => labels.set(b.id, name));
  }
  for (const project of profile.projects || []) {
    labels.set(project.id, project.name);
    project.bullets.forEach((b) => labels.set(b.id, project.name));
  }
  for (const edu of profile.education || []) {
    labels.set(edu.id, edu.institution || edu.degree || "Education");
  }
  for (const cert of profile.certifications || []) {
    labels.set(cert.id, cert.name);
  }
  return labels;
};
