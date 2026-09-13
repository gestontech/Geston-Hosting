# WhatsApp bot environment variables

Do **not** use `OWNER_NUMBER` — it collides with other tooling. Use the names below.

## Server (Heroku / `.env`)

| Variable | Required | Purpose |
|---|---|---|
| `BOT_OWNER_ID` | for the WhatsApp owner session | Any unique ID you choose to identify your own WhatsApp session in the database |
| `DEV_WA_NUMBER` | for WA owner admin + Contact Developer | Your personal WhatsApp number, **digits only** with country code |
| `WA_BOT_NUMBER` | optional | Public WhatsApp bot number for landing/docs links |
| `SITE_URL` / `APP_URL` / `CLIENT_URL` | recommended | Public site URL used in menus and emails |

## Frontend (Vite)

Set these so the Contact page can build `wa.me` links at build time:

| Variable | Purpose |
|---|---|
| `VITE_DEV_WA_NUMBER` | Digits for Contact → WhatsApp |
| `VITE_WA_BOT_NUMBER` | Fallback digits if `VITE_DEV_WA_NUMBER` empty |

## Pairing

WhatsApp multi-device pairing is started from the admin panel's Connections tab. Session credentials are stored in MongoDB (`WaOwnerSession`). The public WhatsApp assistant only answers **DMs**, never groups.
