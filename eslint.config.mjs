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
    // Remotion project with its own toolchain.
    "apps/video/**",
    // Agent worktrees are full copies of the repo.
    ".claude/**",
    // Build outputs of the desktop and mobile apps.
    "apps/setup/dist/**",
    "apps/android/**/build/**",
    // Vendored library.
    "apps/setup/src/renderer/leaflet.js",
  ]),
  {
    // The Electron app is plain CommonJS.
    files: ["apps/setup/**/*.js"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
  {
    // A leading underscore marks a value that is deliberately unused.
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", destructuredArrayIgnorePattern: "^_" },
      ],
    },
  },
]);

export default eslintConfig;
