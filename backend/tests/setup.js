import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import cache from '../utils/cache.js';

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
        await mongoServer.stop();
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
