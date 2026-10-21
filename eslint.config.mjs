import nextPlugin from "@next/eslint-plugin-next";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";

export default [
  {
    ignores: ["**/.next/", "node_modules/", "**/*.js", "scripts/", "supabase/", "temp_*", "vehicle/", "_ui-kit/", "examples/"]
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        sourceType: "module",
      },
    },
    plugins: {
      "@next/next": nextPlugin,
      "@typescript-eslint": tsPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
      "no-restricted-syntax": [
        "error",
        {
          "selector": "JSXElement[openingElement.name.name='button']",
          "message": "Use <AppButton> from @/components/ui/AppButton instead of raw <button>."
        },
        {
          "selector": "JSXElement[openingElement.name.name='table']",
          "message": "Use <AppTable> from @/components/ui/AppTable instead of raw <table>."
        }
      ]
    },
  },
  {
    files: [
      "components/ui/**/*.{tsx,jsx,ts,js}",
      "components/layout/**/*.{tsx,jsx,ts,js}",
      "components/theme/**/*.{tsx,jsx,ts,js}"
    ],
    rules: {
      "no-restricted-syntax": "off"
    }
  }
];
