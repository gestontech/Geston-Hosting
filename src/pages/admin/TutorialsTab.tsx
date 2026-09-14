import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Youtube, Plus, Loader2, Trash2 } from "lucide-react";
import { createAdminTutorial, getAdminTutorials } from "@/lib/api";

interface Tutorial {
  _id: string;
  title: string;
  youtubeUrl: string;
  order: number;
}

interface TutorialsTabProps {
  tutorials: Tutorial[];
  setTutorials: (v: Tutorial[]) => void;
  newTutorialTitle: string;
  setNewTutorialTitle: (v: string) => void;
  newTutorialUrl: string;
  setNewTutorialUrl: (v: string) => void;
  newTutorialOrder: number;
  setNewTutorialOrder: (v: number) => void;
  tutorialLoading: boolean;
  setTutorialLoading: (v: boolean) => void;
  setConfirmDeleteTutorial: (v: { open: boolean; id: string } | null) => void;
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
}

export function TutorialsTab({
  tutorials,
  setTutorials,
  newTutorialTitle,
  setNewTutorialTitle,
  newTutorialUrl,
  setNewTutorialUrl,
  newTutorialOrder,
  setNewTutorialOrder,
  tutorialLoading,
  setTutorialLoading,
  setConfirmDeleteTutorial,
  showToast,
}: TutorialsTabProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Youtube className="w-4 h-4 text-red-400" />
            Add Tutorial
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Title</Label>
              <Input placeholder="Tutorial title" value={newTutorialTitle} onChange={e => setNewTutorialTitle(e.target.value)} />
            </div>
            <div>
              <Label>YouTube URL</Label>
              <Input placeholder="https://youtu.be/..." value={newTutorialUrl} onChange={e => setNewTutorialUrl(e.target.value)} />
            </div>
            <div>
              <Label>Order</Label>
              <Input type="number" min={0} value={newTutorialOrder} onChange={e => setNewTutorialOrder(Number(e.target.value))} />
            </div>
          </div>
          <Button
            size="sm"
            disabled={tutorialLoading || !newTutorialTitle.trim() || !newTutorialUrl.trim()}
            onClick={async () => {
              setTutorialLoading(true);
              try {
                await createAdminTutorial({ title: newTutorialTitle.trim(), youtubeUrl: newTutorialUrl.trim(), order: newTutorialOrder });
                showToast("Tutorial added", "success");
                setNewTutorialTitle(""); setNewTutorialUrl(""); setNewTutorialOrder(0);
                const data = await getAdminTutorials() as Tutorial[];
                if (Array.isArray(data)) setTutorials(data);
              } catch { showToast("Failed to add tutorial", "error"); }
              finally { setTutorialLoading(false); }
            }}
          >
            {tutorialLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Plus className="w-3.5 h-3.5 mr-1.5" />}
            Add Tutorial
          </Button>
        </CardContent>
      </Card>
      <div className="rounded-md border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-3 font-medium">#</th>
              <th className="text-left p-3 font-medium">Title</th>
              <th className="text-left p-3 font-medium">URL</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {tutorials.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-8 text-muted-foreground">No tutorials yet</td></tr>
            ) : tutorials.map(t => (
              <tr key={t._id} className="border-b hover:bg-muted/30">
                <td className="p-3 text-muted-foreground">{t.order}</td>
                <td className="p-3 font-medium">{t.title}</td>
                <td className="p-3 text-xs text-muted-foreground truncate max-w-[200px]">
                  <a href={t.youtubeUrl} target="_blank" rel="noopener noreferrer" className="text-red-400 hover:underline">{t.youtubeUrl}</a>
                </td>
                <td className="p-3">
                  <button
                    onClick={async () => {
                      setConfirmDeleteTutorial({ open: true, id: t._id });
                    }}
                    className="p-1.5 rounded hover:bg-red-500/10 text-red-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
