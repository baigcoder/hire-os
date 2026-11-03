module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:react/jsx-runtime",
    "plugin:react-hooks/recommended",
  ],
  ignorePatterns: ["dist", ".eslintrc.cjs"],
  overrides: [
    // Build and tool config runs in Node, not the browser
    { files: ["*.config.js", "scripts/**/*.js"], env: { node: true } },
  ],
  parserOptions: { ecmaVersion: "latest", sourceType: "module" },
  settings: { react: { version: "18.2" } },
  plugins: ["react-refresh"],
  rules: {
    "react/jsx-no-target-blank": "off",
    // The project doesn't use PropTypes anywhere; props are documented in place
    "react/prop-types": "off",
    // Unused parameters document a callback's or a component's shape
    "no-unused-vars": ["error", { args: "none", ignoreRestSiblings: true }],
    "react-refresh/only-export-components": [
      "warn",
      { allowConstantExport: true },
    ],
  },
};
