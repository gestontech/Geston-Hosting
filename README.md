# Geston Hosting

Plateforme d'hébergement de bots WhatsApp avec économie de pièces TX, boutique de panels Pterodactyl, boost de réseaux sociaux et déploiement automatisé.

**En ligne :** [hosting.gestontech.online](https://hosting.gestontech.online)  
**Version :** 1.12.0

### Parler à notre bot

Configurez `WA_BOT_NUMBER` une fois votre bot WhatsApp en place, et il apparaîtra automatiquement sur la page Contact.

Voir [CHANGELOG.md](./CHANGELOG.md) pour l'historique des versions. Détails d'environnement WhatsApp : [docs/ENV-WHATSAPP.md](./docs/ENV-WHATSAPP.md).

## Stack

- **Frontend** : React + Vite + TypeScript + Tailwind CSS
- **Backend** : Express 5 + MongoDB (Mongoose) + TypeScript
- **Paiements** : Paystack (M-Pesa, Airtel, Carte), mobile money régional
- **Hébergement bots** : Heroku (via API)
- **Hébergement panels** : Pterodactyl
- **IA** : Gemini (principal) + Groq (secours), rotation multi-clés

## Fonctionnalités

- Déployer n'importe quel template de bot WhatsApp en moins de 2 minutes
- Économie de pièces TX (1 TX = 5 KSh au taux de recharge)
- Essai gratuit de 24 heures (un par numéro, à vie)
- Boutique de panels — achetez des panels d'hébergement Pterodactyl avec des pièces TX
- Boost de réseaux sociaux — Instagram, TikTok, YouTube, Twitch et plus (followers, likes, vues)
- Système de parrainage (les deux côtés gagnent 1 TX à l'inscription)
- Codes promo échangeables sur le tableau de bord
- Panel admin complet : gestion des utilisateurs, contrôle des bots, transactions, coupons, stats DB
- Protection anti-spam de paiement : 7 paiements échoués/jour → bannissement automatique du compte
- Balises meta OG pour les liens de déploiement de bots partageables
- Mode sombre/clair
- Notifications in-app pour la progression et la finalisation des commandes de boost
- Assistant WhatsApp public (DM uniquement) avec flux de consentement, prix live panels/boost et synchronisation des feature flags avec le site
- Réponses en texte libre propulsées par l'IA sur WhatsApp et le chat du site (`/ai-chat` + widget flottant)

## Architecture

Le serveur est organisé par ressource. Tout fichier qui dépasse ~300 lignes est découpé en sous-dossier plutôt que de continuer à grossir. Le motif partout dans le code est : un fichier de niveau supérieur mince qui crée uniquement le routeur et monte les sous-routeurs, la logique réelle vivant en dessous.

```
server/
  routes/
    admin.ts          → monte server/routes/admin/{dashboard,users,bots,
                         transactions,catalog,teams,system,boost,
                         notifications,shared}.ts
    payments.ts       → monte server/routes/payments/{core,kenya,nigeria,
                         cameroon,tanzania,drc,paypal,webhooks,shared}.ts
    auth.ts           → monte server/routes/auth/{login,magicLink,
                         passwordReset,oauth,session,shared}.ts
    bots.ts           → monte server/routes/bots/{trialCheck,list,deploy,
                         lifecycle,remove,logs,shared}.ts
    boost.ts          → monte server/routes/boost/{catalog,orders,mpesa,
                         drc,cameroon,tanzania,card,shared}.ts
    aiChat.ts         → POST /api/ai/chat (widget site + page /ai-chat)
  services/
    bot.ts            → démarre le bot WhatsApp public et enregistre le
                         canal de notification propriétaire basé sur WhatsApp
    whatsappOwner.ts  → session multi-appareils Baileys (appairage depuis le panel admin)
    whatsappPublic.ts → assistant DM WhatsApp public (consentement, menus, flags, secours IA)
    bot/ownerOps.ts   → opérations propriétaire partagées (accorder/retirer TX, lookups, stats)
    aiChat.ts         → runAIChat() partagé pour site / WhatsApp
  lib/
    ai.ts             → askAI + parseAIReply (Gemini → Groq, multi-clés)
    promptContext.ts  → contexte prix live + feature flags pour les prompts
  prompts/
    shared.ts         → identité, règles, tarification, handoff, marqueurs de déploiement owner
    sitePrompt.ts     → surface du widget de chat IA du site
    whatsappPrompt.ts → surface en langage naturel WhatsApp
```

Chaque `shared.ts` dans la liste ci-dessus contient ce dont les sous-fichiers d'une ressource ont réellement besoin en commun — constantes, helpers ponctuels, ou (dans `auth/shared.ts`) de l'état en mémoire comme les tokens de magic-link. Cet état est déclaré exactement une fois par ressource et importé par les sous-fichiers qui en ont besoin.

Quelques fichiers ont un ordre d'enregistrement important plutôt que des routes purement indépendantes — à connaître si vous les touchez :

- `routes/bots.ts` : `/trial-check/:phone` est monté *avant*
  `sessionOrApiKeyGuard`/`banCheck`, donc il reste public tandis que toutes les autres routes bot (montées après) exigent l'authentification.

Voir `CONTRIBUTING.md` pour les conventions derrière cette structure (pas de commentaires dans le code source, gestion d'erreurs via `next(err)`, secrets via `.env`, et motifs de tests).

## Logique de boost des réseaux sociaux

Le catalogue de services est stocké localement pour la vitesse :

1. **Fichier JSON** sur disque (`server/data/boost-catalogue.json`) — source principale rapide sur le VPS
2. **Cache en mémoire** après le premier chargement

## Variables d'environnement admin

Les identifiants admin sont lus depuis l'environnement (voir `app.json`) :

- `ADMIN_EMAIL` — e-mail du compte admin (doit correspondre à un utilisateur)
- `ADMIN_USERNAME` — nom d'utilisateur optionnel pour la connexion
- `ADMIN_PASSWORD` — mot de passe utilisé pour le seed et la connexion

Au démarrage / seed, le compte admin est créé ou mis à jour avec le mot de passe fourni dans `ADMIN_PASSWORD`.

## Licence

Voir [LICENSE](./LICENSE).
