# Notes IA & sécurité WhatsApp

## IA multilingue
L'assistant répond dans la **même langue** que celle utilisée par l'utilisateur (swahili, français, anglais, arabe, sheng, etc.).

## Mémoire de conversation
L'historique de conversation par utilisateur est conservé en **RAM** pendant `AI_MEMORY_TTL_HOURS` (défaut **6 heures**) d'inactivité, puis effacé automatiquement. Configurez sur Heroku si vous voulez une autre fenêtre.

## Blocage auto & déblocage (WhatsApp uniquement)
Les messages abusifs / spam / de type malware bloquent automatiquement l'expéditeur dans la base (et via Baileys quand disponible). Le propriétaire n'est jamais bloqué.
