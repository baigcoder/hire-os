import { useEffect, useCallback } from "react";

/**
 * useKeyboardShortcuts - Global keyboard shortcuts for power users
 *
 * Usage:
 * const shortcuts = useKeyboardShortcuts({
 *   'ctrl+k': () => openSearchModal(),
 *   'ctrl+n': () => createNewJob(),
 *   'escape': () => closeModal(),
 * });
 */

const useKeyboardShortcuts = (shortcuts, options = {}) => {
  const {
    enabled = true,
    preventDefault = true,
    stopPropagation = false,
  } = options;

  const handleKeyDown = useCallback(
    (event) => {
      if (!enabled) return;

      // Don't trigger shortcuts when typing in inputs
      const tagName = event.target.tagName.toLowerCase();
      const isEditable = event.target.isContentEditable;
      if (["input", "textarea", "select"].includes(tagName) || isEditable) {
        // Only allow Escape in inputs
        if (event.key !== "Escape") return;
      }

      // Build the key combination string
      const keys = [];
      if (event.ctrlKey || event.metaKey) keys.push("ctrl");
      if (event.altKey) keys.push("alt");
      if (event.shiftKey) keys.push("shift");

      // Normalize key name
      let key = event.key.toLowerCase();
      if (key === " ") key = "space";
      if (key === "arrowup") key = "up";
      if (key === "arrowdown") key = "down";
      if (key === "arrowleft") key = "left";
      if (key === "arrowright") key = "right";

      // Don't add modifier keys as the main key
      if (!["control", "alt", "shift", "meta"].includes(key)) {
        keys.push(key);
      }

      const combination = keys.join("+");

      // Check if this combination has a handler
      const handler = shortcuts[combination];
      if (handler) {
        if (preventDefault) event.preventDefault();
        if (stopPropagation) event.stopPropagation();
        handler(event);
      }
    },
    [shortcuts, enabled, preventDefault, stopPropagation],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return {
    // Utility to format shortcut for display
    formatShortcut: (combo) => {
      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      return combo
        .split("+")
        .map((key) => {
          if (key === "ctrl") return isMac ? "⌘" : "Ctrl";
          if (key === "alt") return isMac ? "⌥" : "Alt";
          if (key === "shift") return "⇧";
          return key.charAt(0).toUpperCase() + key.slice(1);
        })
        .join(isMac ? "" : "+");
    },
  };
};

/**
 * Common keyboard shortcuts configuration
 */
export const COMMON_SHORTCUTS = {
  // Navigation
  SEARCH: "ctrl+k",
  HOME: "ctrl+h",
  DASHBOARD: "ctrl+d",

  // Actions
  NEW_JOB: "ctrl+n",
  SAVE: "ctrl+s",
  REFRESH: "ctrl+r",

  // UI
  TOGGLE_SIDEBAR: "ctrl+b",
  ESCAPE: "escape",
  HELP: "ctrl+/",

  // Navigation within lists
  NEXT: "j",
  PREVIOUS: "k",
  SELECT: "enter",

  // Quick filters
  FILTER_ALL: "1",
  FILTER_PENDING: "2",
  FILTER_INTERVIEW: "3",
  FILTER_HIRED: "4",
};

/**
 * ShortcutHint component - displays keyboard shortcut in UI
 */
export const ShortcutHint = ({ combo, className = "" }) => {
  const isMac =
    typeof navigator !== "undefined" &&
    navigator.platform.toUpperCase().indexOf("MAC") >= 0;

  const formatKey = (key) => {
    const keyMap = {
      ctrl: isMac ? "⌘" : "Ctrl",
      alt: isMac ? "⌥" : "Alt",
      shift: "⇧",
      enter: "↵",
      escape: "Esc",
      space: "␣",
      up: "↑",
      down: "↓",
      left: "←",
      right: "→",
    };
    return keyMap[key.toLowerCase()] || key.toUpperCase();
  };

  const keys = combo.split("+").map(formatKey);

  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`}>
      {keys.map((key, i) => (
        <kbd
          key={i}
          className="px-1.5 py-0.5 text-[10px] font-mono bg-white/10 border border-white/20 rounded text-gray-400"
        >
          {key}
        </kbd>
      ))}
    </span>
  );
};

/**
 * ShortcutsModal - displays all available shortcuts
 */
export const ShortcutsModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcutGroups = [
    {
      title: "Navigation",
      items: [
        { combo: "ctrl+k", description: "Open search" },
        { combo: "ctrl+h", description: "Go to home" },
        { combo: "ctrl+d", description: "Go to dashboard" },
      ],
    },
    {
      title: "Actions",
      items: [
        { combo: "ctrl+n", description: "Create new job" },
        { combo: "ctrl+s", description: "Save changes" },
        { combo: "ctrl+r", description: "Refresh data" },
      ],
    },
    {
      title: "Quick Filters",
      items: [
        { combo: "1", description: "Show all" },
        { combo: "2", description: "Show pending" },
        { combo: "3", description: "Show interviews" },
        { combo: "4", description: "Show hired" },
      ],
    },
    {
      title: "List Navigation",
      items: [
        { combo: "j", description: "Next item" },
        { combo: "k", description: "Previous item" },
        { combo: "enter", description: "Select item" },
        { combo: "escape", description: "Close/Cancel" },
      ],
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      onClick={onClose}
    >
      <div
        className="bg-[#111111] border border-white/10 rounded-lg max-w-2xl w-full mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Keyboard Shortcuts</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white">
            <ShortcutHint combo="escape" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {shortcutGroups.map((group, i) => (
            <div key={i}>
              <h3 className="text-sm text-gray-500 uppercase tracking-wider mb-3">
                {group.title}
              </h3>
              <div className="space-y-2">
                {group.items.map((item, j) => (
                  <div
                    key={j}
                    className="flex items-center justify-between py-1"
                  >
                    <span className="text-gray-300 text-sm">
                      {item.description}
                    </span>
                    <ShortcutHint combo={item.combo} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-white/10 text-center text-xs text-gray-500">
          Press <ShortcutHint combo="ctrl+/" className="mx-1" /> to toggle this
          modal
        </div>
      </div>
    </div>
  );
};

export default useKeyboardShortcuts;
