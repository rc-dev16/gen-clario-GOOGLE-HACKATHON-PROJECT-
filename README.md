# Clario

AI-powered legal document analyzer. Upload a contract, get structured risk and completeness insights, then chat or explore negotiation suggestions — backed by Document AI, Vertex Gemini, and Firebase.

**Live demo:** [https://gen-calrio.web.app](https://gen-calrio.web.app)

Built for the Google Gen AI Exchange Hackathon.

---

## Features

- **Document upload** — PDF, DOCX, and TXT (max 10 MB)
- **Async analysis** — signed GCS upload → job queue → OCR + Gemini → progress UX
- **Structured results** — summary, fields, risk level, completion score, concerning points
- **Document chat** — ask questions about an analysis (prompts run on the server)
- **Negotiation helpers** — party-scoped suggestions and advice
- **Dashboard** — list and open past analyses
- **Quota** — free-tier limits enforced on the BFF (not UI-only)

---

## Stack

| Layer | Tech |
|-------|------|
| SPA | React, TypeScript, Vite, Tailwind CSS |
| Auth / data | Firebase Auth, Firestore, Firebase Hosting |
| BFF / jobs | Cloud Functions (`api`, `processAnalysisJob`, `onAuthUserDeleted`) |
| Files | Google Cloud Storage (signed URLs) |
| OCR | Document AI |
| LLM | Vertex AI Gemini |

Architecture details: **[SYSDESIGN.md](./SYSDESIGN.md)**.

---

## Repository map

```
src/           React SPA (features: auth, landing, analyze, dashboard, results)
functions/     Cloud Functions BFF + workers (TypeScript in functions/src)
scripts/       Ops helpers (GCS CORS)
config/        Local-only GCP credentials directory (gitignored JSON)
SYSDESIGN.md   Full system design
```

---

## Prerequisites

- Node.js 20+
- npm
- Firebase CLI (`npm i -g firebase-tools`)
- A Google Cloud / Firebase project with Auth, Firestore, Cloud Functions, Document AI, Vertex AI, and a GCS upload bucket

---

## Local setup

### 1. Clone and install

```bash
git clone https://github.com/rc-dev16/gen-clario-GOOGLE-HACKATHON-PROJECT-.git
cd gen-clario-GOOGLE-HACKATHON-PROJECT-
npm install
npm install --prefix functions
```

### 2. Client environment

Copy the example file and fill in your **Firebase web app** config (Firebase Console → Project settings → Your apps):

```bash
cp .env.example .env
```

Only `VITE_FIREBASE_*` variables belong in the root `.env`. The Firebase web API key is public-by-design in client apps; protect data with Auth and Firestore rules (see SYSDESIGN).

### 3. Functions environment

```bash
cp functions/.env.example functions/.env
```

Set Document AI processor id/location, upload bucket name, and Gemini model/location. Use placeholders from the example file — do not commit real secrets.

For **local signed URL** creation in the Functions emulator, create gitignored `functions/.env.local` pointing at a local service-account JSON path (see SYSDESIGN §7.7 and §11). Never commit that file or paste private keys into the repo.

### 4. Run

```bash
npm run dev
```

- SPA: [http://localhost:3000](http://localhost:3000)
- Functions emulator: [http://127.0.0.1:5001](http://127.0.0.1:5001)

Or separately: `npm run dev:frontend` / `npm run dev:functions`.

### 5. GCS CORS (once per bucket)

Browser `PUT` uploads need CORS on the upload bucket:

```bash
npm run storage:cors
```

Requires Application Default Credentials that can update the bucket.

---

## Deploy

```bash
npm run build
npm run build --prefix functions
firebase deploy --only hosting,functions,firestore:rules
```

Notes:

- Ensure `functions/.env` values are set before deploy (Firebase loads them for Functions).
- Do **not** put local credential file paths in `functions/.env`.
- Deploying `storage` rules requires Firebase Storage to be enabled; this project may use a plain GCS bucket instead — skip storage rules if that deploy step fails.
- Runtime service accounts need permission for Document AI, Vertex AI, Firestore, and GCS (including signing / `iam.serviceAccounts.signBlob` as required for V4 URLs).

---

## Security

- Service-account JSON and private keys stay **out of git** (see `.gitignore` and `config/google-cloud/`).
- Never publish secrets in README, issues, or screenshots of the Network tab (ID tokens are session credentials).
- If a key was ever committed historically, **rotate it in GCP IAM** even if the current tree is clean.
- Details: [SYSDESIGN.md](./SYSDESIGN.md) §9.

---

## License

MIT — see [LICENSE](./LICENSE).
