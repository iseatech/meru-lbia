import { Switch, Route } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Landing from "./pages/Landing";
import About from "./pages/About";
import Services from "./pages/Services";
import DesignedFor from "./pages/DesignedFor";
import Sample from "./pages/Sample";
import Contact from "./pages/Contact";
import AuthSignUp from "./pages/AuthSignUp";
import AuthLogin from "./pages/AuthLogin";
import NotFound from "./pages/NotFound";
import LogisticsDetails from "./pages/LogisticsDetails";
import LogisticsRequest from "./pages/LogisticsRequest";
import CustomsDetails from "./pages/CustomsDetails";
import CustomsSelect from "./pages/CustomsSelect";
import CustomsUpTo5 from "./pages/CustomsUpTo5";
import Customs6To20 from "./pages/Customs6To20";
import CustomsBulk250 from "./pages/CustomsBulk250";
import CustomsTradeDocument from "./pages/CustomsTradeDocument";
import CustomsLetterOfCredit from "./pages/CustomsLetterOfCredit";
import CombinedDetails from "./pages/CombinedDetails";
import CombinedRequest from "./pages/CombinedRequest";
import Dashboard from "./pages/Dashboard";
import MyAccount from "./pages/MyAccount";
import AccountProfile from "./pages/AccountProfile";
import AccountCompany from "./pages/AccountCompany";
import AccountReports from "./pages/AccountReports";
import AccountBilling from "./pages/AccountBilling";
import AccountSecurity from "./pages/AccountSecurity";
import AdminLayout from "./layouts/AdminLayout";
import { useAuth } from "./hooks/use-auth";
import { useInactivityLogout } from "./hooks/useInactivityLogout";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
});

function AdminGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, isAdmin, twoFaEnabled, twoFaVerified } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      setLocation("/auth/login");
      return;
    }
    if (!isAdmin) {
      setLocation("/account");
      return;
    }
    if (!twoFaEnabled) {
      setLocation("/admin/system");
      return;
    }
    if (!twoFaVerified) {
      setLocation("/admin/system");
      return;
    }
  }, [isLoading, isAuthenticated, isAdmin, twoFaEnabled, twoFaVerified, setLocation]);

  if (isLoading) return <div className="page"><p>Loading...</p></div>;
  if (!isAuthenticated || !isAdmin || !twoFaEnabled || !twoFaVerified) return null;
  return <>{children}</>;
}

function AdminPanelGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, isAdmin, twoFaEnabled, twoFaVerified } = useAuth();
  const [, setLocation] = useLocation();
  const [showMsg, setShowMsg] = useState(false);
  const [loc] = useLocation();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      setLocation("/auth/login");
      return;
    }
    if (!isAdmin) {
      setShowMsg(true);
      const t = setTimeout(() => setLocation("/"), 2000);
      return () => clearTimeout(t);
    }
    if ((!twoFaEnabled || !twoFaVerified) && loc !== "/admin/system") {
      setLocation("/admin/system");
      return;
    }
  }, [isLoading, isAuthenticated, isAdmin, twoFaEnabled, twoFaVerified, setLocation, loc]);

  if (isLoading) return <div className="page"><p>Loading...</p></div>;
  if (showMsg) return <div className="page" style={{ textAlign: "center", padding: "4rem" }}><p className="admin-access-msg" data-testid="text-admin-required">Admin access required. Redirecting...</p></div>;
  if (!isAuthenticated || !isAdmin) return null;
  return <>{children}</>;
}

function DashboardGate() {
  return <AdminGate><Dashboard /></AdminGate>;
}

function InactivityWrapper({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  useInactivityLogout(isAuthenticated);
  return <>{children}</>;
}

function StandardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <Header />
      <div style={{ flex: 1 }}>{children}</div>
      <Footer />
    </div>
  );
}

function AdminPage() {
  return <AdminPanelGate><AdminLayout /></AdminPanelGate>;
}

function AppRoutes() {
  return (
    <InactivityWrapper>
      <Switch>
        <Route path="/admin/users" component={AdminPage} />
        <Route path="/admin/roles" component={AdminPage} />
        <Route path="/admin/intelligence" component={AdminPage} />
        <Route path="/admin/compliance" component={AdminPage} />
        <Route path="/admin/verifications" component={AdminPage} />
        <Route path="/admin/system" component={AdminPage} />
        <Route path="/admin" component={AdminPage} />
        <Route>{() =>
          <StandardLayout>
            <Switch>
              <Route path="/" component={Landing} />
              <Route path="/about" component={About} />
              <Route path="/services" component={Services} />
              <Route path="/services/logistics/details" component={LogisticsDetails} />
              <Route path="/services/logistics/request" component={LogisticsRequest} />
              <Route path="/services/customs/details" component={CustomsDetails} />
              <Route path="/services/customs/upto-5" component={CustomsUpTo5} />
              <Route path="/services/customs/6-20" component={Customs6To20} />
              <Route path="/services/customs/bulk-250" component={CustomsBulk250} />
              <Route path="/services/customs/trade-document" component={CustomsTradeDocument} />
              <Route path="/services/customs/letter-of-credit" component={CustomsLetterOfCredit} />
              <Route path="/services/customs" component={CustomsSelect} />
              <Route path="/services/combined/details" component={CombinedDetails} />
              <Route path="/services/combined/request" component={CombinedRequest} />
              <Route path="/dashboard" component={DashboardGate} />
              <Route path="/designed-for" component={DesignedFor} />
              <Route path="/sample" component={Sample} />
              <Route path="/contact" component={Contact} />
              <Route path="/auth/signup" component={AuthSignUp} />
              <Route path="/auth/login" component={AuthLogin} />
              <Route path="/account" component={MyAccount} />
              <Route path="/account/profile" component={AccountProfile} />
              <Route path="/account/company" component={AccountCompany} />
              <Route path="/account/reports" component={AccountReports} />
              <Route path="/account/billing" component={AccountBilling} />
              <Route path="/account/security" component={AccountSecurity} />
              <Route component={NotFound} />
            </Switch>
          </StandardLayout>
        }</Route>
      </Switch>
    </InactivityWrapper>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppRoutes />
    </QueryClientProvider>
  );
}

export default App;
