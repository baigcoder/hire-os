// Note: dotenv is NOT needed for Vercel - environment variables are set in the Vercel dashboard
import { app } from "../index.js";
import connectDB from "../utils/db.js";

// Initialize database connection for Vercel serverless
let isConnected = false;
let dbConnectionPromise = null;

const handler = async (req, res) => {
  try {
    // Only connect once (connection pooling for serverless)
    // Use a promise to prevent race conditions on cold start
    if (!isConnected) {
      if (!dbConnectionPromise) {
        dbConnectionPromise = connectDB()
          .then(() => {
            isConnected = true;
            console.log("✅ Database connected for Vercel serverless function");
          })
          .catch((error) => {
            dbConnectionPromise = null; // Allow retry on next request
            throw error;
          });
      }

      try {
        await dbConnectionPromise;
      } catch (error) {
        console.error("❌ Failed to connect to database:", error.message);
        console.error("Stack:", error.stack);
        return res.status(500).json({
          success: false,
          message: "Database connection failed",
          error: process.env.NODE_ENV === "development"
            ? error.message
            : "Internal server error",
        });
      }
    }

    // Pass the request to Express
    return app(req, res);
  } catch (error) {
    console.error("❌ Serverless handler error:", error.message);
    console.error("Stack:", error.stack);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === "development"
        ? error.message
        : "Internal server error",
    });
  }
};

// Export the handler as the Vercel function
export default handler;
