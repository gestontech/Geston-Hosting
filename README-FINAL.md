# Geston Hosting — FINAL RDC / OPTGateway

Fichiers à remplacer/créer dans le dépôt :
- app.json
- .env.example
- server/index.ts
- server/lib/featureFlags.ts
- server/models/Transaction.ts
- server/routes/payments.ts
- server/routes/payments/core.ts
- server/routes/payments/drc.ts
- server/routes/payments/optgatewayWebhook.ts
- server/services/optgateway.ts
- src/components/TopUpFlow.tsx
- src/components/topup/DRCPaymentModal.tsx
- src/components/topup/packages.ts
- src/main.tsx
- src/lib/systemPreferences.ts
- src/styles/liquid-ios27.css

Anciennes routes de paiement non montées : Kenya, Nigeria, Cameroun, Tanzanie, PayPal, Paystack, SpeedPesa et WonyaPay.

Variables serveur :
OPTGATEWAY_BASE_URL=https://pay.optsolution.pro
OPTGATEWAY_KEY=sk_live_...
OPTGATEWAY_WEBHOOK_SECRET=...

Webhook : /webhook/optgateway
