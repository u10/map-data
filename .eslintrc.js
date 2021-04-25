/* eslint-disable no-underscore-dangle */
const __DEV__ = process.env.NODE_ENV === 'development';

module.exports = {
  root: true,
  env: {
    node: true,
  },
  extends: [
    'airbnb-base',
    'plugin:@typescript-eslint/recommended',
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  settings: {},
  parserOptions: {
    ecmaVersion: 2020,
  },
  rules: {
    'no-console': [__DEV__ ? 'warn' : 'off'],
    'no-debugger': [__DEV__ ? 'warn' : 'off'],
  },
};
