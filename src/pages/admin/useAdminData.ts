import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { lockScroll, unlockScroll } from "@/lib/scrollLock";
import {
  getAdminStats, getAdminUsers, getAdminBots,
  getAdminTransactions, getAdminCoupons, getAdminReferrals,
  createCoupon, getAdminTeams, createAdminTeam,
  updateAdminTeam, getAdminDbStats, getBotTemplates,
  getAdminBoostOrders, getAdminApiKeys, getAdminBoostCatalogueMeta,
  getAdminPanelPlans, getAdminPanels,
  getAdminTutorials, getOrphanHerokuApps, deleteOrphanApp,
  getAdminRevenue, getAdminBroadcastNotifications, getMaintenanceMode,
  deleteAdminTransaction,
} from "@/lib/api";
import type { AdminStats, AdminUser, AdminBot, Transaction, Coupon, Referral, HerokuTeam, DbStats, BotTemplate, PanelPlan } from "@/types";
import type { TabKey } from "./shared";
import type { AdminPanel } from "./PanelsTab";
type AdminPanelRow = AdminPanel;


export function useAdminData() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [bots, setBots] = useState<AdminBot[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedTxIds, setSelectedTxIds] = useState<string[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [teams, setTeams] = useState<HerokuTeam[]>([]);
  const [dbStats, setDbStats] = useState<DbStats | null>(null);
  const [botTemplates, setBotTemplates] = useState<BotTemplate[]>([]);
  const [boostOrders, setBoostOrders] = useState<Array<Record<string, unknown>>>([]);
  const [boostOrderStats, setBoostOrderStats] = useState({ total: 0, completed: 0, pending: 0, failed: 0, processing: 0, globalCompleted: 3 });
  const [smpFilter, setSmpFilter] = useState("");
  const [smpStatus, setSmpStatus] = useState("");
  const [smpPage, setSmpPage] = useState(1);
  const [apiKeys, setApiKeys] = useState<Array<Record<string, unknown>>>([]);
  const [apiKeyStats, setApiKeyStats] = useState({ totalKeys: 0, activeKeys: 0, totalCalls: 0, totalBoostOrders: 0 });
  const [catalogueMeta, setCatalogueMeta] = useState<{ count: number; updatedAt: string | null; source?: string; mongoCount?: number }>({ count: 0, updatedAt: null });
  const [syncingCatalogue, setSyncingCatalogue] = useState(false);
  const [panelPlans, setPanelPlans] = useState<PanelPlan[]>([]);
  const [adminPanels, setAdminPanels] = useState<AdminPanelRow[]>([]);
  const [tutorials, setTutorials] = useState<{ _id: string; title: string; youtubeUrl: string; order: number }[]>([]);
  const [newTutorialTitle, setNewTutorialTitle] = useState("");
  const [newTutorialUrl, setNewTutorialUrl] = useState("");
  const [newTutorialOrder, setNewTutorialOrder] = useState(0);
  const [tutorialLoading, setTutorialLoading] = useState(false);
  const [deletePanelModal, setDeletePanelModal] = useState<{ open: boolean; id: string; name: string }>({ open: false, id: "", name: "" });
  const [newTemplate, setNewTemplate] = useState({ name: "", githubRepo: "", sessionIdUrl: "", costTx: "10" });
  const [addingTemplate, setAddingTemplate] = useState(false);
  const [deleteTemplateModal, setDeleteTemplateModal] = useState<{ open: boolean; id: string; name: string }>({ open: false, id: "", name: "" });
  const [newPlan, setNewPlan] = useState({ name: "", description: "", txCost: "20", ram: "512MB", disk: "2GB", cpu: "1", isBestDeal: false });
  const [addingPlan, setAddingPlan] = useState(false);
  const [deletePlanModal, setDeletePlanModal] = useState<{ open: boolean; id: string; name: string }>({ open: false, id: "", name: "" });
  const [purgeModal, setPurgeModal] = useState<{ open: boolean; collection: string; label: string }>({ open: false, collection: "", label: "" });
  const [purging, setPurging] = useState(false);
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [userSearch, setUserSearch] = useState("");
  const [botSearch, setBotSearch] = useState("");
  const [adminLogsOpen, setAdminLogsOpen] = useState(false);
  const [adminLogs, setAdminLogs] = useState<string[]>([]);
  const [adminLogsBot, setAdminLogsBot] = useState<string>("");
  const [adminLogsRefreshing, setAdminLogsRefreshing] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [userPanelOpen, setUserPanelOpen] = useState(false);

  const [banReason, setBanReason] = useState("");
  const [banModalOpen, setBanModalOpen] = useState(false);

  const [txAmount, setTxAmount] = useState("");
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [subtractTxModalOpen, setSubtractTxModalOpen] = useState(false);
  const [subtractAmount, setSubtractAmount] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [pwModalOpen, setPwModalOpen] = useState(false);

  const [deleteUserModalOpen, setDeleteUserModalOpen] = useState(false);

  const [notifyTitle, setNotifyTitle] = useState("");
  const [notifyMessage, setNotifyMessage] = useState("");
  const [notifyModalOpen, setNotifyModalOpen] = useState(false);

  const [couponCode, setCouponCode] = useState("");
  const [couponTx, setCouponTx] = useState("");
  const [deleteCouponModal, setDeleteCouponModal] = useState<{ open: boolean; id: string; code: string }>({ open: false, id: "", code: "" });
  const [deleteBotModal, setDeleteBotModal] = useState<{ open: boolean; id: string; name: string }>({ open: false, id: "", name: "" });
  const [confirmDeleteTx, setConfirmDeleteTx] = useState<{ open: boolean; id: string } | null>(null);
  const [confirmBulkDeleteTx, setConfirmBulkDeleteTx] = useState(false);
  const [confirmDeleteAllReferrals, setConfirmDeleteAllReferrals] = useState(false);
  const [confirmDeleteTutorial, setConfirmDeleteTutorial] = useState<{ open: boolean; id: string } | null>(null);

  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamLabel, setNewTeamLabel] = useState("");
  const [orphanApps, setOrphanApps] = useState<string[]>([]);
  const [orphanLoading, setOrphanLoading] = useState(false);
  const [orphanFetched, setOrphanFetched] = useState(false);
  const [deleteTeamModal, setDeleteTeamModal] = useState<{ open: boolean; id: string; name: string }>({ open: false, id: "", name: "" });
  const [editTeamId, setEditTeamId] = useState<string | null>(null);
  const [editTeamLabel, setEditTeamLabel] = useState("");

  const [revenueData, setRevenueData] = useState<null | {
  countries: Array<{ name: string; flag: string; currency: string; amount: number; amountKes: number; amountUsd: number; count: number }>;
  totalKes: number; totalUsd: number;
  }>(null);

  const [broadcastNotifications, setBroadcastNotifications] = useState<Array<{ _id: string; title: string; message: string; type: string; createdAt: string }>>([]);
  const [newBroadcastTitle, setNewBroadcastTitle] = useState("");
  const [newBroadcastMessage, setNewBroadcastMessage] = useState("");
  const [broadcastLoading, setBroadcastLoading] = useState(false);

  const [maintenanceMode, setMaintenanceMode] = useState<boolean | null>(null);
  const [maintenanceLoading, setMaintenanceLoading] = useState(false);

  async function handleDeleteTransaction(id: string) {
    setLoading(l => ({ ...l, ["deleteTx_" + id]: true }));
    try {
      const res = await deleteAdminTransaction(id);
      if (res.ok) {
        setTransactions((prev: Transaction[]) => prev.filter((t: Transaction) => t._id !== id));
        setConfirmDeleteTx(null);
      }
    } finally {
      setLoading(l => ({ ...l, ["deleteTx_" + id]: false }));
    }
  }

    const fetchData = useCallback(async (section: string) => {
  setLoading(prev => ({ ...prev, [section]: true }));
  try {
    switch (section) {
      case "stats": { const s = await getAdminStats(); if (!s.error) setStats(s); break; }
      case "users": { const u = await getAdminUsers(); if (Array.isArray(u)) setUsers(u); break; }
      case "bots": { const b = await getAdminBots(); if (Array.isArray(b)) setBots(b); break; }
      case "transactions": { const t = await getAdminTransactions(); if (Array.isArray(t)) setTransactions(t); break; }
      case "coupons": { const c = await getAdminCoupons(); if (Array.isArray(c)) setCoupons(c); break; }
      case "referrals": { const r = await getAdminReferrals(); if (Array.isArray(r)) setReferrals(r); break; }
      case "config": { const tm = await getAdminTeams(); if (Array.isArray(tm)) setTeams(tm); break; }
        case "database": { const d = await getAdminDbStats(); if (d && !d.error) setDbStats(d); break; }
        case "bot-templates": { const bt = await getBotTemplates(); if (Array.isArray(bt)) setBotTemplates(bt); break; }
        case "api": {
          const ak = await getAdminApiKeys();
          if (ak && Array.isArray(ak.keys)) setApiKeys(ak.keys);
          if (ak?.stats) setApiKeyStats(ak.stats);
          break;
        }
        case "smp": {
          const [bo, meta] = await Promise.all([
            getAdminBoostOrders({ page: smpPage, limit: 50, status: smpStatus || undefined, q: smpFilter || undefined }),
            getAdminBoostCatalogueMeta().catch(() => null),
          ]);
          if (bo && Array.isArray(bo.orders)) setBoostOrders(bo.orders);
          if (bo?.stats) setBoostOrderStats(bo.stats);
          if (meta && typeof meta.count === "number") setCatalogueMeta(meta);
          break;
        }
        case "panel-plans": { const pp = await getAdminPanelPlans(); if (Array.isArray(pp)) setPanelPlans(pp); break; }
          case "panels": { const ap = await getAdminPanels(); if (Array.isArray(ap)) setAdminPanels(ap); break; }
          case "tutorials": { const tuts = await getAdminTutorials(); if (Array.isArray(tuts)) setTutorials(tuts); break; }
        case "revenue": { const rv = await getAdminRevenue(); if (!rv.error) setRevenueData(rv); break; }
        case "notifications": { const bn = await getAdminBroadcastNotifications(); if (Array.isArray(bn)) setBroadcastNotifications(bn); break; }
        case "moderators": { const u = await getAdminUsers(); if (Array.isArray(u)) setUsers(u); break; }
    }
  } catch {
    showToast(`Failed to load ${section}`, "error");
  } finally {
    setLoading(prev => ({ ...prev, [section]: false }));
  }
  }, [showToast, smpPage, smpStatus, smpFilter]);

  useEffect(() => {
  getMaintenanceMode().then(d => { if (typeof d?.maintenanceMode === "boolean") setMaintenanceMode(d.maintenanceMode); }).catch(() => {});
  }, []);

  useEffect(() => {
  if (!user) { navigate("/login"); return; }
  if (!isAdmin) { navigate("/"); return; }
  fetchData("stats");
  fetchData("users");
  fetchData("bots");
  fetchData("transactions");
  fetchData("coupons");
  fetchData("referrals");
  fetchData("config");
    fetchData("database");
    fetchData("revenue");
    fetchData("notifications");
  }, [user, isAdmin, navigate, fetchData]);

  useEffect(() => {
  if (drawerOpen) {
    lockScroll();
    return () => unlockScroll();
  }
  }, [drawerOpen]);

  useEffect(() => {
  if (purgeModal.open) {
    lockScroll();
    return () => unlockScroll();
  }
  }, [purgeModal.open]);

  const handleAction = async (action: string, fn: () => Promise<unknown>, onSuccess?: () => void) => {
  setLoading(prev => ({ ...prev, [action]: true }));
  try {
    const res = await fn() as { error?: string; ok?: boolean };
    if (res.error) {
      showToast(res.error, "error");
    } else {
      showToast(`${action} successful`, "success");
      onSuccess?.();
    }
  } catch {
    showToast(`Failed to ${action}`, "error");
  } finally {
    setLoading(prev => ({ ...prev, [action]: false }));
  }
  };

  const handleCreateCoupon = async () => {
  const code = couponCode.trim().toUpperCase();
  const amount = parseInt(couponTx);
  if (!code || code.length < 3) { showToast("Code must be at least 3 characters", "error"); return; }
  if (!amount || amount < 1) { showToast("Coins amount must be at least 1", "error"); return; }
  await handleAction("createCoupon", () => createCoupon(code, amount), () => {
    setCouponCode(""); setCouponTx(""); fetchData("coupons");
  });
  };

  const handleCreateTeam = async () => {
  const name = newTeamName.trim();
  if (!name || name.length < 2) { showToast("Team name must be at least 2 characters", "error"); return; }
  await handleAction("createTeam", () => createAdminTeam(name, newTeamLabel.trim()), () => {
    setNewTeamName(""); setNewTeamLabel(""); fetchData("config");
  });
  };

  const fetchOrphanApps = async () => {
    setOrphanLoading(true);
    try {
      const data = await getOrphanHerokuApps() as { orphans?: string[] };
      setOrphanApps(data.orphans || []);
      setOrphanFetched(true);
    } catch { showToast("Failed to fetch orphan apps", "error"); }
    finally { setOrphanLoading(false); }
  };

  const handleDeleteOrphan = async (appName: string) => {
    try {
      await deleteOrphanApp(appName);
      setOrphanApps(prev => prev.filter(a => a !== appName));
      showToast(`Deleted ${appName}`, "success");
    } catch { showToast("Failed to delete app", "error"); }
  };

  const handleUpdateTeamLabel = async (id: string) => {
  await handleAction("updateTeam", () => updateAdminTeam(id, editTeamLabel), () => {
    setEditTeamId(null); setEditTeamLabel(""); fetchData("config");
  });
  };

  const handleToggleTeamActive = async (team: HerokuTeam) => {
  await handleAction(`toggleTeam-${team._id}`, () => updateAdminTeam(team._id, team.billingLabel, !team.active), () => {
    fetchData("config");
  });
  };

  const openUserPanel = (u: AdminUser) => {
  setSelectedUser(u);
  setUserPanelOpen(true);
  setBanReason("");
  setTxAmount("");
  setSubtractAmount("");
  setNewPassword("");
  setNotifyTitle("");
  setNotifyMessage("");
  };

  const closeUserPanel = () => {
  setUserPanelOpen(false);
  setSelectedUser(null);
  setBanModalOpen(false);
  setTxModalOpen(false);
  setSubtractTxModalOpen(false);
  setPwModalOpen(false);
  setDeleteUserModalOpen(false);
  setNotifyModalOpen(false);
  };

  const LAZY_TABS: TabKey[] = ["bot-templates", "panel-plans", "panels", "tutorials", "moderators", "smp", "api"];
  const loadedTabsRef = useRef<Set<string>>(new Set());

  const navigateTo = (tab: TabKey) => {
  setActiveTab(tab);
  setDrawerOpen(false);
  if (LAZY_TABS.includes(tab) && !loadedTabsRef.current.has(tab)) {
    loadedTabsRef.current.add(tab);
    fetchData(tab);
  }
  };

  const filteredUsers = users.filter(u => {
  if (!userSearch.trim()) return true;
  const q = userSearch.toLowerCase();
  return (u.username || "").toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });
  return {
    activeTab,
    setActiveTab,
    drawerOpen,
    setDrawerOpen,
    stats,
    setStats,
    users,
    setUsers,
    bots,
    setBots,
    transactions,
    setTransactions,
    selectedTxIds,
    setSelectedTxIds,
    coupons,
    setCoupons,
    referrals,
    setReferrals,
    teams,
    setTeams,
    dbStats,
    setDbStats,
    botTemplates,
    setBotTemplates,
    boostOrders,
    setBoostOrders,
    boostOrderStats,
    setBoostOrderStats,
    smpFilter,
    setSmpFilter,
    smpStatus,
    setSmpStatus,
    smpPage,
    setSmpPage,
    apiKeys,
    setApiKeys,
    apiKeyStats,
    setApiKeyStats,
    catalogueMeta,
    setCatalogueMeta,
    syncingCatalogue,
    setSyncingCatalogue,
    panelPlans,
    setPanelPlans,
    adminPanels,
    setAdminPanels,
    tutorials,
    setTutorials,
    newTutorialTitle,
    setNewTutorialTitle,
    newTutorialUrl,
    setNewTutorialUrl,
    newTutorialOrder,
    setNewTutorialOrder,
    tutorialLoading,
    setTutorialLoading,
    deletePanelModal,
    setDeletePanelModal,
    newTemplate,
    setNewTemplate,
    addingTemplate,
    setAddingTemplate,
    deleteTemplateModal,
    setDeleteTemplateModal,
    newPlan,
    setNewPlan,
    addingPlan,
    setAddingPlan,
    deletePlanModal,
    setDeletePlanModal,
    purgeModal,
    setPurgeModal,
    purging,
    setPurging,
    loading,
    setLoading,
    userSearch,
    setUserSearch,
    botSearch,
    setBotSearch,
    adminLogsOpen,
    setAdminLogsOpen,
    adminLogs,
    setAdminLogs,
    adminLogsBot,
    setAdminLogsBot,
    adminLogsRefreshing,
    setAdminLogsRefreshing,
    selectedUser,
    setSelectedUser,
    userPanelOpen,
    setUserPanelOpen,
    banReason,
    setBanReason,
    banModalOpen,
    setBanModalOpen,
    txAmount,
    setTxAmount,
    txModalOpen,
    setTxModalOpen,
    subtractTxModalOpen,
    setSubtractTxModalOpen,
    subtractAmount,
    setSubtractAmount,
    newPassword,
    setNewPassword,
    pwModalOpen,
    setPwModalOpen,
    deleteUserModalOpen,
    setDeleteUserModalOpen,
    notifyTitle,
    setNotifyTitle,
    notifyMessage,
    setNotifyMessage,
    notifyModalOpen,
    setNotifyModalOpen,
    couponCode,
    setCouponCode,
    couponTx,
    setCouponTx,
    deleteCouponModal,
    setDeleteCouponModal,
    deleteBotModal,
    setDeleteBotModal,
    confirmDeleteTx,
    setConfirmDeleteTx,
    confirmBulkDeleteTx,
    setConfirmBulkDeleteTx,
    confirmDeleteAllReferrals,
    setConfirmDeleteAllReferrals,
    confirmDeleteTutorial,
    setConfirmDeleteTutorial,
    newTeamName,
    setNewTeamName,
    newTeamLabel,
    setNewTeamLabel,
    orphanApps,
    setOrphanApps,
    orphanLoading,
    setOrphanLoading,
    orphanFetched,
    setOrphanFetched,
    deleteTeamModal,
    setDeleteTeamModal,
    editTeamId,
    setEditTeamId,
    editTeamLabel,
    setEditTeamLabel,
    revenueData,
    setRevenueData,
    broadcastNotifications,
    setBroadcastNotifications,
    newBroadcastTitle,
    setNewBroadcastTitle,
    newBroadcastMessage,
    setNewBroadcastMessage,
    broadcastLoading,
    setBroadcastLoading,
    maintenanceMode,
    setMaintenanceMode,
    maintenanceLoading,
    setMaintenanceLoading,
    fetchData,
    handleAction,
    handleDeleteTransaction,
    handleCreateCoupon,
    handleCreateTeam,
    fetchOrphanApps,
    handleDeleteOrphan,
    handleUpdateTeamLabel,
    handleToggleTeamActive,
    openUserPanel,
    closeUserPanel,
    navigateTo,
    filteredUsers,
    user,
    isAdmin,
    showToast,
    searchRef,
    loadedTabsRef,
  };
}
