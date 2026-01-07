import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  project: ['src/**/*.ts'],
  ignore: ['dist/**'],
  ignoreDependencies: [
    // Peer dependencies or optional dependencies can be listed here
  ],
};

export default config;
