# AI Code Review Tool

[![CI](https://github.com/gauravarun/AI-Code-Review/actions/workflows/ci.yml/badge.svg)](https://github.com/gauravarun/AI-Code-Review/actions/workflows/ci.yml)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?logo=node.js&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Prisma-4169E1?logo=postgresql&logoColor=white)
![Claude API](https://img.shields.io/badge/Claude-API-D97757?logo=anthropic&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-informational)

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
- Tests: `cd server && npm test` (Vitest) covers PR URL parsing, diff batching, scoring, and token
  encryption. CI (GitHub Actions) runs typecheck + tests for the server and lint + build for the client.
  The Claude/GitHub/DB integration paths are not yet covered by automated tests.
