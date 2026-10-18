import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.resend.com",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER || "resend",
    pass: process.env.SMTP_PASS,
  },
});

function wrap(body: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 16px"><tr><td align="center">
<table width="520" cellpadding="0" cellspacing="0" style="background:#111827;border:1px solid #1f2937;border-radius:16px;overflow:hidden;max-width:520px;width:100%">
<tr><td style="padding:28px 32px;background:linear-gradient(135deg,#1e1b4b,#0f172a);border-bottom:1px solid #1f2937;text-align:center">
<span style="font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.5px"> GESTONX</span>
</td></tr>
<tr><td style="padding:36px 32px">${body}</td></tr>
<tr><td style="padding:20px 32px;border-top:1px solid #1f2937;text-align:center">
<p style="margin:0;font-size:12px;color:#4b5563">Ceci est une notification de service automatique de GESTONX.</p>
<p style="margin:6px 0 0;font-size:12px;color:#374151">Cordialement, <strong style="color:#9ca3af">Geston</strong> &mdash; GestonTech &middot; <a href="https://hosting.gestontech.online" style="color:#6b7280;text-decoration:none">hosting.gestontech.online</a></p>
</td></tr>
</table></td></tr></table>
</body></html>`;
}

export async function sendBotExpiryEmail(to: string, appName: string, daysLeft: number): Promise<void> {
  const urgency = daysLeft <= 3 ? "⚠️ Urgent :" : "⏰";
  const dayWord = daysLeft !== 1 ? "jours" : "jour";
  const subject = `${urgency} Votre bot "${appName}" expire dans ${daysLeft} ${dayWord} — GESTONX`;
  const btnStyle = `display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;border-radius:10px;text-decoration:none;font-size:15px;font-weight:700`;
  const html = wrap(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#fff">Votre bot expire bientôt</h1>
    <p style="margin:0 0 20px;font-size:14px;color:#9ca3af;line-height:1.6">
      Votre bot <strong style="color:#d1d5db">${appName}</strong> expirera dans
      <strong style="color:${daysLeft <= 3 ? "#f87171" : "#fbbf24"}">${daysLeft} ${dayWord}</strong>.
      Après expiration, une <strong style="color:#d1d5db">période de grâce de 48 heures</strong> s'applique avant la suppression définitive.
    </p>
    <p style="margin:0 0 28px;font-size:14px;color:#6b7280;line-height:1.6">Renouvelez maintenant pour garder votre bot en ligne sans interruption.</p>
    <a href="https://hosting.gestontech.online/mybots" style="${btnStyle}">Renouveler le bot &rarr;</a>
  `);
  await transporter.sendMail({ from: process.env.SMTP_FROM || '"GESTONX" <noreply@gestontech.online>', to, subject, html });
}

export async function sendPanelExpiryEmail(to: string, planName: string, daysLeft: number): Promise<void> {
  const urgency = daysLeft <= 3 ? "⚠️ Urgent :" : "⏰";
  const dayWord = daysLeft !== 1 ? "jours" : "jour";
  const subject = `${urgency} Votre panel "${planName}" expire dans ${daysLeft} ${dayWord} — GESTONX`;
  const btnStyle = `display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;border-radius:10px;text-decoration:none;font-size:15px;font-weight:700`;
  const html = wrap(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#fff">Votre panel expire bientôt</h1>
    <p style="margin:0 0 20px;font-size:14px;color:#9ca3af;line-height:1.6">
      Votre plan de panel <strong style="color:#d1d5db">${planName}</strong> expirera dans
      <strong style="color:${daysLeft <= 3 ? "#f87171" : "#fbbf24"}">${daysLeft} ${dayWord}</strong>.
      Après expiration, il sera <strong style="color:#d1d5db">supprimé définitivement</strong> sans période de grâce.
    </p>
    <p style="margin:0 0 28px;font-size:14px;color:#6b7280;line-height:1.6">Achetez un nouveau plan de panel maintenant pour continuer sans interruption.</p>
    <a href="https://hosting.gestontech.online/services/panels/purchasepanel" style="${btnStyle}">Obtenir un nouveau panel &rarr;</a>
  `);
  await transporter.sendMail({ from: process.env.SMTP_FROM || '"GESTONX" <noreply@gestontech.online>', to, subject, html });
}

export async function sendOutageRefundEmail(opts: {
  to: string;
  totalTx: number;
  items: Array<{ kind: string; label: string; refundTx: number; remainingDays: number }>;
  siteUrl: string;
}): Promise<void> {
  const subject = `Nous sommes désolés — Coins crédités (${opts.totalTx} Coins) — GESTONX`;
  const btnStyle = `display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;border-radius:10px;text-decoration:none;font-size:15px;font-weight:700`;
  const rows = opts.items
    .map(
      (i) =>
        `<tr>
          <td style="padding:8px 0;color:#d1d5db;font-size:14px">Bot : <strong>${i.label}</strong></td>
          <td style="padding:8px 0;color:#a78bfa;font-size:14px;text-align:right">+${i.refundTx} Coins</td>
        </tr>`
    )
    .join("");

  const html = wrap(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#fff">Désolé pour l'interruption</h1>
    <p style="margin:0 0 20px;font-size:14px;color:#9ca3af;line-height:1.6">
      Un problème technique temporaire a été résolu de notre côté.
      Malheureusement, les bots précédemment actifs n'ont pas pu rester en ligne et doivent être redéployés.
    </p>
    <p style="margin:0 0 20px;font-size:14px;color:#9ca3af;line-height:1.6">
      Nous avons crédité l'intégralité des Coins correspondant à votre/vos période(s) de bot payante(s) sur votre solde afin que vous puissiez redéployer sans perte.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px">${rows}</table>
    <p style="margin:0 0 28px;font-size:16px;color:#fff;font-weight:700">
      Total crédité : <span style="color:#a78bfa">${opts.totalTx} Coins</span>
    </p>
    <p style="margin:0 0 28px;font-size:14px;color:#6b7280;line-height:1.6">
      Connectez-vous, vérifiez votre solde et l'historique des transactions, puis déployez un nouveau bot quand vous serez prêt.
      Merci de votre patience.
    </p>
    <a href="${opts.siteUrl}/deploy" style="${btnStyle}">Redéployer &rarr;</a>
  `);

  await transporter.sendMail({
    from: process.env.SMTP_FROM || '"GESTONX" <noreply@gestontech.online>',
    to: opts.to,
    subject,
    html,
  });
}
