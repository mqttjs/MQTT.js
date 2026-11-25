import {
    defineConfig,
    globalIgnores,
} from "eslint/config";

import tsParser from "@typescript-eslint/parser";
import typescriptEslintEslintPlugin from "@typescript-eslint/eslint-plugin";
import globals from "globals";
import js from "@eslint/js";

import {
    FlatCompat,
} from "@eslint/eslintrc";

const compat = new FlatCompat({
    baseDirectory: import.meta.dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default defineConfig([{
    languageOptions: {
        parser: tsParser,

        globals: {
            ...globals.browser,
            ...globals.commonjs,
            ...globals.node,
            ...globals.worker,
        },

        sourceType: "module",

        parserOptions: {
            project: "tsconfig.json",
            tsconfigRootDir: import.meta.dirname,
        },
    },

    plugins: {
        "@typescript-eslint": typescriptEslintEslintPlugin,
    },

    extends: compat.extends("plugin:prettier/recommended", "plugin:@typescript-eslint/recommended"),

    rules: {
        "global-require": "off",
        "no-console": process.env.NODE_ENV === "production" ? "warn" : "off",

        "no-unused-vars": ["error", {
            args: "none",
        }],

        "no-underscore-dangle": "off",
        "no-param-reassign": "off",
        "no-restricted-syntax": "off",
        "default-case": "off",
        "consistent-return": "off",
        "max-classes-per-file": "off",
        "no-plusplus": "off",
        "no-bitwise": "off",
        "class-methods-use-this": "off",
        "no-continue": "off",
        "@typescript-eslint/no-explicit-any": "off",

        "@typescript-eslint/no-unused-vars": ["error", {
            args: "none",
        }],

        "@typescript-eslint/naming-convention": "off",
        "@typescript-eslint/dot-notation": "off",
        "@typescript-eslint/no-use-before-define": "off",

        "@typescript-eslint/consistent-type-imports": ["error", {
            "prefer": "type-imports",
            "fixStyle": "inline-type-imports",
            "disallowTypeAnnotations": true,
        }],
    },
}, globalIgnores([
    "types/",
    "examples/",
    "doc/",
    "dist/",
    "build/",
    "electron-test/",
    "**/*.js",
    "**/*.mjs",
])]);
