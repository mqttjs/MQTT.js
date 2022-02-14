module.exports = {
  root: true,
  env: { 
    "node": true,
    "browser": true,
  },
  parser: '@typescript-eslint/parser',
  plugins: [
    '@typescript-eslint',
  ],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  overrides: [
    {
      "files": [ "types/**/*.ts" ]
    }
  ]
}