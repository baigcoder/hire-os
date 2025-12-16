import mongoose from "mongoose";

const connectDB = async () => {
    try {
        const mongoUri = process.env.MONGO_URI;

        if (!mongoUri) {
            throw new Error('MONGO_URI is not defined in environment variables');
        }

        // MongoDB connection options optimized for Atlas
        const options = {
            // Connection pool settings
            maxPoolSize: 10,
            minPoolSize: 5,

            // Timeout settings
            serverSelectionTimeoutMS: 10000, // Timeout for server selection
            socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity

            // Heartbeat settings
            heartbeatFrequencyMS: 10000,

            // Retry settings
            retryWrites: true,
            retryReads: true,
        };

        // Connect to MongoDB
        const conn = await mongoose.connect(mongoUri, options);

        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
        console.log(`📊 Database: ${conn.connection.name}`);

        // Connection event handlers
        mongoose.connection.on('connected', () => {
            console.log('📗 Mongoose connected to MongoDB');
        });

        mongoose.connection.on('error', (err) => {
            console.error('📕 Mongoose connection error:', err);
        });

        mongoose.connection.on('disconnected', () => {
            console.log('📙 Mongoose disconnected from MongoDB');
        });

        // Handle application termination
        process.on('SIGINT', async () => {
            await mongoose.connection.close();
            console.log('📗 MongoDB connection closed through app termination');
            process.exit(0);
        });

        return conn;
    } catch (error) {
        console.error('❌ MongoDB Connection Error:', error.message);

        // Provide helpful error messages
        if (error.message.includes('ECONNREFUSED')) {
            console.error('💡 Tip: Make sure MongoDB is running locally or check your Atlas connection string');
        } else if (error.message.includes('authentication failed')) {
            console.error('💡 Tip: Check your MongoDB Atlas username and password');
        } else if (error.message.includes('network')) {
            console.error('💡 Tip: Check your network connection and MongoDB Atlas IP whitelist');
        }

        // Exit process with failure in production
        if (process.env.NODE_ENV === 'production') {
            process.exit(1);
        }

        throw error;
    }
};

// Helper function to check database health
export const checkDBHealth = async () => {
    try {
        const state = mongoose.connection.readyState;
        const states = {
            0: 'disconnected',
            1: 'connected',
            2: 'connecting',
            3: 'disconnecting'
        };

        return {
            status: states[state] || 'unknown',
            isConnected: state === 1,
            host: mongoose.connection.host,
            database: mongoose.connection.name
        };
    } catch (error) {
        return {
            status: 'error',
            isConnected: false,
            error: error.message
        };
    }
};

export default connectDB;