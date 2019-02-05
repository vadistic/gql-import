module.exports = {
  preset: 'ts-jest',
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!**/node_modules/**']
}
