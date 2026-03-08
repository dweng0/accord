import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  globals: {
    'ts-jest': {
      tsconfig: {
        jsx: 'react',
      },
    },
  },
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        useESM: true,
        isolatedModules: true,
        tsconfig: {
          module: 'ESNext',
          moduleResolution: 'node',
          strict: false,
          strictNullChecks: false,
          strictFunctionTypes: false,
          strictBindCallApply: false,
          strictPropertyInitialization: false,
          noImplicitAny: false,
          noImplicitThis: false,
        },
      },
    ],
  },
  transformIgnorePatterns: ['/node_modules/(?!(viem)/)'],
  moduleNameMapper: {
    '^viem$': '<rootDir>/../../node_modules/viem/_cjs/index.js',
    '^viem/(.*)$': '<rootDir>/../../node_modules/viem/_cjs/$1/index.js',
  },
  testMatch: ['<rootDir>/src/**/__tests__/**/*.test.ts'],
  verbose: true,
};

export default config;
