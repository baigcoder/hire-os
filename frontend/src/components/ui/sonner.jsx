import { Toaster as Sonner } from "sonner"

/**
 * Industrial-themed Toaster component for HIRE.OS
 * Styled to match the industrial HUD aesthetic
 */
const Toaster = ({ ...props }) => {
  return (
    <Sonner
      theme="dark"
      position="top-right"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: "group toast bg-[#111111] text-white border border-white/10 shadow-[0_0_20px_rgba(0,0,0,0.5)] rounded-sm font-['Space_Grotesk',sans-serif]",
          title: "text-white font-bold text-sm",
          description: "text-gray-400 text-xs font-mono",
          actionButton: "bg-[#FFD700] text-black font-bold text-xs uppercase tracking-wider rounded-sm hover:bg-[#FFE44D]",
          cancelButton: "bg-white/10 text-gray-400 font-medium text-xs uppercase tracking-wider rounded-sm hover:bg-white/20",
          success: "border-[#00FF94]/30 bg-[#00FF94]/5",
          error: "border-red-500/30 bg-red-500/5",
          warning: "border-[#FFD700]/30 bg-[#FFD700]/5",
          info: "border-blue-500/30 bg-blue-500/5",
          closeButton: "bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10",
        },
        style: {
          '--toast-icon-color': '#FFD700',
        },
      }}
      {...props}
    />
  );
}

export { Toaster }
