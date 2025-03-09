/**
 * ESLint configuration for the AI Agent Network web application
 * This configuration enforces code quality standards, type safety, 
 * security best practices, and accessibility standards.
 */

module.exports = {
  // Treat this config as the root - won't look for configs in parent directories
  root: true,
  
  // TypeScript parser for ESLint
  parser: '@typescript-eslint/parser',
  
  // Parser options for TypeScript and React JSX
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    project: './tsconfig.json',
    tsconfigRootDir: '.',
    ecmaFeatures: {
      jsx: true,
    },
  },
  
  // Extends various ESLint configurations for different aspects
  extends: [
    'eslint:recommended', // Base ESLint recommended rules
    'plugin:@typescript-eslint/recommended', // TypeScript recommended rules
    'plugin:@typescript-eslint/recommended-requiring-type-checking', // TypeScript rules requiring type checking
    'plugin:react/recommended', // React recommended rules
    'plugin:react-hooks/recommended', // React Hooks recommended rules
    'plugin:jsx-a11y/recommended', // Accessibility recommended rules
    'plugin:security/recommended', // Security recommended rules
    'next/core-web-vitals', // Next.js core web vitals rules
    'plugin:prettier/recommended', // Prettier integration with ESLint
  ],
  
  // Plugins used in this configuration
  plugins: [
    '@typescript-eslint', // TypeScript rules
    'react', // React rules
    'react-hooks', // React Hooks rules
    'jsx-a11y', // Accessibility rules
    'security', // Security rules
    'prettier', // Prettier integration
    'import', // Import organization rules
  ],
  
  // Environment settings
  env: {
    browser: true, // Browser global variables
    es2022: true, // ES2022 features
    node: true, // Node.js global variables and Node.js scoping
    jest: true, // Jest global variables
  },
  
  // Additional settings
  settings: {
    // React version detection
    react: {
      version: 'detect',
    },
    // Import resolver for TypeScript
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
        project: './tsconfig.json',
      },
    },
  },
  
  // Custom rule configurations
  rules: {
    // Prettier integration
    'prettier/prettier': 'error',
    
    // Console usage (allow warn and error only)
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    
    // Unused variables (use TypeScript version)
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    
    // TypeScript rules
    '@typescript-eslint/explicit-function-return-type': ['error', { allowExpressions: true }],
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unsafe-assignment': 'error',
    '@typescript-eslint/no-unsafe-member-access': 'error',
    '@typescript-eslint/no-unsafe-call': 'error',
    '@typescript-eslint/no-unsafe-return': 'error',
    '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true, allowBoolean: true }],
    '@typescript-eslint/require-await': 'error',
    '@typescript-eslint/await-thenable': 'error',
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: false }],
    
    // React rules
    'react/prop-types': 'off', // TypeScript handles prop validation
    'react/react-in-jsx-scope': 'off', // Not needed with Next.js
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    
    // Accessibility rules
    'jsx-a11y/anchor-is-valid': [
      'error',
      {
        components: ['Link'],
        specialLink: ['hrefLeft', 'hrefRight'],
        aspects: ['invalidHref', 'preferButton'],
      },
    ],
    
    // Import organization
    'import/order': [
      'error',
      {
        groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
        'newlines-between': 'always',
        alphabetize: {
          order: 'asc',
          caseInsensitive: true,
        },
      },
    ],
    'import/no-duplicates': 'error',
    'import/first': 'error',
    'import/newline-after-import': 'error',
    
    // Code complexity and style
    'max-len': ['error', { code: 120, ignoreUrls: true, ignoreStrings: true, ignoreTemplateLiterals: true }],
    'complexity': ['warn', 15],
    'no-var': 'error',
    'prefer-const': 'error',
    'eqeqeq': ['error', 'always'],
    'curly': ['error', 'all'],
    'no-throw-literal': 'error',
    'prefer-promise-reject-errors': 'error',
    
    // Disable some overly strict security rules that cause false positives
    'security/detect-object-injection': 'off',
  },
  
  // Rule overrides for specific file patterns
  overrides: [
    // Test files
    {
      files: [
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/__tests__/**/*.ts',
        '**/__tests__/**/*.tsx',
        '**/__mocks__/**/*.ts',
        '**/__mocks__/**/*.tsx',
      ],
      env: {
        jest: true,
      },
      rules: {
        // Relax some TypeScript rules for tests
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unsafe-assignment': 'off',
        '@typescript-eslint/no-unsafe-member-access': 'off',
        '@typescript-eslint/no-unsafe-call': 'off',
        '@typescript-eslint/no-unsafe-return': 'off',
        '@typescript-eslint/explicit-function-return-type': 'off',
        'security/detect-object-injection': 'off',
      },
    },
    // Next.js pages and app directory
    {
      files: ['src/pages/**/*.tsx', 'src/pages/**/*.ts', 'src/app/**/*.tsx', 'src/app/**/*.ts'],
      rules: {
        // Allow default exports for Next.js pages and app components
        'import/no-default-export': 'off',
      },
    },
  ],
};