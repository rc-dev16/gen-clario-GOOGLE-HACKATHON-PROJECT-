# Project layout

See [SYSDESIGN.md](./SYSDESIGN.md) for the full system design. Folder map:

```
/
├── src/                  # React SPA (Vite)
│   ├── app/              # shell, providers, routes
│   ├── features/         # auth, landing, analyze, dashboard, results
│   │   └── */{api,hooks,components,pages,context}/
│   ├── shared/           # layouts, routing, AppHeader, UI states
│   └── lib/              # firebase, apiClient, types, validation, utils
├── functions/            # Cloud Functions BFF + worker
│   ├── src/              # TypeScript source of truth
│   │   ├── index.ts      # export api + processAnalysisJob
│   │   ├── http/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── prompts/
│   │   └── workers/
│   └── lib/              # tsc output (deploy entry)
├── scripts/              # ops scripts (CORS)
├── config/               # local-only GCP credentials (gitignored JSON)
├── firestore.rules
├── storage.rules
├── SYSDESIGN.md
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

Configured in `vite.config.ts` and `tsconfig.app.json`.
