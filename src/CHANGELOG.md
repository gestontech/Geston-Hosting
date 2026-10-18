# Changelog

Tous les changements notables de GESTONX sont documentés dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/),
et ce projet adhère au [Versionnage Sémantique](https://semver.org/lang/fr/).

## [1.12.0] - 2026-09-09

### Added
- Bug report page (`/report-bug`) with TX rewards for valid reports; admin reward endpoint and in-app notifications
- WhatsApp AI memory (per-user turns, TTL via `AI_MEMORY_TTL_HOURS`)
- Unrestricted AI bypass numbers via `T_NUMBERS` (comma-separated)
- WhatsApp `.unban` command + AI-driven unban (`unbanWaContact`)
- Multilingual AI replies (respond in the user’s language)
- Public Developer API: list templates, list/get bots, deploy by template name, stop/start/restart/renew/delete
- Admin Database tab: **Developer API Keys** purge (clears all users’ API keys; accounts kept)
- Unit tests for bug reports, public API, unban/security, AI memory, T_NUMBERS, device prefs, menus
- Landing Tutorials nav link; Support page AI chat buttons; dashboard Tutorials card

### Changed
- Default site accent is **green** (never purple/violet); old violet preference migrates to green
- WhatsApp consent accept sends a help greeting instead of menu buttons; menu only on explicit `menu` / `help`
- Interactive buttons only for **Android**; iOS / web / desktop / unknown get text-only replies
- Bot template logos: fetch `logo` / `image` / `icon` from repo `app.json` on `main` / `master` / `develop`; auto-backfill empty `imageUrl` on list/slug
- Free-trial bot card shows the template logo (Geston-MD `app.json` logo)
- Telegram bot username made configurable across product copy where applicable

### Fixed
- Unused `BotChatButtons` import breaking Heroku `tsc` build on Home
- Public API TypeScript typing for template `costTx` and route `id` params
- Developer API key status load path
- Admin DB purge coverage for more collections + confirmation UX

## [1.10.0] - 2026-09-06

### Added
- `server/prompts/` — shared AI assistant identity/rules builder plus per-surface prompt builders for the site chat, Telegram bot, and WhatsApp bot, driven by live pricing and feature-flag data rather than static text
- `DEV_NAME` and `BRAND_NAME` env vars for AI assistant identity

## [1.9.0] - 2026-09-06

### Added
- Public WhatsApp assistant (DM-only) with consent Accept/Decline, live panel and boost prices, and feature-flag sync with the site
- `WaContact` model for consent status, phone, username, and message tracking
- Modular WhatsApp handlers under 500 lines each: `waIdentity`, `waConsent`, `waMenus`, `whatsappSend`, `whatsappMessages`, `whatsappPublic`
- LID/phone resolver (`resolveSenderJid` / `resolvePhoneNumber`) modeled after Geston-MD for stable owner and user identity
- Owner-only WhatsApp admin commands gated by `DEV_WA_NUMBER`: `flags`, `disable`/`enable`, `disablepay`/`enablepay`
- Pairing retry loop and credential persist retry for Baileys multi-device (Telegram `/connect`)
- Telegram pairing code copy-friendly MarkdownV2 formatting
- Contact Developer CTA (`wa.me` from `DEV_WA_NUMBER`) and footer watermark on outbound WhatsApp messages
- Dynamic menus with live `PanelPlan` and `BoostServiceCache` prices
- Landing page and README links for Telegram and WhatsApp with platform logos (`BotChatButtons`)
- Env documentation for `DEV_WA_NUMBER`, `WA_BOT_NUMBER`, `VITE_DEV_WA_NUMBER`, `VITE_SUPPORT_TELEGRAM`, `TELEGRAM_BOT_USERNAME`, `SUPPORT_TELEGRAM`

### Changed
- Site and bot feature flags share the same Mongo-backed disable list for `panels`, `boost`, and `botDeploy`
- WhatsApp public bot ignores groups, broadcasts, and newsletters (DM-only)
- Hardcoded personal WhatsApp numbers removed from application code in favor of env vars
- README architecture and env sections expanded for Telegram pairing + WhatsApp assistant
- Bumped package version to 1.9.0

### Fixed
- Heroku TypeScript build failures in panel/social boost and nested template-literal syntax in `panelCommands`
- Owner detection no longer uses suffix matching; exact digits-only match against resolved phone jid after LID fix
- Declined consent path is read-only (no `messageCount` / incidental writes except Accept/Decline status updates)
- Admin API remains fully behind `adminAuth` (JWT + `ADMIN_EMAIL`) on every `/api/admin` sub-router

## [1.8.0] - 2026-09-05

### Added
- Route-level tests for deploy, payments webhooks, login, admin users, session, boost orders
- `CONTRIBUTING.md` and expanded README architecture / env guides

### Changed
- Split admin, payments, auth, bots, boost, and bot services into focused subfolders
- Centralized `JWT_SECRET` into `server/lib/env.ts`
- Bumped package version to 1.8.0

### Fixed
- Telegram bot command registration order
- Hardcoded hosting URL replaced with env-driven `CLIENT_URL` / `SITE_URL`

## [1.7.0] - 2026-08-30

### Added
- Dockerfile and docker-compose, strict CI, Dependabot, health endpoint, shared error handler

### Changed
- TopUp / Social Boost / admin tab extractions into modules

### Fixed
- TypeScript build errors after extractions

## [1.6.x] - 2026-08

### Added
- CI, health, payment schemas, country payment modals, WhatsApp owner bot via Telegram `/connect`

### Fixed
- Heroku/npm lockfile and admin TypeScript issues

## [1.0.0] - 2026-08-18

### Added
- Initial GESTONX fullstack release: React/Vite frontend, Express/MongoDB backend
- TX coin economy, bot deploy, panel shop, social boosting, payments, admin panel
