import { useEffect } from "react";
import { useSearchParams } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { useNavLoader } from "@/App";
import { TechBackground } from "@/components/TechBackground";
import { PageLoader } from "@/components/PageLoader";
import { TopUpFlow } from "@/components/TopUpFlow";
import { placeBoostOrder } from "@/lib/api";
import { ArrowLeft, Coins } from "lucide-react";

export default function TopUp() {
  const { user, loading, refreshUser } = useAuth();
  const { showToast } = useToast();
  const { navigateWithLoader } = useNavLoader();
  const [searchParams] = useSearchParams();
  const required = searchParams.get("required");

  useEffect(() => {
    const status = searchParams.get("status");
    const ref = searchParams.get("ref");
    if (status === "success" && ref) {
      showToast("Paiement confirmé ! Coins ajoutés à votre solde.", "success");
      refreshUser().then(async () => {
        const pending = localStorage.getItem("pendingBoostOrder");
        if (pending) {
          localStorage.removeItem("pendingBoostOrder");
          try {
            const order = JSON.parse(pending);
            const res = await placeBoostOrder(order);
            if (res.ok) {
              showToast("Commande de boost passée !", "success");
              navigateWithLoader("/services/boosting?tab=orders");
            } else if (res.error) {
              showToast(res.error, "error");
            }
          } catch {}
        }
      });
    } else if (status === "failed") {
      showToast("Le paiement a échoué ou a été annulé.", "error");
    }
  }, [searchParams, showToast, refreshUser, navigateWithLoader]);

  if (loading) return <PageLoader />;

  return (
    <div className="min-h-screen bg-background relative">
      <TechBackground />
      <div className="relative z-10 max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => navigateWithLoader("/dashboard")} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold">Recharger</h1>
            <p className="text-sm text-muted-foreground">Ajoutez des Coins à votre compte</p>
          </div>
          {user && (
            <div className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border border-border">
              <Coins className="w-4 h-4 text-yellow-400" />
              <div className="flex flex-col leading-tight">
                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Solde</span>
                <span className="font-semibold text-sm">{user.txCoins} Coins</span>
              </div>
            </div>
          )}
        </div>
        <TopUpFlow requiredTx={required ? Number(required) : undefined} />
      </div>
    </div>
  );
}
