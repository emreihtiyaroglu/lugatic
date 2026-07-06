import js from "@eslint/js";
import globals from "globals";

export default [
    {
        ignores: [
            "node_modules/**",
            "dist/**",
            "web-ext-artifacts/**",
            "src/shared/browser-polyfill.js"
        ]
    },
    js.configs.recommended,
    {
        files: ["src/**/*.js"],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: "script",
            globals: {
                ...globals.browser,
                ...globals.webextensions,
                importScripts: "readonly",
                normalization: "readonly",
                senseRanking: "readonly"
            }
        },
        rules: {
            "no-unused-vars": ["error", { args: "none" }]
        }
    },
    {
        // Shared modules run in workers, event pages, and Node tests; the
        // UMD-style footer references `module`.
        files: ["src/shared/*.js"],
        languageOptions: {
            globals: {
                module: "writable",
                globalThis: "readonly"
            }
        }
    },
    {
        files: ["tests/**/*.js"],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: "commonjs",
            globals: {
                ...globals.node
            }
        }
    }
];
