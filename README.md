# AI Code Review Tool

Paste a GitHub pull request URL and get an AI-generated code review: quality issues, security
flags, and concrete suggestions, with history tracking per user.

**Stack:** React (Vite) + Node.js/Express + Claude API (Anthropic SDK) + PostgreSQL (Prisma) +
GitHub OAuth

## How it works

1. Sign in with GitHub (OAuth) — this also grants the app a token to fetch PR diffs on your behalf.
2. Paste a PR URL (`https://github.com/<owner>/<repo>/pull/<number>`).
3. The backend fetches the PR's file diffs via the GitHub API (Octokit) and chunks them into
   batches sized to stay within Claude's context/cost budget.
4. Each batch is sent to Claude with a forced tool call (`submit_code_review`) so results come
   back as structured JSON (category, severity, file, line, suggestion) instead of free-text.
5. If a PR spans multiple batches, a final Claude call synthesizes one overall summary from the
   per-batch summaries.
6. Results are persisted to Postgres and shown with a score, and are browsable later in History.

Production-thinking details baked in: batched Claude calls for large PRs, exponential-backoff
retry on Anthropic 429s, per-user rate limiting on the review endpoint (`express-rate-limit`),
surfaced GitHub API rate-limit headers, and encrypted-at-rest GitHub access tokens (AES-256-GCM).

## Project layout

```
server/   Express + TypeScript API, Prisma schema, GitHub OAuth, Claude integration
client/   React + TypeScript (Vite) frontend
docker-compose.yml   Local Postgres for development
```

## Setup

### 1. Create a GitHub OAuth App

GitHub Settings → Developer settings → OAuth Apps → New OAuth App:
- Homepage URL: `http://localhost:5173`
- Authorization callback URL: `http://localhost:4000/auth/github/callback`

Note the generated Client ID and Client Secret.

### 2. Start Postgres

```bash
docker compose up -d
```

### 3. Backend

```bash
cd server
cp .env.example .env   # fill in GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, ANTHROPIC_API_KEY, JWT_SECRET
npm install
npm run prisma:migrate   # creates tables
npm run dev               # http://localhost:4000
```

### 4. Frontend

```bash
cd client
cp .env.example .env
npm install
npm run dev   # http://localhost:5173
```

Open `http://localhost:5173` and sign in with GitHub.

## Environment variables

See `server/.env.example` and `client/.env.example`. `JWT_SECRET` is also used to derive the key
for encrypting stored GitHub access tokens — use a long random string, not the placeholder.

## Notes / next steps

- History is scoped per signed-in user (Postgres `Review` rows keyed by `userId`).
- The GitHub OAuth scope requested is `repo` (needed to read PR diffs on private repos); drop to
  `public_repo` if you only need public repos.
- No automated test suite yet — `npm run build` (client and server) and `npx tsc --noEmit` are the
  current correctness checks.
