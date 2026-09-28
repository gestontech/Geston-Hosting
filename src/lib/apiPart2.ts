import { API_URL, fetchWithAuth } from "./apiClient";

export async function createAdminTeam(
  name: string,
  billingLabel: string
) {
  const res = await fetchWithAuth("/admin/teams", {
    method: "POST",
    body: JSON.stringify({ name, billingLabel }),
  });

  return res.json();
}

export async function updateAdminTeam(
  id: string,
  billingLabel: string,
  active?: boolean
) {
  const body: Record<string, unknown> = { billingLabel };

  if (typeof active === "boolean") {
    body.active = active;
  }

  const res = await fetchWithAuth(`/admin/teams/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });

  return res.json();
}

export async function deleteAdminTeam(id: string) {
  const res = await fetchWithAuth(`/admin/teams/${id}`, {
    method: "DELETE",
  });

  return res.json();
}

export async function getAdminDbStats() {
  const res = await fetchWithAuth("/admin/db/stats");
  return res.json();
}

export async function purgeAdminCollection(collection: string) {
  const res = await fetchWithAuth(
    `/admin/db/purge/${collection}`,
    { method: "DELETE" }
  );

  return res.json();
}

export async function getBotTemplates() {
  const res = await fetchWithAuth("/bot-templates");
  return res.json();
}

export async function getBotTemplateBySlug(slug: string) {
  const res = await fetch(
    `${API_URL}/bot-templates/slug/${slug}`
  );

  return res.json();
}

export async function addBotTemplate(data: {
  name: string;
  githubRepo: string;
  sessionIdUrl: string;
  costTx: number;
}) {
  const res = await fetchWithAuth("/bot-templates", {
    method: "POST",
    body: JSON.stringify(data),
  });

  return res.json();
}

export async function updateBotTemplate(
  id: string,
  data: {
    name?: string;
    githubRepo?: string;
    sessionIdUrl?: string;
    costTx?: number;
  }
) {
  const res = await fetchWithAuth(`/bot-templates/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });

  return res.json();
}

export async function deleteBotTemplate(id: string) {
  const res = await fetchWithAuth(
    `/bot-templates/${id}`,
    { method: "DELETE" }
  );

  return res.json();
}

export async function refreshBotTemplateImage(id: string) {
  const res = await fetchWithAuth(
    `/bot-templates/${id}/refresh-image`,
    { method: "POST" }
  );

  return res.json();
}

/**
 * Public — loads required + optional env vars
 * from template app.json.
 */
export async function getTemplateAppVars(
  templateId: string
): Promise<{
  vars: {
    key: string;
    description: string;
    required: boolean;
    value: string;
  }[];
  sessionIdUrl: string;
  branch?: string;
  error?: string;
}> {
  const res = await fetch(
    `${API_URL}/bots/template-appvars/${templateId}`
  );

  return res.json();
}

export async function getPanelPlans() {
  const res = await fetch(`${API_URL}/panels/plans`);
  return res.json();
}

export async function getMyPanels() {
  const res = await fetchWithAuth("/panels/my");
  return res.json();
}

export async function purchasePanel(
  planId: string,
  opts?: {
    panelEmail?: string;
    panelUsername?: string;
    panelPassword?: string;
  }
) {
  const res = await fetchWithAuth("/panels/purchase", {
    method: "POST",
    body: JSON.stringify({
      planId,
      ...opts,
    }),
  });

  return res.json();
}

export async function renewPanel(panelId: string) {
  const res = await fetchWithAuth(
    `/panels/${panelId}/renew`,
    { method: "POST" }
  );

  return res.json();
}

export async function purchaseAdminPanel(
  opts?: {
    panelEmail?: string;
    panelUsername?: string;
    panelPassword?: string;
  }
) {
  const res = await fetchWithAuth(
    "/panels/purchase-admin",
    {
      method: "POST",
      body: JSON.stringify({ ...opts }),
    }
  );

  return res.json();
}

export async function getAdminPanels() {
  const res = await fetchWithAuth("/panels/admin/all");
  return res.json();
}

export async function deleteAdminPanel(id: string) {
  const res = await fetchWithAuth(
    `/panels/admin/panel/${id}`,
    { method: "DELETE" }
  );

  return res.json();
}

export async function deletePanel(id: string) {
  const res = await fetchWithAuth(
    `/panels/my/${id}`,
    { method: "DELETE" }
  );

  return res.json();
}

export async function deployBotWithTemplate(data: {
  botTemplateId: string;
  botName: string;
  sessionVar: string;
  device?: string;
  months?: number;
  extraVars?: Record<string, string>;
}) {
  const res = await fetchWithAuth(
    "/bots/deploy-template",
    {
      method: "POST",
      body: JSON.stringify(data),
    }
  );

  return res.json();
}

export async function getAdminPanelPlans() {
  const res = await fetchWithAuth("/panels/plans");
  return res.json();
}

export async function createAdminPanelPlan(data: {
  name: string;
  description: string;
  txCost: number;
  ram: string;
  disk: string;
  cpu: string;
  isBestDeal: boolean;
}) {
  const res = await fetchWithAuth(
    "/panels/admin/plans",
    {
      method: "POST",
      body: JSON.stringify(data),
    }
  );

  return res.json();
}

export async function deleteAdminPanelPlan(id: string) {
  const res = await fetchWithAuth(
    `/panels/admin/plans/${id}`,
    { method: "DELETE" }
  );

  return res.json();
}

export async function getAdminAllPanels() {
  const res = await fetchWithAuth("/panels/admin/all");
  return res.json();
}

export async function getOrphanHerokuApps() {
  const res = await fetchWithAuth("/admin/orphan-apps");
  return res.json();
}

export async function deleteOrphanApp(appName: string) {
  const res = await fetchWithAuth(
    `/admin/orphan-apps/${encodeURIComponent(appName)}`,
    { method: "DELETE" }
  );

  return res.json();
}

export async function getTutorials() {
  const res = await fetch(`${API_URL}/tutorials`);
  return res.json();
}

export async function getAdminTutorials() {
  const res = await fetchWithAuth("/admin/tutorials");
  return res.json();
}

export async function createAdminTutorial(data: {
  title: string;
  youtubeUrl: string;
  order?: number;
}) {
  const res = await fetchWithAuth(
    "/admin/tutorials",
    {
      method: "POST",
      body: JSON.stringify(data),
    }
  );

  return res.json();
}

export async function deleteAdminTutorial(id: string) {
  const res = await fetchWithAuth(
    `/admin/tutorials/${id}`,
    { method: "DELETE" }
  );

  return res.json();
}

export async function deleteAdminTransactionsBulk(
  ids: string[]
) {
  const res = await fetchWithAuth(
    "/admin/transactions/bulk",
    {
      method: "DELETE",
      body: JSON.stringify({ ids }),
    }
  );

  return res.json();
}

export async function resolveStaleTransactions() {
  const res = await fetchWithAuth(
    "/admin/transactions/resolve-stale",
    { method: "POST" }
  );

  return res.json();
}

export async function getBotVars(id: string) {
  const res = await fetchWithAuth(`/bots/${id}/vars`);
  return res.json();
}

export async function getNotifications() {
  const res = await fetchWithAuth("/notifications");
  return res.json();
}

export async function getUnreadNotificationCount() {
  const res = await fetchWithAuth(
    "/notifications/unread-count"
  );

  return res.json();
}

export async function markNotificationsRead() {
  const res = await fetchWithAuth(
    "/notifications/mark-read",
    { method: "POST" }
  );

  return res.json();
}

export async function deleteNotification(id: string) {
  const res = await fetchWithAuth(
    `/notifications/${id}`,
    { method: "DELETE" }
  );

  return res.json();
}

export async function deleteAllNotifications() {
  const res = await fetchWithAuth(
    "/notifications/all",
    { method: "DELETE" }
  );

  return res.json();
}

export async function getAdminRevenue() {
  const res = await fetchWithAuth("/admin/revenue");
  return res.json();
}

export async function getAdminBoostCatalogueMeta() {
  const res = await fetchWithAuth(
    "/admin/boost-catalogue/meta"
  );

  return res.json();
}
