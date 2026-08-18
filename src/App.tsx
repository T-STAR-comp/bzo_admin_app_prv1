import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AdminLayout } from "@/components/AdminLayout";
import { AuthProvider, useAuth } from "@/context/auth-context";
import { ModalProvider } from "@/context/modal-context";
import { LoginPage } from "@/pages/LoginPage";
import { ApplicationsPage } from "@/pages/ApplicationsPage";
import { AuditPage } from "@/pages/AuditPage";
import { FinancePage, PaymentsPage, SettingsPage, TicketsPage } from "@/pages/OtherPages";
import { PaymentSourcesPage } from "@/pages/PaymentSourcesPage";
import { TravelCreditsPage } from "@/pages/TravelCreditsPage";
import { RoutesPage } from "@/pages/RoutesPage";
import { StatisticsPage } from "@/pages/StatisticsPage";
import { UserControlPage } from "@/pages/UserControlPage";
import { UsersPage } from "@/pages/UsersPage";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }
  if (!user || user.role !== "admin") {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ModalProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              element={
                <ProtectedRoute>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<StatisticsPage />} />
              <Route path="applications" element={<ApplicationsPage />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="user-control" element={<UserControlPage />} />
              <Route path="payments" element={<PaymentsPage />} />
              <Route path="payment-sources" element={<PaymentSourcesPage />} />
              <Route path="finance" element={<FinancePage />} />
              <Route path="travel-credits" element={<TravelCreditsPage />} />
              <Route path="audit" element={<AuditPage />} />
              <Route path="tickets" element={<TicketsPage />} />
              <Route path="routes" element={<RoutesPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ModalProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
