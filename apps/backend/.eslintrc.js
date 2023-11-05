module.exports = {
  parser: '@typescript-eslint/parser',
  extends: [
    'airbnb-base',
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
    'plugin:typescript-sort-keys/recommended',
  ],
  plugins: ['@typescript-eslint', 'prettier', 'typescript-sort-keys'],
  settings: {
    'import/resolver': {
      node: {
        extensions: ['.js', '.ts'],
        paths: ['src'],
      },
      typescript: {
        project: 'apps/backend/tsconfig.json',
      },
    },
  },
  env: {
    es6: true,
    node: true,
  },
  rules: {
    'import/order': [
      'error',
      {
        'newlines-between': 'always',
        alphabetize: { order: 'asc' },
        groups: [
          'external',
          'builtin',
          'internal',
          ['sibling', 'parent', 'index'],
          'type',
          'unknown',
        ],
        pathGroups: [
          {
            pattern: '{express}',
            group: 'external',
            position: 'before',
          },
          {
            pattern: '@/{services,modules}/**',
            group: 'internal',
            position: 'before',
          },
        ],
      },
    ],
    'import/extensions': [
      'error',
      'ignorePackages',
      {
        ts: 'never',
        js: 'never',
      },
    ],
    'prettier/prettier': 'error',
    'typescript-sort-keys/interface': 'warn',
    'typescript-sort-keys/string-enum': 'warn',
    'no-console': 'off',
    'import/prefer-default-export': 'off',
  },
}
