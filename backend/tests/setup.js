import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import cache from "../utils/cache.js";

// CI runs `npm test` with no env; every suite needs a JWT secret (setup
// files run before each test file's imports, so this applies to all)
process.env.SECRET_KEY = process.env.SECRET_KEY || "test-secret-key";
process.env.NODE_ENV = process.env.NODE_ENV || "test";

let mongoServer;

beforeAll(async () => {
  // Disconnect from any existing connection
  await mongoose.disconnect();

  // Start in-memory MongoDB
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();

  // Connect Mongoose to the in-memory DB
  await mongoose.connect(uri);
  console.log(`📝 Connected to in-memory MongoDB for testing`);
});

afterAll(async () => {
  // Cleanup
  await mongoose.disconnect();
  if (mongoServer) {
    // Remove the temporary database folder even if files are still locked:
    // leftovers of these filled the system temp drive during development
    await mongoServer.stop({ doCleanup: true, force: true });
  }
  // Close Redis connection
  await cache.disconnect();
});

afterEach(async () => {
  // Clear all data between tests
  if (mongoose.connection.readyState === 1) {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany();
    }
  }
});
