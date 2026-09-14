export const LOGO_MPESA = "https://raw.githubusercontent.com/xhclintohn/Music-Clips-Collection/refs/heads/main/images/mpesa.jpg";
export const LOGO_AIRTEL = "https://raw.githubusercontent.com/xhclintohn/Music-Clips-Collection/refs/heads/main/images/airtel.jpg";
export const LOGO_CARD = "https://raw.githubusercontent.com/xhclintohn/Music-Clips-Collection/refs/heads/main/images/creditcard.jpg";
export const LOGO_APPLEPAY = "https://raw.githubusercontent.com/xhclintohn/Music-Clips-Collection/refs/heads/main/images/applepay.jpg";

export function PayLogo({ src, alt, className = "" }: { src: string; alt: string; className?: string }) {
  return (
    <img
      src={src}
      alt={alt}
      className={"rounded object-contain " + className}
      style={{ width: 44, height: 30 }}
      onError={e => { (e.target as HTMLImageElement).style.opacity = "0.4"; }}
    />
  );
}

export function MpesaLogo() { return <PayLogo src={LOGO_MPESA} alt="M-Pesa" />; }
export function AirtelLogo() { return <PayLogo src={LOGO_AIRTEL} alt="Airtel" />; }
export function CardLogo() { return <PayLogo src={LOGO_CARD} alt="Card" />; }
export function ApplePayLogo() { return <PayLogo src={LOGO_APPLEPAY} alt="Apple Pay" />; }
