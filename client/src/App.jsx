import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { ToastProvider } from "./context/ToastContext";
import ErrorBoundary from "./components/ErrorBoundary";
import ProtectedRoute from "./components/ProtectedRoute";
import Navbar from "./components/layout/Navbar";
import OnboardingModal from "./components/OnboardingModal";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import MapView from "./pages/MapView";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import VerifyEmailSent from "./pages/VerifyEmailSent";
import VerifyEmail from "./pages/VerifyEmail";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
const AppLayout = () => (
  <>
    <Navbar />
    <OnboardingModal />
    <main>
      <Outlet />
    </main>
  </>
);

const App = () => {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <BrowserRouter>
              <Routes>
                {/* Public */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password/:token" element={<ResetPassword />}/>
                <Route path="/verify-email-sent" element={<VerifyEmailSent />}/>
                <Route path="/verify-email/:token" element={<VerifyEmail />} />

                {/* Protected + with Navbar */}
                <Route element={<ProtectedRoute />}>
                  <Route element={<AppLayout />}>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/map/:id" element={<MapView />} />
                    <Route path="/settings" element={<Settings />} />
                  </Route>
                </Route>

                {/* Root redirect */}
                <Route
                  path="/"
                  element={<Navigate to="/dashboard" replace />}
                />

                {/* 404 */}

                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;
