/**
 * EmailTemplates.jsx
 * Email template management for recruiters
 */

import { useState, useEffect } from "react";
import { Skeleton } from "../app/blocks";
import axios from "axios";
import { toast } from "sonner";
import { Mail, Eye, Search } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "../ui/dialog";
import { EMAIL_TEMPLATES_API_END_POINT } from "@/utils/constant";

// Template type colors
const TYPE_COLORS = {
  rejection: { bg: "bg-white/5", text: "text-gray-300", label: "Rejection" },
  interview_invite: {
    bg: "bg-white/5",
    text: "text-gray-300",
    label: "Interview Invite",
  },
  offer: { bg: "bg-white/5", text: "text-gray-300", label: "Offer" },
  follow_up: {
    bg: "bg-white/5",
    text: "text-gray-300",
    label: "Follow Up",
  },
  custom: { bg: "bg-white/5", text: "text-gray-300", label: "Custom" },
  onboarding: {
    bg: "bg-white/5",
    text: "text-gray-300",
    label: "Onboarding",
  },
};

// Template Card Component
const TemplateEditor = ({ isOpen, template, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: "",
    subject: "",
    body: "",
    type: "custom",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name || "",
        subject: template.subject || "",
        body: template.body || "",
        type: template.type || "custom",
      });
    } else {
      setFormData({ name: "", subject: "", body: "", type: "custom" });
    }
  }, [template, isOpen]);

  const handleSave = async () => {
    if (!formData.name || !formData.subject || !formData.body) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setSaving(true);
      const url = template?._id
        ? `${EMAIL_TEMPLATES_API_END_POINT}/${template._id}`
        : EMAIL_TEMPLATES_API_END_POINT;

      const method = template?._id ? "put" : "post";

      const response = await axios[method](url, formData, {
        withCredentials: true,
      });

      if (response.data.success) {
        toast.success(template?._id ? "Template updated" : "Template created");
        onSave(response.data.template);
        onClose();
      }
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to save template");
    } finally {
      setSaving(false);
    }
  };

  const insertVariable = (variable) => {
    setFormData((prev) => ({
      ...prev,
      body: prev.body + `{{${variable}}}`,
    }));
  };

  const commonVariables = [
    "candidateName",
    "jobTitle",
    "companyName",
    "recruiterName",
    "interviewDate",
    "interviewTime",
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-card border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-[#f2f2f2]" />
            {template?._id ? "Edit Template" : "Create New Template"}
          </DialogTitle>
          <DialogDescription className="text-gray-500">
            Use variables like {"{{candidateName}}"} to personalize emails
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-400">Template Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="e.g., Interview Confirmation"
                className="bg-background border-white/10 text-white mt-1.5"
              />
            </div>
            <div>
              <Label className="text-gray-400">Type</Label>
              <Select
                value={formData.type}
                onValueChange={(val) =>
                  setFormData((prev) => ({ ...prev, type: val }))
                }
              >
                <SelectTrigger className="bg-background border-white/10 text-white mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-white/10">
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
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, subject: e.target.value }))
              }
              placeholder="e.g., Interview Invitation - {{jobTitle}} at {{companyName}}"
              className="bg-background border-white/10 text-white mt-1.5"
            />
          </div>

          <div>
            <Label className="text-gray-400">Email Body *</Label>
            <Textarea
              value={formData.body}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, body: e.target.value }))
              }
              placeholder="Write your email content here..."
              className="bg-background border-white/10 text-white mt-1.5 min-h-[200px] text-sm"
            />
          </div>

          {/* Quick Insert Variables */}
          <div>
            <Label className="text-gray-400 text-xs">
              Quick Insert Variables:
            </Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {commonVariables.map((variable) => (
                <Button
                  key={variable}
                  variant="outline"
                  size="sm"
                  onClick={() => insertVariable(variable)}
                  className="h-7 text-xs bg-background border-white/10 text-gray-400 hover:text-[#f2f2f2] hover:border-[#f2f2f2]/30"
                >
                  {`{{${variable}}}`}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            className="border-white/10 text-gray-400"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#f2f2f2] text-black hover:bg-[#e6e6e6]"
          >
            {saving ? "Saving..." : "Save Template"}
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
        { withCredentials: true },
      );

      if (response.data.success) {
        setPreviewData(response.data.preview);
      }
    } catch (error) {
      console.error("Preview error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-card border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-[#f2f2f2]" />
            Email Preview
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-12 text-center">
            <div className="w-8 h-8 border-2 border-[#f2f2f2]/30 border-t-[#f2f2f2] rounded-full animate-spin mx-auto" />
            <p className="text-gray-500 mt-4">Loading preview...</p>
          </div>
        ) : previewData ? (
          <div className="py-4">
            <div className="p-4 bg-background rounded-sm mb-4">
              <p className="text-xs text-gray-500 mb-1">Subject:</p>
              <p className="text-white font-medium">{previewData.subject}</p>
            </div>
            <div className="p-4 bg-background rounded-sm">
              <p className="text-xs text-gray-500 mb-2">Body:</p>
              <div className="text-gray-300 whitespace-pre-wrap text-sm leading-relaxed">
                {previewData.body}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-center py-8 text-gray-500">
            Failed to load preview
          </p>
        )}

        <DialogFooter>
          <Button
            onClick={onClose}
            className="bg-[#f2f2f2] text-black hover:bg-[#e6e6e6]"
          >
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
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [editorOpen, setEditorOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await axios.get(EMAIL_TEMPLATES_API_END_POINT, {
        withCredentials: true,
      });

      if (response.data.success) {
        setTemplates(response.data.templates || []);
      }
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error("Failed to load templates");
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
    if (!confirm("Are you sure you want to delete this template?")) return;

    try {
      const response = await axios.delete(
        `${EMAIL_TEMPLATES_API_END_POINT}/${template._id}`,
        { withCredentials: true },
      );

      if (response.data.success) {
        setTemplates((prev) => prev.filter((t) => t._id !== template._id));
        toast.success("Template deleted");
      }
    } catch (error) {
      console.error("Delete error:", error);
      toast.error(error.response?.data?.message || "Failed to delete");
    }
  };

  const handleDuplicate = (template) => {
    setSelectedTemplate({
      ...template,
      _id: undefined,
      name: `${template.name} (Copy)`,
      isDefault: false,
    });
    setEditorOpen(true);
  };

  const handlePreview = (template) => {
    setSelectedTemplate(template);
    setPreviewOpen(true);
  };

  const handleSave = (savedTemplate) => {
    setTemplates((prev) => {
      const exists = prev.find((t) => t._id === savedTemplate._id);
      if (exists) {
        return prev.map((t) =>
          t._id === savedTemplate._id ? savedTemplate : t,
        );
      }
      return [savedTemplate, ...prev];
    });
  };

  const filteredTemplates = templates.filter((t) => {
    if (filterType !== "all" && t.type !== filterType) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        t.name.toLowerCase().includes(query) ||
        t.subject.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const open = filteredTemplates.find((t) => t._id === openId) ?? filteredTemplates[0];

  // {{candidateName}} shown as a marked placeholder inside the real text
  const withVars = (text = "") =>
    text.split(/({{.*?}})/g).map((part, k) =>
      /^{{.*}}$/.test(part) ? (
        <span key={k} className="app-chip" style={{ height: 22, padding: "0 6px", margin: "0 1px" }}>
          {part.slice(2, -2)}
        </span>
      ) : (
        part
      ),
    );

  return (
    <>
      <div className="app-title-row">
        <h1 className="app-h1">Email templates</h1>
        <button type="button" className="app-btn app-btn-primary" onClick={handleCreate}>
          New template
        </button>
      </div>

      <div className="app-toolbar">
        <label className="app-search">
          <Search aria-hidden="true" />
          <input placeholder="Search templates" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} aria-label="Search templates" />
        </label>
        <select className="app-select" value={filterType} onChange={(e) => setFilterType(e.target.value)} aria-label="Type">
          <option value="all">All types</option>
          {Object.entries(TYPE_COLORS).map(([key, value]) => (
            <option key={key} value={key}>
              {value.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <Skeleton rows={6} />
      ) : filteredTemplates.length === 0 ? (
        <div className="app-panel" style={{ maxWidth: 560 }}>
          <p className="app-row-title">{searchQuery || filterType !== "all" ? "Nothing matches" : "No templates yet"}</p>
          <p className="app-meta" style={{ margin: "6px 0 16px" }}>
            Write an invitation or an update once, then send it with the candidate&apos;s details filled in.
          </p>
          <button type="button" className="app-btn app-btn-primary" onClick={handleCreate}>
            New template
          </button>
        </div>
      ) : (
        <div className="app-grid">
          <section className="app-panel span-5" aria-label="Templates" style={{ padding: 0 }}>
            <ul className="app-list" role="listbox" aria-label="Templates">
              {filteredTemplates.map((t) => (
                <li key={t._id} role="option" aria-selected={open?._id === t._id}>
                  <button type="button" className={`app-row app-pick ${open?._id === t._id ? "is-picked" : ""}`} onClick={() => setOpenId(t._id)} style={{ padding: "12px 20px" }}>
                    <span className="app-row-main">
                      <span className="app-row-title" style={{ display: "block" }}>
                        {t.name}
                      </span>
                      <span className="app-row-sub" style={{ display: "block" }}>
                        {t.subject}
                      </span>
                    </span>
                    <span className="app-row-end">
                      <span className="app-pill">{(TYPE_COLORS[t.type] || TYPE_COLORS.custom).label}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          {open && (
            <section className="app-panel span-7 app-sticky" aria-labelledby="tpl-h">
              <div className="app-panel-head">
                <h2 className="app-h2" id="tpl-h">
                  {open.name}
                </h2>
                <span className="app-meta">
                  {open.isDefault ? "Default" : "Yours"} · used {open.usageCount || 0} times
                </span>
              </div>
              <dl className="app-dl">
                <div>
                  <dt>Subject</dt>
                  <dd>{withVars(open.subject)}</dd>
                </div>
              </dl>
              <div style={{ whiteSpace: "pre-wrap", lineHeight: "24px", padding: "12px 0 16px" }}>{withVars(open.body)}</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="button" className="app-btn app-btn-primary" onClick={() => handleEdit(open)}>
                  Edit
                </button>
                <button type="button" className="app-btn" onClick={() => handleDuplicate(open)}>
                  Duplicate
                </button>
                <button type="button" className="app-btn" onClick={() => handlePreview(open)}>
                  Preview with sample data
                </button>
                {!open.isDefault && (
                  <button type="button" className="app-btn app-btn-danger" onClick={() => handleDelete(open)}>
                    Delete
                  </button>
                )}
              </div>
            </section>
          )}
        </div>
      )}

      <TemplateEditor isOpen={editorOpen} template={selectedTemplate} onClose={() => setEditorOpen(false)} onSave={handleSave} />
      <PreviewModal isOpen={previewOpen} template={selectedTemplate} onClose={() => setPreviewOpen(false)} />
    </>
  );
};

export default EmailTemplates;
