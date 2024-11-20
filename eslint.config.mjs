import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import nextPlugin from "@next/eslint-plugin-next";

export default [
  {
    files: ["**/*.{js,mjs,cjs,jsx,ts,tsx}"],
    plugins: {
      "@typescript-eslint": tseslint.plugin,
      next: nextPlugin
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node
      },
      parser: tseslint.parser,
      parserOptions: {
        project: true
      }
    }
  },
  ...tseslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked
];