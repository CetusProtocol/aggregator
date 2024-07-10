// jest.config.mjs
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: './tsconfig.json'
    }]
  },
  moduleNameMapper: {
    '^~/(.*)$': '<rootDir>/src/$1'
  }
};
