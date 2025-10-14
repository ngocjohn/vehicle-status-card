import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';
import replace from '@rollup/plugin-replace';
import serve from 'rollup-plugin-serve';

import { logCardInfo, defaultPlugins } from './rollup.config.helper.mjs';

import { version } from './package.json';

const dev = process.env.ROLLUP_WATCH;
const port = process.env.PORT || 8235;
const debug = process.env.DEBUG;

const currentVersion = dev ? 'DEVELOPMENT' : `v${version}`;
const custombanner = logCardInfo(currentVersion);

const fileOutput = dev ? 'dist/vehicle-status-card.js' : 'build/vehicle-status-card.js';

const serveopts = {
  contentBase: ['./dist'],
  port,
  allowCrossOrigin: true,
  headers: {
    'Access-Control-Allow-Origin': '*',
  },
};

const terserOpt = {
  module: true,
  compress: {
    drop_console: ['log', 'error'],
    module: false,
  },
};

const replaceOpts = {
  preventAssignment: true,
  'process.env.DEBUG': JSON.stringify(debug),
  __DEBUG__: debug || false,
};

const plugins = [dev && serve(serveopts), !dev && terser(terserOpt)];

export default [
  {
    input: 'src/vehicle-status-card.ts',
    output: [
      {
        file: fileOutput,
        format: 'es',
        inlineDynamicImports: true,
        sourcemap: dev,
        banner: custombanner,
      },
    ],
    watch: {
      exclude: 'node_modules/**',
    },
    plugins: [replace(replaceOpts), typescript({ declaration: false }), ...defaultPlugins, ...plugins],
    moduleContext: (id) => {
      const thisAsWindowForModules = [
        'node_modules/@formatjs/intl-utils/lib/src/diff.js',
        'node_modules/@formatjs/intl-utils/lib/src/resolve-locale.js',
      ];
      if (thisAsWindowForModules.some((id_) => id.trimRight().endsWith(id_))) {
        return 'window';
      }
    },
    onwarn(warning, warn) {
      if (warning.code === 'CIRCULAR_DEPENDENCY') return; // Ignore circular dependency warnings
      warn(warning); // Display other warnings
    },
  },
];
