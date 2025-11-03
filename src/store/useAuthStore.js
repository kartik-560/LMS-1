// store/useAuthStore.js
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { setAuthToken, clearAuthToken } from "../services/token";

export const ROLE = {
  SUPERADMIN: "SUPERADMIN",
  ADMIN: "ADMIN",
  INSTRUCTOR: "INSTRUCTOR",
  STUDENT: "STUDENT",
};

export const normalizeRole = (raw) => {
  const x = String(raw || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z]/g, "_");
  if (["SUPERADMIN", "SUPER_ADMIN", "SUPER-ADMIN", "SA"].includes(x))
    return ROLE.SUPERADMIN;
  if (x === "ADMIN") return ROLE.ADMIN;
  if (["INSTRUCTOR", "TEACHER"].includes(x)) return ROLE.INSTRUCTOR;
  if (["STUDENT", "LEARNER"].includes(x)) return ROLE.STUDENT;
  return ROLE.STUDENT;
};

// 👇 capture set() here to safely use it later in onRehydrateStorage
let _set;

const useAuthStore = create()(
  persist(
    (set, get) => {
      _set = set; // capture for later use
      return {
        user: null,
        token: null,
        isAuthenticated: false,
        userRole: null,
        hasHydrated: false,

        login: (userData, token) => {
          const role = normalizeRole(userData?.role);
          set({
            user: { ...userData, role },
            token,
            userRole: role,
            isAuthenticated: Boolean(token),
          });
          localStorage.setItem("user_role", role);
          setAuthToken(token);
        },

        logout: () => {
          localStorage.removeItem("token");
          setAuthToken(null);
          set({ token: null, user: null, isAuthenticated: false });
        },

        updateUser: (userData) => {
          const role = normalizeRole(userData?.role);
          set((s) => ({
            user: { ...s.user, ...userData, role },
            userRole: role,
          }));
          localStorage.setItem("user_role", role);
        },

        // convenience
        isStudent: () => get().userRole === ROLE.STUDENT,
        isInstructor: () => get().userRole === ROLE.INSTRUCTOR,
        isAdmin: () => get().userRole === ROLE.ADMIN,
        isSuperAdmin: () => get().userRole === ROLE.SUPERADMIN,
      };
    },
    {
      name: "auth-storage",
      partialize: (s) => ({
        user: s.user,
        token: s.token,
        isAuthenticated: s.isAuthenticated,
        userRole: s.userRole,
      }),
      onRehydrateStorage: () => (state, error) => {
        if (error) console.error("Auth rehydrate error:", error);

        const token = state?.token ?? null;
        if (token) setAuthToken(token);
        else clearAuthToken();

        const role = normalizeRole(state?.userRole);

        queueMicrotask(() => {
  
          _set?.({
            isAuthenticated: Boolean(token),
            userRole: role,
            user: state?.user ? { ...state.user, role } : null,
            hasHydrated: true,
          });
        });
      },
    }
  )
);

export default useAuthStore;
