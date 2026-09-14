import { useState, useMemo } from "react";
import { Modal } from "@/components/Modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCurrency } from "@/hooks/useCurrency";
import { Search } from "lucide-react";

export function CurrencyPickerModal() {
  const { shouldPrompt, dismissPrompt, setCurrency, currencies } = useCurrency();
  const [selected, setSelected] = useState("USD");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return currencies;
    return currencies.filter(c =>
      c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)
    );
  }, [search, currencies]);

  if (!shouldPrompt) return null;

  return (
    <Modal isOpen={shouldPrompt} onClose={dismissPrompt} title="Choose your currency" maxWidth="max-w-md">
      <p className="text-sm text-muted-foreground mb-3">
        Prices across the site will be shown in this currency. You can change it anytime.
      </p>
      <div className="relative mb-3">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search currency..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>
      <div className="max-h-64 overflow-y-auto space-y-1 mb-4 -mx-1 px-1">
        {filtered.map(c => (
          <button
            key={c.code}
            onClick={() => setSelected(c.code)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left transition-colors ${
              selected === c.code ? "bg-primary text-primary-foreground" : "hover:bg-muted"
            }`}
          >
            <span className="text-base">{c.flag}</span>
            <span className="flex-1">{c.name}</span>
            <span className="text-xs opacity-70">{c.code}</span>
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">No currency found.</p>
        )}
      </div>
      <Button className="w-full" onClick={() => setCurrency(selected)}>
        Continue
      </Button>
    </Modal>
  );
}
