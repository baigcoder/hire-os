/**
 * Email Templates Routes
 * CRUD operations for email templates
 */

import express from "express";
import isAuthenticated, {
  isRecruiter,
} from "../middlewares/isAuthenticated.js";
import { EmailTemplate } from "../models/emailTemplate.model.js";
import { Company } from "../models/company.model.js";
import { User } from "../models/user.model.js";

const router = express.Router();

/**
 * GET /api/v1/email-templates
 * Get all templates for company
 */
router.get("/", isAuthenticated, isRecruiter, async (req, res) => {
  try {
    const userId = req.id;
    const user = await User.findById(userId);

    let company;
    if (user.role === "company_admin") {
      company = await Company.findOne({ adminUser: userId });
    } else {
      company = await Company.findById(user.companyId);
    }

    if (!company) {
      return res
        .status(404)
        .json({ success: false, message: "Company not found" });
    }

    const templates = await EmailTemplate.find({
      companyId: company._id,
      isActive: true,
    }).sort({ type: 1, name: 1 });

    // If no templates, create defaults
    if (templates.length === 0) {
      const defaultTemplates = await EmailTemplate.createDefaultTemplates(
        company._id,
        userId,
      );
      return res.status(200).json({
        success: true,
        templates: defaultTemplates,
        message: "Default templates created",
      });
    }

    return res.status(200).json({
      success: true,
      templates,
    });
  } catch (error) {
    console.error("Get templates error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Error fetching templates" });
  }
});

/**
 * GET /api/v1/email-templates/:id
 * Get single template
 */
router.get("/:id", isAuthenticated, isRecruiter, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.id;
    const user = await User.findById(userId);

    let company;
    if (user.role === "company_admin") {
      company = await Company.findOne({ adminUser: userId });
    } else {
      company = await Company.findById(user.companyId);
    }

    const template = await EmailTemplate.findOne({
      _id: id,
      companyId: company._id,
    });

    if (!template) {
      return res
        .status(404)
        .json({ success: false, message: "Template not found" });
    }

    return res.status(200).json({
      success: true,
      template,
    });
  } catch (error) {
    console.error("Get template error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Error fetching template" });
  }
});

/**
 * POST /api/v1/email-templates
 * Create new template
 */
router.post("/", isAuthenticated, isRecruiter, async (req, res) => {
  try {
    const { name, subject, body, type, variables } = req.body;
    const userId = req.id;
    const user = await User.findById(userId);

    if (!name || !subject || !body) {
      return res.status(400).json({
        success: false,
        message: "Name, subject, and body are required",
      });
    }

    let company;
    if (user.role === "company_admin") {
      company = await Company.findOne({ adminUser: userId });
    } else {
      company = await Company.findById(user.companyId);
    }

    if (!company) {
      return res
        .status(404)
        .json({ success: false, message: "Company not found" });
    }

    // Extract variables from body
    const extractedVariables = [];
    const regex = /{{(\w+)}}/g;
    let match;
    while ((match = regex.exec(subject + body)) !== null) {
      if (!extractedVariables.includes(match[1])) {
        extractedVariables.push(match[1]);
      }
    }

    const template = await EmailTemplate.create({
      companyId: company._id,
      name,
      subject,
      body,
      type: type || "custom",
      variables: variables || extractedVariables,
      createdBy: userId,
    });

    return res.status(201).json({
      success: true,
      template,
      message: "Template created successfully",
    });
  } catch (error) {
    console.error("Create template error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Error creating template" });
  }
});

/**
 * PUT /api/v1/email-templates/:id
 * Update template
 */
router.put("/:id", isAuthenticated, isRecruiter, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, subject, body, type, variables, isActive } = req.body;
    const userId = req.id;
    const user = await User.findById(userId);

    let company;
    if (user.role === "company_admin") {
      company = await Company.findOne({ adminUser: userId });
    } else {
      company = await Company.findById(user.companyId);
    }

    const template = await EmailTemplate.findOne({
      _id: id,
      companyId: company._id,
    });

    if (!template) {
      return res
        .status(404)
        .json({ success: false, message: "Template not found" });
    }

    // Update fields
    if (name) template.name = name;
    if (subject) template.subject = subject;
    if (body) template.body = body;
    if (type) template.type = type;
    if (variables) template.variables = variables;
    if (typeof isActive === "boolean") template.isActive = isActive;

    await template.save();

    return res.status(200).json({
      success: true,
      template,
      message: "Template updated successfully",
    });
  } catch (error) {
    console.error("Update template error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Error updating template" });
  }
});

/**
 * DELETE /api/v1/email-templates/:id
 * Delete template (soft delete)
 */
router.delete("/:id", isAuthenticated, isRecruiter, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.id;
    const user = await User.findById(userId);

    let company;
    if (user.role === "company_admin") {
      company = await Company.findOne({ adminUser: userId });
    } else {
      company = await Company.findById(user.companyId);
    }

    const template = await EmailTemplate.findOne({
      _id: id,
      companyId: company._id,
    });

    if (!template) {
      return res
        .status(404)
        .json({ success: false, message: "Template not found" });
    }

    // Prevent deleting default templates
    if (template.isDefault) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot delete default templates. You can deactivate them instead.",
      });
    }

    template.isActive = false;
    await template.save();

    return res.status(200).json({
      success: true,
      message: "Template deleted successfully",
    });
  } catch (error) {
    console.error("Delete template error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Error deleting template" });
  }
});

/**
 * POST /api/v1/email-templates/:id/preview
 * Preview template with sample data
 */
router.post("/:id/preview", isAuthenticated, isRecruiter, async (req, res) => {
  try {
    const { id } = req.params;
    const { data } = req.body;
    const userId = req.id;
    const user = await User.findById(userId);

    let company;
    if (user.role === "company_admin") {
      company = await Company.findOne({ adminUser: userId });
    } else {
      company = await Company.findById(user.companyId);
    }

    const template = await EmailTemplate.findOne({
      _id: id,
      companyId: company._id,
    });

    if (!template) {
      return res
        .status(404)
        .json({ success: false, message: "Template not found" });
    }

    // Sample data if not provided
    const sampleData = data || {
      candidateName: "John Doe",
      jobTitle: "Software Engineer",
      companyName: company.name,
      recruiterName: user.fullname || "Recruiter",
      interviewDate: new Date().toLocaleDateString(),
      interviewTime: "10:00 AM",
      interviewLocation: "Video Call",
      interviewType: "Technical Interview",
    };

    const rendered = template.render(sampleData);

    return res.status(200).json({
      success: true,
      preview: rendered,
    });
  } catch (error) {
    console.error("Preview template error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Error previewing template" });
  }
});

/**
 * POST /api/v1/email-templates/:id/send
 * Send email using template
 */
router.post("/:id/send", isAuthenticated, isRecruiter, async (req, res) => {
  try {
    const { id } = req.params;
    const { recipientEmail, recipientName, data, applicationId } = req.body;
    const userId = req.id;
    const user = await User.findById(userId);

    if (!recipientEmail) {
      return res.status(400).json({
        success: false,
        message: "Recipient email is required",
      });
    }

    let company;
    if (user.role === "company_admin") {
      company = await Company.findOne({ adminUser: userId });
    } else {
      company = await Company.findById(user.companyId);
    }

    const template = await EmailTemplate.findOne({
      _id: id,
      companyId: company._id,
      isActive: true,
    });

    if (!template) {
      return res
        .status(404)
        .json({ success: false, message: "Template not found" });
    }

    // Merge data with defaults
    const emailData = {
      candidateName: recipientName || "Candidate",
      companyName: company.name,
      recruiterName: user.fullname,
      ...data,
    };

    const rendered = template.render(emailData);

    // Update template usage stats
    template.lastUsedAt = new Date();
    template.usageCount = (template.usageCount || 0) + 1;
    await template.save();

    // TODO: Integrate with actual email service (SendGrid, AWS SES, etc.)
    // For now, log the email
    console.log("📧 Email to be sent:");
    console.log("To:", recipientEmail);
    console.log("Subject:", rendered.subject);
    console.log("Body:", rendered.body);

    // If application ID provided, log the email activity
    if (applicationId) {
      const { Application } = await import("../models/application.model.js");
      await Application.findByIdAndUpdate(applicationId, {
        $push: {
          timeline: {
            action: "email_sent",
            performedBy: userId,
            timestamp: new Date(),
            metadata: {
              templateId: template._id,
              templateName: template.name,
              subject: rendered.subject,
            },
          },
        },
      });
    }

    return res.status(200).json({
      success: true,
      message: `Email sent to ${recipientEmail}`,
      preview: process.env.NODE_ENV === "development" ? rendered : undefined,
    });
  } catch (error) {
    console.error("Send email error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Error sending email" });
  }
});

export default router;
