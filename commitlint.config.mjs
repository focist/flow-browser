/** @type {import('@commitlint/types').UserConfig} */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // CI/CD changes must use the `ci:` type, never a scope like `fix(ci)` /
    // `feat(ci)` — those read as app-code changes. Blocklist these as scopes so
    // commitlint rejects them and forces the `ci:` type instead.
    'scope-enum': [2, 'never', ['ci', 'cd', 'deploy', 'pipeline']],
  },
};
