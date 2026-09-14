interface PlatformMatch {
  id: string;
  match: string[];
}

const PLATFORM_MATCHES: PlatformMatch[] = [
  { id: "instagram", match: ["instagram"] },
  { id: "tiktok", match: ["tiktok", "tik tok"] },
  { id: "youtube", match: ["youtube"] },
  { id: "facebook", match: ["facebook"] },
  { id: "x", match: ["twitter", "x.com", " x ", "x/twitter", "(x)"] },
  { id: "telegram", match: ["telegram"] },
  { id: "whatsapp", match: ["whatsapp"] },
  { id: "spotify", match: ["spotify"] },
  { id: "soundcloud", match: ["soundcloud"] },
  { id: "linkedin", match: ["linkedin"] },
  { id: "snapchat", match: ["snapchat"] },
  { id: "twitch", match: ["twitch"] },
  { id: "pinterest", match: ["pinterest"] },
  { id: "discord", match: ["discord"] },
  { id: "threads", match: ["threads"] },
];

export function detectPlatformId(name: string, category: string): string {
  const lower = `${category} ${name}`.toLowerCase();
  const found = PLATFORM_MATCHES.find(p => p.match.some(m => lower.includes(m)));
  return found ? found.id : "other";
}

const TYPE_KEYWORDS = ["Followers", "Likes", "Views", "Subscribers", "Comments", "Shares", "Members", "Plays", "Reactions", "Reviews"];

export function detectServiceType(name: string, category: string): string {
  const haystack = `${name} ${category}`.toLowerCase();
  const found = TYPE_KEYWORDS.find(t => haystack.includes(t.toLowerCase()));
  return found || "Other";
}

const FLAG_EMOJI_RE = /[\u{1F1E6}-\u{1F1FF}]{2}/u;
const REGION_KEYWORDS = [
  "nigeria", "nigerian", "kenya", "kenyan", "south africa", "africa", "african",
  "ghana", "uganda", "tanzania", "cameroon", "egypt", "morocco", "ethiopia",
  "usa", "uk ", " us ", "india", "indian", "brazil", "brazilian", "philippines",
  "indonesia", "arab", "middle east", "worldwide mix", "mix countries",
];

export function detectIsRegionVariant(name: string, category: string): boolean {
  const haystack = `${name} ${category}`.toLowerCase();
  if (FLAG_EMOJI_RE.test(`${name} ${category}`)) return true;
  return REGION_KEYWORDS.some(k => haystack.includes(k));
}
