export default {
  testEnvironment: "node",
  transform: {}, // Native ESM support
  setupFilesAfterEnv: ["./tests/setup.js"],
  verbose: true,
  testTimeout: 600000,
  collectCoverage: true,
  coverageDirectory: "coverage",
  coveragePathIgnorePatterns: ["/node_modules/", "/tests/"],
};
