import dotenv from "dotenv";
import { app } from "../index.js";
import connectDB from "../utils/db.js";

// Load environment variables
dotenv.config();

// Initialize database connection for Vercel serverless
let isConnected = false;

const handler = async (req, res) => {
  // Only connect once (connection pooling for serverless)
  if (!isConnected) {
    try {
      await connectDB();
      isConnected = true;
      console.log("✅ Database connected for Vercel serverless function");
    } catch (error) {
      console.error("❌ Failed to connect to database:", error.message);
      return res.status(500).json({
        success: false,
        message: "Database connection failed",
        error:
          process.env.NODE_ENV === "development"
            ? error.message
            : "Internal server error",
      });
    }
  }

  // Pass the request to Express
  return app(req, res);
};

// Export the handler as the Vercel function
export default handler;
