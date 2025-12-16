import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    Search, Command, Home, Briefcase, Users, Settings, User,
    FileText, BarChart3, PlusCircle, HelpCircle,
    ChevronRight, Keyboard, Bell, Sparkles
} from 'lucide-react';

/**
 * CommandPalette - Ctrl+K quick navigation (Hitr.io Industrial Theme)
 */

const CommandPalette = ({ isOpen, onClose, onShowShortcuts }) => {
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef(null);
    const navigate = useNavigate();

    const commands = [
        // Navigation
        { id: 'home', category: 'NAVIGATION', icon: Home, label: 'Go to Home', shortcut: '⌘H', action: () => navigate('/') },
        { id: 'dashboard', category: 'NAVIGATION', icon: BarChart3, label: 'Dashboard', shortcut: '⌘D', action: () => navigate('/student/dashboard') },
        { id: 'jobs', category: 'NAVIGATION', icon: Briefcase, label: 'Browse Jobs', action: () => navigate('/jobs') },
        { id: 'applications', category: 'NAVIGATION', icon: FileText, label: 'My Applications', action: () => navigate('/applications') },
        { id: 'profile', category: 'NAVIGATION', icon: User, label: 'Profile', action: () => navigate('/profile') },
        { id: 'settings', category: 'NAVIGATION', icon: Settings, label: 'Settings', action: () => navigate('/settings') },

        // Actions
        { id: 'new-job', category: 'ACTIONS', icon: PlusCircle, label: 'Post New Job', shortcut: '⌘N', action: () => navigate('/admin/jobs/create') },
        { id: 'notifications', category: 'ACTIONS', icon: Bell, label: 'View Notifications', action: () => navigate('/notifications') },

        // Tools
        { id: 'skill-gap', category: 'TOOLS', icon: BarChart3, label: 'Skill Gap Analysis', action: () => navigate('/student/dashboard?tab=skill-gap') },
        { id: 'mock-test', category: 'TOOLS', icon: Briefcase, label: 'Practice MCQ Tests', action: () => navigate('/student/dashboard?tab=tests') },
        { id: 'interview', category: 'TOOLS', icon: Users, label: 'Mock Interview', action: () => navigate('/student/dashboard?tab=interview') },

        // Help
        { id: 'shortcuts', category: 'HELP', icon: Keyboard, label: 'Keyboard Shortcuts', shortcut: '?', action: () => { onClose(); onShowShortcuts?.(); } },
        { id: 'help', category: 'HELP', icon: HelpCircle, label: 'Help & Support', action: () => navigate('/help') },
    ];

    const filteredCommands = commands.filter(cmd =>
        cmd.label.toLowerCase().includes(query.toLowerCase()) ||
        cmd.category.toLowerCase().includes(query.toLowerCase())
    );

    const groupedCommands = filteredCommands.reduce((acc, cmd) => {
        if (!acc[cmd.category]) acc[cmd.category] = [];
        acc[cmd.category].push(cmd);
        return acc;
    }, {});

    const flatCommands = Object.values(groupedCommands).flat();

    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setSelectedIndex(0);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    useEffect(() => {
        setSelectedIndex(0);
    }, [query]);

    const handleKeyDown = useCallback((e) => {
        if (!isOpen) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex(prev => (prev + 1) % flatCommands.length);
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex(prev => (prev - 1 + flatCommands.length) % flatCommands.length);
                break;
            case 'Enter':
                e.preventDefault();
                if (flatCommands[selectedIndex]) {
                    flatCommands[selectedIndex].action();
                    onClose();
                }
                break;
            case 'Escape':
                e.preventDefault();
                onClose();
                break;
        }
    }, [isOpen, flatCommands, selectedIndex, onClose]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/90 backdrop-blur-sm"
                onClick={onClose}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -20 }}
                    transition={{ duration: 0.15 }}
                    className="w-full max-w-xl bg-[#0a0a0a] border border-[#FFD700]/20 rounded-sm shadow-2xl shadow-[#FFD700]/10 overflow-hidden"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Search Input */}
                    <div className="flex items-center gap-3 p-4 border-b border-white/10">
                        <Search className="w-5 h-5 text-[#FFD700]" />
                        <input
                            ref={inputRef}
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Type a command or search..."
                            className="flex-1 bg-transparent text-white text-lg font-mono focus:outline-none placeholder-gray-500"
                        />
                        <kbd className="px-2 py-1 text-[10px] font-mono bg-white/5 border border-white/10 rounded-sm text-gray-500">
                            ESC
                        </kbd>
                    </div>

                    {/* Commands List */}
                    <div className="max-h-80 overflow-y-auto p-2">
                        {Object.entries(groupedCommands).length === 0 ? (
                            <div className="py-8 text-center text-gray-500">
                                <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                <p className="font-mono text-xs">NO COMMANDS FOUND</p>
                            </div>
                        ) : (
                            Object.entries(groupedCommands).map(([category, cmds]) => (
                                <div key={category} className="mb-2">
                                    <div className="px-3 py-1.5 text-[10px] text-[#FFD700] font-mono tracking-widest">
                                        {category}
                                    </div>
                                    {cmds.map((cmd) => {
                                        const globalIndex = flatCommands.findIndex(c => c.id === cmd.id);
                                        const isSelected = globalIndex === selectedIndex;
                                        const Icon = cmd.icon;

                                        return (
                                            <button
                                                key={cmd.id}
                                                onClick={() => {
                                                    cmd.action();
                                                    onClose();
                                                }}
                                                onMouseEnter={() => setSelectedIndex(globalIndex)}
                                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-sm transition-all ${isSelected
                                                    ? 'bg-[#FFD700]/10 text-white border border-[#FFD700]/30'
                                                    : 'text-gray-400 hover:bg-white/5 border border-transparent'
                                                    }`}
                                            >
                                                <Icon className={`w-4 h-4 ${isSelected ? 'text-[#FFD700]' : ''}`} />
                                                <span className="flex-1 text-left font-mono text-sm">{cmd.label}</span>
                                                {cmd.shortcut && (
                                                    <kbd className="px-1.5 py-0.5 text-[9px] font-mono bg-white/5 border border-white/10 rounded-sm text-gray-500">
                                                        {cmd.shortcut}
                                                    </kbd>
                                                )}
                                                <ChevronRight className={`w-4 h-4 transition-opacity ${isSelected ? 'opacity-100 text-[#FFD700]' : 'opacity-0'}`} />
                                            </button>
                                        );
                                    })}
                                </div>
                            ))
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between px-4 py-2.5 border-t border-white/10 bg-white/5">
                        <div className="flex items-center gap-4 text-[10px] font-mono text-gray-500">
                            <span className="flex items-center gap-1">
                                <kbd className="px-1 bg-white/10 rounded-sm">↑</kbd>
                                <kbd className="px-1 bg-white/10 rounded-sm">↓</kbd>
                                NAVIGATE
                            </span>
                            <span className="flex items-center gap-1">
                                <kbd className="px-1 bg-white/10 rounded-sm">↵</kbd>
                                SELECT
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#FFD700]">
                            <Sparkles className="w-3 h-3" />
                            <span>HITR.IO</span>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default CommandPalette;
