import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { TechBackground } from "@/components/TechBackground";
import { AppLogoIcon } from "@/components/AppLogo";
import { OrbitalLoader } from "@/components/OrbitalLoader";
import { Card, CardContent } from "@/components/ui/card";
import { Github } from "lucide-react";

function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

export function GitHubSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login: authLogin } = useAuth();
  const [label, setLabel] = useState("Signing you in…");

  const provider = searchParams.get("provider") || "github";

  useEffect(() => {
    setLabel(
      provider === "google"
        ? "Signing you in with Google…"
        : "Signing you in with GitHub…"
    );
  }, [provider]);

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      navigate(provider === "google" ? "/login?error=google_server" : "/login?error=github_server");
      return;
    }

    fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => {
        if (data.user && data.user.id) {
          authLogin(token, data.user);
          navigate("/dashboard");
        } else {
          navigate(provider === "google" ? "/login?error=google_server" : "/login?error=github_server");
        }
      })
      .catch(() => navigate(provider === "google" ? "/login?error=google_server" : "/login?error=github_server"));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-background relative">
      <TechBackground />
      <div className="min-h-screen flex items-center justify-center p-4 relative z-[1]">
        <Card className="w-full max-w-sm" style={{ animation: "fadeUp 0.4s ease both" }}>
          <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>
          <CardContent className="pt-8 pb-8 text-center space-y-5">
            <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <AppLogoIcon className="w-7 h-7 text-primary" />
            </div>

            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                {provider === "google" ? <GoogleIcon /> : <Github className="w-5 h-5" />}
              </div>
              <OrbitalLoader size={22} className="text-primary" />
            </div>

            <p className="text-muted-foreground text-sm font-medium">{label}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
