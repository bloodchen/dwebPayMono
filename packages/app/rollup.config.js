import babel from "@rollup/plugin-babel";
import commonjs from '@rollup/plugin-commonjs';
import { terser } from "rollup-plugin-terser";
import resolve from '@rollup/plugin-node-resolve';
import versionInjector from 'rollup-plugin-version-injector';
//import json from 'rollup-plugin-json';


export default [
  {
    input: "src/wapp.js",
    output: {
      file: "wapp.min.js",
      format: "umd",
      name: 'WalletApp'
    },
    plugins: [
      versionInjector(),
      resolve(),
      babel({
        exclude: 'node_modules/**' // only transpile our source code
      }),
      commonjs({
        ignore: ['socket.io-client', 'eccrypto-js', 'cross-fetch']
      }),
      //terser() 
    ],
  },

];