import nextVitals from "eslint-config-next/core-web-vitals";

export default [
  ...nextVitals,
  {
    rules: {
      // Existing App Router UI uses native anchors for full document navigations
      // and deliberately initializes client state from browser storage in effects.
      "@next/next/no-html-link-for-pages": "off",
      "@next/next/no-img-element": "off",
      "react-hooks/exhaustive-deps": "off",
      "react-hooks/set-state-in-effect": "off",
      "react/no-unescaped-entities": "off",
      "import/no-anonymous-default-export": "off",
    },
    ignores: [
      ".next/**",
      "dist/**",
      "public/**",
      "node_modules/**",
      "supabase/.temp/**",
      "*.log",
    ],
  },
];
