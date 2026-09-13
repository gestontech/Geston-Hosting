# WhatsApp AI & security notes

## Multilingual AI
The assistant replies in the **same language** the user writes (Swahili, French, English, Arabic, Sheng, etc.).

## Chat memory
Per-user conversation history is kept in **RAM** for `AI_MEMORY_TTL_HOURS` (default **6 hours**) of inactivity, then cleared automatically. Set on Heroku if you want a different window.

## Auto-block & unban (WhatsApp only)
Abusive / spam / malware-like messages auto-block the sender in the database (and via Baileys when available). Owner is never blocked.

**Owner unban (owner WhatsApp only):**
- Command: `.unban 2547xxxxxxxx` or `unban +254 7xx xxx xxx` (spaces/`+` auto-cleaned)
- Or natural language to the AI: *"unban 2547xxxxxxxx"* (owner only)

After unban, the bot accepts messages from that number again.

## T_NUMBERS
Comma-separated WhatsApp numbers (digits + country code) that may ask **any topic**. Replies still identify as the Geston Hosting assistant. Does **not** grant owner/admin powers (no TX, deploy, flags, unban).

```bash
heroku config:set T_NUMBERS=2547xxxxxxxx,2557xxxxxxxx
heroku config:set AI_MEMORY_TTL_HOURS=6
```
