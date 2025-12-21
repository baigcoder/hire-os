import nodemailer from "nodemailer";

// Create transporter
const createTransporter = () => {
  const email = process.env.SMTP_USER || process.env.EMAIL_USER;
  const password = process.env.SMTP_PASS || process.env.EMAIL_PASS;

  if (!email || !password) {
    console.error(
      "❌ Email credentials missing! Check EMAIL_USER and EMAIL_PASS in .env",
    );
    throw new Error("Email configuration incomplete");
  }

  console.log(`📧 Configuring email for: ${email}`);

  // Explicit SMTP configuration for Gmail / Google Workspace
  // Using port 587 with STARTTLS (more compatible than 465 for some networks)
  const config = {
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: email,
      pass: password,
    },
    tls: {
      rejectUnauthorized: false,
    },
    debug: false,
    logger: false,
  };

  const transporter = nodemailer.createTransport(config);

  // Verify connection configuration
  transporter.verify((error, success) => {
    if (error) {
      console.error("❌ Email server connection failed:", error.message);
      console.error("   Please check your EMAIL_USER and EMAIL_PASS in .env");
      console.error(
        "   Make sure you are using a Gmail App Password, not your regular password",
      );
    } else {
      console.log("✅ Email server is ready to send messages");
    }
  });

  return transporter;
};

// Generate 6-digit OTP
export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Store OTPs in memory (use Redis in production)
const otpStore = new Map();

// Save OTP with expiry
export const saveOTP = (email, otp) => {
  otpStore.set(email.toLowerCase(), {
    otp,
    expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
    attempts: 0,
  });
};

// Verify OTP
export const verifyOTP = (email, inputOtp) => {
  const stored = otpStore.get(email.toLowerCase());

  if (!stored) {
    return {
      valid: false,
      message: "OTP expired or not found. Please request a new code.",
    };
  }

  if (Date.now() > stored.expiresAt) {
    otpStore.delete(email.toLowerCase());
    return {
      valid: false,
      message: "OTP has expired. Please request a new code.",
    };
  }

  stored.attempts++;

  if (stored.attempts > 5) {
    otpStore.delete(email.toLowerCase());
    return {
      valid: false,
      message: "Too many attempts. Please request a new code.",
    };
  }

  if (stored.otp !== inputOtp) {
    return { valid: false, message: "Invalid OTP. Please try again." };
  }

  // OTP is valid, remove it
  otpStore.delete(email.toLowerCase());
  return { valid: true, message: "OTP verified successfully" };
};

// Send OTP email
export const sendOTPEmail = async (email, otp, purpose = "verification") => {
  const transporter = createTransporter();

  const purposeText = {
    verification: "verify your email",
    signup: "complete your registration",
    login: "sign in to your account",
    reset: "reset your password",
  };

  const mailOptions = {
    from: `"HIRE.OS" <${process.env.SMTP_USER || process.env.EMAIL_USER}>`,
    to: email,
    subject: `HIRE.OS // Verification: ${otp}`,
    html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #0A0A0A;">
                <table role="presentation" style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td align="center" style="padding: 40px 20px;">
                            <table role="presentation" style="width: 100%; max-width: 560px; border-collapse: collapse;">
                                <!-- Header -->
                                <tr>
                                    <td style="background-color: #111111; padding: 25px 30px; border: 1px solid #333; border-bottom: none;">
                                        <span style="color: #FFD700; font-size: 22px; font-weight: bold; letter-spacing: 2px;">HIRE</span><span style="color: #666; font-size: 22px; font-weight: bold;">.</span><span style="color: #fff; font-size: 22px; font-weight: bold; letter-spacing: 2px;">OS</span>
                                    </td>
                                </tr>
                                
                                <!-- Body -->
                                <tr>
                                    <td style="background-color: #111111; padding: 30px; border: 1px solid #333; border-top: none; border-bottom: none;">
                                        <h2 style="margin: 0 0 20px; color: #fff; font-size: 18px; font-weight: bold; letter-spacing: 1px; text-transform: uppercase;">
                                            Verification Code
                                        </h2>
                                        <p style="margin: 0 0 25px; color: #999; font-size: 13px; line-height: 1.8;">
                                            Use the following code to ${purposeText[purpose] || "verify your email"}. Code expires in 10 minutes.
                                        </p>
                                        
                                        <!-- OTP Code -->
                                        <div style="background-color: #0A0A0A; border: 2px solid #FFD700; padding: 25px; text-align: center; margin-bottom: 25px;">
                                            <span style="font-size: 32px; font-weight: bold; letter-spacing: 10px; color: #FFD700; font-family: monospace;">
                                                ${otp}
                                            </span>
                                        </div>
                                        
                                        <p style="margin: 0 0 20px; color: #666; font-size: 11px; line-height: 1.6;">
                                            If you didn't request this code, you can safely ignore this email.
                                        </p>
                                        
                                        <div style="border-top: 1px solid #333; margin: 20px 0; padding-top: 15px;">
                                            <p style="margin: 0; color: #555; font-size: 10px; text-transform: uppercase; letter-spacing: 1px;">
                                                Automated System Message
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                                
                                <!-- Footer -->
                                <tr>
                                    <td style="background-color: #0A0A0A; padding: 15px 30px; border: 1px solid #333; border-top: 2px solid #FFD700;">
                                        <p style="margin: 0; color: #555; font-size: 10px; text-align: center; letter-spacing: 1px; text-transform: uppercase;">
                                            © ${new Date().getFullYear()} HIRE.OS // Secure Verification
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
        `,
  };

  try {
    console.log(`Attempting to send OTP email to ${email}...`);
    const info = await transporter.sendMail(mailOptions);
    console.log("✅ OTP email sent successfully. MessageID:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("❌ Email send error details:", error);

    // Development fallback: Log OTP to console if email fails
    if (process.env.NODE_ENV === "development") {
      console.log("\n" + "=".repeat(60));
      console.log("📧 EMAIL SENDING FAILED - DEVELOPMENT MODE");
      console.log("=".repeat(60));
      console.log(`📨 OTP Code for ${email}: ${otp}`);
      console.log(`🎯 Purpose: ${purpose}`);
      console.log(`⏰ Valid for: 10 minutes`);
      console.log("=".repeat(60) + "\n");

      // Return success so signup can continue in development
      return { success: true, messageId: "dev-mode-console-log" };
    }

    throw new Error(`Failed to send verification email: ${error.message}`);
  }
};

// Send welcome email
export const sendWelcomeEmail = async (email, fullname) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: `"HIRE.OS" <${process.env.SMTP_USER || process.env.EMAIL_USER}>`,
    to: email,
    subject: `Welcome to HIRE.OS // ${fullname}`,
    html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #0A0A0A;">
                <table role="presentation" style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td align="center" style="padding: 40px 20px;">
                            <table role="presentation" style="width: 100%; max-width: 560px; border-collapse: collapse;">
                                <!-- Header -->
                                <tr>
                                    <td style="background-color: #111111; padding: 30px; border: 1px solid #333; border-bottom: none;">
                                        <table width="100%">
                                            <tr>
                                                <td>
                                                    <span style="color: #FFD700; font-size: 24px; font-weight: bold; letter-spacing: 2px;">HIRE</span><span style="color: #666; font-size: 24px; font-weight: bold;">.</span><span style="color: #fff; font-size: 24px; font-weight: bold; letter-spacing: 2px;">OS</span>
                                                </td>
                                                <td style="text-align: right;">
                                                    <span style="background-color: #00FF94; color: #000; padding: 4px 12px; font-size: 10px; font-weight: bold; letter-spacing: 1px;">VERIFIED</span>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                                <!-- Content -->
                                <tr>
                                    <td style="background-color: #111111; padding: 30px; border: 1px solid #333; border-top: none; border-bottom: none;">
                                        <h1 style="margin: 0 0 10px; color: #fff; font-size: 22px; font-weight: bold; letter-spacing: 1px; text-transform: uppercase;">SYSTEM ACCESS GRANTED</h1>
                                        <p style="margin: 0 0 25px; color: #666; font-size: 12px; letter-spacing: 2px; text-transform: uppercase;">User: ${fullname}</p>
                                        
                                        <p style="margin: 0 0 25px; color: #999; font-size: 14px; line-height: 1.8;">
                                            Your account has been verified and initialized. You now have full access to the HIRE.OS talent acquisition platform.
                                        </p>
                                        
                                        <table style="margin-bottom: 25px;">
                                            <tr>
                                                <td style="color: #666; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; padding: 8px 0; border-bottom: 1px solid #333;">PROTOCOL</td>
                                                <td style="color: #fff; font-size: 12px; font-family: monospace; padding: 8px 20px; border-bottom: 1px solid #333;">Complete your profile</td>
                                            </tr>
                                            <tr>
                                                <td style="color: #666; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; padding: 8px 0; border-bottom: 1px solid #333;">PROTOCOL</td>
                                                <td style="color: #fff; font-size: 12px; font-family: monospace; padding: 8px 20px; border-bottom: 1px solid #333;">Upload resume for AI analysis</td>
                                            </tr>
                                            <tr>
                                                <td style="color: #666; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; padding: 8px 0;">PROTOCOL</td>
                                                <td style="color: #fff; font-size: 12px; font-family: monospace; padding: 8px 20px;">Browse and apply to positions</td>
                                            </tr>
                                        </table>
                                        
                                        <a href="${process.env.FRONTEND_URL || "http://localhost:5173"}/jobs" 
                                           style="display: inline-block; background-color: #FFD700; color: #000; padding: 14px 32px; text-decoration: none; font-weight: bold; font-size: 12px; letter-spacing: 2px; text-transform: uppercase;">
                                            INITIALIZE SEARCH
                                        </a>
                                    </td>
                                </tr>
                                <!-- Footer -->
                                <tr>
                                    <td style="background-color: #0A0A0A; padding: 20px 30px; border: 1px solid #333; border-top: 3px solid #FFD700;">
                                        <p style="margin: 0; color: #666; font-size: 10px; text-align: center; letter-spacing: 1px; text-transform: uppercase;">
                                            © ${new Date().getFullYear()} HIRE.OS // Industrial Talent Platform
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
        `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error("Welcome email error:", error);
    // Don't throw - welcome email is not critical
    return { success: false, error: error.message };
  }
};

// Send recruiter invitation email with login credentials
export const sendRecruiterInvitation = async (
  recruiterEmail,
  recruiterName,
  companyName,
  password,
  loginUrl,
) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: `"JobPortal" <${process.env.SMTP_USER || process.env.EMAIL_USER}>`,
    to: recruiterEmail,
    subject: `🎉 You've been invited to join ${companyName} on JobPortal`,
    html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0a0a0a;">
                <table role="presentation" style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td align="center" style="padding: 40px 0;">
                            <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse;">
                                <!-- Header with Gold Theme -->
                                <tr>
                                    <td style="background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); padding: 30px 40px; border-radius: 16px 16px 0 0;">
                                        <h1 style="margin: 0; color: #000; font-size: 28px; font-weight: 700;">
                                            ✨ JobPortal
                                        </h1>
                                        <p style="margin: 10px 0 0; color: #000; font-size: 14px; opacity: 0.8;">
                                            Premium Recruitment Platform
                                        </p>
                                    </td>
                                </tr>
                                
                                <!-- Body -->
                                <tr>
                                    <td style="background-color: #18181b; padding: 40px;">
                                        <h2 style="margin: 0 0 20px; color: #fff; font-size: 24px; font-weight: 600;">
                                            Welcome to the Team! 🎉
                                        </h2>
                                        <p style="margin: 0 0 20px; color: #a1a1aa; font-size: 16px; line-height: 1.6;">
                                            Hi <strong style="color: #F59E0B;">${recruiterName}</strong>,
                                        </p>
                                        <p style="margin: 0 0 30px; color: #a1a1aa; font-size: 16px; line-height: 1.6;">
                                            You've been invited by <strong style="color: #fff;">${companyName}</strong> to join their recruitment team on JobPortal. Below are your login credentials:
                                        </p>
                                        
                                        <!-- Credentials Box -->
                                        <div style="background-color: #27272a; border: 1px solid #F59E0B30; border-radius: 12px; padding: 25px; margin-bottom: 30px;">
                                            <h3 style="margin: 0 0 15px; color: #F59E0B; font-size: 16px; font-weight: 600;">
                                                🔐 Your Login Credentials
                                            </h3>
                                            <table style="width: 100%;">
                                                <tr>
                                                    <td style="padding: 10px 0; color: #71717a; font-size: 14px;">Email (Username):</td>
                                                    <td style="padding: 10px 0; color: #fff; font-size: 14px; font-weight: 600;">${recruiterEmail}</td>
                                                </tr>
                                                <tr>
                                                    <td style="padding: 10px 0; color: #71717a; font-size: 14px;">Temporary Password:</td>
                                                    <td style="padding: 10px 0; color: #F59E0B; font-size: 14px; font-weight: 600; font-family: monospace; letter-spacing: 1px;">${password}</td>
                                                </tr>
                                            </table>
                                        </div>
                                        
                                        <p style="margin: 0 0 20px; color: #ef4444; font-size: 14px; line-height: 1.6;">
                                            ⚠️ <strong>Important:</strong> Please change your password immediately after your first login for security purposes.
                                        </p>
                                        
                                        <div style="background-color: #1e3a5f; border: 1px solid #3b82f6; border-radius: 8px; padding: 15px; margin-bottom: 25px;">
                                            <p style="margin: 0; color: #93c5fd; font-size: 13px; line-height: 1.5;">
                                                ℹ️ <strong style="color: #60a5fa;">Note:</strong> As a recruiter, you must login using the <strong>email and password</strong> provided above. Google Sign-In is not available for recruiter accounts.
                                            </p>
                                        </div>
                                        
                                        <!-- Login Button -->
                                        <a href="${loginUrl}" 
                                           style="display: inline-block; background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); color: #000; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 16px;">
                                            Login to Dashboard →
                                        </a>
                                        
                                        <hr style="border: none; border-top: 1px solid #27272a; margin: 30px 0;">
                                        
                                        <p style="margin: 0 0 10px; color: #71717a; font-size: 14px; line-height: 1.6;">
                                            <strong style="color: #a1a1aa;">What you can do as a Recruiter:</strong>
                                        </p>
                                        <ul style="margin: 0 0 20px; padding-left: 20px; color: #71717a; font-size: 14px; line-height: 1.8;">
                                            <li>Post and manage job listings</li>
                                            <li>Review and screen candidates</li>
                                            <li>Schedule interviews (Video & MCQ)</li>
                                            <li>Send offer letters</li>
                                            <li>Access analytics and reports</li>
                                        </ul>
                                        
                                        <p style="margin: 0; color: #52525b; font-size: 12px;">
                                            If you didn't expect this invitation, please ignore this email or contact support.
                                        </p>
                                    </td>
                                </tr>
                                
                                <!-- Footer -->
                                <tr>
                                    <td style="background-color: #0a0a0a; padding: 20px 40px; border-radius: 0 0 16px 16px; border: 1px solid #27272a; border-top: none;">
                                        <p style="margin: 0; color: #52525b; font-size: 12px; text-align: center;">
                                            © ${new Date().getFullYear()} JobPortal. All rights reserved.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
        `,
  };

  try {
    console.log(`Sending recruiter invitation to ${recruiterEmail}...`);
    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Recruiter invitation sent. MessageID:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("❌ Recruiter invitation email error:", error);

    // Development fallback
    if (process.env.NODE_ENV === "development") {
      console.log("\n" + "=".repeat(60));
      console.log("📧 RECRUITER INVITATION EMAIL - DEVELOPMENT MODE");
      console.log("=".repeat(60));
      console.log(`📨 To: ${recruiterEmail}`);
      console.log(`👤 Name: ${recruiterName}`);
      console.log(`🏢 Company: ${companyName}`);
      console.log(`🔐 Password: ${password}`);
      console.log(`🔗 Login URL: ${loginUrl}`);
      console.log("=".repeat(60) + "\n");
      return { success: true, messageId: "dev-mode-console-log" };
    }

    return { success: false, error: error.message };
  }
};

// Send payment invoice email to admin
export const sendPaymentInvoice = async (
  adminEmail,
  adminName,
  invoiceData,
) => {
  const transporter = createTransporter();
  const {
    companyName,
    planName,
    amount,
    transactionId,
    paymentDate,
    billingCycle,
    validUntil,
  } = invoiceData;

  const mailOptions = {
    from: `"JobPortal" <${process.env.SMTP_USER || process.env.EMAIL_USER}>`,
    to: adminEmail,
    subject: `✅ Payment Confirmed - Invoice for ${companyName}`,
    html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0a0a0a;">
                <table role="presentation" style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td align="center" style="padding: 40px 0;">
                            <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse;">
                                <!-- Header -->
                                <tr>
                                    <td style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 30px 40px; border-radius: 16px 16px 0 0;">
                                        <table style="width: 100%;">
                                            <tr>
                                                <td>
                                                    <h1 style="margin: 0; color: #fff; font-size: 28px; font-weight: 700;">
                                                        JobPortal
                                                    </h1>
                                                </td>
                                                <td style="text-align: right;">
                                                    <span style="background: #fff; color: #16a34a; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: 600;">
                                                        ✓ PAID
                                                    </span>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                                
                                <!-- Body -->
                                <tr>
                                    <td style="background-color: #18181b; padding: 40px;">
                                        <h2 style="margin: 0 0 10px; color: #fff; font-size: 24px; font-weight: 600;">
                                            Payment Successful! 🎉
                                        </h2>
                                        <p style="margin: 0 0 30px; color: #a1a1aa; font-size: 16px;">
                                            Thank you for your payment, ${adminName}. Your subscription is now active.
                                        </p>
                                        
                                        <!-- Invoice Details -->
                                        <div style="background-color: #27272a; border-radius: 12px; padding: 25px; margin-bottom: 30px;">
                                            <h3 style="margin: 0 0 20px; color: #F59E0B; font-size: 16px; font-weight: 600; border-bottom: 1px solid #3f3f46; padding-bottom: 15px;">
                                                📄 INVOICE
                                            </h3>
                                            <table style="width: 100%;">
                                                <tr>
                                                    <td style="padding: 8px 0; color: #71717a; font-size: 14px;">Transaction ID:</td>
                                                    <td style="padding: 8px 0; color: #fff; font-size: 14px; text-align: right; font-family: monospace;">${transactionId}</td>
                                                </tr>
                                                <tr>
                                                    <td style="padding: 8px 0; color: #71717a; font-size: 14px;">Date:</td>
                                                    <td style="padding: 8px 0; color: #fff; font-size: 14px; text-align: right;">${new Date(paymentDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</td>
                                                </tr>
                                                <tr>
                                                    <td style="padding: 8px 0; color: #71717a; font-size: 14px;">Company:</td>
                                                    <td style="padding: 8px 0; color: #fff; font-size: 14px; text-align: right;">${companyName}</td>
                                                </tr>
                                                <tr>
                                                    <td style="padding: 8px 0; color: #71717a; font-size: 14px;">Plan:</td>
                                                    <td style="padding: 8px 0; color: #F59E0B; font-size: 14px; text-align: right; font-weight: 600;">${planName}</td>
                                                </tr>
                                                <tr>
                                                    <td style="padding: 8px 0; color: #71717a; font-size: 14px;">Billing Cycle:</td>
                                                    <td style="padding: 8px 0; color: #fff; font-size: 14px; text-align: right; text-transform: capitalize;">${billingCycle}</td>
                                                </tr>
                                                <tr>
                                                    <td style="padding: 8px 0; color: #71717a; font-size: 14px;">Valid Until:</td>
                                                    <td style="padding: 8px 0; color: #22c55e; font-size: 14px; text-align: right; font-weight: 600;">${new Date(validUntil).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</td>
                                                </tr>
                                            </table>
                                            
                                            <div style="border-top: 2px solid #3f3f46; margin-top: 20px; padding-top: 20px;">
                                                <table style="width: 100%;">
                                                    <tr>
                                                        <td style="color: #fff; font-size: 18px; font-weight: 700;">Total Paid:</td>
                                                        <td style="color: #22c55e; font-size: 24px; font-weight: 700; text-align: right;">Rs ${amount.toLocaleString()}</td>
                                                    </tr>
                                                </table>
                                            </div>
                                        </div>
                                        
                                        <!-- Dashboard Button -->
                                        <a href="${process.env.FRONTEND_URL || "http://localhost:5173"}/company/admin/dashboard" 
                                           style="display: inline-block; background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); color: #000; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 16px;">
                                            Go to Dashboard →
                                        </a>
                                        
                                        <hr style="border: none; border-top: 1px solid #27272a; margin: 30px 0;">
                                        
                                        <p style="margin: 0; color: #52525b; font-size: 12px; line-height: 1.6;">
                                            This is your payment confirmation and invoice. Please keep this email for your records. If you have any questions about your subscription, please contact our support team.
                                        </p>
                                    </td>
                                </tr>
                                
                                <!-- Footer -->
                                <tr>
                                    <td style="background-color: #0a0a0a; padding: 20px 40px; border-radius: 0 0 16px 16px; border: 1px solid #27272a; border-top: none;">
                                        <p style="margin: 0; color: #52525b; font-size: 12px; text-align: center;">
                                            © ${new Date().getFullYear()} JobPortal. All rights reserved.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
        `,
  };

  try {
    console.log(`Sending payment invoice to ${adminEmail}...`);
    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Payment invoice sent. MessageID:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("❌ Payment invoice email error:", error);

    // Development fallback
    if (process.env.NODE_ENV === "development") {
      console.log("\n" + "=".repeat(60));
      console.log("📧 PAYMENT INVOICE EMAIL - DEVELOPMENT MODE");
      console.log("=".repeat(60));
      console.log(`📨 To: ${adminEmail}`);
      console.log(`👤 Admin: ${adminName}`);
      console.log(`🏢 Company: ${companyName}`);
      console.log(`💳 Transaction: ${transactionId}`);
      console.log(`💰 Amount: Rs ${amount}`);
      console.log(`📅 Plan: ${planName} (${billingCycle})`);
      console.log("=".repeat(60) + "\n");
      return { success: true, messageId: "dev-mode-console-log" };
    }

    return { success: false, error: error.message };
  }
};

// Send password reset email
export const sendPasswordResetEmail = async (email, fullname, resetUrl) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: `"JobPortal" <${process.env.SMTP_USER || process.env.EMAIL_USER}>`,
    to: email,
    subject: `Reset Your Password - JobPortal`,
    html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0a0a0a;">
                <table role="presentation" style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td align="center" style="padding: 40px 0;">
                            <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse;">
                                <!-- Header -->
                                <tr>
                                    <td style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 30px 40px; border-radius: 16px 16px 0 0;">
                                        <h1 style="margin: 0; color: #fff; font-size: 28px; font-weight: 700;">
                                            🔐 Password Reset
                                        </h1>
                                    </td>
                                </tr>
                                
                                <!-- Body -->
                                <tr>
                                    <td style="background-color: #18181b; padding: 40px;">
                                        <h2 style="margin: 0 0 20px; color: #fff; font-size: 24px; font-weight: 600;">
                                            Hi ${fullname},
                                        </h2>
                                        <p style="margin: 0 0 20px; color: #a1a1aa; font-size: 16px; line-height: 1.6;">
                                            We received a request to reset your password for your JobPortal account. Click the button below to set a new password:
                                        </p>
                                        
                                        <!-- Reset Button -->
                                        <a href="${resetUrl}" 
                                           style="display: inline-block; background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); color: #000; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 16px; margin: 20px 0;">
                                            Reset Password →
                                        </a>
                                        
                                        <p style="margin: 30px 0 10px; color: #71717a; font-size: 14px; line-height: 1.6;">
                                            <strong style="color: #ef4444;">⚠️ This link will expire in 1 hour.</strong>
                                        </p>
                                        
                                        <p style="margin: 0 0 20px; color: #71717a; font-size: 14px; line-height: 1.6;">
                                            If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
                                        </p>
                                        
                                        <hr style="border: none; border-top: 1px solid #27272a; margin: 30px 0;">
                                        
                                        <p style="margin: 0; color: #52525b; font-size: 12px; line-height: 1.6;">
                                            If the button doesn't work, copy and paste this link into your browser:<br>
                                            <a href="${resetUrl}" style="color: #F59E0B; word-break: break-all;">${resetUrl}</a>
                                        </p>
                                    </td>
                                </tr>
                                
                                <!-- Footer -->
                                <tr>
                                    <td style="background-color: #0a0a0a; padding: 20px 40px; border-radius: 0 0 16px 16px; border: 1px solid #27272a; border-top: none;">
                                        <p style="margin: 0; color: #52525b; font-size: 12px; text-align: center;">
                                            © ${new Date().getFullYear()} JobPortal. All rights reserved.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
        `,
  };

  try {
    console.log(`Sending password reset email to ${email}...`);
    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Password reset email sent. MessageID:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("❌ Password reset email error:", error);

    // Development fallback
    if (process.env.NODE_ENV === "development") {
      console.log("\n" + "=".repeat(60));
      console.log("📧 PASSWORD RESET EMAIL - DEVELOPMENT MODE");
      console.log("=".repeat(60));
      console.log(`📨 To: ${email}`);
      console.log(`👤 Name: ${fullname}`);
      console.log(`🔗 Reset URL: ${resetUrl}`);
      console.log("=".repeat(60) + "\n");
      return { success: true, messageId: "dev-mode-console-log" };
    }

    throw new Error(`Failed to send password reset email: ${error.message}`);
  }
};

// Send interview reminder email
export const sendInterviewReminder = async (
  email,
  candidateName,
  interviewDetails,
) => {
  const transporter = createTransporter();
  const {
    jobTitle,
    companyName,
    interviewDate,
    interviewTime,
    interviewType = "video", // video, phone, in-person
    meetingLink,
    recruiterName,
    reminderType = "24h", // 24h, 1h, 15min
  } = interviewDetails;

  const formattedDate = new Date(interviewDate).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const reminderMessages = {
    "24h": "Your interview is tomorrow!",
    "1h": "Your interview starts in 1 hour!",
    "15min": "Your interview starts in 15 minutes!",
  };

  const urgencyColors = {
    "24h": "#3B82F6", // Blue
    "1h": "#F59E0B", // Yellow
    "15min": "#EF4444", // Red
  };

  const interviewEmojis = {
    video: "📹",
    phone: "📞",
    "in-person": "🏢",
  };

  const mailOptions = {
    from: `"JobPortal Interviews" <${process.env.SMTP_USER || process.env.EMAIL_USER}>`,
    to: email,
    subject: `${reminderType === "15min" ? "⏰ URGENT: " : ""}Interview Reminder - ${jobTitle} at ${companyName}`,
    html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
            </head>
            <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: #000000;">
                <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #000000; padding: 40px 20px;">
                    <tr>
                        <td align="center">
                            <table width="600" cellpadding="0" cellspacing="0">
                                <!-- Header -->
                                <tr>
                                    <td style="background: linear-gradient(135deg, ${urgencyColors[reminderType]} 0%, ${urgencyColors[reminderType]}80 100%); padding: 30px 40px; border-radius: 16px 16px 0 0; text-align: center;">
                                        <h1 style="margin: 0; color: #fff; font-size: 28px; font-weight: 700;">
                                            ${interviewEmojis[interviewType]} ${reminderMessages[reminderType]}
                                        </h1>
                                    </td>
                                </tr>
                                
                                <!-- Content -->
                                <tr>
                                    <td style="background-color: #18181b; padding: 40px; border: 1px solid #27272a; border-top: none;">
                                        <h2 style="margin: 0 0 20px; color: #fff; font-size: 20px;">
                                            Hi ${candidateName},
                                        </h2>
                                        <p style="margin: 0 0 30px; color: #a1a1aa; font-size: 16px; line-height: 1.6;">
                                            This is a reminder for your upcoming interview. Please ensure you're ready on time!
                                        </p>
                                        
                                        <!-- Interview Details Card -->
                                        <div style="background-color: #0a0a0a; border: 1px solid #27272a; border-radius: 12px; padding: 24px; margin-bottom: 30px;">
                                            <table width="100%" cellpadding="0" cellspacing="0">
                                                <tr>
                                                    <td style="padding: 8px 0;">
                                                        <span style="color: #71717a; font-size: 14px;">Position</span><br>
                                                        <span style="color: #fff; font-size: 16px; font-weight: 600;">${jobTitle}</span>
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td style="padding: 8px 0;">
                                                        <span style="color: #71717a; font-size: 14px;">Company</span><br>
                                                        <span style="color: #fff; font-size: 16px;">${companyName}</span>
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td style="padding: 8px 0;">
                                                        <span style="color: #71717a; font-size: 14px;">Date & Time</span><br>
                                                        <span style="color: #F59E0B; font-size: 18px; font-weight: 600;">${formattedDate} at ${interviewTime}</span>
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td style="padding: 8px 0;">
                                                        <span style="color: #71717a; font-size: 14px;">Interview Type</span><br>
                                                        <span style="color: #fff; font-size: 16px;">${interviewType.charAt(0).toUpperCase() + interviewType.slice(1)} Interview</span>
                                                    </td>
                                                </tr>
                                                ${
                                                  recruiterName
                                                    ? `
                                                <tr>
                                                    <td style="padding: 8px 0;">
                                                        <span style="color: #71717a; font-size: 14px;">Interviewer</span><br>
                                                        <span style="color: #fff; font-size: 16px;">${recruiterName}</span>
                                                    </td>
                                                </tr>
                                                `
                                                    : ""
                                                }
                                            </table>
                                        </div>
                                        
                                        ${
                                          meetingLink
                                            ? `
                                        <!-- Join Button -->
                                        <div style="text-align: center; margin-bottom: 30px;">
                                            <a href="${meetingLink}" 
                                               style="display: inline-block; background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: #fff; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 16px;">
                                                ${interviewType === "video" ? "🎥 Join Video Call" : "📞 Join Interview"}
                                            </a>
                                        </div>
                                        `
                                            : ""
                                        }
                                        
                                        <!-- Tips -->
                                        <div style="background-color: #1E3A8A20; border: 1px solid #3B82F640; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
                                            <p style="margin: 0 0 10px; color: #60A5FA; font-weight: 600; font-size: 14px;">💡 Quick Tips:</p>
                                            <ul style="margin: 0; padding-left: 20px; color: #93C5FD; font-size: 13px; line-height: 1.8;">
                                                <li>Test your camera and microphone beforehand</li>
                                                <li>Find a quiet, well-lit space</li>
                                                <li>Have your resume ready to discuss</li>
                                                <li>Prepare questions about the role</li>
                                            </ul>
                                        </div>
                                        
                                        <p style="margin: 0; color: #71717a; font-size: 14px; text-align: center;">
                                            Good luck! 🍀
                                        </p>
                                    </td>
                                </tr>
                                
                                <!-- Footer -->
                                <tr>
                                    <td style="background-color: #0a0a0a; padding: 20px 40px; border-radius: 0 0 16px 16px; border: 1px solid #27272a; border-top: none;">
                                        <p style="margin: 0; color: #52525b; font-size: 12px; text-align: center;">
                                            © ${new Date().getFullYear()} JobPortal. Good luck with your interview!
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
        `,
  };

  try {
    console.log(
      `📧 Sending interview reminder (${reminderType}) to ${email}...`,
    );
    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Interview reminder sent. MessageID:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("❌ Interview reminder email error:", error);

    // Development fallback
    if (process.env.NODE_ENV === "development") {
      console.log("\n" + "=".repeat(60));
      console.log(`📧 INTERVIEW REMINDER (${reminderType}) - DEV MODE`);
      console.log("=".repeat(60));
      console.log(`📨 To: ${email}`);
      console.log(`👤 Candidate: ${candidateName}`);
      console.log(`💼 Job: ${jobTitle} at ${companyName}`);
      console.log(`📅 Date: ${formattedDate} at ${interviewTime}`);
      console.log(`🔗 Link: ${meetingLink || "N/A"}`);
      console.log("=".repeat(60) + "\n");
      return { success: true, messageId: "dev-mode-console-log" };
    }

    throw new Error(`Failed to send interview reminder: ${error.message}`);
  }
};

// Send MCQ test invitation email
export const sendMCQTestInvitation = async (
  email,
  candidateName,
  testDetails,
) => {
  const transporter = createTransporter();
  const {
    jobTitle,
    companyName,
    testLink,
    expiresIn = "7 days",
    duration = 30,
    passingScore = 60,
  } = testDetails;

  const mailOptions = {
    from: `"JobPortal Assessments" <${process.env.SMTP_USER || process.env.EMAIL_USER}>`,
    to: email,
    subject: `🧠 MCQ Assessment Invitation - ${jobTitle} at ${companyName}`,
    html: `
            <!DOCTYPE html>
            <html>
            <head><meta charset="UTF-8"></head>
            <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: #000000;">
                <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #000000; padding: 40px 20px;">
                    <tr>
                        <td align="center">
                            <table width="600" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td style="background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%); padding: 30px 40px; border-radius: 16px 16px 0 0; text-align: center;">
                                        <h1 style="margin: 0; color: #fff; font-size: 28px;">🧠 MCQ Assessment</h1>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="background-color: #18181b; padding: 40px; border: 1px solid #27272a; border-top: none;">
                                        <h2 style="margin: 0 0 20px; color: #fff;">Hi ${candidateName},</h2>
                                        <p style="color: #a1a1aa; font-size: 16px; line-height: 1.6;">
                                            Congratulations! You've been selected to take the MCQ assessment for the <strong style="color: #F59E0B;">${jobTitle}</strong> position at <strong>${companyName}</strong>.
                                        </p>
                                        
                                        <div style="background-color: #0a0a0a; border: 1px solid #27272a; border-radius: 12px; padding: 24px; margin: 30px 0;">
                                            <p style="margin: 0 0 10px; color: #fff;"><strong>📝 Duration:</strong> ${duration} minutes</p>
                                            <p style="margin: 0 0 10px; color: #fff;"><strong>✅ Passing Score:</strong> ${passingScore}%</p>
                                            <p style="margin: 0; color: #EF4444;"><strong>⏰ Expires:</strong> ${expiresIn}</p>
                                        </div>
                                        
                                        <div style="text-align: center; margin: 30px 0;">
                                            <a href="${testLink}" style="display: inline-block; background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%); color: #fff; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 700;">
                                                Start MCQ Test →
                                            </a>
                                        </div>
                                        
                                        <div style="background-color: #FEF3C7; border-radius: 8px; padding: 16px;">
                                            <p style="margin: 0; color: #92400E; font-size: 13px;">
                                                ⚠️ <strong>Important:</strong> Once started, you cannot pause. Tab switching is monitored. Good luck!
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="background-color: #0a0a0a; padding: 20px; border-radius: 0 0 16px 16px; border: 1px solid #27272a; border-top: none; text-align: center;">
                                        <p style="margin: 0; color: #52525b; font-size: 12px;">© ${new Date().getFullYear()} JobPortal</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
        `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("✅ MCQ test invitation sent to", email);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("❌ MCQ test invitation error:", error);
    if (process.env.NODE_ENV === "development") {
      console.log(
        `📧 DEV: MCQ Test invitation for ${candidateName} - ${testLink}`,
      );
      return { success: true, messageId: "dev-mode" };
    }
    throw error;
  }
};

// =============== TRIAL & SUBSCRIPTION EMAILS ===============

// Send Trial Welcome Email to Students
export const sendTrialWelcomeEmail = async (email, fullname, trialEndDate) => {
  const transporter = createTransporter();
  const formattedEndDate = new Date(trialEndDate).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const mailOptions = {
    from: `"HIRE.OS" <${process.env.SMTP_USER || process.env.EMAIL_USER}>`,
    to: email,
    subject: "🎉 Welcome to HIRE.OS - Your Free Trial Has Started!",
    html: `
            <!DOCTYPE html>
            <html>
            <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: #0a0a0a;">
                <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
                    <tr>
                        <td align="center">
                            <table width="600" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #111111 0%, #1a1a1a 100%); border: 1px solid #FFD700; border-radius: 16px;">
                                <tr>
                                    <td style="padding: 40px; text-align: center;">
                                        <h1 style="color: #FFD700; margin: 0 0 10px; font-size: 32px;">HIRE.OS</h1>
                                        <p style="color: #666; margin: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 2px;">Your Career Command Center</p>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 0 40px 40px;">
                                        <h2 style="color: #fff; margin: 0 0 20px;">Welcome, ${fullname}! 🚀</h2>
                                        <p style="color: #aaa; font-size: 16px; line-height: 1.6;">
                                            Your <strong style="color: #FFD700;">30-day FREE trial</strong> has officially started!
                                        </p>
                                        
                                        <div style="background: #000; border: 1px solid #FFD700; border-radius: 8px; padding: 20px; margin: 20px 0;">
                                            <p style="color: #FFD700; margin: 0 0 10px; font-weight: bold;">🎁 FULL ACCESS UNLOCKED</p>
                                            <ul style="color: #ccc; margin: 0; padding-left: 20px; line-height: 1.8;">
                                                <li>AI Resume Analyzer</li>
                                                <li>Mock MCQ Tests with Gemini AI</li>
                                                <li>AI Mock Interviews</li>
                                                <li>Job Applications & Tracking</li>
                                                <li>Career Insights & Analytics</li>
                                            </ul>
                                        </div>
                                        
                                        <p style="color: #888; font-size: 14px;">
                                            ⏰ Your trial ends on <strong style="color: #FFD700;">${formattedEndDate}</strong>
                                        </p>
                                        
                                        <div style="text-align: center; margin: 30px 0;">
                                            <a href="${process.env.FRONTEND_URL || "http://localhost:5173"}/student/dashboard" style="display: inline-block; background: #FFD700; color: #000; padding: 16px 40px; text-decoration: none; border-radius: 4px; font-weight: bold; text-transform: uppercase;">
                                                Go to Dashboard →
                                            </a>
                                        </div>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="background: #000; padding: 20px; border-radius: 0 0 16px 16px; text-align: center;">
                                        <p style="color: #666; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} HIRE.OS - Industrial Grade Hiring</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
        `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Trial welcome email sent to", email);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("❌ Trial welcome email error:", error);
    throw error;
  }
};

// Send Trial Expiry Warning Email
export const sendTrialExpiryEmail = async (
  email,
  fullname,
  daysLeft,
  companyName = null,
) => {
  const transporter = createTransporter();
  const subject = companyName
    ? `⚠️ ${companyName} Subscription Expiring in ${daysLeft} Days`
    : `⚠️ Your HIRE.OS Trial Ends in ${daysLeft} Days`;

  const mailOptions = {
    from: `"HIRE.OS" <${process.env.SMTP_USER || process.env.EMAIL_USER}>`,
    to: email,
    subject,
    html: `
            <!DOCTYPE html>
            <html>
            <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: #0a0a0a;">
                <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
                    <tr>
                        <td align="center">
                            <table width="600" cellpadding="0" cellspacing="0" style="background: #111; border: 1px solid #F59E0B; border-radius: 16px;">
                                <tr>
                                    <td style="padding: 40px; text-align: center;">
                                        <h1 style="color: #F59E0B; margin: 0 0 20px; font-size: 48px;">⏰</h1>
                                        <h2 style="color: #fff; margin: 0;">Your ${companyName ? "Subscription" : "Trial"} Expires Soon</h2>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 0 40px 40px;">
                                        <p style="color: #aaa; font-size: 16px; line-height: 1.6;">
                                            Hi ${fullname},<br><br>
                                            You have <strong style="color: #F59E0B; font-size: 24px;">${daysLeft} days</strong> left on your ${companyName ? `${companyName} subscription` : "free trial"}.
                                        </p>
                                        
                                        <p style="color: #888; font-size: 14px;">
                                            Don't lose access to all the powerful features you've been using!
                                        </p>
                                        
                                        <div style="text-align: center; margin: 30px 0;">
                                            <a href="${process.env.FRONTEND_URL || "http://localhost:5173"}/company/pricing" style="display: inline-block; background: #F59E0B; color: #000; padding: 16px 40px; text-decoration: none; border-radius: 4px; font-weight: bold;">
                                                Upgrade Now →
                                            </a>
                                        </div>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
        `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Trial expiry warning sent to", email);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("❌ Trial expiry email error:", error);
    throw error;
  }
};

// Send Trial Expired Email
export const sendTrialExpiredEmail = async (email, fullname) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: `"HIRE.OS" <${process.env.SMTP_USER || process.env.EMAIL_USER}>`,
    to: email,
    subject: "🔒 Your HIRE.OS Trial Has Ended",
    html: `
            <!DOCTYPE html>
            <html>
            <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: #0a0a0a;">
                <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
                    <tr>
                        <td align="center">
                            <table width="600" cellpadding="0" cellspacing="0" style="background: #111; border: 1px solid #EF4444; border-radius: 16px;">
                                <tr>
                                    <td style="padding: 40px; text-align: center;">
                                        <h1 style="color: #EF4444; margin: 0 0 20px; font-size: 48px;">🔒</h1>
                                        <h2 style="color: #fff; margin: 0;">Your Trial Has Expired</h2>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 0 40px 40px;">
                                        <p style="color: #aaa; font-size: 16px; line-height: 1.6;">
                                            Hi ${fullname},<br><br>
                                            Your 30-day free trial has ended. Your account access has been restricted.
                                        </p>
                                        
                                        <p style="color: #888; font-size: 14px;">
                                            We hope HIRE.OS helped you in your career journey!
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
        `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Trial expired email sent to", email);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("❌ Trial expired email error:", error);
    throw error;
  }
};

// Send Subscription Expired Email to CEO
export const sendSubscriptionExpiryEmail = async (
  email,
  fullname,
  companyName,
) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: `"HIRE.OS" <${process.env.SMTP_USER || process.env.EMAIL_USER}>`,
    to: email,
    subject: `🔒 ${companyName} Subscription Has Expired`,
    html: `
            <!DOCTYPE html>
            <html>
            <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: #0a0a0a;">
                <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
                    <tr>
                        <td align="center">
                            <table width="600" cellpadding="0" cellspacing="0" style="background: #111; border: 1px solid #EF4444; border-radius: 16px;">
                                <tr>
                                    <td style="padding: 40px; text-align: center;">
                                        <h1 style="color: #EF4444; margin: 0 0 20px; font-size: 48px;">⚠️</h1>
                                        <h2 style="color: #fff; margin: 0;">Subscription Expired</h2>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 0 40px 40px;">
                                        <p style="color: #aaa; font-size: 16px; line-height: 1.6;">
                                            Hi ${fullname},<br><br>
                                            The subscription for <strong style="color: #FFD700;">${companyName}</strong> has expired.
                                        </p>
                                        
                                        <div style="background: #000; border: 1px solid #EF4444; border-radius: 8px; padding: 20px; margin: 20px 0;">
                                            <p style="color: #EF4444; margin: 0;">
                                                ⛔ All team members have lost access to HIRE.OS features.
                                            </p>
                                        </div>
                                        
                                        <div style="text-align: center; margin: 30px 0;">
                                            <a href="${process.env.FRONTEND_URL || "http://localhost:5173"}/company/pricing" style="display: inline-block; background: #FFD700; color: #000; padding: 16px 40px; text-decoration: none; border-radius: 4px; font-weight: bold;">
                                                Renew Subscription →
                                            </a>
                                        </div>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
        `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Subscription expiry email sent to", email);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("❌ Subscription expiry email error:", error);
    throw error;
  }
};

export default {
  generateOTP,
  saveOTP,
  verifyOTP,
  sendOTPEmail,
  sendWelcomeEmail,
  sendRecruiterInvitation,
  sendPaymentInvoice,
  sendPasswordResetEmail,
  sendInterviewReminder,
  sendMCQTestInvitation,
  sendTrialWelcomeEmail,
  sendTrialExpiryEmail,
  sendTrialExpiredEmail,
  sendSubscriptionExpiryEmail,
};
