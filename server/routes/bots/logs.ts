import { Router, type Response, type NextFunction } from "express";
import { Bot } from "../../models/Bot.js";
import { type AuthRequest } from "../../middleware/auth.js";
import { getAppLogs } from "../../services/heroku.js";

const router = Router();

function redactEmails(line: string): string {
  return line.replace(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g, "[email]");
}

function filterLogs(rawLogs: string): string[] {
  if (!rawLogs || rawLogs === "No logs available") return [];
  const lines = rawLogs.split("\n").filter(l => l.trim());
  const infraPatterns = [
    /heroku\[/i, /app\[api\]/i, /heroku\/runner/i, /heroku\/release/i,
    /heroku\/slug/i, /heroku\/build/i, /dyno/i, /at=info method=/i,
    /at=error/i, /fwd="/i, /host=/i, /request_id=/i, /protocol=http/i,
    /tls_version=/i, /connect=\d+ms/i, /service=\d+ms/i, /status=\d+ bytes=/i,
    /buildpack/i, /npm\s+(audit|fund|notice)/i, /Downloading/i, /Installing node/i,
    /Compressing/i, /Launching/i, /slug\s+size/i, /app\[scheduler\]/i,
    /source=\w+\sdyno=/i, /Procfile/i, /State changed/i, /Starting process/i,
    /Stopping all processes/i, /Error R\d+/i, /router\s+at=/i,
  ];
  const spamPatterns = [
    /session\s+saved/i, /keys\s+saved/i, /creds\s+saved/i,
    /credentials\s+saved/i, /store\s+state/i, /saving\s+session/i,
  ];
  const botPatterns = [
    /\[patch-baileys\]/i, /session/i, /Server running/i, /\[DB\]/i,
    /Connected/i, /Bot\s+started/i, /command/i, /message/i,
    /error/i, /warn/i, /info/i, /\[.*\]/, /\{.*\}/,
  ];
  return lines
    .filter(line => {
      if (infraPatterns.some(p => p.test(line))) return false;
      if (spamPatterns.some(p => p.test(line))) return false;
      return botPatterns.some(p => p.test(line));
    })
    .map(redactEmails)
    .slice(-100);
}

router.get("/:id/logs", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const bot = await Bot.findOne({ _id: req.params.id, userId: req.user!._id });
    if (!bot) { res.status(404).json({ error: "Bot not found" }); return; }
    const rawLogs = await getAppLogs(bot.herokuAppName);
    const logs = filterLogs(rawLogs);
    res.json({ logs });
  } catch (err) { next(err); }
});

export default router;
