/**
 * Email Service - Send transactional emails
 * Supports Nodemailer with SMTP (fallback to console logging if not configured)
 */

import nodemailer from 'nodemailer';

// Check if email is configured
const isEmailConfigured = () => {
    return process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;
};

// Create transporter
const createTransporter = () => {
    if (!isEmailConfigured()) {
        console.log('⚠️ SMTP not configured - emails will be logged to console');
        return null;
    }

    return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });
};

/**
 * Send an email
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML content
 * @param {string} options.text - Plain text content (optional)
 */
export const sendEmail = async (options) => {
    try {
        const { to, subject, html, text } = options;

        // Fallback to console if SMTP not configured
        if (!isEmailConfigured()) {
            console.log('═══════════════════════════════════════════');
            console.log('📧 EMAIL (Console Mode - SMTP not configured)');
            console.log('═══════════════════════════════════════════');
            console.log(`To: ${to}`);
            console.log(`Subject: ${subject}`);
            console.log('───────────────────────────────────────────');
            console.log('HTML preview:', html ? html.substring(0, 200) + '...' : 'No HTML');
            console.log('═══════════════════════════════════════════');
            return { success: true, mode: 'console' };
        }

        const transporter = createTransporter();

        const mailOptions = {
            from: process.env.SMTP_FROM || `"Hire.iOS" <${process.env.SMTP_USER}>`,
            to,
            subject,
            html,
            text: text || undefined
        };

        const info = await transporter.sendMail(mailOptions);

        console.log(`📧 Email sent to ${to}: ${info.messageId}`);

        return {
            success: true,
            messageId: info.messageId,
            mode: 'smtp'
        };
    } catch (error) {
        console.error('Email sending failed:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

/**
 * Send a welcome email to new users
 */
export const sendWelcomeEmail = async (user) => {
    return sendEmail({
        to: user.email,
        subject: 'Welcome to Hire.iOS! 🎉',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #fff; padding: 40px;">
                <h1 style="color: #FFD700;">Welcome to Hire.iOS!</h1>
                <p>Hi ${user.fullname},</p>
                <p>Your account has been created successfully. We're excited to have you on board!</p>
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard" 
                   style="display: inline-block; background: #FFD700; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                    Go to Dashboard
                </a>
            </div>
        `
    });
};

/**
 * Send password reset email
 */
export const sendPasswordResetEmail = async (user, resetToken) => {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;

    return sendEmail({
        to: user.email,
        subject: 'Password Reset Request - Hire.iOS',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #fff; padding: 40px;">
                <h1 style="color: #FFD700;">Password Reset</h1>
                <p>Hi ${user.fullname},</p>
                <p>You requested a password reset. Click the button below to reset your password:</p>
                <a href="${resetUrl}" 
                   style="display: inline-block; background: #FFD700; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                    Reset Password
                </a>
                <p style="color: #888; margin-top: 20px; font-size: 12px;">
                    If you didn't request this, please ignore this email.
                </p>
            </div>
        `
    });
};



/**
 * Send offer letter email to candidate
 */
export const sendOfferLetterEmail = async (data) => {
    const {
        candidateName,
        candidateEmail,
        companyName,
        position,
        department,
        salary,
        joiningDate,
        benefits,
        expiresAt,
        viewOfferUrl
    } = data;

    const formattedSalary = new Intl.NumberFormat('en-PK', {
        style: 'currency',
        currency: 'PKR',
        maximumFractionDigits: 0
    }).format(salary);

    const formattedJoiningDate = new Date(joiningDate).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const formattedExpiry = new Date(expiresAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    return sendEmail({
        to: candidateEmail,
        subject: `🎉 Job Offer from ${companyName} - ${position}`,
        html: `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #ffffff;">
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%); padding: 40px 30px; text-align: center;">
                    <h1 style="color: #000; margin: 0; font-size: 28px; font-weight: bold;">
                        Congratulations! 🎉
                    </h1>
                    <p style="color: #000; margin: 10px 0 0; font-size: 16px; opacity: 0.8;">
                        You've received a job offer
                    </p>
                </div>
                
                <!-- Content -->
                <div style="padding: 40px 30px;">
                    <p style="color: #fff; font-size: 16px; line-height: 1.6;">
                        Dear <strong>${candidateName}</strong>,
                    </p>
                    
                    <p style="color: #ccc; font-size: 15px; line-height: 1.8;">
                        We are thrilled to extend an offer to join <strong style="color: #FFD700;">${companyName}</strong>. 
                        After careful consideration of your qualifications and interview performance, 
                        we believe you would be a valuable addition to our team.
                    </p>
                    
                    <!-- Offer Details Box -->
                    <div style="background: #1a1a1a; border: 1px solid #333; border-radius: 12px; padding: 25px; margin: 25px 0;">
                        <h2 style="color: #FFD700; margin: 0 0 20px; font-size: 18px; border-bottom: 1px solid #333; padding-bottom: 10px;">
                            Offer Details
                        </h2>
                        
                        <table style="width: 100%; color: #fff; font-size: 14px;">
                            <tr>
                                <td style="padding: 8px 0; color: #888;">Position:</td>
                                <td style="padding: 8px 0; font-weight: bold;">${position}</td>
                            </tr>
                            ${department ? `
                            <tr>
                                <td style="padding: 8px 0; color: #888;">Department:</td>
                                <td style="padding: 8px 0;">${department}</td>
                            </tr>
                            ` : ''}
                            <tr>
                                <td style="padding: 8px 0; color: #888;">Monthly Salary:</td>
                                <td style="padding: 8px 0; font-weight: bold; color: #00FF94;">${formattedSalary}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #888;">Joining Date:</td>
                                <td style="padding: 8px 0;">${formattedJoiningDate}</td>
                            </tr>
                            ${benefits ? `
                            <tr>
                                <td style="padding: 8px 0; color: #888; vertical-align: top;">Benefits:</td>
                                <td style="padding: 8px 0;">${benefits}</td>
                            </tr>
                            ` : ''}
                        </table>
                    </div>
                    
                    <!-- CTA Button -->
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${viewOfferUrl}" 
                           style="display: inline-block; background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%); 
                                  color: #000; padding: 16px 40px; text-decoration: none; border-radius: 8px; 
                                  font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(255,215,0,0.3);">
                            View & Respond to Offer
                        </a>
                    </div>
                    
                    <!-- Expiry Notice -->
                    <div style="background: #331800; border: 1px solid #FF6600; border-radius: 8px; padding: 15px; margin: 25px 0; text-align: center;">
                        <p style="color: #FF9900; margin: 0; font-size: 14px;">
                            ⚠️ This offer expires on <strong>${formattedExpiry}</strong>. Please respond before the deadline.
                        </p>
                    </div>
                    
                    <p style="color: #888; font-size: 14px; line-height: 1.6;">
                        We are excited about the possibility of you joining our team and contributing to our success. 
                        If you have any questions, please don't hesitate to reach out.
                    </p>
                    
                    <p style="color: #888; font-size: 14px; margin-top: 30px;">
                        Best regards,<br>
                        <strong style="color: #fff;">The ${companyName} Team</strong>
                    </p>
                </div>
                
                <!-- Footer -->
                <div style="background: #111; padding: 20px 30px; text-align: center; border-top: 1px solid #333;">
                    <p style="color: #666; font-size: 12px; margin: 0;">
                        This email was sent via Hire.iOS Platform
                    </p>
                </div>
            </div>
        `
    });
};

export default {
    sendEmail,
    sendWelcomeEmail,
    sendPasswordResetEmail,
    sendOfferLetterEmail
};
