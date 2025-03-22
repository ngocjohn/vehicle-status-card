import typescriptEslintRecommended from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import perfectionist from 'eslint-plugin-perfectionist';
import unusedImports from 'eslint-plugin-unused-imports';

export default [
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': typescriptEslintRecommended,
      perfectionist,
      'unused-imports': unusedImports,
    },
    rules: {
      // TypeScript recommended rules
      '@typescript-eslint/no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': 'warn',
      // Perfectionist sort-imports rule
      'perfectionist/sort-imports': [
        'warn',
        {
          type: 'alphabetical',
          order: 'asc',
          ignoreCase: true,
          newlinesBetween: 'always',
          maxLineLength: undefined,
          groups: [
            ['external', 'builtin'],
            ['parent-type', 'sibling-type', 'index-type'],
            ['parent', 'sibling', 'index'],
            'type',
            'internal-type',
            'internal',
            'object',
            'unknown',
          ],
          customGroups: { type: {}, value: {} },
          environment: 'node',
        },
      ],
    },
  },
];
