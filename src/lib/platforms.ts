export interface PlatformDef {
  id: string;
  label: string;
  slug: string;
  color: string;
  match: string[];
  example: string;
}

export const PLATFORMS: PlatformDef[] = [
  { id: "instagram", label: "Instagram", slug: "instagram", color: "#E4405F", match: ["instagram"], example: "https://instagram.com/your_handle" },
  { id: "tiktok", label: "TikTok", slug: "tiktok", color: "#000000", match: ["tiktok", "tik tok"], example: "https://tiktok.com/@your_handle" },
  { id: "youtube", label: "YouTube", slug: "youtube", color: "#FF0000", match: ["youtube"], example: "https://youtube.com/@your_channel" },
  { id: "facebook", label: "Facebook", slug: "facebook", color: "#0866FF", match: ["facebook"], example: "https://facebook.com/your_page" },
  { id: "x", label: "X (Twitter)", slug: "x", color: "#000000", match: ["twitter", "x.com", " x ", "x/twitter", "(x)"], example: "https://x.com/your_handle" },
  { id: "telegram", label: "Telegram", slug: "telegram", color: "#26A5E4", match: ["telegram"], example: "https://t.me/your_channel" },
  { id: "whatsapp", label: "WhatsApp", slug: "whatsapp", color: "#25D366", match: ["whatsapp"], example: "https://chat.whatsapp.com/your_invite_code" },
  { id: "spotify", label: "Spotify", slug: "spotify", color: "#1ED760", match: ["spotify"], example: "https://open.spotify.com/artist/your_artist_id" },
  { id: "soundcloud", label: "SoundCloud", slug: "soundcloud", color: "#FF5500", match: ["soundcloud"], example: "https://soundcloud.com/your_handle" },
  { id: "linkedin", label: "LinkedIn", slug: "linkedin", color: "#0A66C2", match: ["linkedin"], example: "https://linkedin.com/in/your_profile" },
  { id: "snapchat", label: "Snapchat", slug: "snapchat", color: "#FFFC00", match: ["snapchat"], example: "https://snapchat.com/add/your_handle" },
  { id: "twitch", label: "Twitch", slug: "twitch", color: "#9146FF", match: ["twitch"], example: "https://twitch.tv/your_channel" },
  { id: "pinterest", label: "Pinterest", slug: "pinterest", color: "#E60023", match: ["pinterest"], example: "https://pinterest.com/your_handle" },
  { id: "discord", label: "Discord", slug: "discord", color: "#5865F2", match: ["discord"], example: "https://discord.gg/your_invite_code" },
  { id: "threads", label: "Threads", slug: "threads", color: "#000000", match: ["threads"], example: "https://threads.net/@your_handle" },
];

export function platformForCategory(category: string): PlatformDef | undefined {
  const lower = category.toLowerCase();
  return PLATFORMS.find(p => p.match.some(m => lower.includes(m)));
}

export function iconUrl(slug: string): string {
  return `https://cdn.simpleicons.org/${slug}/white`;
}

const TYPE_KEYWORDS = ["Followers", "Likes", "Views", "Subscribers", "Comments", "Shares", "Members", "Plays", "Reactions", "Reviews"];

export function serviceTypeForName(name: string, category: string): string {
  const haystack = `${name} ${category}`.toLowerCase();
  const found = TYPE_KEYWORDS.find(t => haystack.includes(t.toLowerCase()));
  return found || "Other";
}
