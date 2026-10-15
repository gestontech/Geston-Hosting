import { useEffect, useState } from "react";
import {
  Loader2,
  XCircle,
  ExternalLink,
} from "lucide-react";
import { Modal } from "@/components/Modal";
import { useToast } from "@/hooks/useToast";
import type { DRCPackage } from "@/components/topup/packages";

type Stage =
  | "select"
  | "redirecting"
  | "waiting"
  | "failed";

interface DRCPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  pkg: DRCPackage | null;
  onSuccess: () => void;
}

export function DRCPaymentModal({
  isOpen,
  onClose,
  pkg,
  onSuccess,
}: DRCPaymentModalProps) {
  const { showToast } = useToast();

  const [stage, setStage] =
    useState<Stage>("select");

  const [reference, setReference] =
    useState<string | null>(null);

  const [checkoutUrl, setCheckoutUrl] =
    useState<string | null>(null);

  /*
   * The payment confirmation is intentionally handled
   * by the OPTGateway webhook on the server.
   *
   * We keep the callback in the component API because
   * TopUpFlow already supplies it, but we must not call
   * it before the webhook confirms the payment.
   */
  void onSuccess;

  useEffect(() => {
    if (!isOpen) {
      setStage("select");
      setReference(null);
      setCheckoutUrl(null);
    }
  }, [isOpen]);

  const createCheckout = async () => {
    if (!pkg) return;

    setStage("redirecting");

    try {
      const res = await fetch(
        "/api/payments/initiate-drc",
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            packageId: pkg.id,
          }),
        },
      );

      const data = (await res.json()) as {
        checkoutUrl?: string;
        reference?: string;
        error?: string;
      };

      if (
        !res.ok ||
        !data.checkoutUrl ||
        !data.reference
      ) {
        throw new Error(
          data.error ||
            "Impossible de créer la session de paiement.",
        );
      }

      setReference(data.reference);
      setCheckoutUrl(data.checkoutUrl);
      setStage("waiting");

      window.location.assign(
        data.checkoutUrl,
      );
    } catch (error) {
      setStage("failed");

      showToast(
        error instanceof Error
          ? error.message
          : "Échec du lancement du paiement",
        "error",
      );
    }
  };

  if (!isOpen || !pkg) {
    return null;
  }

  const total =
    pkg.txAmount + pkg.bonusTx;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Paiement RD Congo"
    >
      <div className="space-y-4">
        {stage === "select" && (
          <>
            <div className="liquid-glass liquid-surface p-5">
              <p className="text-sm text-muted-foreground">
                {pkg.name}
              </p>

              <p className="text-3xl font-black mt-1">
                {total} Coins
              </p>

              <p className="text-sm text-muted-foreground mt-1">
                {pkg.usdPrice.toFixed(2)} USD
              </p>
            </div>

            <div className="liquid-glass p-4 rounded-2xl">
              <p className="font-semibold">
                Paiement sécurisé OPTGateway
              </p>

              <p className="text-sm text-muted-foreground mt-1">
                Vous serez redirigé vers la page
                sécurisée OPTGateway pour choisir
                votre moyen de paiement disponible
                en RDC.
              </p>
            </div>

            <button
              type="button"
              onClick={createCheckout}
              className="liquid-button w-full py-3.5 bg-primary text-primary-foreground font-bold"
            >
              Payer{" "}
              {pkg.usdPrice.toFixed(2)} USD
            </button>
          </>
        )}

        {stage === "redirecting" && (
          <div className="text-center py-8">
            <Loader2 className="w-9 h-9 animate-spin mx-auto mb-4" />

            <p className="font-semibold">
              Préparation du paiement…
            </p>
          </div>
        )}

        {stage === "waiting" && (
          <div className="text-center py-7 space-y-4">
            <ExternalLink className="w-10 h-10 mx-auto" />

            <p className="font-semibold">
              Paiement en cours
            </p>

            <p className="text-sm text-muted-foreground">
              Revenez sur Geston Hosting après
              avoir terminé le paiement.
            </p>

            {reference && (
              <p className="text-xs text-muted-foreground">
                Référence : {reference}
              </p>
            )}

            {checkoutUrl && (
              <button
                type="button"
                onClick={() =>
                  window.location.assign(
                    checkoutUrl,
                  )
                }
                className="liquid-button px-5 py-2.5 bg-primary text-primary-foreground font-semibold"
              >
                Ouvrir le paiement
              </button>
            )}
          </div>
        )}

        {stage === "failed" && (
          <div className="text-center py-8">
            <XCircle className="w-12 h-12 mx-auto text-red-500 mb-3" />

            <p className="font-bold">
              Paiement non lancé
            </p>

            <button
              type="button"
              onClick={() =>
                setStage("select")
              }
              className="liquid-button mt-5 px-6 py-2.5 border border-border font-semibold"
            >
              Réessayer
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
