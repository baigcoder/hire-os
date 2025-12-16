import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Shield, X, Flag, CheckCircle } from 'lucide-react';
import { Button } from '../ui/button';

/**
 * Industrial-styled Fraud Alert component for live interview
 * Shows to recruiter when AI detects suspicious activity
 */
const FraudAlert = ({ alert, onDismiss, onFlag, onReport }) => {
    if (!alert) return null;

    const severityColors = {
        low: {
            bg: 'bg-yellow-500/10',
            border: 'border-yellow-500/30',
            text: 'text-yellow-400',
            icon: 'text-yellow-500'
        },
        medium: {
            bg: 'bg-orange-500/10',
            border: 'border-orange-500/30',
            text: 'text-orange-400',
            icon: 'text-orange-500'
        },
        high: {
            bg: 'bg-red-500/10',
            border: 'border-red-500/30',
            text: 'text-red-400',
            icon: 'text-red-500'
        }
    };

    const colors = severityColors[alert.severity] || severityColors.medium;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                className={`${colors.bg} ${colors.border} border rounded-sm p-4 relative overflow-hidden`}
            >
                {/* HUD Corner Accents */}
                <div className={`absolute top-0 right-0 w-4 h-4 border-t border-r ${colors.border}`} />
                <div className={`absolute bottom-0 left-0 w-4 h-4 border-b border-l ${colors.border}`} />

                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-sm ${colors.bg} border ${colors.border}`}>
                            <AlertTriangle className={`w-4 h-4 ${colors.icon}`} />
                        </div>
                        <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                                Fraud Alert
                            </h4>
                            <p className="text-[10px] text-gray-500 font-mono uppercase">
                                Severity: {alert.severity}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onDismiss}
                        className="text-gray-500 hover:text-white transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Alert Details */}
                <div className="mb-3">
                    <p className={`text-sm font-medium ${colors.text} mb-2`}>
                        {alert.message}
                    </p>
                    <p className="text-xs text-gray-500 font-mono">
                        {alert.details}
                    </p>
                </div>

                {/* Confidence Score */}
                {alert.confidence && (
                    <div className="mb-4">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] text-gray-500 uppercase tracking-wider font-mono">
                                AI Confidence
                            </span>
                            <span className={`text-[10px] font-bold ${colors.text} font-mono`}>
                                {alert.confidence}%
                            </span>
                        </div>
                        <div className="w-full h-1 bg-white/5 rounded-sm overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${alert.confidence}%` }}
                                transition={{ duration: 0.5 }}
                                className={`h-full ${alert.severity === 'high' ? 'bg-red-500' : alert.severity === 'medium' ? 'bg-orange-500' : 'bg-yellow-500'}`}
                            />
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                    <Button
                        onClick={onDismiss}
                        variant="outline"
                        size="sm"
                        className="flex-1 border-white/10 text-gray-400 hover:bg-white/5 rounded-sm text-xs uppercase tracking-wider"
                    >
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Dismiss
                    </Button>
                    <Button
                        onClick={onFlag}
                        variant="outline"
                        size="sm"
                        className={`flex-1 ${colors.border} ${colors.text} hover:${colors.bg} rounded-sm text-xs uppercase tracking-wider`}
                    >
                        <Flag className="w-3 h-3 mr-1" />
                        Flag
                    </Button>
                    <Button
                        onClick={onReport}
                        size="sm"
                        className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-sm text-xs uppercase tracking-wider"
                    >
                        <Shield className="w-3 h-3 mr-1" />
                        Report
                    </Button>
                </div>

                {/* Timestamp */}
                <div className="mt-3 text-[10px] text-gray-600 font-mono text-right">
                    {new Date(alert.timestamp || Date.now()).toLocaleTimeString()}
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default FraudAlert;
