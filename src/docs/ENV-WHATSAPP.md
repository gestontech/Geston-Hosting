# Variables d'environnement du bot WhatsApp

N'utilisez **pas** `OWNER_NUMBER` — cela entre en conflit avec d'autres outils. Utilisez les noms ci-dessous.

## Serveur (Heroku / `.env`)

| Variable | Requis | Rôle |
|---|---|---|
| `BOT_OWNER_ID` | pour la session propriétaire WhatsApp | N'importe quel ID unique que vous choisissez pour identifier votre propre session WhatsApp dans la base |
| `DEV_WA_NUMBER` | pour l'admin WA owner + Contact développeur | Votre numéro WhatsApp personnel, **chiffres uniquement** avec l'indicatif pays |
| `WA_BOT_NUMBER` | optionnel | Numéro du bot WhatsApp public pour les liens landing/docs |
| `SITE_URL` / `APP_URL` / `CLIENT_URL` | recommandé | URL publique du site utilisée dans les menus et e-mails |

## Frontend (Vite)

Définissez ces variables pour que la page Contact puisse construire les liens `wa.me` au moment du build :

| Variable | Rôle |
|---|---|
| `VITE_DEV_WA_NUMBER` | Chiffres pour Contact → WhatsApp |
