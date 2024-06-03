import typescript from "@rollup/plugin-typescript";
import terser from "@rollup/plugin-terser";
import dts from "rollup-plugin-dts";
import { nodeResolve } from "@rollup/plugin-node-resolve";

const js_config = {
  input: "src/index.ts",
  output: [
    {
      file: `dist/diagramatics.js`,
      format: "es",
      sourcemap: true,
    },
    {
      file: `dist/diagramatics.min.js`,
      format: "es",
      sourcemap: true,
      plugins: [terser()],
    },
  ],
  plugins: [nodeResolve(), typescript()],
};

const dts_config = {
  input: "src/index.ts",
  output: { file: `dist/diagramatics.d.ts`, format: "es" },
  plugins: [dts()],
};

export default [js_config, dts_config];
