import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { login } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { TechBackground } from "@/components/TechBackground";
import { AppLogoIcon } from "@/components/AppLogo";
import { Github, Mail, Lock, ArrowLeft, Eye, EyeOff } from "lucide-react";

const ANIM = `
@keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeScaleIn{from{opacity:0;transform:scale(0.88)}to{opacity:1;transform:scale(1)}}
@keyframes drawCheck{from{stroke-dashoffset:40}to{stroke-dashoffset:0}}
@keyframes pulseRing{0%,100%{opacity:.3;transform:scale(1)}50%{opacity:.6;transform:scale(1.08)}}
@keyframes oaSpin{to{transform:rotate(360deg)}}
@keyframes oaPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.18)}}
@keyframes txFlip{0%{transform:rotateY(0deg)}28%{transform:rotateY(360deg)}54%{transform:rotateY(360deg)}82%{transform:rotateY(720deg)}100%{transform:rotateY(720deg)}}
`;

type Tab = "password" | "link" | "forgot";

function GoogleIcon({ size = 20 }: { size?: number }) {
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

function AnimatedInbox({ email, label, onBack }: { email: string; label: string; onBack: () => void }) {
  return (
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
        <p className="font-semibold text-base">{label} envoyé !</p>
        <p className="text-sm text-muted-foreground">
          Nous avons envoyé un lien à <span className="text-foreground font-medium">{email}</span>
        </p>
        <p className="text-xs text-muted-foreground">Vérifiez votre boîte mail. Le lien expire dans 15 minutes.</p>
      </div>
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> Utiliser une autre adresse e-mail
      </button>
    </div>
  );
}

export function Login() {
  const [tab, setTab] = useState<Tab>("password");
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [linkEmail, setLinkEmail] = useState("");
  const [linkSent, setLinkSent] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"github" | "google" | null>(null);

  const { login: authLogin } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const nextPath = searchParams.get("next") || "/dashboard";
  const errorParam = searchParams.get("error");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) navigate("/dashboard");
  }, [navigate]);

  useEffect(() => {
    if (!errorParam) return;
    const messages: Record<string, string> = {
      banned: "Votre compte a été suspendu.",
      google_denied: "Connexion Google annulée.",
      github_denied: "Connexion GitHub annulée.",
      google_no_account: "Aucun compte trouvé avec ce compte Google. Veuillez vous inscrire d'abord.",
      github_no_account: "Aucun compte trouvé avec ce compte GitHub. Veuillez vous inscrire d'abord.",
      google_not_configured: "La connexion Google n'est pas configurée.",
      google_token: "Échec de l'authentification avec Google. Veuillez réessayer.",
      github_token: "Échec de l'authentification avec GitHub. Veuillez réessayer.",
      google_no_email: "Impossible de récupérer l'e-mail depuis Google. Veuillez réessayer.",
      github_no_email: "Impossible de récupérer l'e-mail depuis GitHub. Veuillez réessayer.",
      google_server: "Erreur serveur lors de la connexion Google.",
      github_server: "Erreur serveur lors de la connexion GitHub.",
    };
    showToast(messages[errorParam] || "Échec de la connexion. Veuillez réessayer.", "error");
  }, [errorParam, showToast]);

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

  const handleGitHubLogin = () => {
    setOauthLoading("github");
    setTimeout(() => { window.location.href = "/api/auth/github?intent=login"; }, 600);
  };

  const handleGoogleLogin = () => {
    setOauthLoading("google");
    setTimeout(() => { window.location.href = "/api/auth/google?intent=login"; }, 600);
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameOrEmail.trim() || !password) { showToast("Veuillez remplir tous les champs", "error"); return; }
    setLoading(true);
    try {
      const data = await login(usernameOrEmail.trim(), password);
      if (data?.token && data?.user) {
        authLogin(data.token, data.user);
        navigate(nextPath, { replace: true });
      } else {
        showToast(data?.error || "Identifiants invalides", "error");
      }
    } catch {
      showToast("Échec de la connexion. Veuillez réessayer.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSendLoginLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkEmail.trim()) { showToast("Veuillez saisir votre e-mail", "error"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/magic-link/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: linkEmail.trim(), type: "login" }),
      });
      const data = await res.json();
      if (data.success) {
        setLinkSent(true);
      } else {
        showToast(data.error || "Échec de l'envoi du lien", "error");
      }
    } catch {
      showToast("Échec de l'envoi du lien", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) { showToast("Veuillez saisir votre e-mail", "error"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setForgotSent(true);
      } else {
        showToast(data.error || "Échec de l'envoi du lien de réinitialisation", "error");
      }
    } catch {
      showToast("Échec de l'envoi du lien de réinitialisation", "error");
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
              {tab === "forgot" ? "Réinitialiser le mot de passe" : "Bon retour"}
            </CardTitle>
            <CardDescription>
              {tab === "forgot"
                ? "Saisissez votre e-mail pour recevoir un lien de réinitialisation"
                : "Connectez-vous à votre compte GESTONX"}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {tab === "forgot" ? (
              <div style={{ animation: "fadeScaleIn 0.2s ease both" }}>
                <button
                  type="button"
                  onClick={() => { setTab("password"); setForgotEmail(""); setForgotSent(false); }}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Retour à la connexion
                </button>
                {forgotSent ? (
                  <AnimatedInbox
                    email={forgotEmail}
                    label="Lien de réinitialisation"
                    onBack={() => { setForgotSent(false); setForgotEmail(""); }}
                  />
                ) : (
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div>
                      <Label htmlFor="forgot-email">Adresse e-mail</Label>
                      <Input
                        id="forgot-email"
                        type="email"
                        value={forgotEmail}
                        onChange={e => setForgotEmail(e.target.value)}
                        placeholder="your@email.com"
                        autoComplete="email"
                        autoFocus
                        className="mt-1"
                      />
                    </div>
                    <Button type="submit" className="w-full gap-2" disabled={loading}>
                      {loading ? (
                        <span className="flex items-center gap-2">
                          <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin inline-block" />
                          Envoi…
                        </span>
                      ) : (
                        <><Mail className="w-4 h-4" /> Envoyer le lien de réinitialisation</>
                      )}
                    </Button>
                  </form>
                )}
              </div>
            ) : (
              <>
                <div className="flex rounded-lg bg-muted p-1 gap-1">
                  <button
                    type="button"
                    onClick={() => { setTab("password"); setLinkSent(false); }}
                    className={`flex-1 flex items-center justify-center gap-1.5 text-sm py-1.5 rounded-md transition-all duration-200 ${tab === "password" ? "bg-background text-foreground shadow-sm font-medium" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    <Lock className="w-3.5 h-3.5" />
                    Mot de passe
                  </button>
                  <button
                    type="button"
                    onClick={() => { setTab("link"); setLinkSent(false); }}
                    className={`flex-1 flex items-center justify-center gap-1.5 text-sm py-1.5 rounded-md transition-all duration-200 ${tab === "link" ? "bg-background text-foreground shadow-sm font-medium" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    <Mail className="w-3.5 h-3.5" />
                    Lien de connexion
                  </button>
                </div>

                {tab === "password" && (
                  <form onSubmit={handlePasswordLogin} className="space-y-4" style={{ animation: "fadeScaleIn 0.2s ease both" }}>
                    <div>
                      <Label htmlFor="username">Nom d'utilisateur ou e-mail</Label>
                      <Input
                        id="username"
                        value={usernameOrEmail}
                        onChange={e => setUsernameOrEmail(e.target.value)}
                        placeholder="Saisissez le nom d'utilisateur ou l'e-mail"
                        autoComplete="username"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <Label htmlFor="password">Mot de passe</Label>
                        <button
                          type="button"
                          onClick={() => { setTab("forgot"); setForgotEmail(""); setForgotSent(false); }}
                          className="text-xs text-muted-foreground hover:text-primary transition-colors"
                        >
                          Mot de passe oublié ?
                        </button>
                      </div>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPass ? "text" : "password"}
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          placeholder="Saisissez le mot de passe"
                          autoComplete="current-password"
                          className="pr-10"
                        />
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => setShowPass(v => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <Button type="submit" className="w-full gap-2" disabled={loading}>
                      {loading ? (
                        <span className="flex items-center gap-2">
                          <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin inline-block" />
                          Connexion…
                        </span>
                      ) : "Connexion"}
                    </Button>
                  </form>
                )}

                {tab === "link" && (
                  linkSent ? (
                    <AnimatedInbox email={linkEmail} label="Lien de connexion" onBack={() => setLinkSent(false)} />
                  ) : (
                    <form onSubmit={handleSendLoginLink} className="space-y-4" style={{ animation: "fadeScaleIn 0.2s ease both" }}>
                      <div>
                        <Label htmlFor="link-email">Adresse e-mail</Label>
                        <Input
                          id="link-email"
                          type="email"
                          value={linkEmail}
                          onChange={e => setLinkEmail(e.target.value)}
                          placeholder="your@email.com"
                          autoComplete="email"
                          className="mt-1"
                        />
                        <p className="text-xs text-muted-foreground mt-1.5">
                          Nous enverrons un lien de connexion en un clic à votre boîte mail.
                        </p>
                      </div>
                      <Button type="submit" className="w-full gap-2" disabled={loading}>
                        {loading ? (
                          <span className="flex items-center gap-2">
                            <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin inline-block" />
                            Envoi…
                          </span>
                        ) : (
                          <><Mail className="w-4 h-4" /> Envoyer le lien de connexion</>
                        )}
                      </Button>
                    </form>
                  )
                )}

                {!linkSent && (
                  <>
                    <div className="relative my-1">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-border" />
                      </div>
                      <div className="relative flex justify-center text-xs text-muted-foreground uppercase">
                        <span className="bg-card px-2">ou continuer avec</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full flex items-center gap-2"
                        onClick={handleGitHubLogin}
                        disabled={!!oauthLoading}
                      >
                        {oauthLoading === "github" ? (
                          <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin inline-block" />
                        ) : (
                          <Github className="w-4 h-4" />
                        )}
                        GitHub
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full flex items-center gap-2"
                        onClick={handleGoogleLogin}
                        disabled={!!oauthLoading}
                      >
                        {oauthLoading === "google" ? (
                          <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin inline-block" />
                        ) : (
                          <GoogleIcon />
                        )}
                        Google
                      </Button>
                    </div>

                    <p className="text-center text-sm text-muted-foreground pt-1">
                      Pas encore de compte ?{" "}
                      <Link to="/signup" className="text-primary hover:underline font-medium">
                        Inscription gratuite
                      </Link>
                    </p>
                  </>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
