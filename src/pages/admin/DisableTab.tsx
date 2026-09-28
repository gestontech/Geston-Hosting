import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/useToast";
import {
  getAdminFeatureFlags,
  setAdminServiceDisabled,
} from "@/lib/api";

const SERVICES: {
  key: string;
  label: string;
  description: string;
}[] = [
  {
    key: "panels",
    label: "Panels",
    description:
      "Pages Boutique de panels et Mes Panels",
  },
  {
    key: "boost",
    label: "Boost réseaux sociaux",
    description:
      "Page de boost et nouvelles commandes",
  },
  {
    key: "botDeploy",
    label: "Déploiement de bot",
    description:
      "Déploiement de nouveaux bots (les bots existants continuent de fonctionner)",
  },
];

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  busy,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  busy: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <div>
        <p className="font-medium text-sm">
          {label}
        </p>

        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {description}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <span
          className={`text-xs font-medium ${
            checked
              ? "text-green-400"
              : "text-red-400"
          }`}
        >
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

  const [disabledServices, setDisabledServices] =
    useState<string[]>([]);

  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] =
    useState<string | null>(null);

  useEffect(() => {
    getAdminFeatureFlags()
      .then(
        (data: {
          disabledServices?: string[];
        }) => {
          setDisabledServices(
            data.disabledServices || [],
          );
        },
      )
      .catch(() => {
        showToast(
          "Échec du chargement des services",
          "error",
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, [showToast]);

  async function toggleService(
    key: string,
    enabled: boolean,
  ) {
    setBusyKey(key);

    try {
      const result =
        (await setAdminServiceDisabled(
          key,
          !enabled,
        )) as {
          disabledServices?: string[];
          error?: string;
        };

      if (result.disabledServices) {
        setDisabledServices(
          result.disabledServices,
        );
      } else {
        throw new Error(
          result.error || "Failed",
        );
      }
    } catch {
      showToast(
        "Échec de la mise à jour",
        "error",
      );
    } finally {
      setBusyKey(null);
    }
  }

  if (loading) {
    return (
      <p className="text-sm text-muted-foreground">
        Chargement...
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold mb-1">
            Services
          </h3>

          <p className="text-xs text-muted-foreground mb-3">
            Gérez ici l'activation des services
            gratuits de Geston Hosting.
          </p>

          {SERVICES.map((service) => (
            <ToggleRow
              key={service.key}
              label={service.label}
              description={service.description}
              checked={
                !disabledServices.includes(
                  service.key,
                )
              }
              busy={busyKey === service.key}
              onChange={(value) =>
                toggleService(
                  service.key,
                  value,
                )
              }
            />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold mb-1">
            Paiements
          </h3>

          <p className="text-sm text-green-400">
            Les paiements et les recharges Coins
            sont désactivés.
          </p>

          <p className="text-xs text-muted-foreground mt-1">
            Tous les services disponibles pour les
            utilisateurs fonctionnent gratuitement.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
