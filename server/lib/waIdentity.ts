const lidToPhone = new Map<string, string>();
const phoneToLid = new Map<string, string>();
const usernameByKey = new Map<string, { value: string; time: number }>();
const USERNAME_TTL_MS = 6 * 60 * 60 * 1000;
const MAX_CACHE = 5000;

function digits(value: string): string {
  return String(value || "").replace(/\D/g, "");
}

export function isLidUser(jid: string | null | undefined): boolean {
  return typeof jid === "string" && jid.endsWith("@lid");
}

export function isPnUser(jid: string | null | undefined): boolean {
  if (typeof jid !== "string") return false;
  return jid.endsWith("@s.whatsapp.net") || jid.endsWith("@c.us");
}

function lidNum(jid: string): string {
  return digits((jid || "").split("@")[0].split(":")[0]);
}

function phoneJidFromNum(num: string): string {
  const n = digits(num);
  return n ? n + "@s.whatsapp.net" : "";
}

function capMaps() {
  if (lidToPhone.size > MAX_CACHE) {
    const first = lidToPhone.keys().next().value;
    if (first !== undefined) {
      const phone = lidToPhone.get(first);
      lidToPhone.delete(first);
      if (phone) phoneToLid.delete(phone);
    }
  }
}

export function rememberLidPhone(lidJid: string, phoneJidOrNum: string): void {
  const l = lidNum(lidJid);
  const p = digits(phoneJidOrNum);
  if (!l || !p) return;
  lidToPhone.set(l, p);
  phoneToLid.set(p, l);
  capMaps();
}

export function resolvePhoneNumber(jidOrLid: string | null | undefined): string {
  if (!jidOrLid) return "";
  if (isPnUser(jidOrLid)) return digits(jidOrLid.split("@")[0].split(":")[0]);
  if (isLidUser(jidOrLid)) {
    const cached = lidToPhone.get(lidNum(jidOrLid));
    if (cached) return cached;
  }
  const n = digits(String(jidOrLid).split("@")[0].split(":")[0]);
  return n;
}

export function resolveSenderIdentifiers(key: {
  participant?: string | null;
  remoteJid?: string | null;
  participantAlt?: string | null;
  remoteJidAlt?: string | null;
} | null | undefined): { jid: string | null; lid: string | null } {
  if (!key) return { jid: null, lid: null };
  const primary = key.participant || key.remoteJid || null;
  const alternate = key.participantAlt || key.remoteJidAlt || null;
  let jid: string | null = null;
  let lid: string | null = null;
  if (isPnUser(primary)) jid = primary;
  else if (isPnUser(alternate)) jid = alternate;
  if (isLidUser(primary)) lid = primary;
  else if (isLidUser(alternate)) lid = alternate;
  if (jid && lid) rememberLidPhone(lid, jid);
  return { jid, lid };
}

type Participant = {
  id?: string;
  jid?: string;
  lid?: string;
  phoneNumber?: string;
  phone_number?: string;
  pn?: string;
};

function participantPhone(p: Participant): string | null {
  const phoneNumber = p.phoneNumber || p.phone_number || p.pn || "";
  if (phoneNumber) {
    const num = digits(String(phoneNumber).split("@")[0].split(":")[0]);
    if (num) return num;
  }
  const base = p.id || p.jid || "";
  if (base && !base.endsWith("@lid") && base.includes("@")) {
    const num = digits(base.split("@")[0].split(":")[0]);
    if (num) return num;
  }
  return null;
}

function participantLidNum(p: Participant): string | null {
  const base = p.id || p.jid || "";
  if (base && base.endsWith("@lid")) {
    return digits(base.split("@")[0].split(":")[0]) || null;
  }
  const lid = p.lid || "";
  if (lid && lid.endsWith("@lid")) {
    return digits(lid.split("@")[0].split(":")[0]) || null;
  }
  return null;
}

export function resolveJidFromLid(
  lidJid: string,
  participants?: Participant[] | null
): string | null {
  if (!lidJid) return null;
  const num = lidNum(lidJid);
  if (!num) return null;

  const cached = lidToPhone.get(num);
  if (cached) return phoneJidFromNum(cached);

  if (participants && participants.length > 0) {
    for (const p of participants) {
      const pLid = participantLidNum(p);
      if (pLid && pLid === num) {
        const phone = participantPhone(p);
        if (phone) {
          rememberLidPhone(lidJid, phone);
          return phoneJidFromNum(phone);
        }
      }
    }
  }
  return null;
}

export function resolveSenderJid(
  key: {
    participant?: string | null;
    remoteJid?: string | null;
    participantAlt?: string | null;
    remoteJidAlt?: string | null;
  } | null | undefined,
  participants?: Participant[] | null
): string {
  const { jid, lid } = resolveSenderIdentifiers(key);
  if (jid) return jid;
  if (lid) {
    const resolved = resolveJidFromLid(lid, participants);
    if (resolved) return resolved;
    return lid;
  }
  const fallback = key?.participant || key?.remoteJid || "";
  return fallback || "";
}

export function resolveTargetJid(
  target: string,
  participants?: Participant[] | null
): string {
  if (!target) return "";
  if (isPnUser(target)) return target;
  if (isLidUser(target)) {
    return resolveJidFromLid(target, participants) || target;
  }
  const n = digits(target);
  if (n.length >= 8) return phoneJidFromNum(n);
  return target;
}

export function cacheUsername(id: string, username: string): void {
  const key = digits(id.split("@")[0]) || id;
  if (!key) return;
  const clean = String(username || "")
    .trim()
    .replace(/^@+/, "")
    .toLowerCase();
  if (!clean || clean.length < 2) return;
  usernameByKey.set(key, { value: clean, time: Date.now() });
  if (usernameByKey.size > MAX_CACHE) {
    const first = usernameByKey.keys().next().value;
    if (first !== undefined) usernameByKey.delete(first);
  }
}

export function getCachedUsername(id: string): string {
  const key = digits(id.split("@")[0]) || id;
  const entry = usernameByKey.get(key);
  if (!entry) return "";
  if (Date.now() - entry.time > USERNAME_TTL_MS) {
    usernameByKey.delete(key);
    return "";
  }
  return entry.value;
}

export function displayNameForJid(jid: string): string {
  if (!jid) return "";
  const uname = getCachedUsername(jid);
  if (uname) return uname;
  const phone = resolvePhoneNumber(jid);
  if (phone) return phone;
  if (isLidUser(jid)) return "lid:" + lidNum(jid);
  return jid.split("@")[0] || jid;
}
