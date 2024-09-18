import typescript from 'rollup-plugin-typescript2';
import commonjs from 'rollup-plugin-commonjs';
import nodeResolve from 'rollup-plugin-node-resolve';
import { babel } from '@rollup/plugin-babel';
import terser from '@rollup/plugin-terser';
import serve from 'rollup-plugin-serve';
import json from '@rollup/plugin-json';
import image from '@rollup/plugin-image';
import postcss from 'rollup-plugin-postcss';
import postcssPresetEnv from 'postcss-preset-env';
import postcssLit from 'rollup-plugin-postcss-lit';
import filesize from 'rollup-plugin-filesize';
import dotenv from 'dotenv';
import replace from '@rollup/plugin-replace';
import { version } from './package.json';
import { logCardInfo } from './rollup.config.dev.mjs';

dotenv.config();
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

const plugins = [
  nodeResolve({}),
  commonjs(),
  typescript(),
  json(),
  image(),
  babel({
    babelHelpers: 'bundled',
    exclude: 'node_modules/**',
  }),
  postcss({
    plugins: [
      postcssPresetEnv({
        stage: 1,
        features: {
          'nesting-rules': true,
        },
      }),
    ],
    extract: false,
  }),
  postcssLit(),
  replace(replaceOpts),
  dev && serve(serveopts),
  !dev && terser(terserOpt),
  !dev && filesize(),
];

export default [
  {
    input: 'src/vehicle-status-card.ts',
    output: {
      dir: './dist',
      format: 'es',
      sourcemap: dev ? true : false,
      inlineDynamicImports: true,
      banner: custombanner,
    },
    watch: {
      exclude: 'node_modules/**',
    },
    plugins: [...plugins],
    moduleContext: {
      // Set specific module contexts if needed
      'node_modules/@formatjs/intl-utils/lib/src/diff.js': 'window',
      'node_modules/@formatjs/intl-utils/lib/src/resolve-locale.js': 'window',
      // Add other modules as needed
    },
  },
];
