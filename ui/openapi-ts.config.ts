import fs from 'fs';
import path from 'path';
import { defineConfig } from '@hey-api/openapi-ts';
import { loadEnvConfig } from '@next/env';

// Load .env.local / .env the same way Next.js does, so client generation targets
// the backend THIS worktree actually runs on (per-worktree BACKEND_URL set by
// scripts/worktree-sync-env.sh). Falls back to the default dev port if unset.
loadEnvConfig(process.cwd());

const docsPath = path.resolve(process.cwd(), '../docs/api-reference/openapi.json');
const backendUrl = (
    process.env.BACKEND_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    'http://127.0.0.1:8000'
).replace(/\/+$/, '');

const input = process.env.OPENAPI_INPUT || (
    fs.existsSync(docsPath)
        ? docsPath
        : `${backendUrl}/api/v1/openapi.json`
);

export default defineConfig({
    input,
    output: 'src/client',
    plugins: [{
        name: '@hey-api/client-fetch',
        runtimeConfigPath: './src/lib/apiClient',
    }],
});
