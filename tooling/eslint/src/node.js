// @ts-check
import baseConfig from "./base.js";

/** @type {import("eslint").Linter.FlatConfig[]} */
export default [
  ...baseConfig,
  {
    rules: {
      "no-console": "off",
    },
  },
];
