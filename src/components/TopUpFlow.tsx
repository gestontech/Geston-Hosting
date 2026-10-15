import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { getPackages, getPaymentsConfig } from "@/lib/api";
import { ArrowLeft, Loader2 } from "lucide-react";
import {
  type Package,
  type NigeriaPackage,
  type TanzaniaPackage,
  type DRCPackage,
  CAMEROON_PACKAGES,
  TANZANIA_PACKAGES,
  DRC_PACKAGES,
  NIGERIA_PACKAGES,
} from "@/components/topup/packages";
import { KenyaPaymentModal } from "@/components/topup/KenyaPaymentModal";
import { TanzaniaPaymentModal } from "@/components/topup/TanzaniaPaymentModal";
import { DRCPaymentModal } from "@/components/topup/DRCPaymentModal";
import { CameroonPaymentModal } from "@/components/topup/CameroonPaymentModal";
import { NigeriaPaymentModal } from "@/components/topup/NigeriaPaymentModal";
import { OtherCountryPaymentModal } from "@/components/topup/OtherCountryPaymentModal";

export interface TopUpFlowProps {
  requiredTx?: number;
  onSuccess?: () => void;
  compact?: boolean;
}

export function TopUpFlow({ requiredTx, onSuccess, compact = false }: TopUpFlowProps) {
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();
  const [packages, setPackages] = useState<Package[]>([]);
  const [pkgLoading, setPkgLoading] = useState(true);
  const [selectedPkg, setSelectedPkg] = useState<Package | null>(null);
  const [selectedNgPkg, setSelectedNgPkg] = useState<NigeriaPackage | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [ngModalOpen, setNgModalOpen] = useState(false);
  const [otherMethodModalOpen, setOtherMethodModalOpen] = useState(false);
  const [country, setCountry] = useState<"kenya" | "nigeria" | "cameroon" | "tanzania" | "drc" | "other" | null>(null);
  const [kenyaAvailable, setKenyaAvailable] = useState(true);
  const [nigeriaAvailable, setNigeriaAvailable] = useState(true);
  const [cameroonAvailable, setCameroonAvailable] = useState(true);
  const [tanzaniaAvailable, setTanzaniaAvailable] = useState(true);
  const [southAfricaAvailable, setSouthAfricaAvailable] = useState(false);
  const [ghanaAvailable, setGhanaAvailable] = useState(false);
  const [drcAvailable, setDrcAvailable] = useState(false);
  const [cardAvailable, setCardAvailable] = useState(true);
  const [cmModalOpen, setCmModalOpen] = useState(false);
  const [selectedCmPkg, setSelectedCmPkg] = useState<{ id: string; name: string; txAmount: number; bonusTx: number; xafPrice: number; isBestDeal: boolean } | null>(null);
  const [tzModalOpen, setTzModalOpen] = useState(false);
  const [selectedTzPkg, setSelectedTzPkg] = useState<TanzaniaPackage | null>(null);
  const [drcModalOpen, setDrcModalOpen] = useState(false);
  const [selectedDrcPkg, setSelectedDrcPkg] = useState<DRCPackage | null>(null);

  const userEmail = user?.email || "";

  const handlePaid = async () => {
    await refreshUser();
    onSuccess?.();
  };

  useEffect(() => {
    getPackages()
      .then(data => setPackages((data as Package[]).sort((a, b) => a.order - b.order)))
      .catch(() => showToast("Échec du chargement des forfaits", "error"))
      .finally(() => setPkgLoading(false));

    getPaymentsConfig()
      .then(config => {
        const c = config as {
          kenyaAvailable?: boolean;
          nigeriaAvailable?: boolean;
          cameroonAvailable?: boolean;
          tanzaniaAvailable?: boolean;
          southAfricaAvailable?: boolean;
          ghanaAvailable?: boolean;
          drcAvailable?: boolean;
          cardAvailable?: boolean;
        };
        if (typeof c.kenyaAvailable === "boolean") setKenyaAvailable(c.kenyaAvailable);
        if (typeof c.nigeriaAvailable === "boolean") setNigeriaAvailable(c.nigeriaAvailable);
        if (typeof c.cameroonAvailable === "boolean") setCameroonAvailable(c.cameroonAvailable);
        if (typeof c.tanzaniaAvailable === "boolean") setTanzaniaAvailable(c.tanzaniaAvailable);
        setSouthAfricaAvailable(!!c.southAfricaAvailable);
        setGhanaAvailable(!!c.ghanaAvailable);
        setDrcAvailable(!!c.drcAvailable);
        if (typeof c.cardAvailable === "boolean") setCardAvailable(c.cardAvailable);
      })
      .catch(() => {});
  }, [showToast]);

  return (
    <div className={compact ? "space-y-4" : "space-y-4"}>
        {requiredTx != null && requiredTx > 0 && (
          <div className="p-3.5 rounded-lg border border-teal-500/30 bg-teal-500/5 text-sm">
            Il vous faut au moins <span className="font-semibold">{requiredTx} Coins</span> pour continuer. Payez ici — votre solde se met à jour automatiquement après paiement.
          </div>
        )}

        {country === null ? (
          <>
            <div className="mb-2">
              <h2 className="font-bold text-lg">Sélectionnez votre pays</h2>
              <p className="text-sm text-muted-foreground">Les moyens de paiement disponibles dépendent de votre localisation</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {kenyaAvailable ? (
              <button
                onClick={() => setCountry("kenya")}
                className="group p-6 rounded-xl border border-border bg-card/50 hover:border-teal-500/40 hover:bg-teal-500/5 transition-all text-left"
              >
                <div className="text-4xl mb-3">🇰🇪</div>
                <p className="font-bold text-lg">Kenya</p>
                <p className="text-sm text-muted-foreground mt-1">Payez avec M-Pesa, Airtel, Carte</p>
                <p className="text-xs text-muted-foreground mt-0.5">Prix en KES</p>
              </button>
              ) : (
                <div className="p-6 rounded-xl border border-border/50 bg-card/20 opacity-60">
                  <div className="text-4xl mb-3">🇰🇪</div>
                  <p className="font-bold text-lg">Kenya</p>
                  <p className="text-sm text-muted-foreground mt-1">Temporairement indisponible</p>
                </div>
              )}

              {nigeriaAvailable ? (
              <button
                onClick={() => setCountry("nigeria")}
                className="group p-6 rounded-xl border border-border bg-card/50 hover:border-green-500/40 hover:bg-green-500/5 transition-all text-left"
              >
                <div className="text-4xl mb-3">🇳🇬</div>
                <p className="font-bold text-lg">Nigeria</p>
                <p className="text-sm text-muted-foreground mt-1">Payez par carte, virement, USSD, OPay, Zap</p>
                <p className="text-xs text-muted-foreground mt-0.5">Prix en NGN</p>
              </button>
              ) : (
                <div className="p-6 rounded-xl border border-border/50 bg-card/20 opacity-60">
                  <div className="text-4xl mb-3">🇳🇬</div>
                  <p className="font-bold text-lg">Nigeria</p>
                  <p className="text-sm text-muted-foreground mt-1">Temporairement indisponible</p>
                </div>
              )}

              {cameroonAvailable ? (
              <button
                onClick={() => setCountry("cameroon")}
                className="group p-6 rounded-xl border border-border bg-card/50 hover:border-yellow-500/40 hover:bg-yellow-500/5 transition-all text-left"
              >
                <div className="text-4xl mb-3">🇨🇲</div>
                <p className="font-bold text-lg">Cameroun</p>
                <p className="text-sm text-muted-foreground mt-1">Payez avec Mobile Money</p>
                <p className="text-xs text-muted-foreground mt-0.5">Prix en XAF</p>
              </button>
              ) : (
                <div className="p-6 rounded-xl border border-border/50 bg-card/20 opacity-60">
                  <div className="text-4xl mb-3">🇨🇲</div>
                  <p className="font-bold text-lg">Cameroun</p>
                  <p className="text-sm text-muted-foreground mt-1">Temporairement indisponible</p>
                </div>
              )}

              {tanzaniaAvailable ? (
              <button
                onClick={() => setCountry("tanzania")}
                className="group p-6 rounded-xl border border-border bg-card/50 hover:border-blue-500/40 hover:bg-blue-500/5 transition-all text-left"
              >
                <div className="text-4xl mb-3">🇹🇿</div>
                <p className="font-bold text-lg">Tanzanie</p>
                <p className="text-sm text-muted-foreground mt-1">Payez avec Mobile Money</p>
                <p className="text-xs text-muted-foreground mt-0.5">Prix en TZS</p>
              </button>
              ) : (
                <div className="p-6 rounded-xl border border-border/50 bg-card/20 opacity-60">
                  <div className="text-4xl mb-3">🇹🇿</div>
                  <p className="font-bold text-lg">Tanzanie</p>
                  <p className="text-sm text-muted-foreground mt-1">Temporairement indisponible</p>
                </div>
              )}

              {drcAvailable ? (
              <button
                onClick={() => setCountry("drc")}
                className="group p-6 rounded-xl border border-border bg-card/50 hover:border-orange-500/40 hover:bg-orange-500/5 transition-all text-left"
              >
                <div className="text-4xl mb-3">🇨🇩</div>
                <p className="font-bold text-lg">RD Congo</p>
                <p className="text-sm text-muted-foreground mt-1">Payez avec Mobile Money</p>
                <p className="text-xs text-muted-foreground mt-0.5">Prix en USD</p>
              </button>
              ) : (
                <div className="p-6 rounded-xl border border-border/50 bg-card/20 opacity-60">
                  <div className="text-4xl mb-3">🇨🇩</div>
                  <p className="font-bold text-lg">RD Congo</p>
                  <p className="text-sm text-muted-foreground mt-1">Temporairement indisponible</p>
                </div>
              )}

              {southAfricaAvailable ? (
                <button
                  onClick={() => setCountry("other")}
                  className="group p-6 rounded-xl border border-border bg-card/50 hover:border-green-500/40 hover:bg-green-500/5 transition-all text-left"
                >
                  <div className="text-4xl mb-3">🇿🇦</div>
                  <p className="font-bold text-lg">Afrique du Sud</p>
                  <p className="text-sm text-muted-foreground mt-1">Payez par carte, Apple Pay</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Prix en ZAR</p>
                </button>
              ) : (
                <div className="p-6 rounded-xl border border-border/50 bg-card/20 opacity-60">
                  <div className="text-4xl mb-3">🇿🇦</div>
                  <p className="font-bold text-lg">Afrique du Sud</p>
                  <p className="text-sm text-muted-foreground mt-1">Bientôt disponible</p>
                </div>
              )}

              {ghanaAvailable ? (
                <button
                  onClick={() => setCountry("other")}
                  className="group p-6 rounded-xl border border-border bg-card/50 hover:border-yellow-500/40 hover:bg-yellow-500/5 transition-all text-left"
                >
                  <div className="text-4xl mb-3">🇬🇭</div>
                  <p className="font-bold text-lg">Ghana</p>
                  <p className="text-sm text-muted-foreground mt-1">Payez par carte, Mobile Money</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Prix en GHS</p>
                </button>
              ) : (
                <div className="p-6 rounded-xl border border-border/50 bg-card/20 opacity-60">
                  <div className="text-4xl mb-3">🇬🇭</div>
                  <p className="font-bold text-lg">Ghana</p>
                  <p className="text-sm text-muted-foreground mt-1">Bientôt disponible</p>
                </div>
              )}

              {cardAvailable ? (
              <button
                onClick={() => setCountry("other")}
                className="group p-6 rounded-xl border border-border bg-card/50 hover:border-blue-500/40 hover:bg-blue-500/5 transition-all text-left"
              >
                <div className="text-4xl mb-3">🌍</div>
                <p className="font-bold text-lg">Autres pays</p>
                <p className="text-sm text-muted-foreground mt-1">Payez par carte ou Apple Pay</p>
                <p className="text-xs text-muted-foreground mt-0.5">Disponible dans le monde entier</p>
              </button>
              ) : (
                <div className="p-6 rounded-xl border border-border/50 bg-card/20 opacity-60">
                  <div className="text-4xl mb-3">🌍</div>
                  <p className="font-bold text-lg">Autres pays</p>
                  <p className="text-sm text-muted-foreground mt-1">Temporairement indisponible</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <button
              onClick={() => setCountry(null)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour aux pays
            </button>

            {country === "kenya" && (
              <div className="space-y-4">
                <h2 className="font-bold text-lg">Forfaits Kenya</h2>
                {pkgLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {packages.map(pkg => (
                      <button
                        key={pkg._id}
                        onClick={() => { setSelectedPkg(pkg); setModalOpen(true); }}
                        className="p-4 rounded-xl border border-border bg-card/50 hover:border-teal-500/40 text-left"
                      >
                        <p className="font-bold">{pkg.name}</p>
                        <p className="text-sm text-muted-foreground">{pkg.txAmount} Coins</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {country === "nigeria" && (
              <div className="space-y-4">
                <h2 className="font-bold text-lg">Forfaits Nigeria</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {NIGERIA_PACKAGES.map(pkg => (
                    <button
                      key={pkg.id}
                      onClick={() => { setSelectedNgPkg(pkg); setNgModalOpen(true); }}
                      className="p-4 rounded-xl border border-border bg-card/50 hover:border-green-500/40 text-left"
                    >
                      <p className="font-bold">{pkg.name}</p>
                      <p className="text-sm text-muted-foreground">{pkg.txAmount} Coins · ₦{pkg.ngnPrice}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {country === "cameroon" && (
              <div className="space-y-4">
                <h2 className="font-bold text-lg">Forfaits Cameroun</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {CAMEROON_PACKAGES.map(pkg => (
                    <button
                      key={pkg.id}
                      onClick={() => { setSelectedCmPkg(pkg); setCmModalOpen(true); }}
                      className="p-4 rounded-xl border border-border bg-card/50 hover:border-yellow-500/40 text-left"
                    >
                      <p className="font-bold">{pkg.name}</p>
                      <p className="text-sm text-muted-foreground">{pkg.txAmount} Coins · {pkg.xafPrice} XAF</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {country === "tanzania" && (
              <div className="space-y-4">
                <h2 className="font-bold text-lg">Forfaits Tanzanie</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {TANZANIA_PACKAGES.map(pkg => (
                    <button
                      key={pkg.id}
                      onClick={() => { setSelectedTzPkg(pkg); setTzModalOpen(true); }}
                      className="p-4 rounded-xl border border-border bg-card/50 hover:border-blue-500/40 text-left"
                    >
                      <p className="font-bold">{pkg.name}</p>
                      <p className="text-sm text-muted-foreground">{pkg.txAmount} Coins · {pkg.tzsPrice} TZS</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {country === "drc" && (
              <div className="space-y-4">
                <h2 className="font-bold text-lg">Forfaits RD Congo</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {DRC_PACKAGES.map(pkg => (
                    <button
                      key={pkg.id}
                      onClick={() => { setSelectedDrcPkg(pkg); setDrcModalOpen(true); }}
                      className="p-4 rounded-xl border border-border bg-card/50 hover:border-orange-500/40 text-left"
                    >
                      <p className="font-bold">{pkg.name}</p>
                      <p className="text-sm text-muted-foreground">{pkg.txAmount} Coins · ${pkg.usdPrice} USD</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {country === "other" && (
              <div className="space-y-4">
                <h2 className="font-bold text-lg">Forfaits internationaux</h2>
                {pkgLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {packages.map(pkg => (
                      <button
                        key={pkg._id + "-other"}
                        onClick={() => { setSelectedPkg(pkg); setOtherMethodModalOpen(true); }}
                        className="p-4 rounded-xl border border-border bg-card/50 hover:border-blue-500/40 text-left"
                      >
                        <p className="font-bold">{pkg.name}</p>
                        <p className="text-sm text-muted-foreground">{pkg.txAmount} Coins</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        <KenyaPaymentModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          pkg={selectedPkg}
          userEmail={userEmail}
          onSuccess={() => { handlePaid(); setModalOpen(false); }}
        />
        <NigeriaPaymentModal
          isOpen={ngModalOpen}
          onClose={() => setNgModalOpen(false)}
          pkg={selectedNgPkg}
          userEmail={userEmail}
          onSuccess={() => { handlePaid(); setNgModalOpen(false); }}
        />
        <CameroonPaymentModal
          isOpen={cmModalOpen}
          onClose={() => setCmModalOpen(false)}
          pkg={selectedCmPkg}
          onSuccess={() => { handlePaid(); setCmModalOpen(false); }}
        />
        <TanzaniaPaymentModal
          isOpen={tzModalOpen}
          onClose={() => setTzModalOpen(false)}
          pkg={selectedTzPkg}
          onSuccess={() => { handlePaid(); setTzModalOpen(false); }}
        />
        <DRCPaymentModal
          isOpen={drcModalOpen}
          onClose={() => setDrcModalOpen(false)}
          pkg={selectedDrcPkg}
          onSuccess={() => { handlePaid(); setDrcModalOpen(false); }}
        />
        <OtherCountryPaymentModal
          isOpen={otherMethodModalOpen}
          onClose={() => setOtherMethodModalOpen(false)}
          pkg={selectedPkg}
          userEmail={userEmail}
          onSuccess={() => { handlePaid(); setOtherMethodModalOpen(false); }}
        />
    </div>
  );
}
