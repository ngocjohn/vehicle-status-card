/**
 * @type {import('semantic-release').GlobalConfig}
 */
export default {
  plugins: [
    [
      '@semantic-release/commit-analyzer',
      {
        preset: 'conventionalcommits',
      },
    ],
    [
      '@semantic-release/release-notes-generator',
      {
        preset: 'conventionalcommits',
        presetConfig: {
          types: [
            { type: 'feat', section: 'Features' },
            { type: 'fix', section: 'Bug Fixes' },
            { type: 'Fix', section: 'Bug Fixes' },
            { type: 'docs', hidden: false, section: 'Documentation' },
            { type: 'doc', hidden: false, section: 'Documentation' },
            { type: 'chore', hidden: true, section: 'Chores' },
          ],
        },
      },
    ],
    '@semantic-release/changelog',
    [
      '@semantic-release/npm',
      {
        npmPublish: false,
      },
    ],
  ],
  preset: 'conventionalcommits',
  branches: [{ name: 'main' }, { name: 'dev', channel: 'beta', prerelease: true }],
};
