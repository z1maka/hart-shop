import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'
import nextTypescript from 'eslint-config-next/typescript'

const forbidDrizzleOutsideRepository = {
  patterns: [
    {
      group: ['@/lib/db', '@/db/schema', '@/db/migrations/*'],
      message: 'Database access is only allowed inside features/*/repository. See AGENTS.md §2.',
    },
  ],
}

const config = [
  ...nextCoreWebVitals,
  ...nextTypescript,

  {
    ignores: [
      '.next/**',
      'coverage/**',
      'design/**',
      'design-source/**',
      'node_modules/**',
      'src/db/migrations/**',
      'next-env.d.ts',
    ],
  },

  {
    rules: {
      'no-console': 'error',
      'no-restricted-syntax': [
        'error',
        {
          selector: 'TSEnumDeclaration',
          message: 'Use a const object + derived type instead of a TS enum. See AGENTS.md §5.',
        },
        {
          selector: 'TSNonNullExpression',
          message:
            'Non-null assertions are forbidden. Use a guard or ?? instead. See AGENTS.md §6.',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'prefer-const': 'error',
      'no-nested-ternary': 'error',
    },
  },

  {
    files: ['src/app/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            ...forbidDrizzleOutsideRepository.patterns,
            {
              group: ['@/features/*/repository/*', '@/features/*/services/*'],
              message: 'Import a feature through its public barrel: @/features/<name>.',
            },
          ],
        },
      ],
    },
  },

  {
    files: ['src/features/*/model/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                'react',
                'react-dom',
                'next',
                'next/*',
                '@/lib/db',
                '@/db/schema',
                '@/db/migrations/*',
              ],
              message: 'model/ must stay pure: no React, no Next, no database. See AGENTS.md §2.',
            },
          ],
        },
      ],
    },
  },

  {
    files: ['src/features/*/services/**/*.ts', 'src/features/*/queries/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', forbidDrizzleOutsideRepository],
    },
  },

  {
    files: ['src/components/ui/**/*.{ts,tsx}', 'src/lib/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/features/*'],
              message: 'Shared layers must not depend on features. See AGENTS.md §2.',
            },
          ],
        },
      ],
    },
  },

  {
    files: ['src/lib/logger.ts', 'src/lib/env.ts', 'scripts/**/*.ts', 'next.config.ts'],
    rules: { 'no-console': 'off' },
  },
]

export default config
