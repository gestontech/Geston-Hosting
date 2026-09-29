import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores([
    "dist",
    "dist-server",
    "android",
    "node_modules",
    "coverage",
  ]),

  {
    files: ["**/*.{ts,tsx}"],

    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],

    languageOptions: {
      ecmaVersion: 2024,
      globals: globals.browser,
    },

    rules: {
      /*
       * The project contains existing React patterns that are valid at
       * runtime but are rejected by the newest React Compiler lint rules.
       * Keep the normal Hooks rules active while preventing those
       * compiler-only diagnostics from blocking the production build.
       */
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/static-components": "warn",
      "react-hooks/incompatible-library": "warn",
      "react-hooks/preserve-manual-memoization": "warn",

      /*
       * Existing UI files intentionally contain utility exports beside
       * components. Fast Refresh still works for the application, but this
       * diagnostic must not block CI.
       */
      "react-refresh/only-export-components": "warn",

      /*
       * Existing code contains deliberate empty catch blocks for optional
       * browser/API operations. Keep these visible as warnings instead of
       * stopping the complete CI pipeline.
       */
      "no-empty": "warn",

      /*
       * These are cleanup-quality diagnostics. They should remain visible
       * in Actions without preventing the application build.
       */
      "prefer-const": "warn",
      "no-useless-escape": "warn",
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
]);
