import { Button } from "@/components/ui/button";
import { useNavLoader } from "@/App";
import { PageLoader } from "@/components/PageLoader";
import {
  RefreshCw,
  ArrowLeft,
  Crown,
  Menu,
  X
} from "lucide-react";

import { NAV_ITEMS } from "./admin/shared";
import { OverviewTab } from "./admin/OverviewTab";
import { UsersTab } from "./admin/UsersTab";
import { BotsTab } from "./admin/BotsTab";
import { CouponsTab } from "./admin/CouponsTab";
import { ReferralsTab } from "./admin/ReferralsTab";
import { ModeratorsTab } from "./admin/ModeratorsTab";
import { RevenueTab } from "./admin/RevenueTab";
import { PanelsTab } from "./admin/PanelsTab";
import { TransactionsTab } from "./admin/TransactionsTab";
import { DatabaseTab } from "./admin/DatabaseTab";
import { BotTemplatesTab } from "./admin/BotTemplatesTab";
import { ApiTab } from "./admin/ApiTab";
import { SmpTab } from "./admin/SmpTab";
import { PanelPlansTab } from "./admin/PanelPlansTab";
import { TutorialsTab } from "./admin/TutorialsTab";
import { NotificationsTab } from "./admin/NotificationsTab";
import { ConfigTab } from "./admin/ConfigTab";
import { DisableTab } from "./admin/DisableTab";
import { ConnectionsTab } from "./admin/ConnectionsTab";
import { TxRetrievalTab } from "./admin/TxRetrievalTab";
import { AdminModals } from "./admin/AdminModals";
import { useAdminData } from "./admin/useAdminData";

export function Admin() {
  const { navigateWithLoader } = useNavLoader();
  const data = useAdminData();
  const {
    user, isAdmin, activeTab, drawerOpen, setDrawerOpen,
    stats, users, bots, transactions, selectedTxIds, setSelectedTxIds,
    coupons, referrals, teams, dbStats, botTemplates,
    boostOrders, setBoostOrders, boostOrderStats, setBoostOrderStats,
    smpFilter, setSmpFilter, smpStatus, setSmpStatus, setSmpPage,
    apiKeys, apiKeyStats, catalogueMeta, setCatalogueMeta,
    syncingCatalogue, setSyncingCatalogue, panelPlans, adminPanels, setAdminPanels,
    tutorials, setTutorials, newTutorialTitle, setNewTutorialTitle,
    newTutorialUrl, setNewTutorialUrl, newTutorialOrder, setNewTutorialOrder,
    tutorialLoading, setTutorialLoading, deletePanelModal, setDeletePanelModal,
    newTemplate, setNewTemplate, addingTemplate, setAddingTemplate,
    deleteTemplateModal, setDeleteTemplateModal, newPlan, setNewPlan,
    addingPlan, setAddingPlan, deletePlanModal, setDeletePlanModal,
    purgeModal, setPurgeModal, purging, setPurging, loading, setLoading,
    userSearch, setUserSearch, botSearch, setBotSearch,
    adminLogsOpen, setAdminLogsOpen, adminLogs, setAdminLogs,
    adminLogsBot, setAdminLogsBot, adminLogsRefreshing, setAdminLogsRefreshing,
    searchRef, selectedUser, setSelectedUser, userPanelOpen,
    banReason, setBanReason, banModalOpen, setBanModalOpen,
    txAmount, setTxAmount, txModalOpen, setTxModalOpen,
    subtractTxModalOpen, setSubtractTxModalOpen, subtractAmount, setSubtractAmount,
    newPassword, setNewPassword, pwModalOpen, setPwModalOpen,
    deleteUserModalOpen, setDeleteUserModalOpen,
    notifyTitle, setNotifyTitle, notifyMessage, setNotifyMessage, notifyModalOpen, setNotifyModalOpen,
    couponCode, setCouponCode, couponTx, setCouponTx,
    deleteCouponModal, setDeleteCouponModal, deleteBotModal, setDeleteBotModal,
    confirmDeleteTx, setConfirmDeleteTx, confirmBulkDeleteTx, setConfirmBulkDeleteTx,
    confirmDeleteAllReferrals, setConfirmDeleteAllReferrals,
    confirmDeleteTutorial, setConfirmDeleteTutorial,
    newTeamName, setNewTeamName, newTeamLabel, setNewTeamLabel,
    orphanApps, orphanLoading, orphanFetched, deleteTeamModal, setDeleteTeamModal,
    editTeamId, setEditTeamId, editTeamLabel, setEditTeamLabel,
    revenueData, broadcastNotifications, setBroadcastNotifications,
    newBroadcastTitle, setNewBroadcastTitle, newBroadcastMessage, setNewBroadcastMessage,
    broadcastLoading, setBroadcastLoading, maintenanceMode, setMaintenanceMode,
    maintenanceLoading, setMaintenanceLoading,
    fetchData, handleAction, handleCreateCoupon, handleCreateTeam,
    fetchOrphanApps, handleDeleteOrphan, handleUpdateTeamLabel, handleToggleTeamActive,
    openUserPanel, closeUserPanel, navigateTo, filteredUsers, showToast,
  } = data;

if (!user || !isAdmin) return <PageLoader />;

const currentNav = NAV_ITEMS.find(n => n.key === activeTab);

return (
  <div className="min-h-screen bg-background">
    <nav className="border-b border-border sticky top-0 bg-background/95 backdrop-blur-sm z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center h-14 gap-3">
          <button
            onClick={() => setDrawerOpen(true)}
            className="p-2 -ml-2 rounded-lg hover:bg-white/10 transition-colors shrink-0"
            aria-label="Open navigation"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 shrink-0">
            <Crown className="w-4 h-4 text-amber-400" />
            <span className="font-bold text-sm sm:text-base">Admin Panel</span>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-1.5 text-amber-400 text-sm font-mono">
            <span className="hidden sm:inline">@Geston</span>
            <Crown className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>
    </nav>

    {drawerOpen && (
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
        onClick={() => setDrawerOpen(false)}
      />
    )}

    <aside
      className={`fixed top-0 left-0 h-full w-72 liquid-glass border-r border-white/15 z-[110] transform transition-transform duration-300 ease-out flex flex-col ${drawerOpen ? "translate-x-0" : "-translate-x-full"}`}
    >
      <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <Crown className="w-4 h-4 text-amber-400" />
          <span className="font-bold text-sm">Admin Navigation</span>
        </div>
        <button onClick={() => setDrawerOpen(false)} className="p-2 rounded-lg hover:bg-white/10 transition-colors" aria-label="Close">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-0.5">
        <button
          onClick={() => { navigateWithLoader("/"); setDrawerOpen(false); }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl liquid-glass-subtle text-sm font-medium text-muted-foreground hover:bg-white/10 hover:text-foreground transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>

        <div className="h-px bg-border my-2" />

        {NAV_ITEMS.map(item => (
          <button
            key={item.key}
            onClick={() => navigateTo(item.key)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === item.key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-white/10 hover:text-foreground"
            }`}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </div>

      <div className="p-3 border-t border-border shrink-0">
        <div className="px-3 py-2 text-xs text-muted-foreground">
          Logged in as <span className="text-amber-400 font-mono">@Geston</span>
        </div>
      </div>
    </aside>

    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-5">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold flex items-center gap-2">
          {currentNav?.icon}
          {currentNav?.label}
        </h2>
        {activeTab !== "tx-retrieval" && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchData(activeTab === "overview" ? "stats" : activeTab)}
          disabled={loading[activeTab === "overview" ? "stats" : activeTab]}
        >
          <RefreshCw className={`w-4 h-4 ${loading[activeTab === "overview" ? "stats" : activeTab] ? "animate-spin" : ""}`} />
          <span className="ml-1.5 hidden sm:inline">Refresh</span>
        </Button>
        )}
      </div>

      {activeTab === "overview" && (
        <OverviewTab
          stats={stats}
          adminPanelsLength={adminPanels.length}
          orphanApps={orphanApps}
          orphanLoading={orphanLoading}
          orphanFetched={orphanFetched}
          fetchOrphanApps={fetchOrphanApps}
          handleDeleteOrphan={handleDeleteOrphan}
        />
      )}

      {activeTab === "users" && (
        <UsersTab
          userSearch={userSearch}
          setUserSearch={setUserSearch}
          searchRef={searchRef}
          loading={!!loading["users"]}
          filteredUsers={filteredUsers}
          openUserPanel={openUserPanel}
        />
      )}

      {activeTab === "bots" && (
        <BotsTab
          botSearch={botSearch}
          setBotSearch={setBotSearch}
          bots={bots}
          loading={loading}
          fetchData={fetchData}
          handleAction={handleAction}
          setAdminLogsBot={setAdminLogsBot}
          setAdminLogsRefreshing={setAdminLogsRefreshing}
          setAdminLogsOpen={setAdminLogsOpen}
          setAdminLogs={setAdminLogs}
          setDeleteBotModal={setDeleteBotModal}
        />
      )}

      {activeTab === "connections" && <ConnectionsTab />}

      {activeTab === "tx-retrieval" && <TxRetrievalTab />}

      {activeTab === "transactions" && (
        <TransactionsTab
          transactions={transactions}
          selectedTxIds={selectedTxIds}
          setSelectedTxIds={setSelectedTxIds}
          loading={loading}
          fetchData={fetchData}
          setConfirmBulkDeleteTx={setConfirmBulkDeleteTx}
          setConfirmDeleteTx={setConfirmDeleteTx}
          users={users}
          openUserPanel={openUserPanel}
          setBanModalOpen={setBanModalOpen}
          showToast={showToast}
        />
      )}

      {activeTab === "coupons" && (
        <CouponsTab
          couponCode={couponCode}
          setCouponCode={setCouponCode}
          couponTx={couponTx}
          setCouponTx={setCouponTx}
          handleCreateCoupon={handleCreateCoupon}
          loading={loading}
          coupons={coupons}
          setDeleteCouponModal={setDeleteCouponModal}
        />
      )}

      {activeTab === "referrals" && (
        <ReferralsTab
          referrals={referrals}
          loading={loading}
          setConfirmDeleteAllReferrals={setConfirmDeleteAllReferrals}
        />
      )}

      {activeTab === "database" && (
        <DatabaseTab
          dbStats={dbStats}
          purgeModal={purgeModal}
          setPurgeModal={setPurgeModal}
          purging={purging}
          setPurging={setPurging}
          fetchData={fetchData}
          showToast={showToast}
        />
      )}

      {activeTab === "bot-templates" && (
        <BotTemplatesTab
          botTemplates={botTemplates}
          newTemplate={newTemplate}
          setNewTemplate={setNewTemplate}
          addingTemplate={addingTemplate}
          setAddingTemplate={setAddingTemplate}
          loading={loading}
          fetchData={fetchData}
          setDeleteTemplateModal={setDeleteTemplateModal}
          showToast={showToast}
        />
      )}

      {activeTab === "api" && (
        <ApiTab
          apiKeys={apiKeys}
          apiKeyStats={apiKeyStats}
          loading={loading}
          fetchData={fetchData}
        />
      )}

      {activeTab === "smp" && (
        <SmpTab
          boostOrders={boostOrders}
          setBoostOrders={setBoostOrders}
          boostOrderStats={boostOrderStats}
          setBoostOrderStats={setBoostOrderStats}
          smpFilter={smpFilter}
          setSmpFilter={setSmpFilter}
          smpStatus={smpStatus}
          setSmpStatus={setSmpStatus}
          setSmpPage={setSmpPage}
          catalogueMeta={catalogueMeta}
          setCatalogueMeta={setCatalogueMeta}
          syncingCatalogue={syncingCatalogue}
          setSyncingCatalogue={setSyncingCatalogue}
          loading={loading}
          setLoading={setLoading}
          fetchData={fetchData}
          showToast={showToast}
        />
      )}

      {activeTab === "panel-plans" && (
        <PanelPlansTab
          panelPlans={panelPlans}
          newPlan={newPlan}
          setNewPlan={setNewPlan}
          addingPlan={addingPlan}
          setAddingPlan={setAddingPlan}
          loading={loading}
          fetchData={fetchData}
          setDeletePlanModal={setDeletePlanModal}
          showToast={showToast}
        />
      )}

      {activeTab === "tutorials" && (
        <TutorialsTab
          tutorials={tutorials}
          setTutorials={setTutorials}
          newTutorialTitle={newTutorialTitle}
          setNewTutorialTitle={setNewTutorialTitle}
          newTutorialUrl={newTutorialUrl}
          setNewTutorialUrl={setNewTutorialUrl}
          newTutorialOrder={newTutorialOrder}
          setNewTutorialOrder={setNewTutorialOrder}
          tutorialLoading={tutorialLoading}
          setTutorialLoading={setTutorialLoading}
          setConfirmDeleteTutorial={setConfirmDeleteTutorial}
          showToast={showToast}
        />
      )}

      {activeTab === "revenue" && (
        <RevenueTab
          revenueData={revenueData}
          loading={loading}
          fetchData={fetchData}
        />
      )}

      {activeTab === "notifications" && (
        <NotificationsTab
          broadcastNotifications={broadcastNotifications}
          setBroadcastNotifications={setBroadcastNotifications}
          newBroadcastTitle={newBroadcastTitle}
          setNewBroadcastTitle={setNewBroadcastTitle}
          newBroadcastMessage={newBroadcastMessage}
          setNewBroadcastMessage={setNewBroadcastMessage}
          broadcastLoading={broadcastLoading}
          setBroadcastLoading={setBroadcastLoading}
          loading={loading}
          fetchData={fetchData}
          showToast={showToast}
        />
      )}

      {activeTab === "moderators" && (
        <ModeratorsTab
          users={users}
          loading={loading}
          handleAction={handleAction}
          fetchData={fetchData}
        />
      )}

      {activeTab === "config" && (
        <ConfigTab
          maintenanceMode={maintenanceMode}
          setMaintenanceMode={setMaintenanceMode}
          maintenanceLoading={maintenanceLoading}
          setMaintenanceLoading={setMaintenanceLoading}
          teams={teams}
          newTeamName={newTeamName}
          setNewTeamName={setNewTeamName}
          newTeamLabel={newTeamLabel}
          setNewTeamLabel={setNewTeamLabel}
          handleCreateTeam={handleCreateTeam}
          editTeamId={editTeamId}
          setEditTeamId={setEditTeamId}
          editTeamLabel={editTeamLabel}
          setEditTeamLabel={setEditTeamLabel}
          handleUpdateTeamLabel={handleUpdateTeamLabel}
          handleToggleTeamActive={handleToggleTeamActive}
          setDeleteTeamModal={setDeleteTeamModal}
          loading={loading}
          showToast={showToast}
        />
      )}

      {activeTab === "disable" && <DisableTab />}

      {activeTab === "panels" && (
        <PanelsTab
          adminPanels={adminPanels}
          loading={loading}
          deletePanelModal={deletePanelModal}
          setDeletePanelModal={setDeletePanelModal}
          setAdminPanels={setAdminPanels}
          showToast={showToast}
        />
      )}
    </main>

    <AdminModals
      selectedUser={selectedUser}
      setSelectedUser={setSelectedUser}
      userPanelOpen={userPanelOpen}
      closeUserPanel={closeUserPanel}
      banModalOpen={banModalOpen}
      setBanModalOpen={setBanModalOpen}
      banReason={banReason}
      setBanReason={setBanReason}
      txModalOpen={txModalOpen}
      setTxModalOpen={setTxModalOpen}
      txAmount={txAmount}
      setTxAmount={setTxAmount}
      subtractTxModalOpen={subtractTxModalOpen}
      setSubtractTxModalOpen={setSubtractTxModalOpen}
      subtractTxAmount={subtractAmount}
      setSubtractTxAmount={setSubtractAmount}
      pwModalOpen={pwModalOpen}
      setPwModalOpen={setPwModalOpen}
      newPassword={newPassword}
      setNewPassword={setNewPassword}
      deleteUserModalOpen={deleteUserModalOpen}
      setDeleteUserModalOpen={setDeleteUserModalOpen}
      notifyModalOpen={notifyModalOpen}
      setNotifyModalOpen={setNotifyModalOpen}
      notifyTitle={notifyTitle}
      setNotifyTitle={setNotifyTitle}
      notifyMessage={notifyMessage}
      setNotifyMessage={setNotifyMessage}
      loading={loading}
      handleAction={handleAction}
      fetchData={fetchData}
      showToast={showToast}
      deleteBotModal={deleteBotModal}
      setDeleteBotModal={setDeleteBotModal}
      deleteCouponModal={deleteCouponModal}
      setDeleteCouponModal={setDeleteCouponModal}
      deleteTeamModal={deleteTeamModal}
      setDeleteTeamModal={setDeleteTeamModal}
      deleteTemplateModal={deleteTemplateModal}
      setDeleteTemplateModal={setDeleteTemplateModal}
      confirmDeleteTx={confirmDeleteTx}
      setConfirmDeleteTx={setConfirmDeleteTx}
      confirmBulkDeleteTx={confirmBulkDeleteTx}
      setConfirmBulkDeleteTx={setConfirmBulkDeleteTx}
      selectedTxIds={selectedTxIds}
      setSelectedTxIds={setSelectedTxIds}
      confirmDeleteAllReferrals={confirmDeleteAllReferrals}
      setConfirmDeleteAllReferrals={setConfirmDeleteAllReferrals}
      confirmDeleteTutorial={confirmDeleteTutorial}
      setConfirmDeleteTutorial={setConfirmDeleteTutorial}
      setTutorials={setTutorials}
      deletePlanModal={deletePlanModal}
      setDeletePlanModal={setDeletePlanModal}
      adminLogsOpen={adminLogsOpen}
      setAdminLogsOpen={setAdminLogsOpen}
      adminLogs={adminLogs}
      setAdminLogs={setAdminLogs}
      adminLogsBot={adminLogsBot}
      adminLogsRefreshing={adminLogsRefreshing}
      setAdminLogsRefreshing={setAdminLogsRefreshing}
      bots={bots}
    />
  </div>
);
}
