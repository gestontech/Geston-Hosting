import { API_URL, fetchWithAuth } from "./apiClient";

export async function login(usernameOrEmail: string, password: string) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ usernameOrEmail, password }),
  });
  return res.json();
}

export async function signup(
  email: string,
  username: string,
  password: string,
  referralCode?: string,
  fingerprint?: string
) {
  const res = await fetch(`${API_URL}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      username,
      password,
      referralCode,
      fingerprint,
    }),
  });
  return res.json();
}

export async function logout() {
  await fetchWithAuth("/auth/logout", { method: "POST" });
  localStorage.removeItem("token");
}

export async function deleteAccount() {
  const res = await fetchWithAuth("/auth/me", { method: "DELETE" });
  const data = await res.json();
  localStorage.removeItem("token");
  return data;
}

export async function getMe() {
  const res = await fetchWithAuth("/auth/me");
  return res.json();
}

export async function updateUsername(username: string) {
  const res = await fetchWithAuth("/auth/username", {
    method: "PATCH",
    body: JSON.stringify({ username }),
  });
  return res.json();
}

export async function getBots() {
  const res = await fetchWithAuth("/bots");
  return res.json();
}

export async function deployBot(data: {
  phoneNumber?: string;
  botName?: string;
  sessionVar: string;
  isTrial?: boolean;
  device?: string;
  months?: number;
}) {
  const res = await fetchWithAuth("/bots/deploy", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function stopBot(id: string) {
  const res = await fetchWithAuth(`/bots/${id}/stop`, {
    method: "POST",
  });
  return res.json();
}

export async function startBot(id: string) {
  const res = await fetchWithAuth(`/bots/${id}/start`, {
    method: "POST",
  });
  return res.json();
}

export async function restartBot(id: string) {
  const res = await fetchWithAuth(`/bots/${id}/restart`, {
    method: "POST",
  });
  return res.json();
}

export async function renewBot(id: string, months: number) {
  const res = await fetchWithAuth(`/bots/${id}/renew`, {
    method: "POST",
    body: JSON.stringify({ months }),
  });
  return res.json();
}

export async function deleteBot(id: string) {
  const res = await fetchWithAuth(`/bots/${id}/delete`, {
    method: "POST",
  });
  return res.json();
}

export async function getBotLogs(id: string) {
  const res = await fetchWithAuth(`/bots/${id}/logs`);
  return res.json();
}

export async function updateBotVars(
  id: string,
  session: string,
  device?: string,
  extraVars?: Record<string, string>
) {
  const body: Record<string, unknown> = { session };

  if (device) {
    body.device = device;
  }

  if (extraVars && Object.keys(extraVars).length > 0) {
    body.extraVars = extraVars;
  }

  const res = await fetchWithAuth(`/bots/${id}/vars`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });

  return res.json();
}

export async function checkTrial(phone: string) {
  const res = await fetchWithAuth(`/bots/trial-check/${phone}`);
  return res.json();
}

export async function claimCoupon(code: string) {
  const res = await fetchWithAuth("/coupons/claim", {
    method: "POST",
    body: JSON.stringify({ code }),
  });

  return res.json();
}

export async function getAdminStats() {
  const res = await fetchWithAuth("/admin/stats");
  return res.json();
}

export async function getAdminUsers() {
  const res = await fetchWithAuth("/admin/users");
  return res.json();
}

export async function banUser(id: string, reason?: string) {
  const res = await fetchWithAuth(`/admin/users/${id}/ban`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });

  return res.json();
}

export async function unbanUser(id: string) {
  const res = await fetchWithAuth(`/admin/users/${id}/unban`, {
    method: "POST",
  });

  return res.json();
}

export async function grantTx(id: string, amount: number) {
  const res = await fetchWithAuth(`/admin/users/${id}/tx`, {
    method: "POST",
    body: JSON.stringify({ amount }),
  });

  return res.json();
}

export async function subtractTx(id: string, amount: number) {
  const res = await fetchWithAuth(`/admin/users/${id}/subtract-tx`, {
    method: "POST",
    body: JSON.stringify({ amount }),
  });

  return res.json();
}

export async function resetPassword(id: string, password: string) {
  const res = await fetchWithAuth(`/admin/users/${id}/password`, {
    method: "POST",
    body: JSON.stringify({ password }),
  });

  return res.json();
}

export async function deleteUser(id: string) {
  const res = await fetchWithAuth(`/admin/users/${id}`, {
    method: "DELETE",
  });

  return res.json();
}

export async function sendUserNotification(
  id: string,
  title: string,
  message: string
) {
  const res = await fetchWithAuth(`/admin/users/${id}/notify`, {
    method: "POST",
    body: JSON.stringify({ title, message }),
  });

  return res.json();
}

export async function getAdminBots() {
  const res = await fetchWithAuth("/admin/bots");
  return res.json();
}

export async function getAdminTransactions() {
  const res = await fetchWithAuth("/admin/transactions");
  return res.json();
}

export async function getAdminCoupons() {
  const res = await fetchWithAuth("/admin/coupons");
  return res.json();
}

export async function createCoupon(code: string, txAmount: number) {
  const res = await fetchWithAuth("/admin/coupons", {
    method: "POST",
    body: JSON.stringify({ code, txAmount }),
  });

  return res.json();
}

export async function deleteCoupon(id: string) {
  const res = await fetchWithAuth(`/admin/coupons/${id}`, {
    method: "DELETE",
  });

  return res.json();
}

export async function getAdminReferrals() {
  const res = await fetchWithAuth("/admin/referrals");
  return res.json();
}

export async function deleteAllAdminReferrals() {
  const res = await fetchWithAuth("/admin/referrals/all", {
    method: "DELETE",
  });

  return res.json();
}

export async function stopAdminBot(id: string) {
  const res = await fetchWithAuth(`/admin/bots/${id}/stop`, {
    method: "POST",
  });

  return res.json();
}

export async function startAdminBot(id: string) {
  const res = await fetchWithAuth(`/admin/bots/${id}/start`, {
    method: "POST",
  });

  return res.json();
}

export async function restartAdminBot(id: string) {
  const res = await fetchWithAuth(`/admin/bots/${id}/restart`, {
    method: "POST",
  });

  return res.json();
}

export async function deleteAdminBot(id: string) {
  const res = await fetchWithAuth(`/admin/bots/${id}`, {
    method: "DELETE",
  });

  return res.json();
}

export async function deleteAdminTransaction(id: string) {
  const res = await fetchWithAuth(`/admin/transactions/${id}`, {
    method: "DELETE",
  });

  return res.json();
}

export async function getAdminBotLogs(id: string) {
  const res = await fetchWithAuth(`/admin/bots/${id}/logs`);
  return res.json();
}

export async function getAdminTeams() {
  const res = await fetchWithAuth("/admin/teams");
  return res.json();
}
