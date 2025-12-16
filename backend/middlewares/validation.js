// Input validation middleware for enhanced security

// Email validation regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Password strength validation
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

// Validation helper functions
export const validateEmail = (email) => {
    return emailRegex.test(email);
};

export const validatePassword = (password) => {
    const errors = [];
    if (password.length < 8) errors.push("Password must be at least 8 characters");
    if (!/[a-z]/.test(password)) errors.push("Password must contain a lowercase letter");
    if (!/[A-Z]/.test(password)) errors.push("Password must contain an uppercase letter");
    if (!/\d/.test(password)) errors.push("Password must contain a number");
    if (!/[@$!%*?&]/.test(password)) errors.push("Password must contain a special character (@$!%*?&)");
    return errors;
};

export const validatePhoneNumber = (phone) => {
    // Accept various phone formats
    const phoneRegex = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;
    return phoneRegex.test(phone.toString());
};

// Sanitize input to prevent XSS
export const sanitizeInput = (str) => {
    if (typeof str !== 'string') return str;
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .trim();
};

// Middleware for registration validation
export const validateRegistration = (req, res, next) => {
    const { fullname, email, phoneNumber, password, role } = req.body;
    const errors = [];

    // Validate fullname
    if (!fullname || fullname.trim().length < 2) {
        errors.push("Full name must be at least 2 characters");
    }
    if (fullname && fullname.length > 100) {
        errors.push("Full name must not exceed 100 characters");
    }

    // Validate email
    if (!email) {
        errors.push("Email is required");
    } else if (!validateEmail(email)) {
        errors.push("Please enter a valid email address");
    }

    // Validate phone number
    if (!phoneNumber) {
        errors.push("Phone number is required");
    } else if (!validatePhoneNumber(phoneNumber)) {
        errors.push("Please enter a valid phone number");
    }

    // Validate password
    if (!password) {
        errors.push("Password is required");
    } else {
        const passwordErrors = validatePassword(password);
        errors.push(...passwordErrors);
    }

    // Validate role
    if (!role) {
        errors.push("Role is required");
    } else if (!['student', 'recruiter', 'company_admin'].includes(role)) {
        errors.push("Invalid role. Must be 'student', 'recruiter', or 'company_admin'");
    }

    if (errors.length > 0) {
        return res.status(400).json({
            message: "Validation failed",
            errors,
            success: false
        });
    }

    // Sanitize inputs
    req.body.fullname = sanitizeInput(fullname);
    req.body.email = email.toLowerCase().trim();

    next();
};

// Middleware for login validation
export const validateLogin = (req, res, next) => {
    const { email, password, role } = req.body;
    const errors = [];

    if (!email) {
        errors.push("Email is required");
    } else if (!validateEmail(email)) {
        errors.push("Please enter a valid email address");
    }

    if (!password) {
        errors.push("Password is required");
    }

    if (!role) {
        errors.push("Role is required");
    } else if (!['student', 'recruiter', 'company_admin'].includes(role)) {
        errors.push("Invalid role");
    }

    if (errors.length > 0) {
        return res.status(400).json({
            message: "Validation failed",
            errors,
            success: false
        });
    }

    req.body.email = email.toLowerCase().trim();
    next();
};

// Middleware for job posting validation
export const validateJobPosting = (req, res, next) => {
    const { title, description, requirements, salary, location, jobType, experience, position, companyId } = req.body;
    const errors = [];

    if (!title || title.trim().length < 3) {
        errors.push("Job title must be at least 3 characters");
    }
    if (!description || description.trim().length < 50) {
        errors.push("Job description must be at least 50 characters");
    }
    if (!requirements) {
        errors.push("Job requirements are required");
    }
    if (!salary || isNaN(Number(salary)) || Number(salary) < 0) {
        errors.push("Valid salary is required");
    }
    if (!location || location.trim().length < 2) {
        errors.push("Location is required");
    }
    if (!jobType) {
        errors.push("Job type is required");
    }
    if (experience === undefined || experience === null) {
        errors.push("Experience level is required");
    }
    if (!position || isNaN(Number(position)) || Number(position) < 1) {
        errors.push("Number of positions must be at least 1");
    }
    if (!companyId) {
        errors.push("Company is required");
    }

    if (errors.length > 0) {
        return res.status(400).json({
            message: "Validation failed",
            errors,
            success: false
        });
    }

    // Sanitize inputs
    req.body.title = sanitizeInput(title);
    req.body.description = sanitizeInput(description);
    req.body.location = sanitizeInput(location);

    next();
};

// Middleware for profile update validation
export const validateProfileUpdate = (req, res, next) => {
    const { email, phoneNumber, bio, skills } = req.body;
    const errors = [];

    if (email && !validateEmail(email)) {
        errors.push("Please enter a valid email address");
    }

    if (phoneNumber && !validatePhoneNumber(phoneNumber)) {
        errors.push("Please enter a valid phone number");
    }

    if (bio && bio.length > 500) {
        errors.push("Bio must not exceed 500 characters");
    }

    if (errors.length > 0) {
        return res.status(400).json({
            message: "Validation failed",
            errors,
            success: false
        });
    }

    // Sanitize inputs
    if (bio) req.body.bio = sanitizeInput(bio);
    if (email) req.body.email = email.toLowerCase().trim();

    next();
};

export default {
    validateRegistration,
    validateLogin,
    validateJobPosting,
    validateProfileUpdate,
    validateEmail,
    validatePassword,
    sanitizeInput
};
