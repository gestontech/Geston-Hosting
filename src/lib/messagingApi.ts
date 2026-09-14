const API_URL = "/api";

function getToken(): string | null {
  return localStorage.getItem("token");
}

async function fetchWithAuth(path: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return fetch(`${API_URL}${path}`, { ...options, headers });
}

export async function getAdminMessagingStatus() {
  const res = await fetchWithAuth("/admin/messaging/status");
  return res.json();
}

export async function adminWaConnect(phone: string) {
  const res = await fetchWithAuth("/admin/messaging/wa/connect", {
    method: "POST",
    body: JSON.stringify({ phone }),
  });
  return res.json();
}

export async function adminWaRestart() {
  const res = await fetchWithAuth("/admin/messaging/wa/restart", { method: "POST" });
  return res.json();
}

export async function adminWaDisconnect() {
  const res = await fetchWithAuth("/admin/messaging/wa/disconnect", { method: "POST" });
  return res.json();
}

export async function adminWaLogout() {
  const res = await fetchWithAuth("/admin/messaging/wa/logout", { method: "POST" });
  return res.json();
}
