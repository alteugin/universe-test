/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  moduleFileExtensions: ['js', 'json', 'ts'],
  testRegex: '\\.spec\\.ts$',
  collectCoverageFrom: ['src/**/*.ts'],
  coveragePathIgnorePatterns: ['/node_modules/', '/dist/', 'main\\.ts$', '\\.module\\.ts$'],
  moduleNameMapper: {
    '^@universe-test/contracts$': '<rootDir>/../../packages/contracts/src/index.ts',
  },
};
