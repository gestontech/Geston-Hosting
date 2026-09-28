import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/useToast";
import { useCurrency } from "@/hooks/useCurrency";
import { Modal } from "@/components/Modal";
import { lockScroll, unlockScroll } from "@/lib/scrollLock";
import {
  getBoostServices,
  getBoostOrders,
  prepareBoostOrder,
  refreshBoostOrder,
} from "@/lib/api";
import { PLATFORMS, iconUrl, type PlatformDef } from "@/lib/platforms";
import {
  ArrowLeft,
  Search,
  TrendingUp,
  Loader2,
  LayoutGrid,
  ChevronDown,
  Check,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { StatusBadge } from "@/pages/social-boosting/StatusBadge";
import {
  detectQuality,
  linkLabelFor,
  exampleLinkFor,
} from "@/pages/social-boosting/helpers";
import type {
  BoostService,
  BoostOrderRow,
} from "@/pages/social-boosting/types";

function PlatformLogo({
  platform,
  size = 22,
}: {
  platform?: PlatformDef;
  size?: number;
}) {
  const [broken, setBroken] = useState(false);

  if (!platform || broken) return null;

  return (
    <img
      src={iconUrl(platform.slug)}
      alt=""
      width={size}
      height={size}
      onError={() => setBroken(true)}
    />
  );
}

export function SocialBoosting() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();
  const { currency } = useCurrency();

  const [tab, setTab] = useState<"browse" | "orders">(
    searchParams.get("tab") === "orders" ? "orders" : "browse"
  );

  const [services, setServices] = useState<BoostService[]>([]);
  const [orders, setOrders] = useState<BoostOrderRow[]>([]);

  const [orderStats, setOrderStats] = useState({
    total: 0,
    completed: 0,
    pending: 0,
    failed: 0,
    globalCompleted: 3,
  });

  const [loading, setLoading] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(false);

  const [platform, setPlatform] = useState<string | null>(null);
  const [serviceType, setServiceType] = useState<string | null>(null);
  const [typeMenuOpen, setTypeMenuOpen] = useState(false);
  const [search, setSearch] = useState("");

  const [selectedService, setSelectedService] =
    useState<BoostService | null>(null);

  const [link, setLink] = useState("");
  const [quantity, setQuantity] = useState(100);
  const [placing, setPlacing] = useState(false);

  const loadOrders = async () => {
    setLoadingOrders(true);

    try {
      const res = await getBoostOrders();

      const data = res as {
        orders?: BoostOrderRow[];
        stats?: {
          total: number;
          completed: number;
          pending: number;
          failed: number;
          globalCompleted?: number;
        };
      };

      if (Array.isArray(data.orders)) {
        setOrders(data.orders);
      } else if (Array.isArray(res)) {
        setOrders(res as BoostOrderRow[]);
      }

      if (data.stats) {
        setOrderStats({
          total: data.stats.total ?? 0,
          completed: data.stats.completed ?? 0,
          pending: data.stats.pending ?? 0,
          failed: data.stats.failed ?? 0,
          globalCompleted: data.stats.globalCompleted ?? 3,
        });
      }
    } catch {
      /* Utilisateur invité ou non authentifié */
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    Promise.all([
      getBoostServices({ currency })
        .then((res) => {
          const data = res as {
            services?: BoostService[];
          };

          if (Array.isArray(data.services)) {
            const sorted = [...data.services].sort(
              (a, b) =>
                a.pricePer1000 - b.pricePer1000 ||
                a.name.localeCompare(b.name)
            );

            setServices(sorted);
          }
        })
        .catch(() => {}),

      loadOrders(),
    ]).finally(() => {
      setLoading(false);
    });
  }, [currency]);

  useEffect(() => {
    if (tab === "orders") {
      loadOrders();
    }
  }, [tab]);

  useEffect(() => {
    if (!typeMenuOpen) return;

    lockScroll();

    return () => unlockScroll();
  }, [typeMenuOpen]);

  const availablePlatforms = useMemo(() => {
    const present = new Set(services.map((service) => service.platformId));

    return PLATFORMS.filter((platformItem) =>
      present.has(platformItem.id)
    );
  }, [services]);

  const availableTypes = useMemo(() => {
    if (!platform) return [];

    return Array.from(
      new Set(
        services
          .filter((service) => service.platformId === platform)
          .map((service) => service.serviceType)
      )
    );
  }, [services, platform]);

  const showIgFollowersNotice = useMemo(() => {
    if (platform === "instagram") {
      if (!serviceType) return true;

      if (serviceType.toLowerCase().includes("follower")) {
        return true;
      }
    }

    if (
      selectedService?.platformId === "instagram" &&
      (selectedService.serviceType || "")
        .toLowerCase()
        .includes("follower")
    ) {
      return true;
    }

    return false;
  }, [platform, serviceType, selectedService]);

  const filtered = useMemo(() => {
    const words = search
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);

    return services
      .filter((service) => {
        const matchesPlatform = !platform
          ? service.platformId !== "other"
          : service.platformId === platform;

        const matchesType =
          !serviceType || service.serviceType === serviceType;

        const haystack = (
          service.name +
          " " +
          service.category
        ).toLowerCase();

        const matchesSearch =
          words.length === 0 ||
          words.every((word) => haystack.includes(word));

        return matchesPlatform && matchesType && matchesSearch;
      })
      .sort(
        (a, b) =>
          a.pricePer1000 - b.pricePer1000 ||
          a.name.localeCompare(b.name)
      );
  }, [services, platform, serviceType, search]);

  const selectedPlatform = selectedService
    ? PLATFORMS.find(
        (platformItem) => platformItem.id === selectedService.platformId
      )
    : undefined;

  const quantityValid =
    !!selectedService &&
    quantity >= selectedService.min &&
    quantity <= selectedService.max;

  const closeOrderForm = () => {
    setSelectedService(null);
    setLink("");
    setQuantity(100);
  };

  const togglePlatform = (id: string) => {
    setServiceType(null);
    setTypeMenuOpen(false);

    setPlatform((current) => (current === id ? null : id));
  };

  /**
   * Les boosts sont désormais gratuits.
   *
   * Le backend doit également accepter cette commande sans :
   * - vérifier le solde Coins ;
   * - demander un paiement ;
   * - créer une étape de paiement ;
   * - débiter txCoins.
   */
  const handlePlaceOrder = async () => {
    if (!selectedService || !link.trim()) {
      showToast(
        "Sélectionnez un service et saisissez un lien",
        "error"
      );
      return;
    }

    if (!quantityValid) {
      showToast(
        "La quantité est hors de la plage autorisée pour ce service",
        "error"
      );
      return;
    }

    setPlacing(true);

    try {
      const res = await prepareBoostOrder({
        serviceId: selectedService.id,
        link: link.trim(),
        quantity,
      });

      const response = res as {
        error?: string;
        message?: string;
        order?: BoostOrderRow;
      };

      if (response.error) {
        showToast(response.error, "error");
        return;
      }

      closeOrderForm();

      await loadOrders();

      setTab("orders");

      showToast(
        "Commande gratuite passée avec succès !",
        "success"
      );
    } catch {
      showToast(
        "Impossible de passer la commande gratuite",
        "error"
      );
    } finally {
      setPlacing(false);
    }
  };

  const handleRefreshOrder = async (id: string) => {
    try {
      await refreshBoostOrder(id);
      await loadOrders();
    } catch {
      showToast(
        "Impossible d'actualiser la commande",
        "error"
      );
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg hover:bg-muted"
          aria-label="Retour"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <h1 className="text-2xl font-bold flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-teal-400" />
          Boost réseaux sociaux
        </h1>
      </div>

      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() => setTab("browse")}
          className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === "browse"
              ? "border-teal-500 text-foreground"
              : "border-transparent text-muted-foreground"
          }`}
        >
          Parcourir les services
        </button>

        <button
          onClick={() => setTab("orders")}
          className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === "orders"
              ? "border-teal-500 text-foreground"
              : "border-transparent text-muted-foreground"
          }`}
        >
          Mes commandes
        </button>
      </div>

      {tab === "browse" && (
        <>
          {showIgFollowersNotice && (
            <div className="sticky top-0 z-30 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 shadow-md backdrop-blur-sm">
              <div className="flex gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />

                <div className="min-w-0 space-y-1.5">
                  <p className="text-sm font-semibold text-amber-200">
                    Mise à jour importante pour les abonnés Instagram
                  </p>

                  <p className="text-sm text-amber-100/90 leading-relaxed">
                    Désactivez la fonctionnalité
                    &quot;Signaler pour examen&quot; dans les paramètres
                    de votre profil Instagram avant de commander des
                    abonnés.
                  </p>

                  <p className="text-sm text-amber-100/80 leading-relaxed">
                    Allez dans :{" "}
                    <span className="font-medium text-amber-50">
                      Paramètres et confidentialité → Abonnement et
                      invitation d&apos;amis → Désactiver
                      &quot;Signaler pour examen&quot;
                    </span>
                    .
                  </p>

                  <p className="text-sm text-amber-100/80 leading-relaxed">
                    Sinon, les nouveaux abonnés peuvent être ajoutés à
                    une liste d&apos;examen et vous devrez approuver
                    chacun manuellement.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2 mb-3">
            <button
              onClick={() => {
                setPlatform(null);
                setServiceType(null);
              }}
              className={
                "flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition-colors " +
                (!platform
                  ? "border-teal-500 bg-teal-500/10 text-foreground"
                  : "border-border bg-card text-muted-foreground")
              }
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Tout
            </button>

            {availablePlatforms.map((platformItem) => (
              <button
                key={platformItem.id}
                onClick={() => togglePlatform(platformItem.id)}
                className={
                  "flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition-colors " +
                  (platform === platformItem.id
                    ? "text-foreground"
                    : "border-border bg-card text-muted-foreground")
                }
                style={
                  platform === platformItem.id
                    ? {
                        borderColor: platformItem.color,
                        backgroundColor:
                          platformItem.color + "1A",
                      }
                    : undefined
                }
              >
                <span
                  className="w-4 h-4 rounded-sm flex items-center justify-center shrink-0"
                  style={{
                    backgroundColor: platformItem.color,
                  }}
                >
                  <PlatformLogo
                    platform={platformItem}
                    size={12}
                  />
                </span>

                {platformItem.label}
              </button>
            ))}
          </div>

          {platform && availableTypes.length > 0 && (
            <div className="relative">
              <button
                onClick={() =>
                  setTypeMenuOpen((current) => !current)
                }
                className="w-full sm:w-auto flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border border-border bg-card text-sm font-medium"
              >
                <span>
                  Affichage :{" "}
                  <span className="text-teal-400">
                    {serviceType || "Tous les types"}
                  </span>

                  <span className="text-muted-foreground font-normal">
                    {" "}
                    — appuyez pour changer
                  </span>
                </span>

                <ChevronDown
                  className={
                    "w-4 h-4 text-muted-foreground transition-transform " +
                    (typeMenuOpen ? "rotate-180" : "")
                  }
                />
              </button>

              {typeMenuOpen && (
                <div
                  className="fixed inset-0 z-[180] flex items-center justify-center p-4"
                  onClick={() => setTypeMenuOpen(false)}
                >
                  <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

                  <div
                    className="relative z-10 w-full max-w-sm max-h-[70dvh] overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl p-2"
                    onClick={(event) =>
                      event.stopPropagation()
                    }
                  >
                    <p className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Type de service
                    </p>

                    <button
                      onClick={() => {
                        setServiceType(null);
                        setTypeMenuOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm hover:bg-muted/60 text-left"
                    >
                      Tous les types

                      {!serviceType && (
                        <Check className="w-4 h-4 text-teal-400" />
                      )}
                    </button>

                    {availableTypes.map((type) => (
                      <button
                        key={type}
                        onClick={() => {
                          setServiceType(type);
                          setTypeMenuOpen(false);
                        }}
                        className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm hover:bg-muted/60 text-left"
                      >
                        {type}

                        {serviceType === type && (
                          <Check className="w-4 h-4 text-teal-400" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />

            <Input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Rechercher un service ou une plateforme..."
              className="pl-9"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((service) => {
              const servicePlatform = PLATFORMS.find(
                (platformItem) =>
                  platformItem.id === service.platformId
              );

              const quality = detectQuality(service.name);
              const active =
                selectedService?.id === service.id;

              return (
                <button
                  key={service.id}
                  onClick={() => {
                    setSelectedService(service);
                    setQuantity(service.min);
                  }}
                  className={
                    "rounded-xl border bg-card p-4 flex flex-col min-w-0 text-left transition-all " +
                    (active
                      ? "border-teal-500/50 bg-teal-500/5"
                      : "border-border hover:border-teal-500/30")
                  }
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    {servicePlatform && (
                      <span
                        className="w-4 h-4 rounded-sm flex items-center justify-center shrink-0"
                        style={{
                          backgroundColor:
                            servicePlatform.color,
                        }}
                      >
                        <PlatformLogo
                          platform={servicePlatform}
                          size={11}
                        />
                      </span>
                    )}

                    <p className="text-xs text-teal-400 font-medium truncate">
                      {service.category}
                    </p>
                  </div>

                  <p className="text-sm font-semibold mb-1 flex-1 break-words">
                    {service.name}
                  </p>

                  {quality && (
                    <div className="mb-2 flex items-start gap-1.5">
                      <span
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold shrink-0"
                        style={{
                          backgroundColor:
                            quality.color + "22",
                          color: quality.color,
                        }}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{
                            backgroundColor:
                              quality.color,
                          }}
                        />

                        {quality.label}
                      </span>

                      <span className="text-[10px] text-muted-foreground leading-snug">
                        {quality.meaning}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2 mt-auto">
                    <span className="text-sm font-bold text-teal-400">
                      Gratuit
                    </span>

                    <span className="text-xs text-muted-foreground">
                      {service.min.toLocaleString()}–
                      {service.max.toLocaleString()}
                    </span>
                  </div>
                </button>
              );
            })}

            {filtered.length === 0 && (
              <p className="text-sm text-muted-foreground col-span-full text-center py-8">
                Aucun service trouvé
              </p>
            )}
          </div>
        </>
      )}

      {tab === "orders" && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="rounded-xl border border-border bg-card p-3">
              <p className="text-xs text-muted-foreground">
                Votre total
              </p>
              <p className="text-xl font-bold">
                {orderStats.total}
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-3">
              <p className="text-xs text-muted-foreground">
                Vos commandes terminées
              </p>
              <p className="text-xl font-bold text-green-400">
                {orderStats.completed}
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-3">
              <p className="text-xs text-muted-foreground">
                En attente
              </p>
              <p className="text-xl font-bold text-amber-400">
                {orderStats.pending}
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-3">
              <p className="text-xs text-muted-foreground">
                Échouées
              </p>
              <p className="text-xl font-bold text-red-400">
                {orderStats.failed}
              </p>
            </div>

            <div className="rounded-xl border border-teal-500/20 bg-teal-500/5 p-3 col-span-2 sm:col-span-1">
              <p className="text-xs text-muted-foreground">
                Total terminées (global)
              </p>

              <p className="text-xl font-bold text-teal-400">
                {orderStats.globalCompleted ?? 3}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-teal-500/20 bg-teal-500/5 p-4">
            <p className="text-sm font-semibold text-teal-400">
              Les commandes sont gratuites
            </p>

            <p className="text-xs text-muted-foreground mt-1">
              Aucun paiement ni achat de Coins n&apos;est nécessaire
              pour utiliser les services de boost.
            </p>
          </div>

          <button
            onClick={() => navigate("/contact")}
            className="w-full flex items-center justify-between p-3.5 rounded-xl border border-green-500/20 bg-green-500/5 hover:bg-green-500/10 transition-colors"
          >
            <div className="text-left">
              <p className="text-sm font-semibold">
                Besoin d&apos;aide avec une commande ?
              </p>

              <p className="text-xs text-muted-foreground">
                Contactez le support pour tout problème de commande
                ou autre
              </p>
            </div>

            <span className="text-xs text-green-400 font-medium shrink-0">
              Contact →
            </span>
          </button>

          {loadingOrders ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : orders.length === 0 ? (
            <p className="text-center text-muted-foreground py-16 text-sm">
              Aucune commande pour le moment.
            </p>
          ) : (
            <div className="space-y-2">
              {orders.map((order) => (
                <div
                  key={order._id}
                  className="rounded-xl border border-border bg-card p-3.5 min-w-0"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">
                        {order.serviceName}
                      </p>

                      <a
                        href={order.link}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-muted-foreground truncate flex items-center gap-1 hover:underline"
                      >
                        <span className="truncate">
                          {order.link}
                        </span>

                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>

                      <p className="text-xs text-muted-foreground mt-1">
                        {order.quantity} unités ·{" "}
                        <span className="text-teal-400 font-medium">
                          Gratuit
                        </span>
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <StatusBadge status={order.status} />

                      {![
                        "completed",
                        "failed",
                        "refunded",
                      ].includes(order.status) && (
                        <button
                          onClick={() =>
                            handleRefreshOrder(order._id)
                          }
                          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                        >
                          <RefreshCw className="w-3 h-3" />
                          Vérifier
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <Modal
        isOpen={!!selectedService}
        onClose={closeOrderForm}
        title={
          selectedService?.name ||
          "Commander un service"
        }
        maxWidth="max-w-md"
      >
        {selectedService && (
          <div className="space-y-4">
            {selectedService.platformId === "instagram" &&
              (selectedService.serviceType || "")
                .toLowerCase()
                .includes("follower") && (
                <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-100/90 space-y-1">
                  <p className="font-semibold text-amber-200 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    Abonnés Instagram — désactivez Signaler
                    pour examen
                  </p>

                  <p>
                    Paramètres et confidentialité →
                    Abonnement et invitation d&apos;amis →
                    Désactivez &quot;Signaler pour examen&quot;
                    avant de commander, sinon les nouveaux
                    abonnés risquent de rester en attente
                    d&apos;examen.
                  </p>
                </div>
              )}

            <div className="flex items-center gap-1.5">
              {selectedPlatform && (
                <span
                  className="w-4 h-4 rounded-sm flex items-center justify-center shrink-0"
                  style={{
                    backgroundColor:
                      selectedPlatform.color,
                  }}
                >
                  <PlatformLogo
                    platform={selectedPlatform}
                    size={11}
                  />
                </span>
              )}

              <p className="text-xs text-teal-400 font-medium">
                {selectedService.category}
              </p>
            </div>

            <div className="rounded-xl border border-teal-500/20 bg-teal-500/5 p-3">
              <p className="text-xs text-muted-foreground">
                Prix
              </p>

              <p className="text-lg font-bold text-teal-400">
                Gratuit
              </p>

              <p className="text-xs text-muted-foreground mt-1">
                Aucun paiement et aucun Coin ne seront débités.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                {linkLabelFor(
                  selectedService.serviceType
                )}
              </label>

              <Input
                value={link}
                onChange={(event) =>
                  setLink(event.target.value)
                }
                placeholder={exampleLinkFor(
                  selectedService.platformId,
                  selectedService.serviceType
                )}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Quantité (
                {selectedService.min.toLocaleString()}–
                {selectedService.max.toLocaleString()})
              </label>

              <Input
                type="number"
                min={selectedService.min}
                max={selectedService.max}
                value={quantity}
                onChange={(event) =>
                  setQuantity(
                    Number(event.target.value) ||
                      selectedService.min
                  )
                }
              />
            </div>

            <Button
              onClick={handlePlaceOrder}
              disabled={placing || !quantityValid}
              className="w-full"
            >
              {placing && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}

              {placing
                ? "Commande en cours..."
                : "Commander gratuitement"}
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
