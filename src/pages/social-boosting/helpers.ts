import { PLATFORMS } from "@/lib/platforms";

export function normalizeDRCPhone(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("243") && digits.length === 12) digits = "0" + digits.slice(3);
  else if (digits.length === 9) digits = "0" + digits;
  return digits;
}
export function isValidDRCPhone(value: string): boolean {
  return /^0\d{9}$/.test(normalizeDRCPhone(value));
}
export function normalizeKenyaPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("254") && digits.length === 12) return digits;
  if (digits.startsWith("0") && digits.length === 10) return "254" + digits.slice(1);
  if (digits.length === 9) return "254" + digits;
  return digits;
}
export function isValidKenyaPhone(value: string): boolean {
  return /^254[17]\d{8}$/.test(normalizeKenyaPhone(value));
}

const HANDLE_TYPES = new Set(["Followers", "Subscribers", "Members"]);
export function linkLabelFor(type: string | undefined): string {
  if (type && HANDLE_TYPES.has(type)) return "Profile handle / URL";
  return "Post / video link";
}
export function exampleLinkFor(platformId: string | undefined, serviceType: string | undefined): string {
  const plat = PLATFORMS.find(p => p.id === platformId);
  const base = plat?.example || "https://example.com/your_profile";
  if (serviceType && HANDLE_TYPES.has(serviceType)) return base;
  const postExamples: Record<string, string> = {
    instagram: "https://instagram.com/p/POST_ID",
    tiktok: "https://tiktok.com/@your_handle/video/1234567890",
    youtube: "https://youtube.com/watch?v=VIDEO_ID",
    facebook: "https://facebook.com/your_page/posts/1234567890",
    x: "https://x.com/your_handle/status/1234567890",
    twitch: "https://twitch.tv/videos/1234567890",
    threads: "https://threads.net/@your_handle/post/POST_ID",
    linkedin: "https://linkedin.com/posts/your_profile_activity-123",
    pinterest: "https://pinterest.com/pin/1234567890",
    soundcloud: "https://soundcloud.com/your_handle/your-track",
    spotify: "https://open.spotify.com/track/TRACK_ID",
  };
  return postExamples[platformId || ""] || base;
}

export function detectQuality(name: string): { label: string; color: string; meaning: string } | null {
  const lower = name.toLowerCase();
  if (/\bblue\b/.test(lower)) return { label: "Blue", color: "#3B82F6", meaning: "Standard quality — good for growth, mixed real & activity accounts" };
  if (/\bgreen\b/.test(lower)) return { label: "Green", color: "#22C55E", meaning: "High quality — mostly real-looking active accounts" };
  if (/\bpurple\b/.test(lower) || /\bvip\b/.test(lower)) return { label: "Purple / VIP", color: "#A855F7", meaning: "Premium quality — higher retention, more organic appearance" };
  if (/\bgold\b/.test(lower) || /\bpremium\b/.test(lower)) return { label: "Gold / Premium", color: "#EAB308", meaning: "Top tier quality — best retention and profile realism" };
  if (/\bhq\b/.test(lower) || /high.?quality/.test(lower)) return { label: "HQ", color: "#14B8A6", meaning: "High quality delivery with better retention" };
  if (/\beq\b/.test(lower) || /economy/.test(lower)) return { label: "Economy", color: "#94A3B8", meaning: "Budget option — faster & cheaper, lower retention" };
  return null;
}
