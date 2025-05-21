import typescript from 'rollup-plugin-typescript2';
import terser from '@rollup/plugin-terser';
import serve from 'rollup-plugin-serve';
import replace from '@rollup/plugin-replace';
import { logCardInfo, defaultPlugins } from './rollup.config.helper.mjs';

import { version } from './package.json';

const dev = process.env.ROLLUP_WATCH ? true : false;
const port = process.env.PORT || 8235;
const currentVersion = dev ? 'DEVELOPMENT' : `v${version}`;
const custombanner = logCardInfo(currentVersion);

const fileOutput = dev ? './dist/vehicle-status-card.js' : './build/vehicle-status-card.js';

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
  'process.env.ROLLUP_WATCH': JSON.stringify(dev),
  preventAssignment: true,
};

const plugins = [
  replace(replaceOpts),
  dev && serve(serveopts),
  !dev && terser(terserOpt),
  typescript({
    sourceMap: dev,
    outputToFilesystem: true,
  }),
];

export default [
  {
    input: 'src/vehicle-status-card.ts',
    output: [
      {
        file: fileOutput,
        format: 'es',
        sourcemap: dev,
        inlineDynamicImports: true,
        banner: custombanner,
      },
    ],
    watch: {
      chokidar: {
        // Workaround for WSL2-based Docker
        usePolling: true,
      },
    },
    plugins: [...defaultPlugins, ...plugins],
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
