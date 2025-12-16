import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
    // Sender information
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    senderRole: {
        type: String,
        enum: ['admin', 'recruiter', 'ceo', 'company_admin', 'student'],
        required: true
    },

    // Receiver information
    receiverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    receiverRole: {
        type: String,
        enum: ['admin', 'recruiter', 'ceo', 'company_admin', 'student'],
        required: true
    },

    // Message content
    subject: {
        type: String,
        required: true,
        maxLength: 200
    },
    content: {
        type: String,
        required: true,
        maxLength: 5000
    },

    // Message type for categorization
    type: {
        type: String,
        enum: ['general', 'interview', 'application', 'announcement', 'feedback', 'offer'],
        default: 'general'
    },

    // Priority level
    priority: {
        type: String,
        enum: ['low', 'normal', 'high', 'urgent'],
        default: 'normal'
    },

    // Related entities for context
    relatedTo: {
        applicationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Application'
        },
        jobId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Job'
        },
        interviewId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Interview'
        },
        companyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Company'
        }
    },

    // Read status
    isRead: {
        type: Boolean,
        default: false
    },
    readAt: {
        type: Date
    },

    // Attachments (optional)
    attachments: [{
        name: String,
        url: String,
        type: String, // 'pdf', 'image', 'document'
        size: Number
    }],

    // For threading/replies
    parentMessageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message'
    },

    // Soft delete
    isDeleted: {
        type: Boolean,
        default: false
    },
    deletedAt: Date,
    deletedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Indexes for efficient queries
messageSchema.index({ receiverId: 1, isRead: 1, createdAt: -1 });
messageSchema.index({ senderId: 1, createdAt: -1 });
messageSchema.index({ 'relatedTo.applicationId': 1 });
messageSchema.index({ 'relatedTo.jobId': 1 });
messageSchema.index({ type: 1 });

// Virtual for checking if message is recent (within 24 hours)
messageSchema.virtual('isRecent').get(function () {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return this.createdAt > oneDayAgo;
});

// Method to mark as read
messageSchema.methods.markAsRead = async function () {
    if (!this.isRead) {
        this.isRead = true;
        this.readAt = new Date();
        await this.save();
    }
    return this;
};

// Method to soft delete
messageSchema.methods.softDelete = async function (userId) {
    this.isDeleted = true;
    this.deletedAt = new Date();
    this.deletedBy = userId;
    await this.save();
    return this;
};

// Static method to get unread count for a user
messageSchema.statics.getUnreadCount = async function (userId) {
    return this.countDocuments({
        receiverId: userId,
        isRead: false,
        isDeleted: false
    });
};

// Static method to get inbox messages with pagination
messageSchema.statics.getInbox = async function (userId, options = {}) {
    const {
        page = 1,
        limit = 20,
        type = null,
        senderRole = null,
        isRead = null
    } = options;

    const query = {
        receiverId: userId,
        isDeleted: false
    };

    if (type) query.type = type;
    if (senderRole) query.senderRole = senderRole;
    if (isRead !== null) query.isRead = isRead;

    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
        this.find(query)
            .populate('senderId', 'fullname email profile.profilePhoto role')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
        this.countDocuments(query)
    ]);

    return {
        messages,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
        }
    };
};

// Static method to get sent messages
messageSchema.statics.getSentMessages = async function (userId, options = {}) {
    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const query = {
        senderId: userId,
        isDeleted: false
    };

    const [messages, total] = await Promise.all([
        this.find(query)
            .populate('receiverId', 'fullname email profile.profilePhoto role')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
        this.countDocuments(query)
    ]);

    return {
        messages,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
        }
    };
};

export const Message = mongoose.model('Message', messageSchema);
