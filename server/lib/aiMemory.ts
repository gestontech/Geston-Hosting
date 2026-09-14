/**
 * In-memory AI conversation history per userLabel.
 * Entries expire after MEMORY_TTL_MS of inactivity (default 6 hours).
 */

export type MemoryTurn = { role: "user" | "assistant"; content: string; at: number };

type Session = {
  turns: MemoryTurn[];
  lastAt: number;
};

const MEMORY_TTL_MS = Number(process.env.AI_MEMORY_TTL_HOURS || "6") * 60 * 60 * 1000;
const MAX_TURNS = 24; // 12 user + 12 assistant pairs max

const store = new Map<string, Session>();

function pruneExpired(): void {
  const now = Date.now();
  for (const [key, sess] of store) {
    if (now - sess.lastAt > MEMORY_TTL_MS) store.delete(key);
  }
}

export function getMemoryTurns(userLabel: string): MemoryTurn[] {
  if (!userLabel) return [];
  pruneExpired();
  const sess = store.get(userLabel);
  if (!sess) return [];
  if (Date.now() - sess.lastAt > MEMORY_TTL_MS) {
    store.delete(userLabel);
    return [];
  }
  return sess.turns.slice();
}

export function appendMemory(userLabel: string, role: "user" | "assistant", content: string): void {
  if (!userLabel || !content.trim()) return;
  pruneExpired();
  let sess = store.get(userLabel);
  if (!sess) {
    sess = { turns: [], lastAt: Date.now() };
    store.set(userLabel, sess);
  }
  sess.turns.push({ role, content: content.slice(0, 1500), at: Date.now() });
  if (sess.turns.length > MAX_TURNS) {
    sess.turns = sess.turns.slice(-MAX_TURNS);
  }
  sess.lastAt = Date.now();
}

/** Format prior turns for injection into the model user message. */
export function formatMemoryForPrompt(userLabel: string): string {
  const turns = getMemoryTurns(userLabel);
  if (turns.length === 0) return "";
  const lines = turns.map((t) => (t.role === "user" ? "User: " : "Assistant: ") + t.content);
  return (
    "Previous conversation (most recent last — use this for continuity; do not repeat it verbatim):\n" +
    lines.join("\n") +
    "\n\n---\nCurrent message:\n"
  );
}

export function clearMemory(userLabel: string): void {
  if (userLabel) store.delete(userLabel);
}
