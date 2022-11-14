import babel from "@rollup/plugin-babel";
import commonjs from '@rollup/plugin-commonjs';
import { terser } from "rollup-plugin-terser";
import { nodeResolve } from '@rollup/plugin-node-resolve';
import versionInjector from 'rollup-plugin-version-injector';
//import json from 'rollup-plugin-json';


export default [
    {
        input: "src/wallet.js",
        output: {
            file: "wallet.min.js",
            format: "umd",
            name: 'dpay'
        },
        plugins: [
            versionInjector(),
            nodeResolve({ isRequire: false }),
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