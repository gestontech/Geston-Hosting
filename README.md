# Geston Hosting

WhatsApp bot hosting platform with TX coin economy, Pterodactyl panel shop, social media boosting, and automated deployment.

**Live:** [hosting.gestontech.online](https://hosting.gestontech.online)  
**Version:** 1.12.0

### Talk to our bot

Configure `WA_BOT_NUMBER` once you set up your WhatsApp bot, and it'll appear automatically on the Contact page.

See [CHANGELOG.md](./CHANGELOG.md) for release history. WhatsApp env details: [docs/ENV-WHATSAPP.md](./docs/ENV-WHATSAPP.md).

## Stack

- **Frontend**: React + Vite + TypeScript + Tailwind CSS
- **Backend**: Express 5 + MongoDB (Mongoose) + TypeScript
- **Payments**: Paystack (M-Pesa, Airtel, Card), regional mobile money
- **Bot hosting**: Heroku (via API)
- **Panel hosting**: Pterodactyl
- **AI**: Gemini (primary) + Groq (fallback), multi-key rotation

## Features

- Deploy any WhatsApp bot template in < 2 minutes
- TX coin economy (1 TX = KSh 5 top-up rate)
- Free 24-hour trial (one per number, ever)
- Panel Shop — buy Pterodactyl hosting panels with TX coins
- Social Media Boosting — Instagram, TikTok, YouTube, Twitch and more (followers, likes, views)
- Referral system (both sides earn 1 TX on signup)
- Coupon codes redeemable on dashboard
- Full admin panel: user management, bot control, transactions, coupons, DB stats
- Payment spam protection: 7 failed payments/day → automatic account ban
- OG meta tags for shareable bot deployment links
- Dark/light mode
- In-app notifications for boost order progress and completion
- Public WhatsApp assistant (DM-only) with consent flow, live panel/boost prices, and feature-flag sync with the site
- AI-powered free-text replies on WhatsApp and the site chat (`/ai-chat` + floating widget)

## Architecture

The server is organized by resource, and any file that grows past ~300 lines
gets split into a subfolder rather than left to keep growing. The pattern
throughout the codebase is: a thin top-level file that only creates the
router and mounts sub-routers, with the real logic living underneath it.

```
server/
  routes/
    admin.ts          → mounts server/routes/admin/{dashboard,users,bots,
                         transactions,catalog,teams,system,boost,
                         notifications,shared}.ts
    payments.ts       → mounts server/routes/payments/{core,kenya,nigeria,
                         cameroon,tanzania,drc,paypal,webhooks,shared}.ts
    auth.ts           → mounts server/routes/auth/{login,magicLink,
                         passwordReset,oauth,session,shared}.ts
    bots.ts           → mounts server/routes/bots/{trialCheck,list,deploy,
                         lifecycle,remove,logs,shared}.ts
    boost.ts          → mounts server/routes/boost/{catalog,orders,mpesa,
                         drc,cameroon,tanzania,card,shared}.ts
    aiChat.ts         → POST /api/ai/chat (site widget + /ai-chat page)
  services/
    bot.ts            → starts the public WhatsApp bot and registers the
                         WhatsApp-based owner notification channel
    whatsappOwner.ts  → Baileys multi-device session (pair from the admin panel)
    whatsappPublic.ts → public WhatsApp DM assistant (consent, menus, flags, AI fallback)
    bot/ownerOps.ts   → shared owner operations (grant/subtract TX, lookups, stats)
    aiChat.ts         → shared runAIChat() for site / WhatsApp
  lib/
    ai.ts             → askAI + parseAIReply (Gemini → Groq, multi-key)
    promptContext.ts  → live pricing + feature-flag context for prompts
  prompts/
    shared.ts         → identity, rules, pricing, handoff, owner deploy markers
    sitePrompt.ts     → website AI chat widget surface
    whatsappPrompt.ts → WhatsApp natural-language surface
```

Each `shared.ts` in the list above holds whatever a resource's sub-files
genuinely need in common — constants, one-off helpers, or (in `auth/shared.ts`)
in-memory state like magic-link tokens. That state is declared exactly once
per resource and imported by whichever sub-files need it, rather than
re-created per file.

A couple of files have load-bearing registration order rather than pure
independent routes — worth knowing if you're touching them:

- `routes/bots.ts`: `/trial-check/:phone` is mounted *before*
  `sessionOrApiKeyGuard`/`banCheck`, so it stays public while every other bot
  route (mounted after) requires auth.

See `CONTRIBUTING.md` for the conventions behind this structure (no comments
in source, `next(err)` error handling, `.env` secret handling, and test
patterns).

## Social Media Boosting Logic

The service catalogue is stored locally for speed:

1. **JSON file** on disk (`server/data/boost-catalogue.json`) — primary fast source on the VPS
2. **In-memory cache** after the first load
3. **MongoDB** as a backup mirror of the same data

Sell prices are derived from the provider base rate plus a fixed margin so the site does not sell at a loss when upstream prices change.

Admins can **Pull updates from API** on the SMP page to refresh platforms and prices from the provider into the local JSON + Mongo store. Cron also syncs periodically. Users always read from the local catalogue (not live from the provider), so the boosting page stays fast and stable.

Boost orders can be paid with TX (API / moderators) or direct mobile money / card on the website. Quantity must be within each service min/max before payment can continue.

Quality labels (Blue, Green, Purple/VIP, Gold, HQ, Economy) are detected from service names and explained in the UI.

## TX Coin System

| Action | Cost |
|---|---|
| Deploy bot | 10 TX/month |
| Renew bot | 10 TX/month |
| Mini 400MB Panel | 5 TX (was 8 TX) |
| Basic 800MB Panel | 10 TX (was 16 TX) |
| Unlimited Panel | 12 TX (was 20 TX) |

## Development

```bash
cp .env.example .env
yarn install
yarn dev          # frontend (Vite)
yarn dev:server   # backend (Express)
yarn test         # run test suite
yarn lint
yarn build
```

## Docker

```bash
cp .env.example .env
# set JWT_SECRET, ADMIN_EMAIL, and payment keys in .env

docker compose up --build -d
```

App: http://localhost:3000  
MongoDB is started as the `mongo` service. `MONGODB_URI` is set to `mongodb://mongo:27017/geston-hosting` for the app container.

Single image only:

```bash
docker build -t geston-hosting .
docker run --rm -p 3000:3000 --env-file .env geston-hosting
```

## Environment variables — full setup guide

Copy `.env.example` to `.env`, then fill in each section below. Variables
marked **(required)** must be set or the server refuses to start.

### Core

| Variable | Where to get it |
|---|---|
| `MONGODB_URI` **(required)** | A MongoDB connection string. For local dev, install MongoDB and use `mongodb://localhost:27017/geston-hosting`. For hosted, create a free cluster at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) → Database → Connect → "Drivers" → copy the connection string (replace `<password>` with your database user's password). |
| `JWT_SECRET` **(required)** | Not obtained anywhere — generate one yourself: `openssl rand -hex 32`. Keep it private; rotating it logs out every active session. |
| `FRONTEND_ORIGIN` | The URL your frontend runs on, e.g. `http://localhost:5173` for local dev. Comma-separate multiple origins. |
| `PORT` | Port the Express server listens on (default `5000`). |
| `NODE_ENV` | `development` or `production`. |

### Admin account

| Variable | Notes |
|---|---|
| `ADMIN_EMAIL` **(required)** | The email address that gets admin/owner privileges throughout the app (checked against `user.email` on every request that needs admin access). Doesn't need to pre-exist — the account is granted admin rights the moment a user signs up or logs in with this exact email. |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | Used for basic-auth-protected admin routes, if any — set to whatever you want. |

### Paystack (Kenya M-Pesa/Airtel + card, Nigeria, Ghana, South Africa)

1. Sign up at [dashboard.paystack.com/#/signup](https://dashboard.paystack.com/#/signup).
2. Go to **Settings → API Keys & Webhooks** to get `PAYSTACK_SECRET_KEY` and `PAYSTACK_PUBLIC_KEY`.
3. For `PAYSTACK_WEBHOOK_SECRET`, add a webhook pointing to `https://yourdomain.com/webhook` in the same settings page — Paystack signs requests with your secret key, so this is usually the same value as `PAYSTACK_SECRET_KEY` unless you configure a separate webhook secret.
4. Paystack supports Nigeria and Ghana as separate "integrations" under one account — check **Settings → Preferences** for region-specific key pairs to fill in `PAYSTACK_NIGERIA_*` / `PAYSTACK_GHANA_*`.
5. `PAYSTACK_SA_*` (South Africa) and `PAYSTACK_GHANA_*` — **heads up:** as of this refactor, these two currencies are flagged as "available" via these env vars but have no actual backend payment route wired up (see the payment-methods audit from earlier in this project). Setting these keys will make the frontend show a South Africa/Ghana option that silently falls through to the generic card flow rather than a real ZAR/GHS-specific one. Leave them unset unless you're planning to finish that integration.

### Fapshi (Cameroon mobile money)

Sign up at [fapshi.com](https://www.fapshi.com), then find your API user/key in the dashboard under API settings. Sandbox keys are prefixed differently from live keys — check their dashboard for which environment you're issued.

### SpeedPesa (Tanzania mobile money) / Wonya (DR Congo mobile money)

These are smaller regional payment processors without well-documented public sign-up flows. Contact each provider directly for merchant/API access:
- **SpeedPesa** — `SPEEDPESA_API_KEY`
- **Wonya** — `WONYA_TOKEN`, `WONYA_PARTNER_ID`, `WONYA_CALLBACK_URL` (set this to `https://yourdomain.com/api/payments/wonya/callback`)

If you don't have accounts with these, leave them blank — the corresponding country's payment option simply won't appear as available (see `isTanzaniaAvailable()` / `isDRCAvailable()` in the relevant service files).

### Social media boosting provider (TXH_API)

The social boosting catalogue (`/services/boosting`) is powered by an external provider, set via:
- **TXH_API** — your provider API key
- **TXH_API_URL** — your provider's base API URL (must expose `/services`, `/services/order`, and `/services/order/:id`, matching the shape described in `server/services/boostProvider.ts`)

If left blank, social boosting is simply unavailable on the site — nothing else is affected.

### SMTP (magic-link login, password reset emails)

Any SMTP provider works. Quick options: [Resend](https://resend.com) (has a generous free tier, `smtp.resend.com` as host), or your existing email provider's SMTP credentials. Fill in `SMTP_HOST`, `SMTP_PORT` (587 for TLS), `SMTP_USER`, `SMTP_PASS`.

Optional: `SMTP_FROM` — the From header on auth emails. If unset, defaults to `"Geston Hosting" <noreply@gestontech.online>`.

### Heroku (bot hosting)

1. Sign up at [heroku.com](https://www.heroku.com).
2. Generate `HEROKU_API_KEY` from **Account Settings → API Key** (click "Reveal", or regenerate). This key is required for bot deployment (`server/services/heroku.ts`). You can also paste it in the admin AppSettings panel; env wins as fallback when the DB key is empty.
3. Bots are deployed to Heroku "teams" — see the Team model in the admin panel to configure which team(s) the app deploys new bots into.

### Pterodactyl (panel shop)

1. You need a running Pterodactyl panel instance (self-hosted or a provider that offers Pterodactyl access) — this is a separate piece of infrastructure, not a signup-and-go service.
2. `PANEL_API_KEY` — from your Pterodactyl admin area under **Application API** (Account Settings → API Credentials on newer versions).
3. `PANEL_DOMAIN` — the base URL of your panel instance.
4. `PANEL_EGG_ID` / `PANEL_NEST_ID` — IDs of the game/app "egg" and "nest" your servers get created under; find these in your panel's admin area under **Nests**.
5. `PANEL_EMAIL_DOMAIN` — a domain used to generate placeholder emails for auto-created panel accounts (doesn't need to be a real receiving domain).

### GitHub / Google OAuth login

- **GitHub**: create an OAuth App at [github.com/settings/developers](https://github.com/settings/developers) → "New OAuth App". Set the callback URL to `https://yourdomain.com/api/auth/github/callback`. Copy the generated Client ID and Client Secret.
- **Google**: create credentials at [console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials) → "Create Credentials" → "OAuth client ID" → Web application. Add `https://yourdomain.com/api/auth/google/callback` as an authorized redirect URI.

### WhatsApp owner session

- `BOT_OWNER_ID` — any unique ID you choose (e.g. your own phone number or a random string) to identify your WhatsApp owner session in the database.
- `PAIRING_URL` — optional session-ID / pairing help page URL stored on the default bot template when the server seeds it (defaults to empty).
- Pairing is started from the admin panel (Connections tab) — enter your WhatsApp number and follow the pairing code shown there.

### WhatsApp public bot (DM assistant)

Do **not** set `OWNER_NUMBER` for the owner — use `DEV_WA_NUMBER` only.

| Variable | Notes |
|---|---|
| `DEV_WA_NUMBER` | Your personal WhatsApp number, **digits only** with country code. Gates owner admin commands (`flags`, `disable`, …) and builds the Contact Developer `wa.me` button. |
| `WA_BOT_NUMBER` | Public bot WhatsApp number (digits only) for landing/docs links, once you have one. |
| `VITE_DEV_WA_NUMBER` | Build-time Contact page WhatsApp link (same digits as `DEV_WA_NUMBER`). Set on Heroku **before** the build. |

The public assistant is **DM-only** (groups ignored unless mentioned), requires consent (Accept/Decline), uses live panel prices from `PanelPlan` and boost prices from `BoostServiceCache`, and respects site feature flags (`panels` / `boost` / `botDeploy`). Free-text that is not a menu action is answered by the AI assistant.

### AI assistant

`DEV_NAME` and `BRAND_NAME` control how the AI support assistant (site chat, WhatsApp) refers to itself and its developer in replies. Both have sensible defaults if unset. The assistant reuses `DEV_WA_NUMBER` (above) as its stated contact number — no separate variable needed.

| Variable | Notes |
|---|---|
| `GEMINI_API_KEY` | Primary model provider. Comma-separate multiple keys to rotate on quota/rate limits. |
| `GROQ_API_KEY` | Fallback provider if every Gemini key fails. Comma-separate for rotation. |
| `DEV_NAME` | Display name in AI replies (default `Geston`). |
| `BRAND_NAME` | Platform name in AI replies (default `Geston Hosting`). |

Prompt builders live in `server/prompts/` (`shared.ts` + per-surface files). Runtime path: free-text on **WhatsApp** (outside commands, menus, and multi-step flows) and the site **`/ai-chat`** + floating widget all call `runAIChat()` → `askAI()` (Gemini, then Groq).

### Site URLs and misc

| Variable | Notes |
|---|---|
| `CLIENT_URL` / `SITE_URL` / `APP_URL` | Your deployed frontend URL — used to build links in emails, OAuth redirects, and bot menus. |
| `IMAGE_URL` | Default Open Graph / branding image URL for shareable links. |
| `KSH_PER_TX` | Conversion rate: how many Kenyan Shillings one TX coin costs. |
| `MONGO_STORAGE_QUOTA_MB` | Used by the admin DB-stats page to show usage against a soft quota — purely informational, doesn't enforce a hard limit. |

## Deployment

Hosted on Heroku. Build command: `yarn build`.


## Payments (shared)

All TX purchase and country payment methods (Kenya M-Pesa/Airtel, Nigeria, Cameroon, Tanzania, DR Congo, card/Apple Pay) are driven from one shared flow (`TopUpFlow` + `paymentConfig`). The same methods appear on:

- Top Up page
- Bot deploy (in-page modal when balance is low)
- Social media boosting checkout

Adding a new method or country in the shared config/flow surfaces it everywhere without duplicating handlers.
