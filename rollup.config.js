import terser from '@rollup/plugin-terser';
import serve from 'rollup-plugin-serve';
import filesize from 'rollup-plugin-filesize';
import replace from '@rollup/plugin-replace';
import { version } from './package.json';
import { logCardInfo, defaultPlugins } from './rollup.config.helper.mjs';

const dev = process.env.ROLLUP_WATCH;
const port = process.env.PORT || 8235;
const currentVersion = dev ? 'DEVELOPMENT' : `v${version}`;
const custombanner = logCardInfo(currentVersion);

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

const plugins = [replace(replaceOpts), dev && serve(serveopts), !dev && terser(terserOpt), !dev && filesize()];

export default [
  {
    input: 'src/vehicle-status-card.ts',
    output: [
      {
        file: dev ? 'dist/vehicle-status-card.js' : 'build/vehicle-status-card.js',
        format: 'es',
        sourcemap: dev ? true : false,
        inlineDynamicImports: true,
        banner: custombanner,
      },
    ],
    watch: {
      exclude: 'node_modules/**',
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
