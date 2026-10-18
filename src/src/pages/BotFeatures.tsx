import { useState, useMemo } from "react";
import { useNavLoader } from "@/App";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TechBackground } from "@/components/TechBackground";
import { AppLogoIcon } from "@/components/AppLogo";
import {
  Search, Copy, Check, ArrowLeft, Bot, Zap, Shield,
  AlertTriangle, Rocket, ChevronDown
} from "lucide-react";

interface BotFeature {
  id: string;
  name: string;
  category: string;
  description: string;
  tags: string[];
  commands: { label: string; command: string }[];
}

const FEATURES: BotFeature[] = [
  {
    id: "autoview",
    name: "Statut automatique",
    category: "Statut",
    description: "Voit automatiquement les statuts de tous les contacts dès leur publication. Soyez le premier à voir chaque mise à jour de statut.",
    tags: ["status", "view", "auto", "autoview", "first"],
    commands: [
      { label: "Activer", command: ".autoview on" },
      { label: "Activer aussi", command: ".enable autoview" },
      { label: "Désactiver", command: ".autoview off" },
      { label: "Désactiver aussi", command: ".disable autoview" },
    ],
  },
  {
    id: "autolike",
    name: "J'aime automatique de statut",
    category: "Statut",
    description: "Aime automatiquement chaque mise à jour de statut avec un emoji personnalisé de votre choix. Votre numéro réagit instantanément à tous les statuts.",
    tags: ["status", "like", "emoji", "autolike", "react", "heart"],
    commands: [
      { label: "Activer avec emoji", command: ".autolike 😍" },
      { label: "Changer l'emoji", command: ".autolike 🔥" },
      { label: "Désactiver", command: ".autolike off" },
    ],
  },
  {
    id: "groupstatus",
    name: "Statut de groupe",
    category: "Statut",
    description: "Envoie les mises à jour de statut directement à un groupe WhatsApp pour que tous les membres puissent les voir, même sans suivre l'expéditeur.",
    tags: ["status", "group", "forward", "groupstatus", "share"],
    commands: [
      { label: "Activer", command: ".groupstatus on" },
      { label: "Désactiver", command: ".groupstatus off" },
      { label: "Définir le groupe (exécuter dans le groupe)", command: ".setstatusgroup" },
    ],
  },
  {
    id: "antidelete",
    name: "Anti-suppression",
    category: "Anti-suppression",
    description: "Récupère tout message supprimé et affiche son contenu original. Quand quelqu'un supprime un message, votre bot le sauvegarde discrètement et vous l'envoie.",
    tags: ["delete", "antidelete", "retrieve", "deleted", "messages", "recover"],
    commands: [
      { label: "Activer", command: ".antidelete on" },
      { label: "Désactiver", command: ".antidelete off" },
    ],
  },
  {
    id: "viewonce",
    name: "Récupération vue unique",
    category: "Anti-suppression",
    description: "Les photos et vidéos à vue unique qui vous sont envoyées sont discrètement transférées dans vos messages privés avant de disparaître. Ne manquez plus jamais un média à vue unique.",
    tags: ["viewonce", "view", "once", "media", "secret", "dm", "photo", "video", "recover"],
    commands: [
      { label: "Activer", command: ".viewonce on" },
      { label: "Désactiver", command: ".viewonce off" },
    ],
  },
  {
    id: "welcome",
    name: "Message de bienvenue",
    category: "Gestion de groupe",
    description: "Accueille automatiquement les nouveaux membres de votre groupe avec un message personnalisé lors de leur arrivée. Définissez un message de bienvenue sur mesure.",
    tags: ["welcome", "group", "members", "join", "message", "greet", "new"],
    commands: [
      { label: "Activer", command: ".welcome on" },
      { label: "Désactiver", command: ".welcome off" },
      { label: "Définir le message", command: ".setwelcome Bienvenue dans le groupe, @user ! 🎉" },
      { label: "Réinitialiser par défaut", command: ".setwelcome reset" },
    ],
  },
  {
    id: "goodbye",
    name: "Message d'adieu",
    category: "Gestion de groupe",
    description: "Envoie un message d'adieu quand des membres quittent le groupe. Gardez votre groupe engagé et professionnel.",
    tags: ["goodbye", "bye", "group", "members", "leave", "farewell"],
    commands: [
      { label: "Activer", command: ".goodbye on" },
      { label: "Désactiver", command: ".goodbye off" },
      { label: "Définir le message", command: ".setgoodbye Au revoir @user, tu vas nous manquer ! 👋" },
      { label: "Réinitialiser par défaut", command: ".setgoodbye reset" },
    ],
  },
  {
    id: "antilink",
    name: "Anti-lien",
    category: "Sécurité",
    description: "Supprime automatiquement tout lien partagé dans votre groupe. Vous pouvez autoriser des domaines spécifiques sur liste blanche.",
    tags: ["antilink", "link", "security", "spam", "delete", "block", "url"],
    commands: [
      { label: "Activer", command: ".antilink on" },
      { label: "Désactiver", command: ".antilink off" },
      { label: "Autoriser un domaine", command: ".allowlink example.com" },
      { label: "Retirer un domaine autorisé", command: ".removelink example.com" },
    ],
  },
  {
    id: "broadcast",
    name: "Diffusion vers les groupes",
    category: "Gestion de groupe",
    description: "Envoie un seul message à tous les groupes WhatsApp où se trouve votre bot simultanément. Parfait pour les annonces importantes.",
    tags: ["broadcast", "groups", "announce", "message", "all", "send", "mass"],
    commands: [
      { label: "Diffuser", command: ".broadcast <votre message>" },
      { label: "Exemple", command: ".broadcast Salut tout le monde ! 🎉 N'oubliez pas l'événement de ce soir !" },
    ],
  },
  {
    id: "autoreply",
    name: "Réponse automatique",
    category: "Réponse auto",
    description: "Votre bot répond automatiquement aux messages avec des réponses intelligentes. Définissez des mots-clés déclencheurs avec des réponses spécifiques — comme un assistant IA.",
    tags: ["autoreply", "reply", "auto", "keyword", "llm", "ai", "respond", "bot"],
    commands: [
      { label: "Activer", command: ".autoreply on" },
      { label: "Désactiver", command: ".autoreply off" },
      { label: "Définir une réponse mot-clé", command: ".setreply hello Salut ! Comment puis-je t'aider ?" },
      { label: "Retirer un mot-clé", command: ".removereply hello" },
    ],
  },
  {
    id: "antispam",
    name: "Anti-spam",
    category: "Sécurité",
    description: "Détecte automatiquement et avertit ou retire les utilisateurs qui envoient trop de messages en peu de temps. Gardez votre groupe propre et organisé.",
    tags: ["antispam", "spam", "security", "flood", "group", "protect"],
    commands: [
      { label: "Activer", command: ".antispam on" },
      { label: "Désactiver", command: ".antispam off" },
      { label: "Définir la limite de messages par minute", command: ".spammsg 10" },
    ],
  },
  {
    id: "tagall",
    name: "Mentionner tous les membres",
    category: "Gestion de groupe",
    description: "Mentionne tous les membres du groupe en un seul message. Idéal pour les annonces importantes nécessitant l'attention de tous.",
    tags: ["tagall", "mention", "all", "group", "announce", "notify", "ping"],
    commands: [
      { label: "Mentionner tous", command: ".tagall <message>" },
      { label: "Exemple", command: ".tagall Merci de lire le message épinglé !" },
    ],
  },
  {
    id: "ping",
    name: "Ping / Vérification de vitesse",
    category: "Général",
    description: "Vérifie la vitesse de réponse et le statut de connexion de votre bot. Assurez-vous qu'il fonctionne bien à tout moment.",
    tags: ["ping", "speed", "check", "latency", "status", "bot", "connection"],
    commands: [
      { label: "Vérifier la vitesse", command: ".ping" },
      { label: "Aussi", command: ".speed" },
    ],
  },
  {
    id: "menu",
    name: "Menu du bot",
    category: "Général",
    description: "Affiche toutes les commandes et fonctionnalités disponibles dans un menu formaté. Idéal pour découvrir tout ce que votre bot peut faire.",
    tags: ["menu", "help", "commands", "list", "all"],
    commands: [
      { label: "Afficher le menu", command: ".menu" },
      { label: "Aussi", command: ".help" },
    ],
  },
  {
    id: "info",
    name: "Infos du bot",
    category: "Général",
    description: "Affiche des informations sur l'instance de votre bot : temps d'exécution, utilisation mémoire, disponibilité, et version.",
    tags: ["info", "about", "version", "bot", "uptime"],
    commands: [
      { label: "Afficher les infos", command: ".info" },
      { label: "Aussi", command: ".botinfo" },
    ],
  },
];

const CATEGORIES = ["All", "Statut", "Anti-suppression", "Gestion de groupe", "Réponse auto", "Sécurité", "Général"];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <button
      onClick={handleCopy}
      className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
      aria-label="Copier la commande"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function FeatureCard({ feature }: { feature: BotFeature }) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4 hover:border-teal-500/30 transition-all duration-200">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-teal-500/10 border border-teal-500/20">
            <Zap className="w-4 h-4 text-teal-400" />
          </div>
          <h3 className="font-semibold text-sm leading-tight pt-2">{feature.name}</h3>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Commandes</p>
          <div className="space-y-1.5">
            {feature.commands.map((cmd) => (
              <div key={cmd.command} className="flex items-center justify-between gap-2 bg-muted/50 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs text-muted-foreground shrink-0">{cmd.label}:</span>
                  <code className="text-xs font-mono text-foreground truncate">{cmd.command}</code>
                </div>
                <CopyButton text={cmd.command} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
    }

export function BotFeatures() {
  const { navigateWithLoader } = useNavLoader();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return FEATURES.filter((f) => {
      const matchCat = category === "All" || f.category === category;
      if (!matchCat) return false;
      if (!q) return true;
      const haystack = [
        f.name,
        f.description,
        f.category,
        ...f.tags,
        ...f.commands.map((c) => c.command),
      ].join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [search, category]);


  return (
    <div className="min-h-screen bg-background relative">
      <TechBackground />

      <nav className="border-b border-border sticky top-0 bg-background/95 backdrop-blur-sm z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <button
                className="p-2 -ml-2 rounded-lg hover:bg-muted transition-colors"
                onClick={() => navigateWithLoader("/")}
                aria-label="Retour"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-2">
                <AppLogoIcon className="w-5 h-5 text-primary" />
                <span className="font-bold text-base">Fonctionnalités & Aide</span>
              </div>
            </div>
            <Button
              size="sm"
              className="hidden sm:flex bg-gradient-to-r from-teal-600 to-orange-600 hover:from-teal-700 hover:to-orange-700 text-white border-0 gap-1.5"
              onClick={() => navigateWithLoader("/services/bots")}
            >
              <Rocket className="w-3.5 h-3.5" />
              Essayer gratuitement
            </Button>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 relative z-10">
        <div className="mb-8 p-4 rounded-xl bg-gradient-to-r from-teal-600/10 to-orange-600/10 border border-teal-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 flex items-center justify-center">
              <Bot className="w-5 h-5 text-teal-400" />
            </div>
            <div>
              <p className="font-semibold text-sm">Essayez Geston-MD gratuitement</p>
              <p className="text-xs text-muted-foreground">Déployez un bot d'essai gratuit et testez toutes les fonctionnalités instantanément — aucun Coins requis.</p>
            </div>
          </div>
          <Button
            size="sm"
            className="shrink-0 bg-gradient-to-r from-teal-600 to-orange-600 hover:from-teal-700 hover:to-orange-700 text-white border-0 gap-1.5"
            onClick={() => navigateWithLoader("/services/bots")}
          >
            <Rocket className="w-3.5 h-3.5" />
            Démarrer l'essai gratuit
          </Button>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-1">Fonctionnalités du bot & Aide</h1>
          <p className="text-muted-foreground text-sm">Tout ce que vous pouvez faire avec Geston-MD. Recherchez, explorez, et copiez les commandes.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher des fonctionnalités, commandes, ou mots-clés... (ex. 'statut', 'supprimer', 'groupe')"
              className="pl-9"
            />
          </div>
          <div className="relative sm:w-52">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full appearance-none h-10 rounded-md border border-input bg-background px-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat === "All" ? "Toutes les catégories" : cat}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          </div>
        </div>

        <p className="mb-5 text-sm text-muted-foreground">{filtered.length} fonctionnalité{filtered.length !== 1 ? "s" : ""}</p>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Search className="w-10 h-10 text-muted-foreground/30 mb-3" />
            <p className="font-medium mb-1">Aucune fonctionnalité trouvée</p>
            <p className="text-sm text-muted-foreground">Essayez un autre terme de recherche ou une autre catégorie.</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => { setSearch(""); setCategory("All"); }}>
              Effacer les filtres
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
            {filtered.map((feature) => (
              <FeatureCard key={feature.id} feature={feature} />
            ))}
          </div>
        )}

        <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-5 flex gap-4 items-start">
          <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm mb-1">Avertissement</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              GESTONX fournit un support exclusivement pour <span className="text-foreground font-medium">Geston-MD</span>.
              Pour les autres bots WhatsApp, nous ne pouvons pas fournir d'assistance car nous ne les possédons ni ne les maintenons.
              Les commandes et fonctionnalités présentées ici s'appliquent spécifiquement à Geston-MD.
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-teal-500/20 bg-teal-500/5 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-teal-400 shrink-0" />
            <div>
              <p className="font-semibold text-sm">Prêt à découvrir Geston-MD ?</p>
              <p className="text-xs text-muted-foreground mt-0.5">Déployez un bot d'essai gratuit instantanément — aucun Coins requis pour commencer.</p>
            </div>
          </div>
          <Button
            size="sm"
            className="shrink-0 bg-gradient-to-r from-teal-600 to-orange-600 hover:from-teal-700 hover:to-orange-700 text-white border-0 gap-1.5"
            onClick={() => navigateWithLoader("/services/bots")}
          >
            <Rocket className="w-3.5 h-3.5" />
            Démarrer l'essai gratuit
          </Button>
        </div>
      </main>
    </div>
  );
}
