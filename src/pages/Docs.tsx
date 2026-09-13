import { ArrowLeft, Zap, BookOpen, Shield, Repeat2, Gift, Users, HelpCircle, ChevronDown, Server, Crown, AlertTriangle, Search } from "lucide-react";
import { useState, useEffect, useRef, type ReactNode } from "react";
import { useNavLoader } from "@/App";
import { TechBackground } from "@/components/TechBackground";

const ANIM = `
@keyframes docsSlideIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes docsFadeIn{from{opacity:0}to{opacity:1}}
@keyframes docsScaleIn{from{opacity:0;transform:scale(0.96)}to{opacity:1;transform:scale(1)}}
`;

interface FAQItem { q: string; a: string; tags?: string[]; }
interface Section { icon: React.ComponentType<{ className?: string }>; title: string; color?: string; items: FAQItem[]; }

const sections: Section[] = [
  {
    icon: Zap,
    title: "Pour commencer",
    color: "purple",
    items: [
      { q: "Comment déployer un bot ?", a: "Depuis votre tableau de bord, allez dans Services → Déploiement de bot. Parcourez les modèles de bot disponibles et cliquez sur 'Déployer'. Sur la page de déploiement : récupérez votre ID de session (étape 1), saisissez un nom de bot d'au moins 5 lettres (étape 2), collez votre ID de session (étape 3), choisissez le mode d'appareil (étape 4), puis cliquez sur Déployer. Votre bot se construit en environ 4 minutes.", tags: ["deploy", "start", "setup", "new"] },
      { q: "Où puis-je obtenir un ID de session ?", a: "Chaque modèle de bot a un bouton 'Obtenir l'ID de session' qui ouvre la page de jumelage. Suivez le processus de jumelage et vous recevrez une longue chaîne de session — copiez-collez la valeur entière dans le formulaire de déploiement.", tags: ["session", "pair", "qr", "link"] },
      { q: "Quelle est la différence entre appareil Android et iOS ?", a: "Android active les boutons interactifs (menus déroulants, boutons de réponse rapide). iOS utilise uniquement des réponses texte. Choisissez selon les fonctionnalités de votre bot — Android est recommandé dans la plupart des cas.", tags: ["android", "ios", "device", "mode"] },
      { q: "Combien coûte l'hébergement ?", a: "La plupart des bots coûtent 10 Coins par mois. Certains modèles premium peuvent coûter plus cher — le coût est clairement indiqué sur la page de déploiement de chaque bot avant confirmation. 10 Coins = 1 mois d'hébergement pour un bot.", tags: ["price", "cost", "tx", "coins"] },
      { q: "Puis-je déployer plusieurs bots ?", a: "Oui. Vous pouvez déployer autant de bots que votre solde de Coins le permet, et tous les gérer depuis la page Mes Bots.", tags: ["multiple", "more", "bots"] },
      { q: "Combien de temps prend le déploiement ?", a: "Le déploiement prend généralement environ 4 minutes. Pendant ce temps, Heroku construit et démarre votre bot. Le statut passera de 'en construction' à 'en cours d'exécution' sur la page Mes Bots une fois prêt.", tags: ["time", "deploy", "how long", "minutes", "building"] },
    ],
  },
  {
    icon: Repeat2,
    title: "Gérer votre bot",
    color: "indigo",
    items: [
      { q: "Comment redémarrer ou arrêter mon bot ?", a: "Depuis Mes Bots, chaque carte de bot a des boutons Démarrer, Arrêter et Redémarrer. Utilisez-les pour contrôler le cycle de vie de votre bot.", tags: ["restart", "stop", "start", "control"] },
      { q: "Comment mettre à jour mon ID de session ?", a: "Cliquez sur 'Modifier' sur la carte de votre bot, saisissez la nouvelle chaîne de session, et enregistrez. Utile si WhatsApp vous déconnecte ou si vous obtenez une nouvelle session.", tags: ["update", "session", "edit", "change"] },
      { q: "Comment voir les journaux (logs) ?", a: "Cliquez sur le bouton 'Logs' sur n'importe quelle carte de bot. Cela affiche la sortie récente de l'application pour vous aider à déboguer.", tags: ["logs", "debug", "output", "error"] },
      { q: "Mon bot ne fonctionne plus après une mise à jour WhatsApp — que faire ?", a: "Générez une nouvelle session via le lien de jumelage de votre bot, puis mettez à jour votre bot via le bouton Modifier avec le nouvel ID de session, et redémarrez. Cela résout généralement les problèmes de connexion WhatsApp.", tags: ["stopped", "update", "whatsapp", "fix", "broken"] },
      { q: "Comment partager la page de déploiement de mon bot ?", a: "Sur la page Déploiement de bot, chaque modèle a un bouton 'Copier le lien'. Partagez ce lien pour ouvrir directement la page de déploiement de ce bot.", tags: ["share", "link", "copy"] },
    ],
  },
  {
    icon: Zap,
    title: "Coins & Facturation",
    color: "violet",
    items: [
      { q: "Que sont les Coins ?", a: "Les Coins sont la monnaie interne utilisée pour payer l'hébergement des bots et les panels. 10 Coins = 1 mois d'hébergement pour un bot. Les Coins n'expirent jamais.", tags: ["tx", "coins", "currency", "what"] },
      { q: "Comment acheter des Coins ?", a: "Allez sur la page Recharger. Choisissez un forfait et payez via M-Pesa, Airtel Money, carte bancaire, ou Apple Pay. Les Coins sont ajoutés instantanément après confirmation du paiement.", tags: ["buy", "top up", "purchase", "pay", "mpesa", "airtel", "card"] },
      { q: "Quelle est l'option la moins chère ?", a: "Le forfait Starter vous donne le minimum de Coins nécessaire pour déployer un bot. Le forfait Best Deal donne le plus de Coins par shilling — repérez le badge 'Best Deal'.", tags: ["cheap", "cheap", "starter", "best", "deal"] },
      { q: "Les Coins expirent-ils ?", a: "Non — votre solde de Coins n'expire jamais. Utilisez-le quand vous en avez besoin pour déployer ou renouveler.", tags: ["expire", "expiry", "balance", "never"] },
      { q: "Mon paiement est passé mais les Coins n'ont pas été ajoutés", a: "Attendez 1 à 2 minutes et actualisez votre tableau de bord. Si les Coins n'ont toujours pas été ajoutés après 5 minutes, contactez le support avec votre numéro de référence de paiement.", tags: ["payment", "tx", "not added", "missing", "charged"] },
    ],
  },
  {
    icon: Gift,
    title: "Codes promo",
    color: "green",
    items: [
      { q: "Où saisir un code promo ?", a: "Depuis le tableau de bord, cliquez sur 'Code promo'. Saisissez le code reçu et cliquez sur Réclamer.", tags: ["coupon", "code", "claim", "enter"] },
      { q: "Où trouver des codes promo ?", a: "Les codes promo sont partagés dans les groupes WhatsApp de Geston Bot et parfois sur les réseaux sociaux. Restez à l'affût !", tags: ["find", "coupon", "code", "where"] },
      { q: "Puis-je utiliser le même code promo deux fois ?", a: "Non. Chaque code ne peut être réclamé qu'une seule fois, par un seul compte.", tags: ["coupon", "twice", "reuse"] },
    ],
  },
  {
    icon: Users,
    title: "Parrainage",
    color: "blue",
    items: [
      { q: "Comment fonctionne le parrainage ?", a: "Partagez votre lien de parrainage unique depuis le tableau de bord. Quand quelqu'un s'inscrit avec votre lien, vous gagnez tous les deux automatiquement 2 Coins.", tags: ["referral", "invite", "earn", "bonus"] },
      { q: "Y a-t-il des restrictions sur le parrainage ?", a: "Oui — les comptes créés depuis la même adresse IP ou le même appareil que le vôtre ne sont pas éligibles aux récompenses de parrainage. Cela évite l'auto-parrainage.", tags: ["referral", "restriction", "ip", "self"] },
      { q: "Quand est-ce que je reçois mes Coins de parrainage ?", a: "Instantanément, dès que votre filleul crée un compte. Aucun délai, aucune attente.", tags: ["referral", "when", "instant"] },
    ],
  },
  {
    icon: Server,
    title: "Hébergement de panels",
    color: "indigo",
    items: [
      { q: "Qu'est-ce qu'un panel d'hébergement ?", a: "Un panel d'hébergement (Pterodactyl) vous donne un environnement serveur complet avec accès console, gestionnaire de fichiers, et suivi des ressources en temps réel. Vous pouvez y exécuter directement n'importe quelle app Node.js ou bot WhatsApp.", tags: ["panel", "pterodactyl", "what", "server"] },
      { q: "Comment acheter un panel ?", a: "Allez dans Services → Panels → Acheter des panels. Choisissez un forfait et cliquez sur Acheter. Les Coins sont déduits instantanément et vos identifiants de panel (nom d'utilisateur et mot de passe) s'affichent immédiatement. Vous pouvez aussi les retrouver plus tard dans Mes Panels.", tags: ["panel", "buy", "purchase", "how"] },
      { q: "Comment accéder à mon panel ?", a: "Allez dans Services → Panels → Mes Panels. Chaque panel a un bouton 'Ouvrir le panel' qui vous amène directement à la page de connexion Pterodactyl.", tags: ["panel", "access", "open", "login", "my panels"] },
      { q: "Y a-t-il des frais récurrents pour les panels ?", a: "Non. Les achats de panel sont ponctuels — vous payez des Coins une fois et conservez l'accès. Il n'y a pas de renouvellement mensuel pour les panels.", tags: ["panel", "fee", "recurring", "monthly", "renewal"] },
      { q: "Puis-je supprimer l'enregistrement de mon panel ?", a: "Oui — dans Mes Panels, chaque panel a un bouton 'Supprimer'. Cela retire les identifiants enregistrés de la vue de votre compte. Votre accès réel au serveur sur le panel Pterodactyl reste inchangé.", tags: ["panel", "delete", "remove"] },
    ],
  },
  {
    icon: Crown,
    title: "Accès Panel Admin",
    color: "yellow",
    items: [
      { q: "Qu'est-ce que le forfait Panel Admin ?", a: "Le forfait Panel Admin (40 Coins) donne à votre compte les pleins privilèges d'administrateur sur le panel Pterodactyl. En tant qu'admin, vous pouvez gérer tous les serveurs, utilisateurs, nodes et allocations depuis le tableau de bord du panel.", tags: ["admin", "panel", "what", "privileges"] },
      { q: "Comment acheter l'accès admin ?", a: "Allez dans Services → Panels → Acheter des panels et faites défiler jusqu'à la carte Panel Admin. Cliquez sur Acheter (coûte 40 Coins). Vos identifiants admin s'affichent immédiatement après — enregistrez-les en lieu sûr.", tags: ["admin", "purchase", "buy", "how"] },
    ],
  },
  {
    icon: Shield,
    title: "Compte & Sécurité",
    color: "green",
    items: [
      { q: "J'ai oublié mon mot de passe — comment le réinitialiser ?", a: "Sur la page de connexion, cliquez sur 'Mot de passe oublié ?' et saisissez votre adresse e-mail. Un lien de réinitialisation vous sera envoyé. Si vous vous êtes inscrit via GitHub ou Google, vous pouvez plutôt vous connecter avec cette option.", tags: ["password", "forgot", "reset", "login"] },
      { q: "Mon compte a été banni — que faire ?", a: "Contactez le support via la page contact avec l'e-mail de votre compte. Les bannissements sont émis pour violation des conditions d'utilisation. Si vous pensez que c'est une erreur, nous l'examinerons.", tags: ["banned", "suspended", "account", "ban"] },
      { q: "Mon ID de session est-il sécurisé ?", a: "Votre ID de session est stocké chiffré et utilisé uniquement pour connecter votre bot à WhatsApp. Nous ne le partageons ni ne l'exposons à des tiers.", tags: ["session", "safe", "security", "privacy"] },
    ],
  },
  {
    icon: AlertTriangle,
    title: "Dépannage",
    color: "orange",
    items: [
      { q: "Le bot ne fonctionne plus / ne répond pas", a: "WhatsApp a peut-être déconnecté la session. Essayez ces étapes dans l'ordre :\n1. Allez dans Mes Bots et cliquez sur Redémarrer sur le bot.\n2. Si toujours pas de réponse après 2 minutes, générez une nouvelle session via le lien de jumelage du bot.\n3. Cliquez sur Modifier sur la carte du bot, collez le nouvel ID de session, et enregistrez.\n4. Cliquez à nouveau sur Redémarrer.\nCela résout la plupart des problèmes.", tags: ["stopped", "not responding", "offline", "fix", "broken", "session", "restart", "not working"] },
      { q: "Le bot affiche 'arrêté' de façon inattendue", a: "WhatsApp a peut-être déconnecté la session en arrière-plan. Allez sur Modifier sur la carte du bot, générez une nouvelle session via le lien de jumelage, collez le nouvel ID de session, enregistrez, et redémarrez le bot.", tags: ["stopped", "status", "unexpected", "offline"] },
      { q: "Comment mettre à jour mon ID de session quand WhatsApp déconnecte", a: "1. Cliquez sur 'Obtenir l'ID de session' pour votre modèle de bot afin d'ouvrir la page de jumelage.\n2. Scannez le QR code ou saisissez le code de jumelage dans WhatsApp.\n3. Copiez la chaîne de session complète reçue.\n4. Allez dans Mes Bots → Modifier sur votre bot → collez le nouvel ID de session → Enregistrer.\n5. Redémarrez le bot.", tags: ["session", "update", "logout", "whatsapp", "qr", "pairing", "expired"] },
      { q: "Le bot fonctionne mais ne répond pas aux messages", a: "Vérifiez ceci dans l'ordre :\n1. Confirmez que le statut du bot affiche 'en cours d'exécution' sur la page Mes Bots.\n2. Cliquez sur 'Logs' et cherchez des messages d'erreur.\n3. Si les logs montrent 'session expirée' ou similaire — générez une nouvelle session et mettez-la à jour via Modifier.\n4. Si le bot vient d'être déployé, attendez 5 minutes — certains bots prennent du temps à s'initialiser complètement.\n5. Si le problème persiste, contactez le support avec le nom de votre bot et une capture d'écran des logs.", tags: ["not replying", "not responding", "messages", "reply", "silent"] },
      { q: "Échec du déploiement / bot bloqué en 'construction'", a: "Si votre bot est resté en statut 'en construction' pendant plus de 10 minutes, le déploiement a probablement échoué. Essayez :\n1. Allez dans Services → Déploiement de bot.\n2. Cliquez à nouveau sur Déployer avec le même modèle et un nouvel ID de session.\n3. Si le problème persiste, contactez le support avec le nom de votre bot.", tags: ["deploy failed", "building", "stuck", "failed", "deployment"] },
      { q: "La page devient blanche / écran vide", a: "Essayez un rafraîchissement forcé (Ctrl+Shift+R sur ordinateur, ou tirez vers le bas sur mobile). Si déconnecté, reconnectez-vous et revenez en arrière. Si le problème persiste, videz le cache de votre navigateur.", tags: ["blank", "white", "screen", "empty", "page", "crash"] },
      { q: "Le paiement a échoué ou n'a pas été traité", a: "Si votre demande M-Pesa / Airtel n'est pas apparue : vérifiez que votre numéro est correct et inclut l'indicatif du pays. Si le paiement a été débité mais que les Coins n'ont pas été ajoutés, attendez 3 minutes et actualisez. Si toujours manquant, contactez le support avec votre numéro de référence et une capture d'écran.", tags: ["payment", "failed", "not processed", "mpesa", "airtel", "charged"] },
      { q: "Je n'arrive pas à me connecter à mon compte", a: "Essayez ceci :\n1. Si vous utilisez e-mail+mot de passe : cliquez sur 'Mot de passe oublié ?' et réinitialisez-le.\n2. Si vous utilisez GitHub ou Google : cliquez sur le bouton OAuth correspondant — ne saisissez pas de mot de passe.\n3. Si votre compte a été banni, la page de connexion affichera un message d'erreur.\n4. Essayez un autre navigateur ou videz les cookies.", tags: ["login", "cant login", "sign in", "access", "locked out"] },
      { q: "Mes identifiants de panel ne fonctionnent pas", a: "Les identifiants du panel sont affichés une seule fois lors de l'achat. Vérifiez que vous avez bien enregistré le bon nom d'utilisateur et mot de passe. Si vous les avez perdus :\n1. Allez dans Mes Panels pour confirmer que le panel existe.\n2. Contactez le support — un admin peut réinitialiser votre mot de passe de panel.", tags: ["panel", "password", "credentials", "wrong", "login", "pterodactyl"] },
    ],
  },
  {
    icon: HelpCircle,
    title: "Questions fréquentes",
    color: "purple",
    items: [
      { q: "Puis-je changer le numéro de téléphone de mon bot WhatsApp ?", a: "Non — les bots sont liés à l'ID de session qui est lié à un numéro WhatsApp spécifique. Pour utiliser un autre numéro, déployez un nouveau bot.", tags: ["phone", "number", "change", "whatsapp"] },
      { q: "Que se passe-t-il quand mon bot expire ?", a: "Quand la période d'hébergement de votre bot se termine, il entre dans une période de grâce de 24 heures en mode maintenance. Après cela, il est automatiquement supprimé. Renouvelez avant expiration depuis la page Mes Bots pour éviter toute perte de données.", tags: ["expire", "expiry", "delete", "grace", "renew"] },
      { q: "Puis-je renouveler mon bot ?", a: "Oui. Depuis la page Mes Bots, cliquez sur 'Renouveler' sur n'importe quel bot actif ou expiré. Des Coins seront déduits et l'expiration du bot sera prolongée de 30 jours.", tags: ["renew", "extend", "subscription"] },
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
      if (t) { clearTimeout(t); t = null; }
      if (entry.isIntersecting) {
        t = setTimeout(() => { el.style.opacity = "1"; el.style.transform = "translateY(0)"; t = null; }, delay);
      } else {
        el.style.opacity = "0";
        el.style.transform = "translateY(16px)";
      }
    }, { threshold: 0.08 });
    obs.observe(el);
    return () => { obs.disconnect(); if (t) clearTimeout(t); };
  }, [delay]);
  return ref;
}

function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRevealOnScroll(delay);
  return (
    <div ref={ref} className={className} style={{ opacity: 0, transform: "translateY(16px)", transition: `opacity 0.7s cubic-bezier(0.22,1,0.36,1) ${delay}ms, transform 0.7s cubic-bezier(0.22,1,0.36,1) ${delay}ms` }}>
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
    if (t.includes(w)) score += 2;
    else {
      for (let i = 0; i <= t.length - w.length; i++) {
        let diff = 0;
        for (let j = 0; j < w.length; j++) if (t[i + j] !== w[j]) diff++;
        if (diff <= 1) { score += 1; break; }
      }
    }
  }
  return score;
}

function searchSections(q: string) {
  if (!q.trim()) return null;
  const results: Array<{ item: FAQItem; sectionTitle: string; SectionIcon: Section["icon"]; score: number }> = [];
  for (const section of sections) {
    for (const item of section.items) {
      const haystack = [item.q, item.a, ...(item.tags || [])].join(" ");
      const score = fuzzScore(haystack, q);
      if (score > 0) {
        results.push({ item, sectionTitle: section.title, SectionIcon: section.icon, score });
      }
    }
  }
  results.sort((a, b) => b.score - a.score);
  if (results.length === 0) {
    const fallback = sections.find(s => s.title === "Troubleshooting");
    if (fallback) {
      return fallback.items.slice(0, 3).map(item => ({ item, sectionTitle: fallback.title, SectionIcon: fallback.icon, score: 0, isFallback: true }));
    }
  }
  return results.map(r => ({ ...r, isFallback: false }));
}

function FAQCard({ q, a, delay = 0 }: FAQItem & { delay?: number }) {
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
          <span className="shrink-0 transition-transform duration-200" style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </span>
        </button>
        {open && (
          <div className="px-4 pb-4 pt-0" style={{ animation: "docsSlideIn 0.2s ease both" }}>
            {lines.length > 1 ? (
              <div className="text-sm text-muted-foreground leading-relaxed space-y-1">
                {lines.map((line, i) => <p key={i}>{line}</p>)}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground leading-relaxed">{a}</p>
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
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(["Getting Started"]));

  const filtered = searchSections(search);

  const toggleSection = (title: string) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
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
            <button onClick={() => navigateWithLoader("/")} className="p-2 -ml-2 rounded-lg hover:bg-muted transition-colors" aria-label="Retour">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-muted-foreground" />
              <h1 className="font-bold text-base">Documentation & Aide</h1>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5 relative z-[1]">
        <Reveal>
          <div className="rounded-2xl bg-gradient-to-br from-teal-500/10 to-orange-500/5 border border-teal-500/20 p-5">
            <h2 className="font-bold text-lg mb-1">Documentation Geston Hosting</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Guides pour déployer des bots, gérer les panels, les paiements, et le dépannage. Vous ne trouvez pas votre réponse ? Contactez le support.
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
              placeholder="Rechercher… ex. 'bot ne répond pas', 'paiement échoué'"
              className="w-full px-4 py-3 pl-10 rounded-xl border border-border bg-muted/50 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500/50 transition-colors"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            )}
          </div>
        </Reveal>

        {filtered !== null ? (
          <div className="space-y-3" style={{ animation: "docsScaleIn 0.25s ease both" }}>
            {(filtered as Array<{ item: FAQItem; sectionTitle: string; SectionIcon: Section["icon"]; isFallback?: boolean }>).map((result, i) => (
              <Reveal key={i} delay={i * 40}>
                <div className="border border-border rounded-xl overflow-hidden hover:border-teal-500/30 transition-colors">
                  <div className="flex items-center gap-2 px-4 pt-3 pb-1">
                    <result.SectionIcon className="w-3 h-3 text-teal-400" />
                    <span className="text-[11px] text-muted-foreground uppercase tracking-wide font-semibold">{result.sectionTitle}</span>
                    {result.isFallback && <span className="text-[9px] text-muted-foreground/60 ml-auto">Suggéré</span>}
                  </div>
                  <FAQCard {...result.item} />
                </div>
              </Reveal>
            ))}
            {(filtered as Array<{ isFallback?: boolean }>).every(r => r.isFallback) && search && (
              <Reveal delay={filtered.length * 40}>
                <div className="text-center py-4">
                  <p className="text-xs text-muted-foreground">Aucune correspondance exacte pour "<span className="text-foreground">{search}</span>" — dépannage associé ci-dessous.</p>
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
              const colors = colorMap[section.color || "purple"] || colorMap.purple;
              const isOpen = openSections.has(section.title);
              return (
                <Reveal key={section.title} delay={si * 50}>
                  <div className="border border-border rounded-xl overflow-hidden">
                    <button
                      className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-muted/40 transition-colors"
                      onClick={() => toggleSection(section.title)}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-7 h-7 rounded-lg border flex items-center justify-center ${colors}`}>
                          <section.icon className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-semibold text-sm">{section.title}</span>
                        <span className="text-[11px] text-muted-foreground/60">({section.items.length})</span>
                      </div>
                      <span style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease" }}>
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      </span>
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-4 pt-1 space-y-2.5 border-t border-border/50" style={{ animation: "docsSlideIn 0.2s ease both" }}>
                        {section.items.map((item, i) => (
                          <FAQCard key={item.q} {...item} delay={i * 30} />
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
            <p className="text-sm font-medium mb-1">Besoin d'aide supplémentaire ?</p>
            <p className="text-xs text-muted-foreground mb-3">Notre équipe de support est disponible via la page contact.</p>
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
