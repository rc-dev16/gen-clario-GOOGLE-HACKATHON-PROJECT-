# Project layout

```
/
├── src/                  # React SPA (Vite)
│   ├── app/              # shell, providers, routes
│   ├── features/         # auth, landing, analyze, dashboard, results
│   │   └── */{api,hooks,components,pages,context}/
│   ├── shared/           # layouts, routing, AppHeader, UI states
│   └── lib/              # firebase, apiClient, types, validation, utils
├── functions/            # Cloud Functions BFF
│   ├── src/              # TypeScript source of truth
│   │   ├── index.ts      # thin exports (api)
│   │   ├── init.ts       # firebase-admin init
│   │   ├── config.ts
│   │   ├── types.ts
│   │   ├── http/         # router, errors, headers, request helpers
│   │   ├── middleware/   # auth, rateLimit
│   │   ├── routes/       # upload-url, documentai, ai, persist
│   │   ├── services/     # gcs, documentAi, gemini, analysesRepo
│   │   └── prompts/      # analysis prompt + response schemas
│   └── lib/              # tsc output (deploy entry)
├── scripts/              # ops scripts (CORS, admin helpers)
├── config/               # local-only GCP credentials (gitignored JSON)
├── firestore.rules
├── storage.rules
├── firebase.json
└── public/
```

## Path aliases (SPA)

| Alias | Resolves to |
|-------|-------------|
| `@/*` | `src/*` |
| `@app/*` | `src/app/*` |
| `@features/*` | `src/features/*` |
| `@shared/*` | `src/shared/*` |
| `@lib/*` | `src/lib/*` |

Configured in `vite.config.ts` and `tsconfig.app.json`. Prefer `@/` or the scoped aliases for new imports.
