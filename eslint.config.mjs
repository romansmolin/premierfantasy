import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'
import stylistic from '@stylistic/eslint-plugin'
import importPlugin from 'eslint-plugin-import'
import boundaries from 'eslint-plugin-boundaries'

const FSD_LAYERS = ['app', 'views', 'widgets', 'features', 'entities', 'shared']

const eslintConfig = defineConfig([
    ...nextVitals,
    ...nextTs,

    globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts']),

    {
        name: 'custom-rules',
        plugins: {
            '@stylistic': stylistic,
            import: importPlugin,
            boundaries,
        },
        settings: {
            'import/resolver': {
                typescript: {
                    alwaysTryTypes: true,
                },
            },
            'boundaries/elements': FSD_LAYERS.map((layer, index) => ({
                type: layer,
                pattern: `src/${layer}/**`,
                mode: 'folder',
                capture: ['slice'],
                priority: index,
            })),
        },
        rules: {
            // Prohibit `any`
            '@typescript-eslint/no-explicit-any': 'error',

            // Warn on console.log
            'no-console': ['warn', { allow: ['warn', 'error'] }],

            // Padding lines between code sections
            '@stylistic/padding-line-between-statements': [
                'warn',
                { blankLine: 'always', prev: '*', next: 'return' },
                { blankLine: 'always', prev: ['const', 'let', 'var'], next: '*' },
                {
                    blankLine: 'any',
                    prev: ['const', 'let', 'var'],
                    next: ['const', 'let', 'var'],
                },
                { blankLine: 'always', prev: 'directive', next: '*' },
                { blankLine: 'always', prev: '*', next: ['if', 'for', 'while', 'switch', 'try'] },
                { blankLine: 'always', prev: ['if', 'for', 'while', 'switch', 'try'], next: '*' },
                { blankLine: 'always', prev: '*', next: 'function' },
                { blankLine: 'always', prev: 'function', next: '*' },
                { blankLine: 'always', prev: 'block-like', next: '*' },
                { blankLine: 'always', prev: '*', next: 'block-like' },
                { blankLine: 'always', prev: '*', next: 'export' },
                { blankLine: 'always', prev: 'export', next: '*' },
                { blankLine: 'any', prev: 'export', next: 'export' },
            ],

            // Sort imports
            'import/order': [
                'warn',
                {
                    groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'type'],
                    pathGroups: FSD_LAYERS.map((layer) => ({
                        pattern: `@/${layer}/**`,
                        group: 'internal',
                        position: 'after',
                    })),
                    pathGroupsExcludedImportTypes: ['builtin'],
                    'newlines-between': 'always',
                    alphabetize: { order: 'asc', caseInsensitive: true },
                },
            ],
            'import/newline-after-import': ['warn', { count: 1 }],

            // FSD boundaries — each layer may only import from layers below it
            'boundaries/dependencies': [
                'error',
                {
                    default: 'disallow',
                    rules: [
                        {
                            from: [{ type: 'app' }],
                            allow: [
                                { to: [{ type: 'views' }] },
                                { to: [{ type: 'widgets' }] },
                                { to: [{ type: 'features' }] },
                                { to: [{ type: 'entities' }] },
                                { to: [{ type: 'shared' }] },
                            ],
                        },
                        {
                            from: [{ type: 'views' }],
                            allow: [
                                { to: [{ type: 'widgets' }] },
                                { to: [{ type: 'features' }] },
                                { to: [{ type: 'entities' }] },
                                { to: [{ type: 'shared' }] },
                            ],
                        },
                        {
                            from: [{ type: 'widgets' }],
                            allow: [
                                { to: [{ type: 'features' }] },
                                { to: [{ type: 'entities' }] },
                                { to: [{ type: 'shared' }] },
                            ],
                        },
                        {
                            from: [{ type: 'features' }],
                            allow: [{ to: [{ type: 'entities' }] }, { to: [{ type: 'shared' }] }],
                        },
                        { from: [{ type: 'entities' }], allow: [{ to: [{ type: 'shared' }] }] },
                        { from: [{ type: 'shared' }], allow: [{ to: [{ type: 'shared' }] }] },
                    ],
                },
            ],
        },
    },
])

export default eslintConfig
