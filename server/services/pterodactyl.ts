const PANEL_API_KEY = process.env.PANEL_API_KEY || "";
const PANEL_DOMAIN = process.env.PANEL_DOMAIN || "";

async function panelFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (!PANEL_API_KEY || !PANEL_DOMAIN) throw new Error("PANEL_API_KEY and PANEL_DOMAIN must be configured");
  const res = await fetch(`${PANEL_DOMAIN}/api/application${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${PANEL_API_KEY}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(options.headers ?? {}),
    },
  });
  if (res.status === 401) throw new Error("Panel authentication failed — verify PANEL_API_KEY is correct");
  if (res.status === 403) {
    const body = await res.json().catch(() => ({})) as { errors?: Array<{ detail?: string }> };
    const detail = body.errors?.[0]?.detail ?? "This action is unauthorized";
    throw new Error(`Panel API key missing write permissions: ${detail}. Go to ${PANEL_DOMAIN}/admin/api → edit your key → enable Write permissions for Users and Servers.`);
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { errors?: Array<{ detail?: string }> };
    throw new Error(body.errors?.[0]?.detail ?? `Panel API error ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

interface PterodactylUser { id: number; username: string; email: string; }
type UserRes = { attributes: PterodactylUser };
type ListRes<T> = { data: Array<{ attributes: T }>; meta?: { pagination?: { total_pages?: number } } };
interface Alloc { id: number; assigned: boolean; }
interface NodeAttrs { id: number; relationships?: { allocations?: { data: Array<{ attributes: Alloc }> } }; }
interface EggAttrs { id: number; name: string; docker_image: string; }

export async function findPanelUser(username: string): Promise<PterodactylUser | null> {
  const res = await panelFetch<ListRes<PterodactylUser>>(`/users?filter[username]=${encodeURIComponent(username)}`);
  const found = res.data.find(u => u.attributes.username === username);
  return found ? found.attributes : null;
}

export async function createPanelUser(username: string, email: string, password: string): Promise<PterodactylUser> {
  const res = await panelFetch<UserRes>("/users", {
    method: "POST",
    body: JSON.stringify({ email, username, first_name: username, last_name: "User", language: "en", password, root_admin: false }),
  });
  return res.attributes;
}

export async function updatePanelUserPassword(userId: number, username: string, email: string, password: string): Promise<void> {
  await panelFetch<UserRes>(`/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify({ email, username, first_name: username, last_name: "User", language: "en", password }),
  });
}

export async function promoteToAdmin(userId: number, username: string, email: string): Promise<void> {
  await panelFetch<UserRes>(`/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify({ email, username, first_name: username, last_name: "User", language: "en", root_admin: true }),
  });
}

export async function getFreeAllocation(): Promise<number> {
  let page = 1;
  while (true) {
    const res = await panelFetch<ListRes<NodeAttrs>>(`/nodes?include=allocations&page=${page}`);
    for (const nodeData of res.data) {
      const allocs = nodeData.attributes.relationships?.allocations?.data ?? [];
      const free = allocs.find(a => !a.attributes.assigned);
      if (free) return free.attributes.id;
    }
    const totalPages = res.meta?.pagination?.total_pages ?? 1;
    if (page >= totalPages || res.data.length === 0) break;
    page++;
  }
  throw new Error("No free allocations available — add port allocations to a node in the Pterodactyl admin panel");
}

async function discoverEgg(nestId: number): Promise<{ id: number; dockerImage: string }> {
  const envEggId = parseInt(process.env.PANEL_EGG_ID || "0");
  const res = await panelFetch<ListRes<EggAttrs>>(`/nests/${nestId}/eggs`);
  if (res.data.length === 0) throw new Error(`No eggs found in nest ${nestId}`);
  if (envEggId > 0) {
    const matched = res.data.find(e => e.attributes.id === envEggId);
    if (matched) return { id: matched.attributes.id, dockerImage: matched.attributes.docker_image };
  }
  const first = res.data[0].attributes;
  return { id: first.id, dockerImage: first.docker_image };
}

export interface ServerInfo { id: number; uuid: string; name: string; }

export async function createPanelServer(params: {
  name: string; panelUserId: number; memoryMb: number; diskMb: number; cpu: number; allocationId: number;
}): Promise<ServerInfo> {
  const nestId = parseInt(process.env.PANEL_NEST_ID || "5");
  const { id: eggId, dockerImage } = await discoverEgg(nestId);
  const res = await panelFetch<{ attributes: ServerInfo }>("/servers", {
    method: "POST",
    body: JSON.stringify({
      name: params.name,
      user: params.panelUserId,
      egg: eggId,
      docker_image: dockerImage,
      startup: "if [ -f /home/container/package.json ]; then /usr/local/bin/npm install; fi; /usr/local/bin/node /home/container/${MAIN_FILE} ${NODE_ARGS}",
      environment: {
        USER_UPLOAD: "1",
        AUTO_UPDATE: "0",
        MAIN_FILE: "index.js",
        NODE_PACKAGES: "",
        NODE_ARGS: "",
        GIT_ADDRESS: "",
        BRANCH: "",
        USERNAME: "",
        ACCESS_TOKEN: "",
      },
      limits: { memory: params.memoryMb, swap: 0, disk: params.diskMb, io: 500, cpu: params.cpu },
      feature_limits: { databases: 1, backups: 1, allocations: 5 },
      allocation: { default: params.allocationId },
    }),
  });
  return res.attributes;
}
