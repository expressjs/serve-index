import { defineConfig, globalIgnores } from "eslint/config";
import markdown from "eslint-plugin-markdown";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all
});

export default defineConfig([globalIgnores(["**/.nyc_output", "**/coverage", "**/node_modules"]), {
  extends: compat.extends("plugin:markdown/recommended"),

  plugins: {
    markdown,
  },

  rules: {
    "eol-last": "error",
    eqeqeq: ["error", "allow-null"],

    indent: ["error", 2, {
      SwitchCase: 1,
    }],

    "no-trailing-spaces": "error",
  },
  ignores: [".nyc_output", "coverage", "node_modules"]
}, {
  files: ["**/*.md"],
  processor: "markdown/markdown",
}, {
  files: ["**/*.md/*.js"],
  plugins: {
    markdown
  },
  extends: compat.extends("plugin:markdown/recommended")
}
]);
