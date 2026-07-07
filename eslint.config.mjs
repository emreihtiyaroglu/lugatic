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
                senseRanking: "readonly",
                lugaticDb: "readonly",
                lemmatize: "readonly",
                datasetReady: "readonly",
                DecompressionStream: "readonly"
            }
        },
        rules: {
            "no-unused-vars": ["error", { args: "none" }]
        }
    },
    {
        // dataset-import.js defines datasetReady (consumed as a global by
        // background.js), so the shared global must not apply to it here.
        files: ["src/background/dataset-import.js"],
        languageOptions: {
            globals: {
                datasetReady: "off"
            }
        }
    },
    {
        // Files that also load in Node tests use a UMD-style footer
        // referencing `module`.
        files: ["src/shared/*.js", "src/background/dataset-import.js"],
        languageOptions: {
            globals: {
                module: "writable",
                globalThis: "readonly"
            }
        }
    },
    {
        files: ["data-pipeline/**/*.mjs"],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: "module",
            globals: {
                ...globals.node
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
