/**
 * KeyboardShortcuts - Global keyboard shortcut handler
 * Provides Ctrl+K for command palette and other shortcuts
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Keyboard, Command, X } from 'lucide-react';

const SHORTCUTS = [
    {
        category: 'Navigation', shortcuts: [
            { keys: ['Ctrl', 'K'], description: 'Open command palette' },
            { keys: ['Ctrl', 'H'], description: 'Go to Home' },
            { keys: ['Ctrl', 'D'], description: 'Go to Dashboard' },
            { keys: ['Ctrl', 'J'], description: 'Browse Jobs' },
            { keys: ['Esc'], description: 'Close modal/palette' }
        ]
    },
    {
        category: 'Actions', shortcuts: [
            { keys: ['Ctrl', 'N'], description: 'New Job Post (Recruiter)' },
            { keys: ['Ctrl', 'S'], description: 'Save changes' },
            { keys: ['Ctrl', 'Enter'], description: 'Submit form' }
        ]
    },
    {
        category: 'Interview', shortcuts: [
            { keys: ['Space'], description: 'Start/Stop recording' },
            { keys: ['N'], description: 'Next question' },
            { keys: ['P'], description: 'Previous question' }
        ]
    }
];

const KeyboardShortcuts = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
                onClick={onClose}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="w-full max-w-lg bg-[#0a0a0a] border border-[#FFD700]/20 rounded-sm shadow-2xl overflow-hidden"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-white/10">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-[#FFD700]/10 rounded-sm border border-[#FFD700]/30">
                                <Keyboard className="w-4 h-4 text-[#FFD700]" />
                            </div>
                            <span className="text-white font-bold font-mono tracking-wider">KEYBOARD SHORTCUTS</span>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-500 hover:text-white hover:bg-white/10 rounded-sm transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Shortcuts List */}
                    <div className="p-4 max-h-[60vh] overflow-y-auto">
                        {SHORTCUTS.map(section => (
                            <div key={section.category} className="mb-6 last:mb-0">
                                <h3 className="text-[10px] text-[#FFD700] font-mono tracking-widest mb-3">
                                    {section.category.toUpperCase()}
                                </h3>
                                <div className="space-y-2">
                                    {section.shortcuts.map((shortcut, idx) => (
                                        <div
                                            key={idx}
                                            className="flex items-center justify-between py-2 px-3 bg-white/5 rounded-sm border border-white/5"
                                        >
                                            <span className="text-gray-400 text-sm font-mono">
                                                {shortcut.description}
                                            </span>
                                            <div className="flex items-center gap-1">
                                                {shortcut.keys.map((key, kidx) => (
                                                    <React.Fragment key={kidx}>
                                                        <kbd className="px-2 py-1 text-[10px] font-mono bg-[#111111] border border-white/20 rounded text-white min-w-[24px] text-center">
                                                            {key}
                                                        </kbd>
                                                        {kidx < shortcut.keys.length - 1 && (
                                                            <span className="text-gray-600 text-[10px]">+</span>
                                                        )}
                                                    </React.Fragment>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between px-4 py-3 border-t border-white/10 bg-white/5">
                        <span className="text-[10px] text-gray-500 font-mono">
                            Press <kbd className="px-1 bg-white/10 rounded">?</kbd> anytime to show
                        </span>
                        <span className="text-[10px] text-[#FFD700] font-mono">HIRE.iOS</span>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

/**
 * useKeyboardShortcuts - Hook for global keyboard shortcuts
 */
export const useKeyboardShortcuts = ({ onCommandPalette, onShortcutsModal, navigate }) => {
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Ignore if typing in input
            if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
            if (e.target.isContentEditable) return;

            // Ctrl+K - Command Palette
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                onCommandPalette?.();
                return;
            }

            // Ctrl+H - Home
            if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
                e.preventDefault();
                navigate?.('/');
                return;
            }

            // Ctrl+D - Dashboard
            if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
                e.preventDefault();
                navigate?.('/student/dashboard');
                return;
            }

            // Ctrl+J - Jobs
            if ((e.ctrlKey || e.metaKey) && e.key === 'j') {
                e.preventDefault();
                navigate?.('/jobs');
                return;
            }

            // ? - Shortcuts modal
            if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                onShortcutsModal?.();
                return;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onCommandPalette, onShortcutsModal, navigate]);
};

export default KeyboardShortcuts;
