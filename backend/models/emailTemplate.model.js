/**
 * Email Templates Model
 * For managing email templates used in recruitment
 */

import mongoose from 'mongoose';

const emailTemplateSchema = new mongoose.Schema({
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true,
        index: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    subject: {
        type: String,
        required: true,
        trim: true
    },
    body: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['rejection', 'interview_invite', 'offer', 'follow_up', 'custom', 'onboarding'],
        default: 'custom'
    },
    // Available variables that can be used in this template
    variables: [{
        type: String
    }],
    isDefault: {
        type: Boolean,
        default: false
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    lastUsedAt: {
        type: Date
    },
    usageCount: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

// Index for faster queries
emailTemplateSchema.index({ companyId: 1, type: 1 });
emailTemplateSchema.index({ companyId: 1, isDefault: 1 });

// Static method to get default templates for a new company
emailTemplateSchema.statics.createDefaultTemplates = async function (companyId, userId) {
    const defaultTemplates = [
        {
            name: 'Application Received',
            subject: 'Thank you for your application - {{jobTitle}}',
            body: `Dear {{candidateName}},

Thank you for applying for the {{jobTitle}} position at {{companyName}}.

We have received your application and our team is currently reviewing it. We will get back to you within 5-7 business days with an update on your application status.

In the meantime, feel free to explore other opportunities on our careers page.

Best regards,
{{companyName}} Recruitment Team`,
            type: 'custom',
            variables: ['candidateName', 'jobTitle', 'companyName'],
            isDefault: true
        },
        {
            name: 'Interview Invitation',
            subject: 'Interview Invitation - {{jobTitle}} at {{companyName}}',
            body: `Dear {{candidateName}},

We are pleased to inform you that you have been shortlisted for an interview for the {{jobTitle}} position at {{companyName}}.

Interview Details:
- Date: {{interviewDate}}
- Time: {{interviewTime}}
- Location: {{interviewLocation}}
- Interview Type: {{interviewType}}

Please confirm your availability by replying to this email.

If you have any questions, please don't hesitate to reach out.

Best regards,
{{recruiterName}}
{{companyName}}`,
            type: 'interview_invite',
            variables: ['candidateName', 'jobTitle', 'companyName', 'interviewDate', 'interviewTime', 'interviewLocation', 'interviewType', 'recruiterName'],
            isDefault: true
        },
        {
            name: 'Rejection - After Review',
            subject: 'Update on Your Application - {{jobTitle}}',
            body: `Dear {{candidateName}},

Thank you for your interest in the {{jobTitle}} position at {{companyName}} and for taking the time to apply.

After careful review of your application, we regret to inform you that we have decided to move forward with other candidates whose qualifications more closely match our current requirements.

We encourage you to apply for future positions that match your skills and experience. We will keep your resume on file for future opportunities.

We wish you the best in your job search and future endeavors.

Best regards,
{{companyName}} Recruitment Team`,
            type: 'rejection',
            variables: ['candidateName', 'jobTitle', 'companyName'],
            isDefault: true
        },
        {
            name: 'Rejection - After Interview',
            subject: 'Update on Your Interview - {{jobTitle}}',
            body: `Dear {{candidateName}},

Thank you for taking the time to interview for the {{jobTitle}} position at {{companyName}}. We enjoyed meeting you and learning about your background.

After careful consideration, we have decided to proceed with another candidate for this role. This was a difficult decision given the strength of your candidacy.

We were impressed by your {{positiveNote}} and would encourage you to apply for future opportunities that match your expertise.

Thank you again for your interest in {{companyName}}.

Best regards,
{{recruiterName}}
{{companyName}}`,
            type: 'rejection',
            variables: ['candidateName', 'jobTitle', 'companyName', 'positiveNote', 'recruiterName'],
            isDefault: true
        },
        {
            name: 'Job Offer',
            subject: 'Job Offer - {{jobTitle}} at {{companyName}}',
            body: `Dear {{candidateName}},

We are delighted to extend an offer of employment for the position of {{jobTitle}} at {{companyName}}!

Offer Details:
- Position: {{jobTitle}}
- Start Date: {{startDate}}
- Salary: {{salary}}
- Employment Type: {{employmentType}}

Please review the attached offer letter for complete details regarding compensation, benefits, and terms of employment.

To accept this offer, please sign and return the offer letter by {{responseDeadline}}.

If you have any questions, please don't hesitate to contact us.

Congratulations, and we look forward to welcoming you to the team!

Best regards,
{{recruiterName}}
{{companyName}}`,
            type: 'offer',
            variables: ['candidateName', 'jobTitle', 'companyName', 'startDate', 'salary', 'employmentType', 'responseDeadline', 'recruiterName'],
            isDefault: true
        },
        {
            name: 'Follow Up - After Interview',
            subject: 'Thank You - {{jobTitle}} Interview',
            body: `Dear {{candidateName}},

Thank you for taking the time to interview for the {{jobTitle}} position at {{companyName}} on {{interviewDate}}.

We are currently in the process of evaluating all candidates and will be in touch with the next steps within {{timeframe}}.

If you have any questions in the meantime, please feel free to reach out.

Best regards,
{{recruiterName}}
{{companyName}}`,
            type: 'follow_up',
            variables: ['candidateName', 'jobTitle', 'companyName', 'interviewDate', 'timeframe', 'recruiterName'],
            isDefault: true
        }
    ];

    const templates = defaultTemplates.map(template => ({
        ...template,
        companyId,
        createdBy: userId
    }));

    return await this.insertMany(templates);
};

// Method to replace variables in template
emailTemplateSchema.methods.render = function (data) {
    let subject = this.subject;
    let body = this.body;

    // Replace all variables
    Object.keys(data).forEach(key => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        subject = subject.replace(regex, data[key] || '');
        body = body.replace(regex, data[key] || '');
    });

    return { subject, body };
};

export const EmailTemplate = mongoose.model('EmailTemplate', emailTemplateSchema);
