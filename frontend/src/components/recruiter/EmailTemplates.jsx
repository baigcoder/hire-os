/**
 * EmailTemplates.jsx
 * Email template management for recruiters
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { toast } from 'sonner';
import {
    Mail, Plus, Edit2, Trash2, Copy, Send, Eye,
    FileText, X, Save, RefreshCw, Search, ChevronDown
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../ui/select';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '../ui/dialog';
import { EMAIL_TEMPLATES_API_END_POINT } from '@/utils/constant';

// Template type colors
const TYPE_COLORS = {
    rejection: { bg: 'bg-red-500/10', text: 'text-red-400', label: 'Rejection' },
    interview_invite: { bg: 'bg-blue-500/10', text: 'text-blue-400', label: 'Interview Invite' },
    offer: { bg: 'bg-[#00FF94]/10', text: 'text-[#00FF94]', label: 'Offer' },
    follow_up: { bg: 'bg-purple-500/10', text: 'text-purple-400', label: 'Follow Up' },
    custom: { bg: 'bg-[#FFD700]/10', text: 'text-[#FFD700]', label: 'Custom' },
    onboarding: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', label: 'Onboarding' }
};

// Template Card Component
const TemplateCard = ({ template, onEdit, onDelete, onPreview, onDuplicate }) => {
    const typeStyle = TYPE_COLORS[template.type] || TYPE_COLORS.custom;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative p-5 bg-[#111111] border border-white/10 rounded-sm group hover:border-[#FFD700]/30 transition-all"
        >
            <div className="absolute top-0 right-0 w-6 h-6 border-t border-r border-white/10 group-hover:border-[#FFD700]/30 transition-colors" />

            {/* Header */}
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-semibold text-white">{template.name}</h3>
                        {template.isDefault && (
                            <Badge className="text-[10px] bg-white/10 text-gray-400">Default</Badge>
                        )}
                    </div>
                    <Badge className={`text-[10px] ${typeStyle.bg} ${typeStyle.text}`}>
                        {typeStyle.label}
                    </Badge>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onPreview(template)}>
                        <Eye className="w-3.5 h-3.5 text-gray-400" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDuplicate(template)}>
                        <Copy className="w-3.5 h-3.5 text-gray-400" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(template)}>
                        <Edit2 className="w-3.5 h-3.5 text-[#FFD700]" />
                    </Button>
                    {!template.isDefault && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDelete(template)}>
                            <Trash2 className="w-3.5 h-3.5 text-red-400" />
                        </Button>
                    )}
                </div>
            </div>

            {/* Subject Preview */}
            <p className="text-xs text-gray-400 mb-2 truncate">
                <span className="text-gray-600">Subject:</span> {template.subject}
            </p>

            {/* Body Preview */}
            <p className="text-xs text-gray-500 line-clamp-2">
                {template.body.replace(/{{.*?}}/g, '[...]').substring(0, 100)}...
            </p>

            {/* Variables */}
            {template.variables?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                    {template.variables.slice(0, 3).map((variable, idx) => (
                        <code key={idx} className="text-[10px] bg-[#FFD700]/10 text-[#FFD700] px-1.5 py-0.5 rounded">
                            {`{{${variable}}}`}
                        </code>
                    ))}
                    {template.variables.length > 3 && (
                        <span className="text-[10px] text-gray-600">+{template.variables.length - 3} more</span>
                    )}
                </div>
            )}

            {/* Usage Stats */}
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5">
                <span className="text-[10px] text-gray-600 font-mono">
                    Used {template.usageCount || 0} times
                </span>
                {template.lastUsedAt && (
                    <span className="text-[10px] text-gray-600 font-mono">
                        Last used: {new Date(template.lastUsedAt).toLocaleDateString()}
                    </span>
                )}
            </div>
        </motion.div>
    );
};

// Template Editor Modal
const TemplateEditor = ({ isOpen, template, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        name: '',
        subject: '',
        body: '',
        type: 'custom'
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (template) {
            setFormData({
                name: template.name || '',
                subject: template.subject || '',
                body: template.body || '',
                type: template.type || 'custom'
            });
        } else {
            setFormData({ name: '', subject: '', body: '', type: 'custom' });
        }
    }, [template, isOpen]);

    const handleSave = async () => {
        if (!formData.name || !formData.subject || !formData.body) {
            toast.error('Please fill in all required fields');
            return;
        }

        try {
            setSaving(true);
            const url = template?._id
                ? `${EMAIL_TEMPLATES_API_END_POINT}/${template._id}`
                : EMAIL_TEMPLATES_API_END_POINT;

            const method = template?._id ? 'put' : 'post';

            const response = await axios[method](url, formData, { withCredentials: true });

            if (response.data.success) {
                toast.success(template?._id ? 'Template updated' : 'Template created');
                onSave(response.data.template);
                onClose();
            }
        } catch (error) {
            console.error('Save error:', error);
            toast.error('Failed to save template');
        } finally {
            setSaving(false);
        }
    };

    const insertVariable = (variable) => {
        setFormData(prev => ({
            ...prev,
            body: prev.body + `{{${variable}}}`
        }));
    };

    const commonVariables = ['candidateName', 'jobTitle', 'companyName', 'recruiterName', 'interviewDate', 'interviewTime'];

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl bg-[#111111] border-white/10 text-white">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Mail className="w-5 h-5 text-[#FFD700]" />
                        {template?._id ? 'Edit Template' : 'Create New Template'}
                    </DialogTitle>
                    <DialogDescription className="text-gray-500">
                        Use variables like {'{{candidateName}}'} to personalize emails
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label className="text-gray-400">Template Name *</Label>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="e.g., Interview Confirmation"
                                className="bg-[#0A0A0A] border-white/10 text-white mt-1.5"
                            />
                        </div>
                        <div>
                            <Label className="text-gray-400">Type</Label>
                            <Select
                                value={formData.type}
                                onValueChange={(val) => setFormData(prev => ({ ...prev, type: val }))}
                            >
                                <SelectTrigger className="bg-[#0A0A0A] border-white/10 text-white mt-1.5">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-[#111111] border-white/10">
                                    {Object.entries(TYPE_COLORS).map(([key, value]) => (
                                        <SelectItem key={key} value={key} className="text-gray-300">
                                            {value.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div>
                        <Label className="text-gray-400">Subject Line *</Label>
                        <Input
                            value={formData.subject}
                            onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                            placeholder="e.g., Interview Invitation - {{jobTitle}} at {{companyName}}"
                            className="bg-[#0A0A0A] border-white/10 text-white mt-1.5"
                        />
                    </div>

                    <div>
                        <Label className="text-gray-400">Email Body *</Label>
                        <Textarea
                            value={formData.body}
                            onChange={(e) => setFormData(prev => ({ ...prev, body: e.target.value }))}
                            placeholder="Write your email content here..."
                            className="bg-[#0A0A0A] border-white/10 text-white mt-1.5 min-h-[200px] font-mono text-sm"
                        />
                    </div>

                    {/* Quick Insert Variables */}
                    <div>
                        <Label className="text-gray-400 text-xs">Quick Insert Variables:</Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {commonVariables.map((variable) => (
                                <Button
                                    key={variable}
                                    variant="outline"
                                    size="sm"
                                    onClick={() => insertVariable(variable)}
                                    className="h-7 text-xs bg-[#0A0A0A] border-white/10 text-gray-400 hover:text-[#FFD700] hover:border-[#FFD700]/30"
                                >
                                    {`{{${variable}}}`}
                                </Button>
                            ))}
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} className="border-white/10 text-gray-400">
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-[#FFD700] text-black hover:bg-[#FFE44D]"
                    >
                        {saving ? 'Saving...' : 'Save Template'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

// Preview Modal
const PreviewModal = ({ isOpen, template, onClose }) => {
    const [previewData, setPreviewData] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && template) {
            fetchPreview();
        }
    }, [isOpen, template]);

    const fetchPreview = async () => {
        try {
            setLoading(true);
            const response = await axios.post(
                `${EMAIL_TEMPLATES_API_END_POINT}/${template._id}/preview`,
                {},
                { withCredentials: true }
            );

            if (response.data.success) {
                setPreviewData(response.data.preview);
            }
        } catch (error) {
            console.error('Preview error:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl bg-[#111111] border-white/10 text-white">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Eye className="w-5 h-5 text-[#FFD700]" />
                        Email Preview
                    </DialogTitle>
                </DialogHeader>

                {loading ? (
                    <div className="py-12 text-center">
                        <div className="w-8 h-8 border-2 border-[#FFD700]/30 border-t-[#FFD700] rounded-full animate-spin mx-auto" />
                        <p className="text-gray-500 mt-4">Loading preview...</p>
                    </div>
                ) : previewData ? (
                    <div className="py-4">
                        <div className="p-4 bg-[#0A0A0A] rounded-sm mb-4">
                            <p className="text-xs text-gray-500 mb-1">Subject:</p>
                            <p className="text-white font-medium">{previewData.subject}</p>
                        </div>
                        <div className="p-4 bg-[#0A0A0A] rounded-sm">
                            <p className="text-xs text-gray-500 mb-2">Body:</p>
                            <div className="text-gray-300 whitespace-pre-wrap text-sm leading-relaxed">
                                {previewData.body}
                            </div>
                        </div>
                    </div>
                ) : (
                    <p className="text-center py-8 text-gray-500">Failed to load preview</p>
                )}

                <DialogFooter>
                    <Button onClick={onClose} className="bg-[#FFD700] text-black hover:bg-[#FFE44D]">
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

const EmailTemplates = () => {
    const [loading, setLoading] = useState(true);
    const [templates, setTemplates] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [editorOpen, setEditorOpen] = useState(false);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState(null);

    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        try {
            setLoading(true);
            const response = await axios.get(EMAIL_TEMPLATES_API_END_POINT, { withCredentials: true });

            if (response.data.success) {
                setTemplates(response.data.templates || []);
            }
        } catch (error) {
            console.error('Fetch error:', error);
            toast.error('Failed to load templates');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (template) => {
        setSelectedTemplate(template);
        setEditorOpen(true);
    };

    const handleCreate = () => {
        setSelectedTemplate(null);
        setEditorOpen(true);
    };

    const handleDelete = async (template) => {
        if (!confirm('Are you sure you want to delete this template?')) return;

        try {
            const response = await axios.delete(
                `${EMAIL_TEMPLATES_API_END_POINT}/${template._id}`,
                { withCredentials: true }
            );

            if (response.data.success) {
                setTemplates(prev => prev.filter(t => t._id !== template._id));
                toast.success('Template deleted');
            }
        } catch (error) {
            console.error('Delete error:', error);
            toast.error(error.response?.data?.message || 'Failed to delete');
        }
    };

    const handleDuplicate = (template) => {
        setSelectedTemplate({
            ...template,
            _id: undefined,
            name: `${template.name} (Copy)`,
            isDefault: false
        });
        setEditorOpen(true);
    };

    const handlePreview = (template) => {
        setSelectedTemplate(template);
        setPreviewOpen(true);
    };

    const handleSave = (savedTemplate) => {
        setTemplates(prev => {
            const exists = prev.find(t => t._id === savedTemplate._id);
            if (exists) {
                return prev.map(t => t._id === savedTemplate._id ? savedTemplate : t);
            }
            return [savedTemplate, ...prev];
        });
    };

    const filteredTemplates = templates.filter(t => {
        if (filterType !== 'all' && t.type !== filterType) return false;
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            return t.name.toLowerCase().includes(query) ||
                t.subject.toLowerCase().includes(query);
        }
        return true;
    });

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                        <div className="w-16 h-16 border-2 border-[#FFD700]/30 rounded-sm" />
                        <div className="absolute top-0 left-0 w-16 h-16 border-2 border-transparent border-t-[#FFD700] rounded-sm animate-spin" />
                    </div>
                    <p className="text-[#FFD700]/70 font-mono text-sm uppercase tracking-wider">Loading Templates...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0A0A0A] font-['Space_Grotesk',sans-serif]">
            <div className="fixed inset-0 bg-grid opacity-30 pointer-events-none" />

            <div className="container mx-auto px-4 py-8 relative z-10">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-8 gap-4"
                >
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                            <Mail className="w-7 h-7 text-[#FFD700]" />
                            Email Templates
                        </h1>
                        <p className="text-gray-500 text-sm mt-1">
                            Create and manage email templates for candidate communication
                        </p>
                    </div>

                    <Button
                        onClick={handleCreate}
                        className="bg-[#FFD700] text-black hover:bg-[#FFE44D] rounded-sm font-bold"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Create Template
                    </Button>
                </motion.div>

                {/* Filters */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="flex flex-wrap items-center gap-4 mb-6 p-4 bg-[#111111] border border-white/10 rounded-sm"
                >
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <Input
                            placeholder="Search templates..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 bg-[#0A0A0A] border-white/10 text-white"
                        />
                    </div>

                    <Select value={filterType} onValueChange={setFilterType}>
                        <SelectTrigger className="w-[150px] bg-[#0A0A0A] border-white/10 text-white">
                            <SelectValue placeholder="All Types" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#111111] border-white/10">
                            <SelectItem value="all" className="text-gray-300">All Types</SelectItem>
                            {Object.entries(TYPE_COLORS).map(([key, value]) => (
                                <SelectItem key={key} value={key} className="text-gray-300">
                                    {value.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Button
                        variant="outline"
                        className="border-white/10 text-gray-400"
                        onClick={fetchTemplates}
                    >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Refresh
                    </Button>
                </motion.div>

                {/* Templates Grid */}
                {filteredTemplates.length > 0 ? (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <AnimatePresence>
                            {filteredTemplates.map((template, idx) => (
                                <TemplateCard
                                    key={template._id}
                                    template={template}
                                    onEdit={handleEdit}
                                    onDelete={handleDelete}
                                    onPreview={handlePreview}
                                    onDuplicate={handleDuplicate}
                                />
                            ))}
                        </AnimatePresence>
                    </div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-16"
                    >
                        <Mail className="w-16 h-16 mx-auto mb-4 text-gray-700" />
                        <h3 className="text-xl font-bold text-white mb-2">No Templates Found</h3>
                        <p className="text-gray-500 mb-6">
                            {searchQuery || filterType !== 'all'
                                ? 'Try adjusting your filters'
                                : 'Create your first email template to get started'
                            }
                        </p>
                        <Button
                            onClick={handleCreate}
                            className="bg-[#FFD700] text-black hover:bg-[#FFE44D]"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Create Template
                        </Button>
                    </motion.div>
                )}
            </div>

            {/* Editor Modal */}
            <TemplateEditor
                isOpen={editorOpen}
                template={selectedTemplate}
                onClose={() => setEditorOpen(false)}
                onSave={handleSave}
            />

            {/* Preview Modal */}
            <PreviewModal
                isOpen={previewOpen}
                template={selectedTemplate}
                onClose={() => setPreviewOpen(false)}
            />
        </div>
    );
};

export default EmailTemplates;
