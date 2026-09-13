import { useEffect, useState } from "react";

interface CountdownTimerProps {
  target: string;
  expiredLabel?: string;
  className?: string;
  urgentClassName?: string;
}

function getParts(target: string): { total: number; days: number; hours: number; minutes: number; seconds: number } {
  const total = new Date(target).getTime() - Date.now();
  if (total <= 0) return { total: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };
  const days = Math.floor(total / (1000 * 60 * 60 * 24));
  const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((total / (1000 * 60)) % 60);
  const seconds = Math.floor((total / 1000) % 60);
  return { total, days, hours, minutes, seconds };
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

export function CountdownTimer({ target, expiredLabel = "Expired", className = "", urgentClassName = "" }: CountdownTimerProps) {
  const [parts, setParts] = useState(() => getParts(target));

  useEffect(() => {
    setParts(getParts(target));
    const interval = setInterval(() => setParts(getParts(target)), 1000);
    return () => clearInterval(interval);
  }, [target]);

  if (parts.total <= 0) {
    return <span className={className}>{expiredLabel}</span>;
  }

  const isUrgent = parts.days === 0 && parts.hours < 12;
  const combinedClassName = `${className} ${isUrgent ? urgentClassName : ""}`.trim();

  if (parts.days > 0) {
    return (
      <span className={combinedClassName}>
        {parts.days}d {pad(parts.hours)}h {pad(parts.minutes)}m
      </span>
    );
  }
  if (parts.hours > 0) {
    return (
      <span className={combinedClassName}>
        {parts.hours}h {pad(parts.minutes)}m {pad(parts.seconds)}s
      </span>
    );
  }
  return (
    <span className={combinedClassName}>
      {parts.minutes}m {pad(parts.seconds)}s
    </span>
  );
}
