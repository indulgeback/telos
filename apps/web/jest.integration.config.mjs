import nextJest from 'next/jest.js'

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  displayName: 'Integration Tests',
  setupFilesAfterEnv: ['<rootDir>/jest.integration.setup.js'],
  testEnvironment: 'jsdom',
  testMatch: ['<rootDir>/src/__tests__/integration/**/*.test.{js,jsx,ts,tsx}'],
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-resizable-panels|@radix-ui)/)',
  ],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/app/**/layout.tsx',
    '!src/app/**/page.tsx',
    '!src/app/**/loading.tsx',
    '!src/app/**/error.tsx',
    '!src/app/**/not-found.tsx',
    '!src/__tests__/**',
    '!src/__mocks__/**',
  ],
  testTimeout: 30000,
  maxWorkers: 2,
}

export default createJestConfig(customJestConfig)
