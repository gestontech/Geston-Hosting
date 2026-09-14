import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { TechBackground } from "@/components/TechBackground";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useAuth } from "@/hooks/useAuth";
import { useNavLoader } from "@/App";
import {
  ArrowRight, Moon, Sun, Menu, X, ChevronRight, ChevronLeft,
  Bot, Server, TrendingUp, Sparkles, MessageCircle, Code2,
  ShieldCheck, Rocket, UserPlus, MousePointerClick, Wallet,
  Gauge, Lock, Headphones,
} from "lucide-react";
import { BotChatButtonsWithNote } from "@/components/BotChatButtons";
import { SiteIntro } from "@/components/SiteIntro";
import { WhatsAppIcon } from "@/components/BrandIcons";

function useTheme() {
  const [theme, setTheme] = useState<"dark" | "light">(() =>
    (localStorage.getItem("theme") as "dark" | "light") || "dark"
  );
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.classList.toggle("light", theme === "light");
    localStorage.setItem("theme", theme);
  }, [theme]);
  return { theme, toggle: () => setTheme((t) => (t === "dark" ? "light" : "dark")) };
}

function BrandMark({ size = 32 }: { size?: number }) {
  return (
    <img
      src="/logo/icon.png"
      alt="Geston Hosting"
      width={size}
      height={size}
      className="object-contain shrink-0"
      draggable={false}
    />
  );
}

function Reveal({
  children,
  className = "",
  variant = "up",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  variant?: "up" | "left" | "right";
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const base =
    variant === "left" ? "tx-reveal-left" : variant === "right" ? "tx-reveal-right" : "tx-reveal";

  return (
    <div
      ref={ref}
      className={`${base} ${inView ? "tx-in" : ""} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

const HERO_SLIDES = [
  {
    key: "bots",
    badge: "Bots WhatsApp",
    title: "Déployez Geston-MD en quelques minutes",
    body: "Essai gratuit disponible. Associez la session, choisissez un forfait, et le bot est en ligne sur Heroku.",
    meta: [
      { label: "Config", value: "~3 min" },
      { label: "Essai", value: "Disponible" },
      { label: "Hébergeur", value: "Heroku" },
    ],
    accent: "lime" as const,
    icon: Bot,
  },
  {
    key: "panels",
    badge: "Pterodactyl",
    title: "Des panels qui se configurent tout seuls",
    body: "Payez une fois et obtenez RAM, disque et CPU alloués automatiquement — aucun ticket requis.",
    meta: [
      { label: "Livraison", value: "Auto" },
      { label: "Panel", value: "Ptero" },
      { label: "Support", value: "24/7" },
    ],
    accent: "sky" as const,
    icon: Server,
  },
  {
    key: "boost",
    badge: "Croissance sociale",
    title: "Boosts à prix local",
    body: "Forfaits Instagram, TikTok, YouTube et Twitch, commandés depuis le même compte que vos bots.",
    meta: [
      { label: "Plateformes", value: "4+" },
      { label: "Livraison", value: "Progressive" },
      { label: "Payer avec", value: "Coins" },
    ],
    accent: "pink" as const,
    icon: TrendingUp,
  },
  {
    key: "chat",
    badge: "Bot de support",
    title: "Assistant WhatsApp",
    body: "Posez vos questions sur les prix, le déploiement ou votre compte à tout moment. Le bot est une IA — utilisez Contact pour parler à une personne.",
    meta: [
      { label: "WhatsApp", value: "En ligne" },
      { label: "Horaires", value: "24/7" },
      { label: "Réponse", value: "Instantanée" },
    ],
    accent: "teal" as const,
    icon: MessageCircle,
  },
];

function HeroShowcase() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = HERO_SLIDES.length;

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % count), 4200);
    return () => clearInterval(t);
  }, [paused, count]);

  const slide = HERO_SLIDES[index];
  const Icon = slide.icon;
  const accentBorder =
    slide.accent === "sky"
      ? "border-sky-500/25"
      : slide.accent === "pink"
        ? "border-pink-500/25"
        : slide.accent === "teal"
          ? "border-teal-500/25"
          : "border-lime-500/25";
  const accentText =
    slide.accent === "sky"
      ? "text-sky-400"
      : slide.accent === "pink"
        ? "text-pink-400"
        : slide.accent === "teal"
          ? "text-teal-400"
          : "text-lime-400";
  const accentBg =
    slide.accent === "sky"
      ? "bg-sky-500/10"
      : slide.accent === "pink"
        ? "bg-pink-500/10"
        : slide.accent === "teal"
          ? "bg-teal-500/10"
          : "bg-lime-500/10";

  return (
    <div
      className="relative mx-auto w-full max-w-sm lg:max-w-none"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        className={`tx-card-tilt tx-float rounded-2xl border ${accentBorder} bg-card/80 backdrop-blur-sm p-5 shadow-xl shadow-black/10 min-h-[280px] flex flex-col`}
      >
        <div className="flex items-center justify-between mb-4">
          <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide ${accentText}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${accentText.replace("text-", "bg-")}`} />
            {slide.badge}
          </span>
          <div className={`w-9 h-9 rounded-xl ${accentBg} flex items-center justify-center`}>
            <Icon className={`w-4.5 h-4.5 ${accentText}`} />
          </div>
        </div>

        <h3 className="text-lg font-bold tracking-tight mb-2 leading-snug">{slide.title}</h3>
        <p className="text-sm text-muted-foreground mb-5 flex-1 leading-relaxed">{slide.body}</p>

        <div className="grid grid-cols-3 gap-2 mb-4">
          {slide.meta.map((m) => (
            <div key={m.label} className="rounded-lg bg-muted/50 px-2.5 py-2">
              <p className="text-[10px] text-muted-foreground leading-tight">{m.label}</p>
              <p className="text-sm font-bold mt-0.5">{m.value}</p>
            </div>
          ))}
        </div>

        {slide.key === "chat" && (
          <div className="flex items-center gap-4 text-sm pt-1 border-t border-border/60">
            <span className="inline-flex items-center gap-1.5">
              <WhatsAppIcon className="w-4 h-4" />
              WhatsApp
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-2 mt-4">
        <button
          type="button"
          aria-label="Diapositive précédente"
          onClick={() => setIndex((i) => (i - 1 + count) % count)}
          className="p-1.5 rounded-lg border border-border hover:bg-muted transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex gap-1.5">
          {HERO_SLIDES.map((s, i) => (
            <button
              key={s.key}
              type="button"
              aria-label={`Afficher ${s.badge}`}
              onClick={() => setIndex(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? "w-6 bg-lime-400" : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50"
              }`}
            />
          ))}
        </div>
        <button
          type="button"
          aria-label="Diapositive suivante"
          onClick={() => setIndex((i) => (i + 1) % count)}
          className="p-1.5 rounded-lg border border-border hover:bg-muted transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

const FEATURES = [
  {
    icon: Bot,
    title: "Bots WhatsApp",
    desc: "Lancez Geston-MD sur Heroku avec un essai gratuit, pour tester avant de payer.",
    link: "/services/bots",
    cta: "Explorer les bots",
  },
  {
    icon: Server,
    title: "Panels Pterodactyl",
    desc: "Panels de jeux et d'applications avec configuration automatique dès le paiement confirmé.",
    link: "/services/panels",
    cta: "Voir les panels",
  },
  {
    icon: TrendingUp,
    title: "Boost réseaux sociaux",
    desc: "Instagram, TikTok, YouTube et Twitch, avec prix locaux et livraison progressive.",
    link: "/services/boosting",
    cta: "Voir les forfaits",
  },
  {
    icon: Sparkles,
    title: "Support IA",
    desc: "Prix, déploiements et dépannage à toute heure. Demandez un agent humain si besoin.",
    link: "/ai-chat",
    cta: "Ouvrir le chat",
  },
  {
    icon: Code2,
    title: "API développeur",
    desc: "Automatisez les déploiements et vérifications de compte avec une API REST simple.",
    link: "/developers",
    cta: "Docs API",
  },
  {
    icon: MessageCircle,
    title: "Contacter l'équipe",
    desc: "La discussion WhatsApp est un assistant IA. Utilisez Contact pour parler à une personne.",
    link: "/contact",
    cta: "Contact",
  },
];

const STEPS = [
  {
    icon: UserPlus,
    title: "Créez un compte",
    desc: "Inscription gratuite. Aucune carte requise pour ouvrir le tableau de bord.",
  },
  {
    icon: MousePointerClick,
    title: "Choisissez un service",
    desc: "Bots, panels ou forfaits sociaux — selon vos besoins.",
  },
  {
    icon: Rocket,
    title: "Payez et lancez",
    desc: "La plupart des bots et panels se configurent automatiquement en quelques minutes.",
  },
  {
    icon: ShieldCheck,
    title: "Gérez tout ici",
    desc: "Suivez vos services, rechargez vos Coins et obtenez de l'aide depuis un seul endroit.",
  },
];

const BENEFITS = [
  {
    icon: Gauge,
    title: "Configuration rapide",
    desc: "Les commandes sont configurées automatiquement dès la confirmation du paiement — pas d'attente.",
  },
  {
    icon: Lock,
    title: "Votre compte reste le vôtre",
    desc: "Identifiants chiffrés et gestion de session à chaque connexion, pour que bots et panels restent privés.",
  },
  {
    icon: Wallet,
    title: "Un seul solde pour tout",
    desc: "Rechargez vos Coins une fois et dépensez-les sur les bots, panels ou boosts sans ressaisir vos infos de paiement.",
  },
  {
    icon: Headphones,
    title: "De l'aide quand vous en avez besoin",
    desc: "L'IA répond instantanément. Une vraie personne est à un message via Contact.",
  },
];

const FAQS = [
  {
    q: "La discussion WhatsApp est-elle une vraie personne ?",
    a: "Non. Ce sont des assistants IA pour les prix, déploiements et problèmes courants. Pour une personne, utilisez Contacter le support ou demandez à l'IA de vous connecter à un agent.",
  },
  {
    q: "Le déploiement est-il rapide ?",
    a: "Les bots et panels sont configurés automatiquement. La plupart des commandes sont en ligne quelques minutes après confirmation du paiement.",
  },
  {
    q: "Le boost sur les réseaux sociaux est-il sûr ?",
    a: "Nous utilisons une livraison progressive conçue pour paraître organique. Tout boost comporte un certain risque vis-à-vis de la plateforme, et nous le précisons avant votre commande.",
  },
  {
    q: "Quels moyens de paiement acceptez-vous ?",
    a: "Carte via Paystack et Coins sur toute la plateforme. La page Recharger liste les options disponibles dans votre région.",
  },
];

const NAV_LINKS = [
  { label: "Bots", href: "/services/bots" },
  { label: "Panels", href: "/services/panels" },
  { label: "Boost", href: "/services/boosting" },
  { label: "API", href: "/developers" },
  { label: "Fonctionnalités", href: "/features" },
  { label: "Tutoriels", href: "/tutorials" },
  { label: "Docs", href: "/docs" },
  { label: "Support", href: "/contact" },
];

export default function Home() {
  const { user } = useAuth();
  const { navigateWithLoader } = useNavLoader();
  const { theme, toggle: toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="tx-home min-h-screen bg-background relative overflow-x-hidden">
      <SiteIntro />
      <TechBackground accent="132,204,22" />

      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 flex items-center justify-center overflow-hidden"
      >
        <img
          src="/logo/icon.png"
          alt=""
          className="w-[min(70vw,520px)] h-[min(70vw,520px)] object-contain opacity-[0.03] dark:opacity-[0.05] select-none"
          draggable={false}
        />
      </div>

      <header
        className={`sticky top-0 z-50 border-b transition-colors ${
          scrolled
            ? "bg-background/95 backdrop-blur-md border-border"
            : "bg-background/80 backdrop-blur-sm border-transparent"
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          <button
            type="button"
            className="flex items-center gap-2.5 shrink-0"
            onClick={() => navigateWithLoader("/")}
          >
            <BrandMark size={28} />
            <span className="font-semibold text-[15px]">Geston Hosting</span>
          </button>

          <nav className="hidden lg:flex items-center gap-1">
            {NAV_LINKS.map((l) => (
              <button
                key={l.href}
                type="button"
                onClick={() => navigateWithLoader(l.href)}
                className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors"
              >
                {l.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-md hover:bg-muted"
              aria-label="Changer de thème"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            {!user && (
              <Button
                size="sm"
                variant="outline"
                className="hidden sm:inline-flex"
                onClick={() => navigateWithLoader("/login")}
              >
                Connexion
              </Button>
            )}
            <Button
              size="sm"
              className="hidden sm:inline-flex bg-lime-500 text-lime-950 hover:bg-lime-400"
              onClick={() => navigateWithLoader(user ? "/dashboard" : "/signup")}
            >
              {user ? "Tableau de bord" : "Créer un compte gratuit"}
            </Button>
            <button
              type="button"
              className="lg:hidden p-2 rounded-md hover:bg-muted"
              onClick={() => setMobileMenuOpen((o) => !o)}
              aria-label="Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-border bg-background px-4 py-3 space-y-1">
            {NAV_LINKS.map((l) => (
              <button
                key={l.href}
                type="button"
                onClick={() => {
                  navigateWithLoader(l.href);
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {l.label}
                <ChevronRight className="w-4 h-4 opacity-40" />
              </button>
            ))}
            <div className="flex gap-2 pt-2">
              {!user && (
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    navigateWithLoader("/login");
                    setMobileMenuOpen(false);
                  }}
                >
                  Connexion
                </Button>
              )}
              <Button
                className="flex-1 bg-lime-500 text-lime-950 hover:bg-lime-400"
                onClick={() => {
                  navigateWithLoader(user ? "/dashboard" : "/signup");
                  setMobileMenuOpen(false);
                }}
              >
                {user ? "Tableau de bord" : "Inscription gratuite"}
              </Button>
            </div>
          </div>
        )}
      </header>

      <main className="relative z-[1]">
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-14 sm:pt-24 pb-14 sm:pb-20">
          <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-10 lg:gap-8 items-center">
            <Reveal variant="up">
              <h1 className="text-3xl sm:text-5xl font-bold tracking-tight mb-5 leading-[1.08]">
                Bots WhatsApp, panels et croissance sociale — sous un seul compte
              </h1>
              <p className="text-base sm:text-lg text-muted-foreground mb-8 max-w-xl">
                Déployez des bots, achetez des panels Pterodactyl et commandez des boosts sans changer de site.
                Payez une fois, puis gérez tout depuis votre tableau de bord.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 mb-10">
                <Button
                  size="lg"
                  className="sm:min-w-[190px] bg-lime-500 text-lime-950 hover:bg-lime-400 shadow-lg shadow-lime-500/20"
                  onClick={() => navigateWithLoader(user ? "/dashboard" : "/signup")}
                >
                  {user ? "Ouvrir le tableau de bord" : "Créer un compte gratuit"}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => navigateWithLoader(user ? "/dashboard" : "/login")}
                >
                  {user ? "Retour au tableau de bord" : "Connexion"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Inscription gratuite · Solde Coins pour bots, panels & boosts · Support IA sur WhatsApp
              </p>
            </Reveal>

            <Reveal variant="right" delay={80}>
              <HeroShowcase />
            </Reveal>
          </div>
        </section>

        <section className="border-y border-border/60 bg-muted/20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-16">
            <Reveal>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">Ce que vous pouvez faire</h2>
              <p className="text-muted-foreground mb-8 max-w-2xl">
                Tout fonctionne sous un seul compte Geston Hosting — bots, panels, boosts et support.
              </p>
            </Reveal>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {FEATURES.map((f, i) => (
                <Reveal key={f.title} delay={i * 40}>
                  <button
                    type="button"
                    onClick={() => navigateWithLoader(f.link)}
                    className="tx-card-tilt w-full text-left rounded-xl border border-border bg-card p-5 hover:border-lime-500/40 transition-colors h-full"
                  >
                    <div className="w-10 h-10 rounded-lg bg-lime-500/10 flex items-center justify-center mb-3">
                      <f.icon className="w-5 h-5 text-lime-500" />
                    </div>
                    <h3 className="font-semibold mb-1.5">{f.title}</h3>
                    <p className="text-sm text-muted-foreground mb-3 leading-relaxed">{f.desc}</p>
                    <span className="text-sm font-medium text-lime-600 dark:text-lime-400 inline-flex items-center gap-1">
                      {f.cta}
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </button>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-16">
          <Reveal>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">Comment ça marche</h2>
            <p className="text-muted-foreground mb-8 max-w-xl">Quatre étapes de l'inscription à un service en ligne.</p>
          </Reveal>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {STEPS.map((s, i) => (
              <Reveal key={s.title} delay={i * 50}>
                <div className="rounded-xl border border-border bg-card/60 p-5 h-full">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xs font-bold text-lime-600 dark:text-lime-400 tabular-nums">
                      0{i + 1}
                    </span>
                    <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                      <s.icon className="w-4 h-4" />
                    </div>
                  </div>
                  <h3 className="font-semibold mb-1">{s.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="border-y border-border/60 bg-muted/20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-16">
            <Reveal>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">Pourquoi nos clients restent</h2>
              <p className="text-muted-foreground mb-8 max-w-xl">Des raisons concrètes, pas des slogans.</p>
            </Reveal>
            <div className="grid sm:grid-cols-2 gap-4">
              {BENEFITS.map((b, i) => (
                <Reveal key={b.title} delay={i * 40}>
                  <div className="rounded-xl border border-border bg-card p-5 flex gap-4">
                    <div className="w-10 h-10 rounded-lg bg-lime-500/10 flex items-center justify-center shrink-0">
                      <b.icon className="w-5 h-5 text-lime-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">{b.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{b.desc}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-16">
          <div className="grid lg:grid-cols-2 gap-10 items-start">
            <Reveal>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">Parlez au support</h2>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Le bot WhatsApp répond aux questions de prix, déploiement et compte à toute heure.
                Pour une personne, utilisez Contact.
              </p>
              <BotChatButtonsWithNote />
            </Reveal>
            <Reveal delay={60}>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-4">FAQ</h2>
              <Accordion type="single" collapsible className="w-full">
                {FAQS.map((f, i) => (
                  <AccordionItem key={i} value={`faq-${i}`}>
                    <AccordionTrigger className="text-left text-sm sm:text-base">
                      {f.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground text-sm leading-relaxed">
                      {f.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </Reveal>
          </div>
        </section>

        <section className="border-t border-border/60">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-16 text-center">
            <Reveal>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">
                Prêt quand vous l'êtes
              </h2>
              <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
                Ouvrez un compte gratuitement, rechargez quand vous avez besoin d'un service, et gérez bots, panels et boosts en un seul endroit.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  size="lg"
                  className="bg-lime-500 text-lime-950 hover:bg-lime-400"
                  onClick={() => navigateWithLoader(user ? "/dashboard" : "/signup")}
                >
                  {user ? "Aller au tableau de bord" : "Créer un compte gratuit"}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <Button size="lg" variant="outline" onClick={() => navigateWithLoader("/contact")}>
                  Contacter le support
                </Button>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <footer className="relative z-[1] border-t border-border bg-muted/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <BrandMark size={22} />
            <span className="text-sm font-medium">Geston Hosting</span>
          </div>
          <p className="text-xs text-muted-foreground text-center sm:text-right">
            © {new Date().getFullYear()} Geston Hosting · Bots, panels & outils de croissance
          </p>
        </div>
      </footer>
    </div>
  );
}
