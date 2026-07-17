# Architecture Follow-ups (Backend Integration)

Frontend architecture redesign is in place (feature modules, React Query, protected routes, shared validation). The items below are **backend-tied leftovers** the frontend still depends on or deliberately defers.

## Must fix on backend (blocks product correctness)

| Frontend today | Backend work needed |
|----------------|---------------------|
| Free-plan quota checked only in UI (`AnalyzerPage` / hooks) | Enforce `maxContracts` in `/api/analysis/persist` and ideally before Document AI / Gemini spend |
| Chat / negotiation send a full client-built `prompt` to `/api/ai/orchestrate` | Accept `analysisId` + user message; server loads GCS text and builds the prompt |
| Analyze is one long synchronous HTTP mutation | Job lifecycle: `pending` → `processing` → `ready` \| `failed` with status polling or push |
| Chat / negotiation history lives in `localStorage` | Persist sessions under `users/{uid}/analyses/{id}/chats` (or equivalent) in Firestore |
| Plan / `maxContracts` mostly from Auth claims (admin → enterprise) or defaults | Admin-only plan writes; optional billing provider for `pro` / `enterprise` |

**Frontend hold:** do **not** migrate chat off `localStorage` until a chat-by-`analysisId` API exists.

## Backend source / ops hygiene

| Gap | Action |
|-----|--------|
| `functions/src/index.ts` empty; deploy truth is `functions/lib/index.js` | Restore TypeScript source as the only edit target; build → deploy |
| No `storage.rules` (or GCS lifecycle) in repo | Add Storage rules + retention for `uploads/` and `texts/` |
| Rate limit only on `/ai/orchestrate` | Broader API rate limits; idempotent persist keys |
| BFF path contract `/api/...` assumed by features | Keep stable or version (`/api/v1/...`) when changing |

## Frontend leftovers that wait on the above

- Replace client prompt builders in DocumentChat / NegotiationSuggestions with `analysisId` + message once the API exists.
- Switch analyze UX to job status (progress / retry) when async jobs ship.
- Load chat history from Firestore instead of `localStorage` after chat persistence lands.
- Server-driven remaining quota (stop trusting client-only `contractsAnalyzed` for enforcement).

## Optional frontend cleanup (not blocking)

- Root `package.json` still lists server-oriented packages unused by the browser bundle (`@google-cloud/*`, `firebase-admin`, `express`, `openai`, `mammoth`, etc.). Prefer keeping them only under `functions/` / scripts once confirmed unused by root scripts.
- Landing / Auth pages are still large presentational files; Analyzer / Dashboard / Result are thin containers with extracted views.

## Suggested backend pass order

1. Server-enforce quota on persist (+ reject before OCR/AI when possible).
2. Chat / negotiation by `analysisId` (no raw client prompt with document text).
3. Restore `functions/src` as source of truth + Storage rules.
4. Async analysis jobs + status API.
5. Persist chat sessions; then frontend migrates off `localStorage`.
