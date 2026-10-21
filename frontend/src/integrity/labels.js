/** Display labels; mirrors backend modules/integrity/signals.js. */
export const SIGNAL_LABELS = {
  face_missing: "Face not visible",
  multiple_faces: "More than one face",
  gaze_away: "Looking away",
  head_turned: "Head turned away",
  phone_detected: "Phone in view",
  book_detected: "Book or paper in view",
  extra_device: "Another screen in view",
  extra_person: "Another person in view",
  speech_lips_closed: "Speech, lips still",
  second_voice: "A second voice",
  tab_hidden: "Tab hidden",
  window_blur: "Window lost focus",
  fullscreen_exit: "Left fullscreen",
  copy_paste: "Copy or paste",
  devtools: "Developer tools",
  multiple_displays: "Multiple displays",
  screen_share_not_monitor: "Shared a window, not the screen",
};

export const TAMPER_LABELS = {
  virtual_camera: "Virtual camera software",
  frozen_video: "Video frozen",
  model_not_loaded: "Detector failed to load",
  heartbeat_gap: "Candidate monitoring went silent",
  sequence_gap: "Monitoring data went missing",
  detector_mismatch: "Your detector saw what theirs didn't",
};

export const BAND_STYLES = {
  low: { text: "text-[#00FF94]", bar: "bg-[#00FF94]", label: "Low" },
  elevated: { text: "text-[#FFD700]", bar: "bg-[#FFD700]", label: "Elevated" },
  high: { text: "text-orange-400", bar: "bg-orange-400", label: "High" },
  critical: { text: "text-red-400", bar: "bg-red-500", label: "Critical" },
};

export const PRIORITY_STYLES = {
  routine: { label: "Routine", className: "bg-[#00FF94]/10 text-[#00FF94] border-[#00FF94]/30" },
  review: { label: "Worth a review", className: "bg-[#FFD700]/10 text-[#FFD700] border-[#FFD700]/30" },
  priority_review: { label: "Priority review", className: "bg-red-500/10 text-red-400 border-red-500/30" },
};

export const signalLabel = (type) => SIGNAL_LABELS[type] || TAMPER_LABELS[type] || type.replace(/_/g, " ");
