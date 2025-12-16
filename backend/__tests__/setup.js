import { jest } from '@jest/globals';

/**
 * Jest Test Setup
 * Global configuration for all tests
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.SECRET_KEY = 'test-secret-key-for-jwt';
process.env.FRONTEND_URL = 'http://localhost:5173';

// Global test timeout
jest.setTimeout(30000);

// Mock console for cleaner test output (optional)
if (process.env.SUPPRESS_LOGS) {
    global.console = {
        ...console,
        log: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    };
}

// Global test helpers
global.testHelpers = {
    /**
     * Generate a valid MongoDB ObjectId string
     */
    generateObjectId: () => {
        const hex = '0123456789abcdef';
        let id = '';
        for (let i = 0; i < 24; i++) {
            id += hex[Math.floor(Math.random() * 16)];
        }
        return id;
    },

    /**
     * Generate test user data
     */
    generateUser: (overrides = {}) => ({
        fullname: 'Test User',
        email: `test${Date.now()}@example.com`,
        phoneNumber: `+1${Math.floor(1000000000 + Math.random() * 9000000000)}`,
        password: 'TestPassword123!',
        role: 'student',
        ...overrides
    }),

    /**
     * Generate test job data
     */
    generateJob: (companyId, userId, overrides = {}) => ({
        title: 'Software Engineer',
        description: 'Looking for an experienced software engineer to join our team. ' +
            'You will be working on exciting projects with cutting-edge technology.',
        requirements: ['JavaScript', 'React', 'Node.js'],
        skills: ['JavaScript', 'TypeScript', 'React'],
        salary: 75000,
        location: 'Remote',
        jobType: 'Full-time',
        experienceLevel: 2,
        position: 1,
        company: companyId,
        created_by: userId,
        ...overrides
    }),

    /**
     * Wait for specified milliseconds
     */
    wait: (ms) => new Promise(resolve => setTimeout(resolve, ms))
};

// Cleanup after all tests
afterAll(async () => {
    // Add any global cleanup here
    // e.g., close database connections, clear mocks
    jest.clearAllMocks();
});
