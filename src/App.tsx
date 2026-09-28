import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation, Link } from "react-router";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { CurrencyProvider } from "@/hooks/useCurrency";
import { CurrencyPickerModal } from "@/components/CurrencyPickerModal";
import { ToastProvider } from "@/hooks/useToast";
import { Login } from "@/pages/Login";
import { Signup } from "@/pages/Signup";
import { MagicLinkVerify } from "@/pages/MagicLinkVerify";
import { GitHubSuccess } from "@/pages/GitHubSuccess";
import { ResetPassword } from "@/pages/ResetPassword";
import { Dashboard } from "@/pages/Dashboard";
import { Admin } from "@/pages/Admin";
import { Profile } from "@/pages/Profile";
import { Docs } from "@/pages/Docs";
import { Deploy } from "@/pages/Deploy";
import { ServicesBots } from "@/pages/ServicesBots";
import { ServicesPanel } from "@/pages/ServicesPanel";
import { MyBots } from "@/pages/MyBots";
import { PurchasePanels } from "@/pages/PurchasePanels";
import { SocialBoosting } from "@/pages/SocialBoosting";
import { DeveloperApi } from "@/pages/DeveloperApi";
import { MyPanels } from "@/pages/MyPanels";
import { BotDeployPage } from "@/pages/BotDeployPage";
import { Tutorials } from "@/pages/Tutorials";
import { Contact } from "@/pages/Contact";
import { AiChat } from "@/pages/AiChat";
import { ReportBug } from "@/pages/ReportBug";
import { NotFound } from "@/pages/NotFound";
import { PageLoader } from "@/components/PageLoader";
import Home from "@/pages/Home";
import { BotFeatures } from "@/pages/BotFeatures";
import { ServiceGate } from "@/components/ServiceGate";
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { Wrench, AlertTriangle } from "lucide-react";
import { getPublicMaintenanceStatus } from "@/lib/api";

interface NavLoadingContextType {
  navigateWithLoader: (path: string) => void;
}

const NavLoadingContext = createContext<NavLoadingContextType>({
  navigateWithLoader: () => {},
});

export function useNavLoader() {
  return useContext(NavLoadingContext);
}

function NavLoadingProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const navigateWithLoader = useCallback(
    (path: string) => {
      setLoading(true);

      setTimeout(() => {
        navigate(path);
        setLoading(false);
      }, 400);
    },
    [navigate]
  );

  if (loading) return <PageLoader />;

  return (
    <NavLoadingContext.Provider value={{ navigateWithLoader }}>
      {children}
    </NavLoadingContext.Provider>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "instant",
    });
  }, [pathname]);

  return null;
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <PageLoader />;

  if (!user) {
    return (
      <Navigate
        to={`/login?next=${encodeURIComponent(location.pathname)}`}
        replace
      />
    );
  }

  return <>{children}</>;
}

function HomeRoute() {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Home />;
}

function AppRoutes() {
  return (
    <NavLoadingProvider>
      <ScrollToTop />

      <Routes>
        <Route path="/" element={<HomeRoute />} />

        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        <Route path="/auth/magic" element={<MagicLinkVerify />} />
        <Route path="/auth/login" element={<MagicLinkVerify />} />
        <Route path="/auth/verify" element={<MagicLinkVerify />} />

        <Route
          path="/auth/github/success"
          element={<GitHubSuccess />}
        />

        <Route
          path="/auth/reset-password"
          element={<ResetPassword />}
        />

        <Route
          path="/reset-password"
          element={<ResetPassword />}
        />

        <Route path="/docs" element={<Docs />} />
        <Route path="/tutorials" element={<Tutorials />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/ai-chat" element={<AiChat />} />

        <Route
          path="/services/bots"
          element={<ServicesBots />}
        />

        <Route
          path="/services/bots/:slug"
          element={
            <ServiceGate
              serviceKey="botDeploy"
              serviceName="Bot Deployment"
            >
              <BotDeployPage />
            </ServiceGate>
          }
        />

        <Route
          path="/services/panels"
          element={<ServicesPanel />}
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <Admin />
            </ProtectedRoute>
          }
        />

        {/* Legacy payment/top-up URL:
            intentionally redirected because the platform is free. */}
        <Route
          path="/topup"
          element={<Navigate to="/dashboard" replace />}
        />

        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />

        <Route
          path="/report-bug"
          element={
            <ProtectedRoute>
              <ReportBug />
            </ProtectedRoute>
          }
        />

        <Route
          path="/deploy"
          element={
            <ProtectedRoute>
              <ServiceGate
                serviceKey="botDeploy"
                serviceName="Bot Deployment"
              >
                <Deploy />
              </ServiceGate>
            </ProtectedRoute>
          }
        />

        <Route
          path="/mybots"
          element={
            <ProtectedRoute>
              <MyBots />
            </ProtectedRoute>
          }
        />

        <Route
          path="/mypanels"
          element={
            <ProtectedRoute>
              <ServiceGate
                serviceKey="panels"
                serviceName="My Panels"
              >
                <MyPanels />
              </ServiceGate>
            </ProtectedRoute>
          }
        />

        <Route
          path="/services/panels/mypanels"
          element={
            <ProtectedRoute>
              <ServiceGate
                serviceKey="panels"
                serviceName="My Panels"
              >
                <MyPanels />
              </ServiceGate>
            </ProtectedRoute>
          }
        />

        <Route
          path="/services/panels/purchasepanel"
          element={
            <ProtectedRoute>
              <ServiceGate
                serviceKey="panels"
                serviceName="Panel Shop"
              >
                <PurchasePanels />
              </ServiceGate>
            </ProtectedRoute>
          }
        />

        <Route
          path="/services/boosting"
          element={
            <ProtectedRoute>
              <ServiceGate
                serviceKey="boost"
                serviceName="Social Media Boosting"
              >
                <SocialBoosting />
              </ServiceGate>
            </ProtectedRoute>
          }
        />

        <Route
          path="/developers"
          element={
            <ProtectedRoute>
              <DeveloperApi />
            </ProtectedRoute>
          }
        />

        <Route
          path="/features"
          element={<BotFeatures />}
        />

        <Route
          path="/botfeatures"
          element={<BotFeatures />}
        />

        <Route
          path="*"
          element={<NotFound />}
        />
      </Routes>

      <CurrencyPickerModal />
    </NavLoadingProvider>
  );
}

function BanGate({ children }: { children: ReactNode }) {
  const { user, loading, logout } = useAuth();
  const { pathname } = useLocation();

  const authPaths = [
    "/login",
    "/signup",
    "/auth/magic",
    "/auth/login",
    "/auth/verify",
    "/auth/github/success",
    "/auth/reset-password",
    "/reset-password",
    "/contact",
  ];

  if (
    authPaths.some(
      (p) => pathname === p || pathname.startsWith(p + "/")
    )
  ) {
    return <>{children}</>;
  }

  if (loading) return <>{children}</>;

  if (!user?.isBanned) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center gap-6">
      <div className="w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
        <AlertTriangle className="w-10 h-10 text-red-400" />
      </div>

      <div className="max-w-sm w-full">
        <h1 className="text-2xl font-bold text-red-400 mb-2">
          Account Suspended
        </h1>

        <p className="text-muted-foreground text-sm leading-relaxed">
          Your account has been suspended. You cannot use this platform
          until the ban is lifted.
        </p>

        {user.banReason ? (
          <div className="mt-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-left">
            <p className="text-[10px] text-red-400 font-semibold uppercase tracking-wide mb-1">
              Reason
            </p>

            <p className="text-sm text-red-200">
              {user.banReason}
            </p>
          </div>
        ) : (
          <p className="mt-3 text-xs text-muted-foreground">
            Contact support if you believe this is a mistake.
          </p>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          to="/contact"
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 text-sm font-medium transition-colors"
        >
          Contact Support
        </Link>

        <button
          type="button"
          onClick={() => logout()}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-medium transition-colors border border-red-500/20"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}

function MaintenanceGate({ children }: { children: ReactNode }) {
  const { user, isAdmin, isModerator } = useAuth();
  const { pathname } = useLocation();

  const [maintenanceOn, setMaintenanceOn] =
    useState(false);

  const [checked, setChecked] = useState(false);

  useEffect(() => {
    getPublicMaintenanceStatus()
      .then((d) => {
        if (d?.maintenanceMode) {
          setMaintenanceOn(true);
        }
      })
      .catch(() => {})
      .finally(() => setChecked(true));
  }, []);

  if (!checked) return null;

  const authPaths = [
    "/login",
    "/signup",
    "/auth/magic",
    "/auth/login",
    "/auth/verify",
    "/auth/github/success",
    "/auth/reset-password",
    "/reset-password",
  ];

  if (
    authPaths.some(
      (p) => pathname === p || pathname.startsWith(p + "/")
    )
  ) {
    return <>{children}</>;
  }

  if (maintenanceOn && !(isAdmin || isModerator)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-6">
            <Wrench className="w-8 h-8 text-amber-400" />
          </div>

          <h1 className="text-2xl font-bold mb-2">
            Under Maintenance
          </h1>

          <p className="text-muted-foreground text-sm leading-relaxed mb-6">
            Geston Hosting is temporarily down for maintenance.
            We'll be back shortly — please check again in a few
            minutes.
          </p>

          {user ? (
            <p className="text-xs text-muted-foreground">
              Logged in as{" "}
              <span className="text-foreground font-medium">
                {user.email}
              </span>
            </p>
          ) : (
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function AppBootWrapper({
  children,
}: {
  children: ReactNode;
}) {
  const { loading } = useAuth();
  const [minTimeElapsed, setMinTimeElapsed] =
    useState(false);

  useEffect(() => {
    const t = setTimeout(
      () => setMinTimeElapsed(true),
      2200
    );

    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!loading && minTimeElapsed) {
      const el = document.getElementById("boot-loader");

      if (el) {
        el.style.opacity = "0";

        setTimeout(() => {
          el.remove();

          const style = document.getElementById(
            "boot-loader-style"
          );

          if (style) style.remove();
        }, 300);
      }
    }
  }, [loading, minTimeElapsed]);

  if (loading || !minTimeElapsed) return null;

  return <>{children}</>;
}

function App() {
  return (
    <AuthProvider>
      <CurrencyProvider>
        <ToastProvider>
          <BrowserRouter>
            <AppBootWrapper>
              <MaintenanceGate>
                <BanGate>
                  <AppRoutes />
                </BanGate>
              </MaintenanceGate>
            </AppBootWrapper>
          </BrowserRouter>
        </ToastProvider>
      </CurrencyProvider>
    </AuthProvider>
  );
}

export default App;
