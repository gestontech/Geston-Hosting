import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/useToast";
import { TechBackground } from "@/components/TechBackground";
import { AppLogoIcon } from "@/components/AppLogo";
import { Github, Mail, Eye, EyeOff, ArrowLeft } from "lucide-react";

const ANIM = `
@keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeScaleIn{from{opacity:0;transform:scale(0.88)}to{opacity:1;transform:scale(1)}}
@keyframes drawCheck{from{stroke-dashoffset:40}to{stroke-dashoffset:0}}
@keyframes pulseRing{0%,100%{opacity:.3;transform:scale(1)}50%{opacity:.6;transform:scale(1.08)}}
@keyframes oaSpin{to{transform:rotate(360deg)}}
@keyframes oaPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.18)}}
@keyframes txFlip{0%{transform:rotateY(0deg)}28%{transform:rotateY(360deg)}54%{transform:rotateY(360deg)}82%{transform:rotateY(720deg)}100%{transform:rotateY(720deg)}}
`;

type Step = "choose" | "link-sent";

function GoogleIcon({ size = 16 }: { size?: number }) {
  return (
    <svg style={{ width: size, height: size }} viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function AnimatedLogoHeader() {
  return (
    <div className="mx-auto mb-3 flex items-center justify-center" style={{ width: 56, height: 56, perspective: "120px" }}>
      <div
        className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shadow-sm"
      >
        <span style={{ filter: "drop-shadow(0 0 6px rgba(59,130,246,0.8))" }}>
          <AppLogoIcon className="w-8 h-8 text-primary" />
        </span>
      </div>
    </div>
  );
}

function OAuthLoader({ provider }: { provider: "github" | "google" }) {
  const color = provider === "github" ? "#181717" : "#4285F4";
  const color2 = provider === "github" ? "#2b2b2b" : "#34A853";
  const color3 = provider === "github" ? "#c4b5fd" : "#FBBC05";
  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm"
      style={{ animation: "fadeScaleIn 0.25s ease both" }}
    >
      <div className="relative flex items-center justify-center" style={{ width: 120, height: 120 }}>
        <span className="absolute rounded-full" style={{ width: 120, height: 120, border: `2px solid ${color}22` }} />
        <span className="absolute rounded-full" style={{ width: 120, height: 120, border: `2px solid transparent`, borderTopColor: color, borderRightColor: color + "66", animation: "oaSpin 1.1s linear infinite" }} />
        <span className="absolute rounded-full" style={{ width: 88, height: 88, border: `2px solid transparent`, borderBottomColor: color2, borderLeftColor: color2 + "55", animation: "oaSpin 0.8s linear infinite reverse" }} />
        <span className="absolute rounded-full" style={{ width: 56, height: 56, border: `2px solid transparent`, borderTopColor: color3, borderRightColor: color3 + "44", animation: "oaSpin 0.6s linear infinite" }} />
        <span className="absolute rounded-full flex items-center justify-center" style={{ width: 32, height: 32, background: "hsl(var(--card))", animation: "oaPulse 1.5s ease-in-out infinite" }}>
          {provider === "github" ? <Github style={{ width: 16, height: 16, color }} /> : <GoogleIcon size={16} />}
        </span>
      </div>
      <p className="mt-6 text-sm font-medium text-muted-foreground">
        Redirection vers {provider === "github" ? "GitHub" : "Google"}…
      </p>
      <button
        className="mt-4 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors underline underline-offset-2"
        onClick={() => window.location.reload()}
      >
        Annuler
      </button>
    </div>
  );
}

export function Signup() {
  const [step, setStep] = useState<Step>("choose");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"github" | "google" | null>(null);

  const navigate = useNavigate();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const refCode = searchParams.get("ref") || "";

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) navigate("/dashboard");
  }, [navigate]);

  useEffect(() => {
    if (!oauthLoading) return;
    let t: ReturnType<typeof setTimeout>;
    const clear = () => setOauthLoading(null);
    const handleVisibility = () => { if (document.visibilityState === "visible") clear(); };
    t = setTimeout(() => {
      document.addEventListener("visibilitychange", handleVisibility);
      window.addEventListener("focus", clear);
    }, 2500);
    return () => {
      clearTimeout(t);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", clear);
    };
  }, [oauthLoading]);

  const handleGitHub = () => {
    setOauthLoading("github");
    setTimeout(() => {
      window.location.href = `/api/auth/github${refCode ? `?ref=${refCode}` : ""}`;
    }, 600);
  };

  const handleGoogle = () => {
    setOauthLoading("google");
    setTimeout(() => {
      window.location.href = `/api/auth/google${refCode ? `?ref=${refCode}` : ""}`;
    }, 600);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { showToast("Veuillez saisir votre e-mail", "error"); return; }
    if (!password || password.length < 8) { showToast("Le mot de passe doit contenir au moins 8 caractères", "error"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/magic-link/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password, referralCode: refCode || undefined }),
      });
      const data = await res.json();
      if (data.success) {
        setStep("link-sent");
      } else if (res.status === 409) {
        showToast(data.error || "Ce compte existe déjà. Veuillez vous connecter.", "error");
        setTimeout(() => navigate("/login"), 1500);
      } else {
        showToast(data.error || "Échec de l'envoi du lien d'inscription", "error");
      }
    } catch {
      showToast("Échec de l'envoi du lien d'inscription", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background relative">
      <style>{ANIM}</style>
      {oauthLoading && <OAuthLoader provider={oauthLoading} />}
      <TechBackground />
      <div className="min-h-screen flex items-center justify-center p-4 relative z-[1]">
        <Card
          className="w-full max-w-md"
          style={{ animation: "fadeUp 0.4s cubic-bezier(0.16,1,0.3,1) both" }}
        >
          <CardHeader className="text-center pb-4">
            <AnimatedLogoHeader />
            <CardTitle className="text-2xl font-bold">
              {step === "link-sent" ? "Vérifiez votre boîte mail" : "Créer un compte"}
            </CardTitle>
            <CardDescription>
              {step === "link-sent"
                ? "Cliquez sur le lien dans votre e-mail pour finaliser l'inscription"
                : "Commencez gratuitement — aucune carte requise"}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {step === "link-sent" ? (
              <div className="text-center space-y-5 py-3" style={{ animation: "fadeScaleIn 0.35s ease both" }}>
                <div className="relative mx-auto" style={{ width: 72, height: 72 }}>
                  <span className="absolute inset-0 rounded-full border-2 border-green-500/40" style={{ animation: "pulseRing 2s ease-in-out infinite" }} />
                  <span className="absolute inset-2 rounded-full bg-green-500/10 flex items-center justify-center">
                    <svg className="w-9 h-9 text-green-400" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                      <path d="M4.5 12.75l6 6 9-13.5" strokeDasharray="40" style={{ animation: "drawCheck 0.55s ease 0.25s both" }} />
                    </svg>
                  </span>
                </div>
                <div className="space-y-1.5">
                  <p className="font-semibold text-base">E-mail de vérification envoyé !</p>
                  <p className="text-sm text-muted-foreground">
                    Nous avons envoyé un lien à{" "}
                    <span className="text-foreground font-medium">{email}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Cliquez dessus pour vérifier votre e-mail et finaliser la création de votre compte. Le lien expire dans 15 minutes.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { setStep("choose"); setPassword(""); }}
                  className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Utiliser une autre adresse e-mail
                </button>

                <div className="mt-4 p-4 rounded-xl border border-teal-500/20 bg-teal-500/5 text-left">
                  <p className="text-sm font-semibold text-teal-300">👋 Nouveau ici ?</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Une fois connecté, consultez nos tutoriels — ils couvrent tout, du déploiement des bots à la recharge.
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate("/tutorials")}
                    className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                  >
                    Ouvrir les tutoriels →
                  </button>
                </div>
              </div>
            ) : (
              <>
                {refCode && (
                  <div className="flex items-center gap-2.5 p-3 rounded-lg bg-teal-500/10 border border-teal-500/20" style={{ animation: "fadeScaleIn 0.3s ease both" }}>
                    <svg className="w-4 h-4 text-teal-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <p className="text-sm text-teal-300">
                      Code de parrainage : <span className="font-mono font-semibold text-teal-400">{refCode}</span>
                    </p>
                  </div>
                )}

                <form onSubmit={handleSignup} className="space-y-4">
                  <div>
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      autoComplete="email"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="password">Mot de passe</Label>
                    <div className="relative mt-1">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Au moins 8 caractères"
                        autoComplete="new-password"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5">
                      Un lien de vérification sera envoyé à votre e-mail.
                    </p>
                  </div>
                  <Button type="submit" className="w-full gap-2" disabled={loading}>
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin inline-block" />
                        Envoi de la vérification…
                      </span>
                    ) : (
                      <><Mail className="w-4 h-4" /> Créer un compte</>
                    )}
                  </Button>
                </form>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs text-muted-foreground uppercase">
                    <span className="bg-card px-2">ou inscrivez-vous avec</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" variant="outline" className="w-full flex items-center gap-2" onClick={handleGitHub} disabled={!!oauthLoading}>
                    {oauthLoading === "github" ? (
                      <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin inline-block" />
                    ) : (
                      <Github className="w-4 h-4" />
                    )}
                    GitHub
                  </Button>
                  <Button type="button" variant="outline" className="w-full flex items-center gap-2" onClick={handleGoogle} disabled={!!oauthLoading}>
                    {oauthLoading === "google" ? (
                      <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin inline-block" />
                    ) : (
                      <GoogleIcon />
                    )}
                    Google
                  </Button>
                </div>

                <p className="text-center text-sm text-muted-foreground">
                  Vous avez déjà un compte ?{" "}
                  <Link to="/login" className="text-primary hover:underline font-medium">Connexion</Link>
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
