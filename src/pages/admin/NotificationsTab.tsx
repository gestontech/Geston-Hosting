import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, Plus, Loader2, Trash2 } from "lucide-react";
import { createAdminBroadcastNotification, deleteAdminBroadcastNotification } from "@/lib/api";

interface BroadcastNotification {
  _id: string;
  title: string;
  message: string;
  type: string;
  createdAt: string;
}

interface NotificationsTabProps {
  broadcastNotifications: BroadcastNotification[];
  setBroadcastNotifications: React.Dispatch<React.SetStateAction<BroadcastNotification[]>>;
  newBroadcastTitle: string;
  setNewBroadcastTitle: (v: string) => void;
  newBroadcastMessage: string;
  setNewBroadcastMessage: (v: string) => void;
  broadcastLoading: boolean;
  setBroadcastLoading: (v: boolean) => void;
  loading: Record<string, boolean>;
  fetchData: (key: string) => void;
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
}

export function NotificationsTab({
  broadcastNotifications,
  setBroadcastNotifications,
  newBroadcastTitle,
  setNewBroadcastTitle,
  newBroadcastMessage,
  setNewBroadcastMessage,
  broadcastLoading,
  setBroadcastLoading,
  loading,
  fetchData,
  showToast,
}: NotificationsTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Bell className="w-5 h-5 text-teal-400" />
        <h2 className="text-lg font-bold">Broadcast Notifications</h2>
      </div>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Send Broadcast
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Title</Label>
            <Input placeholder="Notification title" value={newBroadcastTitle} onChange={e => setNewBroadcastTitle(e.target.value)} />
          </div>
          <div>
            <Label>Message</Label>
            <textarea
              className="w-full min-h-[80px] rounded-md border border-input bg-transparent px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder="Notification message..."
              value={newBroadcastMessage}
              onChange={e => setNewBroadcastMessage(e.target.value)}
            />
          </div>
          <Button
            size="sm"
            disabled={broadcastLoading || !newBroadcastTitle.trim() || !newBroadcastMessage.trim()}
            onClick={async () => {
              setBroadcastLoading(true);
              try {
                const res = await createAdminBroadcastNotification({ title: newBroadcastTitle.trim(), message: newBroadcastMessage.trim(), type: "general" }) as { ok?: boolean; error?: string };
                if (res.error) { showToast(res.error, "error"); } else {
                  showToast("Broadcast sent!", "success");
                  setNewBroadcastTitle(""); setNewBroadcastMessage("");
                  fetchData("notifications");
                }
              } catch { showToast("Failed to send broadcast", "error"); }
              finally { setBroadcastLoading(false); }
            }}
          >
            {broadcastLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Bell className="w-3.5 h-3.5 mr-1.5" />}
            Send Broadcast
          </Button>
        </CardContent>
      </Card>

      {loading["notifications"] ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : broadcastNotifications.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">No broadcast notifications yet</div>
      ) : (
        <div className="space-y-2">
          {broadcastNotifications.map(n => (
            <Card key={n._id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="font-semibold text-sm">{n.title}</p>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-teal-500/10 text-teal-400 capitalize">{n.type}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{n.message}</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">{new Date(n.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        await deleteAdminBroadcastNotification(n._id);
                        setBroadcastNotifications(prev => prev.filter(x => x._id !== n._id));
                        showToast("Deleted", "success");
                      } catch { showToast("Failed to delete", "error"); }
                    }}
                    className="p-1.5 rounded hover:bg-red-500/10 text-red-400 transition-colors shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
