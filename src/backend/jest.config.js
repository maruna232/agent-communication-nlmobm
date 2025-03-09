module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json' }]
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/__mocks__/**',
    '!src/types/**',
    '!src/server.ts',
    '!src/app.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85
    },
    './src/utils/': {
      branches: 90,
      functions: 95,
      lines: 95,
      statements: 95
    },
    './src/services/': {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov', 'clover', 'json'],
  verbose: true,
  testTimeout: 10000,
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  clearMocks: true,
  restoreMocks: true,
  resetMocks: true,
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  watchPathIgnorePatterns: ['/node_modules/', '/dist/'],
  globals: {
    'ts-jest': {
      isolatedModules: true
    }
  },
  reporters: [
    'default',
    ['jest-junit', { outputDirectory: './reports', outputName: 'jest-junit.xml' }]
  ],
  collectCoverage: false,
  errorOnDeprecated: true,
  maxWorkers: '50%'
};