import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/useToast";
import { getAdminFeatureFlags, setAdminServiceDisabled, setAdminPaymentMethodDisabled } from "@/lib/api";

const SERVICES: { key: string; label: string; description: string }[] = [
  { key: "panels", label: "Panels", description: "Pages Boutique de panels et Mes Panels" },
  { key: "boost", label: "Boost réseaux sociaux", description: "Page de boost et nouvelles commandes" },
  { key: "botDeploy", label: "Déploiement de bot", description: "Déploiement de nouveaux bots (les bots existants continuent de fonctionner)" },
];

const PAYMENT_METHODS: { key: string; label: string; description: string }[] = [
  { key: "kenya", label: "Kenya (M-Pesa / Airtel / Carte)", description: "" },
  { key: "nigeria", label: "Nigeria (Carte)", description: "" },
  { key: "cameroon", label: "Cameroun (Mobile Money)", description: "" },
  { key: "tanzania", label: "Tanzanie (Mobile Money)", description: "" },
  { key: "drc", label: "RD Congo (Mobile Money)", description: "" },
  { key: "southAfrica", label: "Afrique du Sud", description: "Intégration incomplète — peut rester désactivé" },
  { key: "ghana", label: "Ghana", description: "Intégration incomplète — peut rester désactivé" },
  { key: "paypal", label: "PayPal", description: "Flux de preuve de paiement manuel" },
  { key: "card", label: "Autres pays (Carte)", description: "" },
];

function ToggleRow({
  label, description, checked, onChange, busy,
}: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void; busy: boolean }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <div>
        <p className="font-medium text-sm">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <div className="flex items-center gap-2">
        <span className={`text-xs font-medium ${checked ? "text-green-400" : "text-red-400"}`}>
          {checked ? "Activé" : "Désactivé"}
        </span>
        <Switch
          checked={checked}
          disabled={busy}
          onCheckedChange={onChange}
          className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-red-500"
        />
      </div>
    </div>
  );
}

export function DisableTab() {
  const { showToast } = useToast();
  const [disabledServices, setDisabledServices] = useState<string[]>([]);
  const [disabledPaymentMethods, setDisabledPaymentMethods] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  useEffect(() => {
    getAdminFeatureFlags()
      .then((d: { disabledServices?: string[]; disabledPaymentMethods?: string[] }) => {
        setDisabledServices(d.disabledServices || []);
        setDisabledPaymentMethods(d.disabledPaymentMethods || []);
      })
      .catch(() => showToast("Échec du chargement des drapeaux de fonctionnalités", "error"))
      .finally(() => setLoading(false));
  }, []);

  async function toggleService(key: string, enabled: boolean) {
    setBusyKey(key);
    try {
      const res = await setAdminServiceDisabled(key, !enabled) as { disabledServices?: string[]; error?: string };
      if (res.disabledServices) setDisabledServices(res.disabledServices);
      else throw new Error(res.error || "Failed");
    } catch {
      showToast("Échec de la mise à jour", "error");
    } finally {
      setBusyKey(null);
    }
  }

  async function togglePaymentMethod(key: string, enabled: boolean) {
    setBusyKey(key);
    try {
      const res = await setAdminPaymentMethodDisabled(key, !enabled) as { disabledPaymentMethods?: string[]; error?: string };
      if (res.disabledPaymentMethods) setDisabledPaymentMethods(res.disabledPaymentMethods);
      else throw new Error(res.error || "Failed");
    } catch {
      showToast("Échec de la mise à jour", "error");
    } finally {
      setBusyKey(null);
    }
  }

  if (loading) return <p className="text-sm text-muted-foreground">Chargement...</p>;

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold mb-1">Services</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Les services désactivés affichent aux visiteurs une superposition avec un lien vers la page d'accueil au lieu de la page normale.
          </p>
          {SERVICES.map(s => (
            <ToggleRow
              key={s.key}
              label={s.label}
              description={s.description}
              checked={!disabledServices.includes(s.key)}
              busy={busyKey === s.key}
              onChange={(v) => toggleService(s.key, v)}
            />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold mb-1">Moyens de paiement</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Les moyens désactivés disparaissent du paiement partout (recharge, boost) et rejettent les requêtes API directes.
          </p>
          {PAYMENT_METHODS.map(m => (
            <ToggleRow
              key={m.key}
              label={m.label}
              description={m.description}
              checked={!disabledPaymentMethods.includes(m.key)}
              busy={busyKey === m.key}
              onChange={(v) => togglePaymentMethod(m.key, v)}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
