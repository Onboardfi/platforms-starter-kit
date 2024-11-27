import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin"; // Corrected import

/** @type {import('eslint').Linter.Config[]} */
export default [
  // Apply to JavaScript and TypeScript files
  { files: ["**/*.{js,mjs,cjs,ts}"] },
  
  // Specific configuration for JavaScript files
  { files: ["**/*.js"], languageOptions: { sourceType: "script" } },
  
  // Define global variables
  { languageOptions: { globals: globals.browser } },
  
  // Use recommended rules from @eslint/js
  pluginJs.configs.recommended,
  
  // Use recommended rules from @typescript-eslint/eslint-plugin
  ...tseslint.configs.recommended,
  
  // Override specific rules for TypeScript files
  {
    files: ["**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off", // Disable the rule
      // Alternatively, set to "warn" to receive warnings instead of errors
      // "@typescript-eslint/no-explicit-any": "warn",
    },
  },
];
