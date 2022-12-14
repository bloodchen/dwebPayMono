import babel from "@rollup/plugin-babel";
import commonjs from '@rollup/plugin-commonjs';
import { terser } from "rollup-plugin-terser";
import resolve from '@rollup/plugin-node-resolve';
import versionInjector from 'rollup-plugin-version-injector';
//import json from 'rollup-plugin-json';


export default [
  {
    input: "src/qrmodal.js",
    output: {
      file: "qrmodal.min.js",
      format: "umd",
      name: 'qrModal'
    },
    plugins: [
      versionInjector(),
      resolve(),
      babel({
        exclude: 'node_modules/**' // only transpile our source code
      }),
      commonjs(),
      //terser() 
    ],
  },

];