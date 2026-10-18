import { Bot } from "lucide-react";
import { WhatsAppIcon } from "@/components/BrandIcons";
import { supportWhatsAppUrl } from "@/lib/supportLinks";

export function BotChatButtons({ className }: { className?: string }) {
  const whatsappUrl = supportWhatsAppUrl();

  if (!whatsappUrl) return null;

  return (
    <div className={"flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 " + (className || "")}>
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="group inline-flex items-center justify-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#25D366] hover:bg-[#1ebe57] shadow-md shadow-[#25D366]/25 transition-all hover:-translate-y-0.5 active:translate-y-0"
      >
        <WhatsAppIcon className="w-5 h-5 shrink-0" />
        Discuter sur WhatsApp
      </a>
    </div>
  );
}

/**
 * WhatsApp button, plus a small clarifying note that this is an automated
 * AI assistant bot (not a human live-chat), and a link through to the
 * full bot features page.
 */
export function BotChatButtonsWithNote({
  className,
  featuresHref = "/botfeatures",
  onFeaturesClick,
}: {
  className?: string;
  featuresHref?: string;
  onFeaturesClick?: () => void;
}) {
  const whatsappUrl = supportWhatsAppUrl();
  if (!whatsappUrl) return null;

  return (
    <div className={"flex flex-col items-center gap-3 " + (className || "")}>
      <BotChatButtons />
      <p className="text-xs text-muted-foreground text-center max-w-sm leading-relaxed">
        <Bot className="w-3.5 h-3.5 inline -mt-0.5 mr-1 text-lime-400" />
        WhatsApp vous connecte à notre{" "}
        <span className="font-medium text-foreground">assistant IA</span> pour des réponses
        instantanées et automatisées, 24/7.{" "}
        {onFeaturesClick ? (
          <button
            type="button"
            onClick={onFeaturesClick}
            className="font-semibold text-lime-400 hover:text-lime-300 underline underline-offset-2"
          >
            Voir tout ce qu'il peut faire →
          </button>
        ) : (
          <a
            href={featuresHref}
            className="font-semibold text-lime-400 hover:text-lime-300 underline underline-offset-2"
          >
            Voir tout ce qu'il peut faire →
          </a>
        )}
      </p>
    </div>
  );
}
