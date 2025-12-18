// jest.config.js
export default {
    preset: 'ts-jest',
    testEnvironment: 'jest-environment-jsdom',
    setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
    moduleNameMapper: {
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
        '^@/(.*)$': '<rootDir>/src/$1',
    },
    transform: {
        '^.+\\.tsx?$': ['ts-jest', {
            tsconfig: 'tsconfig.json',
            useESM: true,
        }],
    },
    testMatch: [
        '**/__tests__/**/*.test.(ts|tsx)',
        '**/?(*.)+(spec|test).(ts|tsx)'
    ],
    collectCoverageFrom: [
        'src/**/*.{ts,tsx}',
        '!src/**/*.d.ts',
        '!src/main.tsx',
        '!src/vite-env.d.ts',
    ],
    moduleDirectories: ['node_modules', 'src'],
    extensionsToTreatAsEsm: ['.ts', '.tsx'],
    testPathIgnorePatterns: [
        "<rootDir>/node_modules/",
        "<rootDir>/tests/e2e/"
    ],
};