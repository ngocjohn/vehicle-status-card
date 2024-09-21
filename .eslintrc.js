module.exports = {
  parser: '@typescript-eslint/parser', // Specifies the ESLint parser
  parserOptions: {
    ecmaVersion: 2020, // Allows for the parsing of modern ECMAScript features
    sourceType: 'module', // Allows for the use of imports
  },
  extends: ['plugin:@typescript-eslint/recommended'],
  plugins: ['perfectionist'],
  rules: {
    'perfectionist/sort-imports': [
      'error',
      {
        type: 'alphabetical',
        order: 'asc',
        ignoreCase: true,
        internalPattern: ['~/**'],
        newlinesBetween: 'always',
        maxLineLength: undefined,
        groups: [
          'type',
          ['builtin', 'external'],
          'internal-type',
          'internal',
          ['parent-type', 'sibling-type', 'index-type'],
          ['parent', 'sibling', 'index'],
          'object',
          'unknown',
        ],
        customGroups: { type: {}, value: {} },
        environment: 'node',
      },
    ],
  },
};
