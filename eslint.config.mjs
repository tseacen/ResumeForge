import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettierConfig from "eslint-config-prettier";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Disable ESLint rules that conflict with Prettier (must come last)
  prettierConfig,
  // Project-specific rules
  {
    rules: {
      // Underscore-prefixed vars are intentionally unused
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // Disallow `any` — use `unknown` instead
      "@typescript-eslint/no-explicit-any": "error",
      // Prefer const where variable is never reassigned
      "prefer-const": "error",
      // No leftover console.log in committed code
      "no-console": ["warn", { allow: ["warn", "error"] }],
      // Consistent import ordering
      "import/order": [
        "warn",
        {
          groups: ["builtin", "external", "internal", "parent", "sibling", "index"],
          "newlines-between": "always",
          alphabetize: { order: "asc", caseInsensitive: true },
        },
      ],
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "node_modules/**",
    "src-tauri/**",
  ]),
]);

export default eslintConfig;
