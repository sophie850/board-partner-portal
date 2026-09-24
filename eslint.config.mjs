import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),

  /*
   * No static `process.env.NAME` anywhere.
   *
   * The compiler replaces it with the literal value at build time,
   * which writes secrets into deploy artifacts — Netlify's scanner
   * catches that and fails the build, which is how this rule came to
   * be written. It also means a variable changed in the dashboard
   * does nothing until the next rebuild.
   *
   * Read through `env()` in src/lib/env.ts instead. The two files
   * exempted below are the ones that do the indexed lookup the rest
   * of the codebase relies on.
   */
  {
    files: ["**/*.ts", "**/*.tsx", "**/*.mts"],
    ignores: ["src/lib/env.ts", "netlify/functions/*.mts", "project/**", "chats/**"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "MemberExpression[object.object.name='process'][object.property.name='env']",
          message:
            "Read environment variables through env() in src/lib/env.ts — a static process.env.NAME is inlined at build time and bakes secrets into the bundle.",
        },
      ],
    },
  },
]);

export default eslintConfig;
