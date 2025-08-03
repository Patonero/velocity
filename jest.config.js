/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "jsdom",

  // Test file patterns
  testMatch: ["**/src/tests/**/*.test.ts", "**/src/tests/**/*.test.js"],

  // TypeScript configuration
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        tsconfig: "tsconfig.test.json",
      },
    ],
  },

  // Module file extensions
  moduleFileExtensions: ["ts", "js", "json"],

  // Coverage settings
  collectCoverage: true,
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html"],
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/tests/**/*",
    "!src/**/*.d.ts",
    "!dist/**/*",
  ],

  // Setup files
  setupFilesAfterEnv: ["<rootDir>/src/tests/setup.ts"],


  // Increase timeout for integration tests
  testTimeout: 10000,

  // Clear mocks between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
};
