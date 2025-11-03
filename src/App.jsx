import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import Navbar from "./components/layout/Navbar";
import useAuthStore from "./store/useAuthStore";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import CourseCatalogPage from "./pages/CourseCatalogPage";
import CourseViewerPage from "./pages/CourseViewerPage";
import CreateCoursePage from "./pages/CreateCoursePage";
import CreateFinaltest from "./pages/CreateFinaltest";
import EditCoursePage from "./pages/EditCoursePage";
import InstructorDashboardPage from "./pages/InstructorDashboardPage";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import Register from "./pages/Register";
import RegisterPage from "./pages/RegisterPage";
import StudentDashboardPage from "./pages/StudentDashboardPage";
import SuperAdminDashboardPage from "./pages/SuperAdminDashboardPage";
import Terms from "./pages/TermsPage";
import Privacy from "./pages/PrivacyPage";
import Signup from "./pages/Signup";
import AddcollegePage from "./pages/AddcollegePage";
import CertificateTestPage from "./pages/CertificateTestPage";
import Certificate from "./components/Certificate";
import CourseListPage from "./pages/CourseListPage";
import CertificatePreviewPage from "./pages/CertificatePreviewPage";
import ViewFinalTest from "./pages/ViewFinalTest";
const ROLE = {
  SUPERADMIN: "SUPERADMIN",
  ADMIN: "ADMIN",
  INSTRUCTOR: "INSTRUCTOR",
  STUDENT: "STUDENT",
};

const normalizeRole = (r) =>
  String(r || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z]/g, "_");

const roleHome = {
  [ROLE.SUPERADMIN]: "/superadmin",
  [ROLE.ADMIN]: "/admin",
  [ROLE.INSTRUCTOR]: "/instructor",
  [ROLE.STUDENT]: "/dashboard",
};

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { isAuthenticated, userRole, hasHydrated } = useAuthStore();
  if (!hasHydrated) return <div />;

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const role = normalizeRole(userRole);
  const need = allowedRoles.map(normalizeRole); 

  if (role === ROLE.SUPERADMIN) return children;

  if (!need.length) return children;

  if (need.includes(role)) return children;

  return <Navigate to={roleHome[role] || "/"} replace />;
};

// const ProtectedRoute = ({ children, allowedRoles = [] }) => {
//   const token = useAuthStore((state) => state.token); // ✅ Get ONLY token
//   const user = useAuthStore((state) => state.user); // ✅ Get ONLY user
//   const userRole = useAuthStore((state) => state.userRole); // ✅ Get ONLY role

//   console.log('[ProtectedRoute] Checking auth:', { token: !!token, user: !!user, userRole });

//   // ✅ Simple check: if no token, redirect to login
//   if (!token) {
//     return <Navigate to="/login" replace />;
//   }

//   // ✅ If no user, redirect to login
//   if (!user) {
//     return <Navigate to="/login" replace />;
//   }

//   // ✅ If no roles required, allow
//   if (!allowedRoles || allowedRoles.length === 0) {
//     return children;
//   }

//   // ✅ Check role
//   const role = normalizeRole(userRole);
//   const normalizedAllowed = allowedRoles.map(normalizeRole);

//   if (role === ROLE.SUPERADMIN) {
//     return children;
//   }

//   if (normalizedAllowed.includes(role)) {
//     return children;
//   }

//   return <Navigate to={roleHome[role] || "/"} replace />;
// };


const PublicRoute = ({ children }) => {
  const { isAuthenticated, userRole, hasHydrated } = useAuthStore();
  if (!hasHydrated) return <div />;
  const location = useLocation();
  const allowWhenLoggedIn = location.state?.allowWhenLoggedIn === true;

  if (!isAuthenticated || allowWhenLoggedIn) return children;

  const role = normalizeRole(userRole);
  return <Navigate to={roleHome[role] || "/dashboard"} replace />;
};


const App = () => {
  const { isAuthenticated } = useAuthStore();

  return (
    <div className="App">
      {isAuthenticated && <Navbar />}

      <Routes>
        {/* Public */}
        <Route path="/" element={<LandingPage />} />

        <Route path="/test-certificate" element={<Certificate />} />
        <Route
          path="/certificate/:assessmentId"
          element={
            <ProtectedRoute
              allowedRoles={[
                ROLE.STUDENT,
              ]}
            >
              <CertificatePreviewPage />
            </ProtectedRoute>}
        />
        <Route
          path="/courses"
          element={
            <ProtectedRoute
              allowedRoles={[
                ROLE.STUDENT,
                ROLE.ADMIN,
                ROLE.SUPERADMIN,
                ROLE.INSTRUCTOR,
              ]}
            >
              <CourseCatalogPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/courses-list"
          element={
            <ProtectedRoute
              allowedRoles={[
                ROLE.STUDENT,
                ROLE.ADMIN,
                ROLE.SUPERADMIN,
                ROLE.INSTRUCTOR,
              ]}
            >
              <CourseListPage />
            </ProtectedRoute>
          }
        />

        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />

        {/* Auth */}
        <Route
          path="/signup"
          element={
            <PublicRoute>
              <Signup />
            </PublicRoute>
          }
        />
        <Route
          path="/register-first"
          element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          }
        />
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />
        {/* ✅ Forgot Password Route */}
        <Route
          path="/forgot-password"
          element={
            <PublicRoute>
              <ForgotPasswordPage />
            </PublicRoute>
          }
        />

        <Route
          path="/register"
          element={
            <ProtectedRoute allowedRoles={[ROLE.ADMIN, ROLE.SUPERADMIN]}>
              <RegisterPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={[ROLE.STUDENT]}>
              <StudentDashboardPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/instructor"
          element={
            <ProtectedRoute allowedRoles={[ROLE.INSTRUCTOR]}>
              <InstructorDashboardPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/courses/:courseId"
          element={
            <ProtectedRoute
              allowedRoles={[
                ROLE.STUDENT,
                ROLE.INSTRUCTOR,
                ROLE.ADMIN,
                ROLE.SUPERADMIN,
              ]}
            >
              <CourseViewerPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/courses/create"
          element={
            <ProtectedRoute allowedRoles={[ROLE.ADMIN, ROLE.SUPERADMIN]}>
              <CreateCoursePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/courses/:courseId/edit"
          element={
            <ProtectedRoute allowedRoles={[ROLE.ADMIN, ROLE.SUPERADMIN]}>
              <EditCoursePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/superadmin"
          element={
            <ProtectedRoute allowedRoles={[ROLE.SUPERADMIN]}>
              <SuperAdminDashboardPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/create_finaltest"
          element={
            <ProtectedRoute allowedRoles={[ROLE.SUPERADMIN]}>
              <CreateFinaltest />
            </ProtectedRoute>
          }
        />

        <Route
          path="/view_finaltest"
          element={
            <ProtectedRoute allowedRoles={[ROLE.SUPERADMIN, ROLE.ADMIN, ROLE.STUDENT]}>
              <ViewFinalTest />
            </ProtectedRoute>
          }
        />

        <Route
          path="/add_college"
          element={
            <ProtectedRoute allowedRoles={[ROLE.SUPERADMIN]}>
              <AddcollegePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={[ROLE.ADMIN]}>
              <AdminDashboardPage />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
};

export default App;
