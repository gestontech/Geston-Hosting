import { useEffect, useRef, useState, useCallback } from "react";
import { Bell, Trash2, X, Coins, Rocket, RefreshCw, AlertTriangle, Loader2, TrendingUp } from "lucide-react";
import type { AppNotification } from "@/types";
import { getNotifications, markNotificationsRead, deleteNotification, deleteAllNotifications } from "@/lib/api";
import { lockScroll, unlockScroll } from "@/lib/scrollLock";
import { useAuth } from "@/hooks/useAuth";

function timeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function NotificationIcon({ type }: { type: AppNotification["type"] }) {
  switch (type) {
    case "topup": return <Coins className="w-4 h-4 text-teal-400" />;
    case "deploy": return <Rocket className="w-4 h-4 text-blue-400" />;
    case "expiring": return <AlertTriangle className="w-4 h-4 text-orange-400" />;
    case "renewed": return <RefreshCw className="w-4 h-4 text-green-400" />;
    case "refund": return <Coins className="w-4 h-4 text-green-400" />;
    case "boost": return <TrendingUp className="w-4 h-4 text-pink-400" />;
    case "deleted": return <Trash2 className="w-4 h-4 text-red-400" />;
    default: return <Bell className="w-4 h-4 text-muted-foreground" />;
  }
}

export function NotificationBell() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const readTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getNotifications() as { notifications?: AppNotification[]; unreadCount?: number };
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [user, fetchNotifications]);

  useEffect(() => {
    if (!open) return undefined;
    lockScroll();
    readTimeoutRef.current = setTimeout(() => {
      markNotificationsRead().catch(() => {});
      setUnreadCount(0);
    }, 1200);
    return () => {
      unlockScroll();
      if (readTimeoutRef.current) clearTimeout(readTimeoutRef.current);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleToggle = () => {
    if (!open) fetchNotifications();
    setOpen(o => !o);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteNotification(id);
      setNotifications(prev => prev.filter(n => n._id !== id));
    } catch {} finally {
      setDeletingId(null);
    }
  };

  const handleDeleteAll = async () => {
    try {
      await deleteAllNotifications();
      setNotifications([]);
      setUnreadCount(0);
    } catch {}
  };

  if (!user) return null;

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={handleToggle}
        className="relative p-2 rounded-lg hover:bg-muted transition-all duration-200"
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4 text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none animate-in zoom-in-50 duration-200">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] bg-black/50 animate-in fade-in-0 duration-200 sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:z-[100] sm:mt-2 sm:bg-transparent sm:animate-none"
          onClick={() => setOpen(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ top: "max(4.5rem, calc(env(safe-area-inset-top, 0px) + 3.75rem))" }}
            className="fixed left-4 right-4 max-h-[70dvh] rounded-xl border border-border bg-card shadow-xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200 sm:static sm:left-auto sm:right-auto sm:w-80 sm:max-w-[calc(100vw-2rem)] sm:max-h-96 sm:slide-in-from-top-2 sm:origin-top-right flex flex-col"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
              <p className="text-sm font-semibold">Notifications</p>
              <div className="flex items-center gap-1">
                {notifications.length > 0 && (
                  <button
                    onClick={handleDeleteAll}
                    className="text-xs text-muted-foreground hover:text-red-400 transition-colors px-2 py-1 rounded-md hover:bg-red-500/10"
                  >
                    Clear all
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="p-1 rounded-md hover:bg-muted transition-colors"
                  aria-label="Close notifications"
                >
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto">
              {loading && notifications.length === 0 ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                  <Bell className="w-8 h-8 text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">No notifications yet</p>
                </div>
              ) : (
                notifications.map(n => (
                  <div
                    key={n._id}
                    className={`group flex items-start gap-3 px-4 py-3 border-b border-border/50 last:border-0 hover:bg-muted/50 transition-colors ${!n.read ? "bg-teal-500/5" : ""}`}
                  >
                    <div className="mt-0.5 shrink-0">
                      <NotificationIcon type={n.type} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-snug">{n.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{n.message}</p>
                      <p className="text-[10px] text-muted-foreground/70 mt-1">{timeAgo(n.createdAt)}</p>
                    </div>
                    <button
                      onClick={() => handleDelete(n._id)}
                      disabled={deletingId === n._id}
                      className="shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-all opacity-70 sm:opacity-0 sm:group-hover:opacity-100"
                      aria-label="Delete notification"
                    >
                      {deletingId === n._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
