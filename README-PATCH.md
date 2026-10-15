# Geston Hosting — DRC + Liquid iOS 27 pack

Ce pack contient les fichiers de remplacement/création pour :

- paiements limités à la RDC ;
- OPTGateway réel, côté serveur ;
- checkout hébergé OPTGateway ;
- confirmation par webhook signé ;
- thème Liquid Glass inspiré d'iOS 27 ;
- thème clair/sombre selon le système ;
- détection automatique de la langue système (fr/en).

## Variables serveur

Ajouter dans l'environnement de production :

```env
OPTGATEWAY_BASE_URL=https://pay.optsolution.pro
OPTGATEWAY_KEY=sk_test_...
OPTGATEWAY_WEBHOOK_SECRET=whsec_...
```

Pour l'argent réel, utiliser uniquement une clé `sk_live_...` après activation/vérification du compte OPTGateway.

## Webhook

Configurer dans le tableau de bord OPTGateway :

```text
https://hosting.gestontech.online/webhook/optgateway
```

IMPORTANT : le corps HTTP brut doit être conservé avant `express.json()`.
Dans `server/index.ts`, remplacer l'appel simple à `express.json()` par :

```ts
app.use(express.json({
  limit: "2mb",
  verify: (req, _res, buf) => {
    (req as Request & { rawBody?: Buffer }).rawBody = Buffer.from(buf);
  },
}));
```

Et importer `Request` depuis Express si nécessaire.

Le fichier `server/routes/payments/optgatewayWebhook.ts` doit être enregistré AVANT les autres routes qui consomment le body, ou monté avec une configuration compatible avec ce raw body.

## Langue

La détection système est automatique :
- `fr-*` => français ;
- autre langue => anglais.

Attention : détecter la langue ne traduit pas magiquement les textes existants. Pour traduire l'ensemble des pages de Geston Hosting, il faut ensuite brancher les textes de l'application à un vrai système i18n. Ce pack ne remplace pas les milliers de chaînes existantes par des traductions inventées.

## OPTGateway

La clé secrète reste uniquement sur le serveur. Le navigateur reçoit seulement l'URL de checkout hébergé.
La confirmation de crédit des Coins doit venir du webhook signé, jamais du simple retour navigateur.

Documentation officielle :
https://docs.optsolution.pro/
