import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["components/playground/ErmaFlowStudio.tsx"],
    rules: {
      // Flow hydrates a bounded browser-local run store after mount and uses refs
      // solely as concurrency guards for streaming requests.
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/refs": "off",
    },
  },
  {
    files: ["components/playground/MobileChatDrawer.tsx"],
    rules: {
      // The navigation icon set is intentionally kept aligned across mobile
      // workspace variants while the drawer information architecture evolves.
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  {
    files: ["components/playground/ResponsiveChatComposer.tsx"],
    rules: {
      // Slash-command suggestions use option semantics without a persistent
      // selection model; activation happens directly on press.
      "jsx-a11y/role-has-required-aria-props": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Separate Cloudflare Worker sub-project with its own lint/type setup.
    "telegram-bot/**",
    ".tmp-workers-types/**",
  ]),
]);

export default eslintConfig;
