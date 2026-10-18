import { Input } from "@/components/ui/input";
import type { AdminUser } from "@/types";
import {
  Search, X, Loader2, Crown, Shield, ChevronDown,
} from "lucide-react";
import { formatDate } from "./shared";
import type { RefObject } from "react";

interface UsersTabProps {
  userSearch: string;
  setUserSearch: (v: string) => void;
  searchRef: RefObject<HTMLInputElement | null>;
  loading: boolean;
  filteredUsers: AdminUser[];
  openUserPanel: (u: AdminUser) => void;
}

export function UsersTab({
  userSearch,
  setUserSearch,
  searchRef,
  loading,
  filteredUsers,
  openUserPanel,
}: UsersTabProps) {
  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={searchRef}
          placeholder="Search by username or email..."
          value={userSearch}
          onChange={e => setUserSearch(e.target.value)}
          className="pl-9"
        />
        {userSearch && (
          <button
            onClick={() => setUserSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          {userSearch ? `No users matching "${userSearch}"` : "No users found"}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredUsers.map(u => (
            <button
              key={u._id}
              onClick={() => openUserPanel(u)}
              className="w-full text-left rounded-xl border border-border bg-card hover:bg-muted/40 transition-colors p-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 text-xs font-bold text-primary uppercase">
                    {(u.username || u.email)[0]}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-medium text-sm">{u.username ? `@${u.username}` : "No username"}</span>
                      {u.isAdmin && <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                      {u.isAdmin && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-400/10 text-amber-400 flex items-center gap-0.5">Admin</span>
                      )}
                      {u.isModerator && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-400/10 text-blue-400 flex items-center gap-0.5"><Shield className="w-2.5 h-2.5" />Mod</span>
                      )}
                      {u.isBanned && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-400/10 text-red-400">Banned</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="text-teal-400 font-medium">{u.txCoins} Coins</span>
                      <span>{u.botCount} bot{u.botCount !== 1 ? "s" : ""}</span>
                      <span>{formatDate(u.createdAt)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 mt-2 sm:mt-0 sm:shrink-0 flex-wrap justify-start sm:justify-end">
                  <span className="text-xs text-muted-foreground">Tap to manage</span>
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground rotate-[-90deg]" />
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
