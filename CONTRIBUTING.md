# Contribuer à Geston Hosting

## Démarrage

```bash
cp .env.example .env
yarn install
yarn dev          # frontend (Vite)
yarn dev:server   # backend (Express)
```

Exécutez `yarn test` et `yarn lint` avant d'ouvrir une PR. `yarn build` doit aussi réussir proprement (`tsc -b && vite build && tsc -p tsconfig.server.json`).

## Style de code

- **Pas de commentaires dans les fichiers source.** Ce codebase garde volontairement la logique auto-explicative via le nommage et la structure plutôt que des commentaires. Respectez cette convention dans le nouveau code — si quelque chose a besoin d'un commentaire pour être compris, c'est généralement le signe qu'il devrait s'agir d'une fonction helper nommée à la place.
- **Les erreurs passent par `next(err)`.** Chaque handler de route enveloppe son corps dans `try { ... } catch (err) { next(err); }` et laisse le middleware partagé `errorHandler` (`server/lib/errors.ts`) le transformer en réponse structurée. N'utilisez pas `res.status(500).json(...)` directement dans un catch générique — la seule exception est un bloc catch qui doit renvoyer un message *spécifique* et utile côté client.
- **Pas de secrets lus en ligne avec un fallback.** `process.env.SOME_SECRET || ""` dispersé dans les fichiers est exactement le motif dont ce codebase s'est éloigné. Centralisez la lecture d'environnement.

## Tests

Écrivez des tests unitaires pour la nouvelle logique métier. Les tests existants dans `server/**/__tests__` et `src/lib/__tests__` servent de référence.

## Pull requests

- Gardez les PR focalisées.
- Assurez-vous que le build et les tests passent.
- Ne committez jamais de secrets.
