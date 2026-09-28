import { ArrowLeft, Zap, BookOpen, Shield, Repeat2, Gift, Users, HelpCircle, ChevronDown, Server, Crown, AlertTriangle, Search } from "lucide-react";
import { useState, useEffect, useRef, type ReactNode } from "react";
import { useNavLoader } from "@/App";
import { TechBackground } from "@/components/TechBackground";

const ANIM = `
@keyframes docsSlideIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes docsFadeIn{from{opacity:0}to{opacity:1}}
@keyframes docsScaleIn{from{opacity:0;transform:scale(0.96)}to{opacity:1;transform:scale(1)}}
`;

interface FAQItem {
  q: string;
  a: string;
  tags?: string[];
}

interface Section {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  color?: string;
  items: FAQItem[];
}

const sections: Section[] = [
  {
    icon: Zap,
    title: "Pour commencer",
    color: "purple",
    items: [
      {
        q: "Comment déployer un bot ?",
        a: "Depuis votre tableau de bord, allez dans Services → Déploiement de bot. Parcourez les modèles de bot disponibles et cliquez sur 'Déployer'. Sur la page de déploiement : récupérez votre ID de session (étape 1), saisissez un nom de bot d'au moins 5 lettres (étape 2), collez votre ID de session (étape 3), choisissez le mode d'appareil (étape 4), puis cliquez sur Déployer. Le déploiement est gratuit et votre bot est provisionné automatiquement.",
        tags: ["deploy", "start", "setup", "new", "gratuit"],
      },
      {
        q: "Où puis-je obtenir un ID de session ?",
        a: "Chaque modèle de bot a un bouton 'Obtenir l'ID de session' qui ouvre la page de jumelage. Suivez le processus de jumelage et vous recevrez une longue chaîne de session — copiez-collez la valeur entière dans le formulaire de déploiement.",
        tags: ["session", "pair", "qr", "link"],
      },
      {
        q: "Quelle est la différence entre appareil Android et iOS ?",
        a: "Android active les boutons interactifs (menus déroulants, boutons de réponse rapide). iOS utilise uniquement des réponses texte. Choisissez selon les fonctionnalités de votre bot — Android est recommandé dans la plupart des cas.",
        tags: ["android", "ios", "device", "mode"],
      },
      {
        q: "Combien coûte l'hébergement ?",
        a: "Le déploiement et l'hébergement des services proposés sur Geston Hosting sont actuellement gratuits. Aucun achat, aucune recharge et aucun solde à utiliser pour déployer ou gérer vos services.",
        tags: ["price", "cost", "free", "gratuit"],
      },
      {
        q: "Puis-je déployer plusieurs bots ?",
        a: "Oui. Vous pouvez déployer plusieurs bots et les gérer depuis la page Mes Bots. Les déploiements disponibles sont gratuits.",
        tags: ["multiple", "more", "bots", "free"],
      },
      {
        q: "Combien de temps prend le déploiement ?",
        a: "Le déploiement prend généralement quelques minutes. Pendant ce temps, le service construit et démarre votre bot. Le statut passera de 'en construction' à 'en cours d'exécution' sur la page Mes Bots une fois prêt.",
        tags: ["time", "deploy", "how long", "minutes", "building"],
      },
    ],
  },
  {
    icon: Repeat2,
    title: "Gérer votre bot",
    color: "indigo",
    items: [
      {
        q: "Comment redémarrer ou arrêter mon bot ?",
        a: "Depuis Mes Bots, chaque carte de bot a des boutons Démarrer, Arrêter et Redémarrer. Utilisez-les pour contrôler le cycle de vie de votre bot.",
        tags: ["restart", "stop", "start", "control"],
      },
      {
        q: "Comment mettre à jour mon ID de session ?",
        a: "Cliquez sur 'Modifier' sur la carte de votre bot, saisissez la nouvelle chaîne de session, et enregistrez. Utile si WhatsApp vous déconnecte ou si vous obtenez une nouvelle session.",
        tags: ["update", "session", "edit", "change"],
      },
      {
        q: "Comment voir les journaux (logs) ?",
        a: "Cliquez sur le bouton 'Logs' sur n'importe quelle carte de bot. Cela affiche la sortie récente de l'application pour vous aider à déboguer.",
        tags: ["logs", "debug", "output", "error"],
      },
      {
        q: "Mon bot ne fonctionne plus après une mise à jour WhatsApp — que faire ?",
        a: "Générez une nouvelle session via le lien de jumelage de votre bot, puis mettez à jour votre bot via le bouton Modifier avec le nouvel ID de session, et redémarrez. Cela résout généralement les problèmes de connexion WhatsApp.",
        tags: ["stopped", "update", "whatsapp", "fix", "broken"],
      },
      {
        q: "Comment partager la page de déploiement de mon bot ?",
        a: "Sur la page Déploiement de bot, chaque modèle a un bouton 'Copier le lien'. Partagez ce lien pour ouvrir directement la page de déploiement de ce bot.",
        tags: ["share", "link", "copy"],
      },
    ],
  },
  {
    icon: Gift,
    title: "Codes promo",
    color: "green",
    items: [
      {
        q: "Où saisir un code promo ?",
        a: "Depuis le tableau de bord, cliquez sur 'Code promo'. Saisissez le code reçu et cliquez sur Réclamer.",
        tags: ["coupon", "code", "claim", "enter"],
      },
      {
        q: "Où trouver des codes promo ?",
        a: "Les codes promo peuvent être partagés dans les groupes WhatsApp de Geston Hosting et sur les canaux officiels. Restez à l'affût des annonces.",
        tags: ["find", "coupon", "code", "where"],
      },
      {
        q: "Puis-je utiliser le même code promo deux fois ?",
        a: "Non. Chaque code ne peut être réclamé qu'une seule fois, par un seul compte.",
        tags: ["coupon", "twice", "reuse"],
      },
    ],
  },
  {
    icon: Users,
    title: "Parrainage",
    color: "blue",
    items: [
      {
        q: "Comment fonctionne le parrainage ?",
        a: "Partagez votre lien de parrainage unique depuis le tableau de bord. Lorsqu'une personne s'inscrit avec votre lien, le système enregistre automatiquement le parrainage et applique les avantages prévus par le programme.",
        tags: ["referral", "invite", "bonus"],
      },
      {
        q: "Y a-t-il des restrictions sur le parrainage ?",
        a: "Oui — les comptes créés depuis la même adresse IP ou le même appareil que le vôtre peuvent ne pas être éligibles aux récompenses de parrainage. Cela permet notamment d'éviter l'auto-parrainage et les abus.",
        tags: ["referral", "restriction", "ip", "self"],
      },
      {
        q: "Quand est-ce que je reçois mon avantage de parrainage ?",
        a: "L'avantage est appliqué automatiquement lorsque les conditions du programme de parrainage sont remplies. Aucun achat ni recharge n'est nécessaire.",
        tags: ["referral", "when", "instant", "bonus"],
      },
    ],
  },
  {
    icon: Server,
    title: "Hébergement de panels",
    color: "indigo",
    items: [
      {
        q: "Qu'est-ce qu'un panel d'hébergement ?",
        a: "Un panel d'hébergement (Pterodactyl) vous donne un environnement serveur complet avec accès console, gestionnaire de fichiers et suivi des ressources en temps réel. Vous pouvez y exécuter directement une application Node.js ou un bot WhatsApp compatible.",
        tags: ["panel", "pterodactyl", "what", "server"],
      },
      {
        q: "Comment créer un panel ?",
        a: "Allez dans Services → Panels → Créer des panels. Choisissez le type de panel disponible, renseignez les informations demandées puis lancez la création. Le service est gratuit et le provisionnement réel du panel est effectué automatiquement.",
        tags: ["panel", "create", "purchase", "how", "free"],
      },
      {
        q: "Comment accéder à mon panel ?",
        a: "Allez dans Services → Panels → Mes Panels. Chaque panel possède un bouton 'Ouvrir le panel' qui vous amène directement à la page de connexion Pterodactyl.",
        tags: ["panel", "access", "open", "login", "my panels"],
      },
      {
        q: "Y a-t-il des frais récurrents pour les panels ?",
        a: "Non. Les panels proposés actuellement sont gratuits. Aucun renouvellement payant ou recharge n'est nécessaire.",
        tags: ["panel", "fee", "recurring", "monthly", "renewal", "free"],
      },
      {
        q: "Puis-je supprimer l'enregistrement de mon panel ?",
        a: "Oui — dans Mes Panels, chaque panel possède un bouton 'Supprimer'. Cela retire l'enregistrement de la vue de votre compte. Le fonctionnement réel du serveur sur le panel Pterodactyl dépend de l'action effectuée et des règles de gestion du service.",
        tags: ["panel", "delete", "remove"],
      },
    ],
  },
  {
    icon: Crown,
    title: "Accès Panel Admin",
    color: "yellow",
    items: [
      {
        q: "Qu'est-ce que le Panel Admin ?",
        a: "Le Panel Admin fournit des privilèges d'administration sur l'environnement Pterodactyl lorsqu'ils sont disponibles pour votre compte. Il permet notamment de gérer les serveurs, utilisateurs, nodes et allocations selon les permissions accordées.",
        tags: ["admin", "panel", "what", "privileges"],
      },
      {
        q: "Comment obtenir l'accès admin ?",
        a: "Allez dans Services → Panels et choisissez l'option Panel Admin lorsqu'elle est disponible. L'accès est géré directement par le système et ne nécessite aucun achat ou paiement.",
        tags: ["admin", "access", "how", "free"],
      },
    ],
  },
  {
    icon: Shield,
    title: "Compte & Sécurité",
    color: "green",
    items: [
      {
        q: "J'ai oublié mon mot de passe — comment le réinitialiser ?",
        a: "Sur la page de connexion, cliquez sur 'Mot de passe oublié ?' et saisissez votre adresse e-mail. Un lien de réinitialisation vous sera envoyé. Si vous vous êtes inscrit via GitHub ou Google, vous pouvez plutôt vous connecter avec cette option.",
        tags: ["password", "forgot", "reset", "login"],
      },
      {
        q: "Mon compte a été banni — que faire ?",
        a: "Contactez le support via la page Contact avec l'e-mail de votre compte. Les bannissements sont émis pour violation des conditions d'utilisation. Si vous pensez que c'est une erreur, nous l'examinerons.",
        tags: ["banned", "suspended", "account", "ban"],
      },
      {
        q: "Mon ID de session est-il sécurisé ?",
        a: "Votre ID de session est stocké de manière sécurisée et utilisé uniquement pour connecter votre bot à WhatsApp. Ne partagez jamais votre ID de session publiquement.",
        tags: ["session", "safe", "security", "privacy"],
      },
    ],
  },
  {
    icon: AlertTriangle,
    title: "Dépannage",
    color: "orange",
    items: [
      {
        q: "Le bot ne fonctionne plus / ne répond pas",
        a: "WhatsApp a peut-être déconnecté la session. Essayez ces étapes dans l'ordre :\n1. Allez dans Mes Bots et cliquez sur Redémarrer sur le bot.\n2. Si toujours pas de réponse après quelques minutes, générez une nouvelle session via le lien de jumelage du bot.\n3. Cliquez sur Modifier sur la carte du bot, collez le nouvel ID de session et enregistrez.\n4. Cliquez à nouveau sur Redémarrer.\nCela résout la plupart des problèmes de connexion.",
        tags: ["stopped", "not responding", "offline", "fix", "broken", "session", "restart", "not working"],
      },
      {
        q: "Le bot affiche 'arrêté' de façon inattendue",
        a: "WhatsApp a peut-être déconnecté la session en arrière-plan. Allez sur Modifier sur la carte du bot, générez une nouvelle session via le lien de jumelage, collez le nouvel ID de session, enregistrez, puis redémarrez le bot.",
        tags: ["stopped", "status", "unexpected", "offline"],
      },
      {
        q: "Comment mettre à jour mon ID de session quand WhatsApp déconnecte",
        a: "1. Cliquez sur 'Obtenir l'ID de session' pour votre modèle de bot afin d'ouvrir la page de jumelage.\n2. Scannez le QR code ou saisissez le code de jumelage dans WhatsApp.\n3. Copiez la chaîne de session complète reçue.\n4. Allez dans Mes Bots → Modifier sur votre bot → collez le nouvel ID de session → Enregistrer.\n5. Redémarrez le bot.",
        tags: ["session", "update", "logout", "whatsapp", "qr", "pairing", "expired"],
      },
      {
        q: "Le bot fonctionne mais ne répond pas aux messages",
        a: "Vérifiez ceci dans l'ordre :\n1. Confirmez que le statut du bot affiche 'en cours d'exécution' sur la page Mes Bots.\n2. Cliquez sur 'Logs' et cherchez des messages d'erreur.\n3. Si les logs montrent 'session expirée' ou similaire, générez une nouvelle session et mettez-la à jour via Modifier.\n4. Si le bot vient d'être déployé, attendez quelques minutes afin qu'il termine son initialisation.\n5. Si le problème persiste, contactez le support avec le nom de votre bot et une capture d'écran des logs.",
        tags: ["not replying", "not responding", "messages", "reply", "silent"],
      },
      {
        q: "Échec du déploiement / bot bloqué en 'construction'",
        a: "Si votre bot est resté en statut 'en construction' pendant plus de 10 minutes, le déploiement a probablement rencontré un problème. Essayez :\n1. Allez dans Services → Déploiement de bot.\n2. Relancez le déploiement avec le même modèle et un nouvel ID de session.\n3. Si le problème persiste, contactez le support avec le nom de votre bot.",
        tags: ["deploy failed", "building", "stuck", "failed", "deployment"],
      },
      {
        q: "La page devient blanche / écran vide",
        a: "Essayez un rafraîchissement forcé (Ctrl+Shift+R sur ordinateur, ou tirez vers le bas sur mobile). Si vous êtes déconnecté, reconnectez-vous et revenez à la page. Si le problème persiste, videz le cache de votre navigateur.",
        tags: ["blank", "white", "screen", "empty", "page", "crash"],
      },
      {
        q: "Un service gratuit ne se lance pas",
        a: "Vérifiez d'abord que vous êtes connecté à votre compte et que les informations demandées sont correctes. Consultez ensuite le statut du service ou du déploiement. Si le problème persiste, contactez le support avec le nom du service, l'heure approximative de l'action et le message d'erreur affiché.",
        tags: ["failed", "service", "free", "error", "deployment"],
      },
      {
        q: "Je n'arrive pas à me connecter à mon compte",
        a: "Essayez ceci :\n1. Si vous utilisez e-mail + mot de passe : cliquez sur 'Mot de passe oublié ?' et réinitialisez-le.\n2. Si vous utilisez GitHub ou Google : cliquez sur le bouton OAuth correspondant — ne saisissez pas de mot de passe.\n3. Si votre compte a été banni, la page de connexion affichera un message d'erreur.\n4. Essayez un autre navigateur ou videz les cookies.",
        tags: ["login", "cant login", "sign in", "access", "locked out"],
      },
      {
        q: "Mes identifiants de panel ne fonctionnent pas",
        a: "Vérifiez que vous utilisez bien les identifiants affichés lors de la création du panel. Si vous les avez perdus ou si le mot de passe ne fonctionne plus :\n1. Allez dans Mes Panels pour confirmer que le panel existe.\n2. Contactez le support afin qu'un administrateur puisse vérifier ou réinitialiser l'accès.",
        tags: ["panel", "password", "credentials", "wrong", "login", "pterodactyl"],
      },
    ],
  },
  {
    icon: HelpCircle,
    title: "Questions fréquentes",
    color: "purple",
    items: [
      {
        q: "Puis-je changer le numéro de téléphone de mon bot WhatsApp ?",
        a: "Non — les bots sont liés à l'ID de session qui est lié à un numéro WhatsApp spécifique. Pour utiliser un autre numéro, déployez un nouveau bot.",
        tags: ["phone", "number", "change", "whatsapp"],
      },
      {
        q: "Que se passe-t-il quand mon bot arrive à expiration ?",
        a: "Selon le service et sa configuration, un bot arrivé à expiration peut entrer dans une période de grâce ou être arrêté automatiquement. Consultez son statut dans Mes Bots et contactez le support si vous avez besoin d'aide pour le réactiver.",
        tags: ["expire", "expiry", "delete", "grace", "renew"],
      },
      {
        q: "Puis-je renouveler mon bot ?",
        a: "Oui. Depuis la page Mes Bots, utilisez l'action 'Renouveler' lorsqu'elle est disponible. Le renouvellement est actuellement gratuit.",
        tags: ["renew", "extend", "subscription", "free"],
      },
    ],
  },
];

function useRevealOnScroll(delay = 0) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let t: ReturnType<typeof setTimeout> | null = null;

    const obs = new IntersectionObserver(([entry]) => {
      if (t) {
        clearTimeout(t);
        t = null;
      }

      if (entry.isIntersecting) {
        t = setTimeout(() => {
          el.style.opacity = "1";
          el.style.transform = "translateY(0)";
          t = null;
        }, delay);
      } else {
        el.style.opacity = "0";
        el.style.transform = "translateY(16px)";
      }
    }, { threshold: 0.08 });

    obs.observe(el);

    return () => {
      obs.disconnect();
      if (t) clearTimeout(t);
    };
  }, [delay]);

  return ref;
}

function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRevealOnScroll(delay);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: 0,
        transform: "translateY(16px)",
        transition: `opacity 0.7s cubic-bezier(0.22,1,0.36,1) ${delay}ms, transform 0.7s cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

function fuzzScore(text: string, query: string): number {
  const t = text.toLowerCase();
  const q = query.toLowerCase().trim();

  if (!q) return 0;
  if (t.includes(q)) return 3;

  const words = q.split(/\s+/);
  let score = 0;

  for (const w of words) {
    if (w.length < 2) continue;

    if (t.includes(w)) {
      score += 2;
    } else {
      for (let i = 0; i <= t.length - w.length; i++) {
        let diff = 0;

        for (let j = 0; j < w.length; j++) {
          if (t[i + j] !== w[j]) diff++;
        }

        if (diff <= 1) {
          score += 1;
          break;
        }
      }
    }
  }

  return score;
}

function searchSections(q: string) {
  if (!q.trim()) return null;

  const results: Array<{
    item: FAQItem;
    sectionTitle: string;
    SectionIcon: Section["icon"];
    score: number;
  }> = [];

  for (const section of sections) {
    for (const item of section.items) {
      const haystack = [item.q, item.a, ...(item.tags || [])].join(" ");
      const score = fuzzScore(haystack, q);

      if (score > 0) {
        results.push({
          item,
          sectionTitle: section.title,
          SectionIcon: section.icon,
          score,
        });
      }
    }
  }

  results.sort((a, b) => b.score - a.score);

  if (results.length === 0) {
    const fallback = sections.find(s => s.title === "Dépannage");

    if (fallback) {
      return fallback.items.slice(0, 3).map(item => ({
        item,
        sectionTitle: fallback.title,
        SectionIcon: fallback.icon,
        score: 0,
        isFallback: true,
      }));
    }
  }

  return results.map(r => ({
    ...r,
    isFallback: false,
  }));
}

function FAQCard({
  q,
  a,
  delay = 0,
}: FAQItem & { delay?: number }) {
  const [open, setOpen] = useState(false);
  const lines = a.split("\n");

  return (
    <Reveal delay={delay}>
      <div className="border border-border rounded-xl overflow-hidden hover:border-teal-500/30 transition-colors">
        <button
          className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
          onClick={() => setOpen(!open)}
        >
          <span className="text-sm font-medium pr-4">{q}</span>

          <span
            className="shrink-0 transition-transform duration-200"
            style={{
              transform: open ? "rotate(180deg)" : "rotate(0deg)",
            }}
          >
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </span>
        </button>

        {open && (
          <div
            className="px-4 pb-4 pt-0"
            style={{ animation: "docsSlideIn 0.2s ease both" }}
          >
            {lines.length > 1 ? (
              <div className="text-sm text-muted-foreground leading-relaxed space-y-1">
                {lines.map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground leading-relaxed">
                {a}
              </p>
            )}
          </div>
        )}
      </div>
    </Reveal>
  );
}

const colorMap: Record<string, string> = {
  purple: "text-teal-400 bg-teal-500/10 border-teal-500/20",
  indigo: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
  violet: "text-violet-400 bg-violet-500/10 border-violet-500/20",
  green: "text-green-400 bg-green-500/10 border-green-500/20",
  blue: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  orange: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  yellow: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
};

export function Docs() {
  const { navigateWithLoader } = useNavLoader();
  const [search, setSearch] = useState("");
  const [openSections, setOpenSections] = useState<Set<string>>(
    new Set(["Pour commencer"])
  );

  const filtered = searchSections(search);

  const toggleSection = (title: string) => {
    setOpenSections(prev => {
      const next = new Set(prev);

      if (next.has(title)) {
        next.delete(title);
      } else {
        next.add(title);
      }

      return next;
    });
  };

  return (
    <div className="min-h-screen bg-background relative">
      <style>{ANIM}</style>

      <TechBackground />

      <nav className="border-b border-border sticky top-0 bg-background/95 backdrop-blur-sm z-50">
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex items-center h-14 gap-3">
            <button
              onClick={() => navigateWithLoader("/")}
              className="p-2 -ml-2 rounded-lg hover:bg-muted transition-colors"
              aria-label="Retour"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-muted-foreground" />
              <h1 className="font-bold text-base">
                Documentation & Aide
              </h1>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5 relative z-[1]">
        <Reveal>
          <div className="rounded-2xl bg-gradient-to-br from-teal-500/10 to-orange-500/5 border border-teal-500/20 p-5">
            <h2 className="font-bold text-lg mb-1">
              Documentation Geston Hosting
            </h2>

            <p className="text-sm text-muted-foreground leading-relaxed">
              Guides pour déployer gratuitement des bots, créer et gérer les
              panels, utiliser les fonctionnalités de la plateforme et résoudre
              les problèmes courants. Vous ne trouvez pas votre réponse ?
              Contactez le support.
            </p>

            <button
              onClick={() => navigateWithLoader("/contact")}
              className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-lg bg-teal-500/15 text-teal-400 hover:bg-teal-500/25 text-xs font-medium transition-colors border border-teal-500/20"
            >
              Contacter le support
            </button>
          </div>
        </Reveal>

        <Reveal delay={60}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />

            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher… ex. 'bot ne répond pas', 'panel'"
              className="w-full px-4 py-3 pl-10 rounded-xl border border-border bg-muted/50 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500/50 transition-colors"
            />

            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Effacer la recherche"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
        </Reveal>

        {filtered !== null ? (
          <div
            className="space-y-3"
            style={{ animation: "docsScaleIn 0.25s ease both" }}
          >
            {(
              filtered as Array<{
                item: FAQItem;
                sectionTitle: string;
                SectionIcon: Section["icon"];
                isFallback?: boolean;
              }>
            ).map((result, i) => (
              <Reveal key={i} delay={i * 40}>
                <div className="border border-border rounded-xl overflow-hidden hover:border-teal-500/30 transition-colors">
                  <div className="flex items-center gap-2 px-4 pt-3 pb-1">
                    <result.SectionIcon className="w-3 h-3 text-teal-400" />

                    <span className="text-[11px] text-muted-foreground uppercase tracking-wide font-semibold">
                      {result.sectionTitle}
                    </span>

                    {result.isFallback && (
                      <span className="text-[9px] text-muted-foreground/60 ml-auto">
                        Suggéré
                      </span>
                    )}
                  </div>

                  <FAQCard {...result.item} />
                </div>
              </Reveal>
            ))}

            {(
              filtered as Array<{ isFallback?: boolean }>
            ).every(r => r.isFallback) && search && (
              <Reveal delay={filtered.length * 40}>
                <div className="text-center py-4">
                  <p className="text-xs text-muted-foreground">
                    Aucune correspondance exacte pour "
                    <span className="text-foreground">{search}</span>"
                    — voici quelques solutions de dépannage.
                  </p>

                  <button
                    className="mt-2 text-xs text-teal-400 hover:text-teal-300 transition-colors underline underline-offset-2"
                    onClick={() => navigateWithLoader("/contact")}
                  >
                    Toujours bloqué ? Contactez le support →
                  </button>
                </div>
              </Reveal>
            )}
          </div>
        ) : (
          <>
            {sections.map((section, si) => {
              const colors =
                colorMap[section.color || "purple"] ||
                colorMap.purple;

              const isOpen = openSections.has(section.title);

              return (
                <Reveal key={section.title} delay={si * 50}>
                  <div className="border border-border rounded-xl overflow-hidden">
                    <button
                      className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-muted/40 transition-colors"
                      onClick={() => toggleSection(section.title)}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-7 h-7 rounded-lg border flex items-center justify-center ${colors}`}
                        >
                          <section.icon className="w-3.5 h-3.5" />
                        </div>

                        <span className="font-semibold text-sm">
                          {section.title}
                        </span>

                        <span className="text-[11px] text-muted-foreground/60">
                          ({section.items.length})
                        </span>
                      </div>

                      <span
                        style={{
                          transform: isOpen
                            ? "rotate(180deg)"
                            : "rotate(0deg)",
                          transition: "transform 0.2s ease",
                        }}
                      >
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      </span>
                    </button>

                    {isOpen && (
                      <div
                        className="px-4 pb-4 pt-1 space-y-2.5 border-t border-border/50"
                        style={{
                          animation: "docsSlideIn 0.2s ease both",
                        }}
                      >
                        {section.items.map((item, i) => (
                          <FAQCard
                            key={item.q}
                            {...item}
                            delay={i * 30}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </Reveal>
              );
            })}
          </>
        )}

        <Reveal delay={80}>
          <div className="rounded-2xl bg-card border border-border p-5 text-center">
            <p className="text-sm font-medium mb-1">
              Besoin d'aide supplémentaire ?
            </p>

            <p className="text-xs text-muted-foreground mb-3">
              Notre équipe de support est disponible via la page contact.
            </p>

            <button
              onClick={() => navigateWithLoader("/contact")}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-teal-600 text-white hover:bg-teal-700 text-sm font-medium transition-colors"
            >
              Obtenir de l'aide
            </button>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
