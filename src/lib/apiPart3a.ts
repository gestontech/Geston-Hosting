import { API_URL, fetchWithAuth } from "./apiClient";

export async function syncAdminBoostCatalogue() {
  const res = await fetchWithAuth("/admin/boost-catalogue/sync", { method: "POST" });
  return res.json();
}

export async function clearAdminBoostCatalogue() {
  const res = await fetchWithAuth("/admin/boost-catalogue", { method: "DELETE" });
  return res.json();
}

export async function getAdminApiKeys() {
  const res = await fetchWithAuth("/admin/api-keys");
  return res.json();
}

export async function markAdminBoostOrderComplete(id: string) {
  const res = await fetchWithAuth(`/admin/boost-orders/${id}/complete`, { method: "POST" });
  return res.json();
}

export async function getAdminBoostOrders(params?: { page?: number; limit?: number; status?: string; q?: string }) {
  const sp = new URLSearchParams();
  if (params?.page) sp.set("page", String(params.page));
  if (params?.limit) sp.set("limit", String(params.limit));
  if (params?.status) sp.set("status", params.status);
  if (params?.q) sp.set("q", params.q);
  const qs = sp.toString();
  const res = await fetchWithAuth(`/admin/boost-orders${qs ? `?${qs}` : ""}`);
  return res.json();
}

export async function getAdminBroadcastNotifications() {
  const res = await fetchWithAuth("/admin/broadcast-notifications");
  return res.json();
}

export async function createAdminBroadcastNotification(data: { title: string; message: string; type?: string }) {
  const res = await fetchWithAuth("/admin/broadcast-notifications", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteAdminBroadcastNotification(id: string) {
  const res = await fetchWithAuth(`/admin/broadcast-notifications/${id}`, { method: "DELETE" });
  return res.json();
}

export async function initiateCameroonPayment(data: { xafAmount: number; txAmount: number; bonusTx: number }) {
  const res = await fetchWithAuth("/payments/initiate-cameroon", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function checkCameroonPaymentStatus(reference: string) {
  const res = await fetchWithAuth(`/payments/cameroon/status/${reference}`);
  return res.json();
}

export async function promoteToModerator(id: string) {
  const res = await fetchWithAuth(`/admin/users/${id}/moderator`, { method: "POST" });
  return res.json();
}

export async function getMaintenanceMode() {
  const res = await fetchWithAuth("/admin/maintenance");
  return res.json();
}

export async function setMaintenanceModeApi(enabled: boolean) {
  const res = await fetchWithAuth("/admin/maintenance", {
    method: "POST",
    body: JSON.stringify({ enabled }),
  });
  return res.json();
}

export async function getHerokuKeyStatus() {
  const res = await fetchWithAuth("/admin/settings/heroku-key");
  return res.json();
}

export async function setHerokuKeyApi(key: string | null) {
  const res = await fetchWithAuth("/admin/settings/heroku-key", {
    method: "POST",
    body: JSON.stringify({ key }),
  });
  return res.json();
}

export async function getPublicMaintenanceStatus() {
  const res = await fetch(`${API_URL}/settings/maintenance`);
  return res.json();
}

export async function getFeatureFlags() {
  const res = await fetch(`${API_URL}/settings/feature-flags`);
  return res.json();
}

export async function getAdminFeatureFlags() {
  const res = await fetchWithAuth("/admin/feature-flags");
  return res.json();
}

export async function setAdminServiceDisabled(key: string, disabled: boolean) {
  const res = await fetchWithAuth("/admin/feature-flags/services", {
    method: "POST",
    body: JSON.stringify({ key, disabled }),
  });
  return res.json();
}

export async function setAdminPaymentMethodDisabled(key: string, disabled: boolean) {
  const res = await fetchWithAuth("/admin/feature-flags/payment-methods", {
    method: "POST",
    body: JSON.stringify({ key, disabled }),
  });
  return res.json();
}

export async function getCurrencyList() {
  const res = await fetch(`${API_URL}/currency/list`);
  return res.json();
}

export async function setUserCurrency(currency: string) {
  const res = await fetchWithAuth("/currency/set", {
    method: "PATCH",
    body: JSON.stringify({ currency }),
  });
  return res.json();
}

/** Coins Retrieval — preview who gets full paid-bot credits restored */
export async function previewTxRetrieval() {
  const res = await fetchWithAuth("/admin/outage-refund/preview");
  return res.json();
}

/** Coins Retrieval — execute credits + emails (confirm: REFUND) */
export async function executeTxRetrieval() {
  const res = await fetchWithAuth("/admin/outage-refund/execute", {
    method: "POST",
    body: JSON.stringify({ confirm: "REFUND", panels: false }),
  });
  return res.json();
}
