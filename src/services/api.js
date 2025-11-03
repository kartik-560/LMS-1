import axios from "axios";
import useAuthStore from "../store/useAuthStore";
import { setAuthToken, getToken } from "./token";
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

export const FALLBACK_THUMB =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450">
       <rect width="100%" height="100%" fill="#e5e7eb"/>
       <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
             font-family="Arial" font-size="28" fill="#6b7280">Course</text>
     </svg>`
  );

export const makeHeaders = () => {
  const t = getToken();
  const headers = {
    "Content-Type": "application/json",
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
    Expires: "0",
  };
  if (t) headers.Authorization = t.startsWith("Bearer ") ? t : `Bearer ${t}`;
  return headers;
};

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  headers: {
    "Content-Type": "application/json",
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
    Expires: "0",
  },
});

api.interceptors.request.use(
  (config) => {
    const t = getToken();
    if (t) {
      const val = t.startsWith("Bearer ") ? t : `Bearer ${t}`;
      config.headers = { ...(config.headers || {}), Authorization: val };
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error?.response?.status;
    const url = error?.config?.url || "";
    if (
      status === 401 &&
      !["/auth/login", "/auth/registrations", "/auth/signup"].some((p) =>
        url.includes(p)
      )
    ) {
      setAuthToken(null);
      window.location.assign("/login");
    }
    return Promise.reject(error);
  }
);

export async function fileToBase64(file) {
  if (!file) return "";
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export const handleAPIError = (error) => {
  if (error?.response) return error.response.data;
  if (error?.request) return { error: "No response from server" };
  return { error: error?.message || "Unknown error" };
};

export const authAPI = {
  register: (payload) => api.post("/auth/registrations", payload),
  login: (payload) => api.post("/auth/login", payload),
  loginOtpBegin: (payload) =>
    api.post("/auth/signup/begin", payload).then((r) => r.data),
  loginOtpVerify: (email, otp) =>
    api.post("/auth/signup/verify", { email, otp }).then((r) => r.data),
  completeSignup: (payload) =>
    api.post("/signup/complete", payload).then((r) => r.data),
  me: async () => {
    const raw = await api.get("/auth/me").then((r) => r.data);

    const meUser = Array.isArray(raw) ? raw[0] : raw;
    if (!meUser) return null;

    const collegeId =
      meUser.collegeId ?? meUser.college_id ?? meUser.college?.id ?? null;

    return { ...meUser, collegeId }; 
  },

  logout: () => {
    useAuthStore.getState().logout();
    localStorage.removeItem("auth_token");
    sessionStorage.removeItem("auth_token");
    window.location.href = "/login";
  },
  isAuthenticated: () =>
    !!(
      localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token")
    ),
    googleLogin: (googleData) => api.post("/auth/google-login", googleData),
    
    googleSignup: (googleData) => api.post("/auth/signup-google", googleData),
    

  bulkRegister: (formData) =>
    api.post("/auth/registrations/bulk", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }),
};

export const superAdminAPI = {
  getOverview: async () => {
    const { data } = await api.get("/superadmin/overview");
    return data; // { overview, courseBreakdown }
  },
  getAdmins: async () => {
    const { data } = await api.get("/superadmin/admins");
    return data; // array
  },
  getInstructors: async () => {
    const { data } = await api.get("/superadmin/instructors");
    return data; // array
  },
  getStudents: async () => {
    const { data } = await api.get("/superadmin/students");
    return data; // array
  },
  updateUserPermissions: async (userId, permissions) => {
    const { data } = await api.patch(
      `/superadmin/users/${userId}/permissions`,
      permissions
    );
    return data;
  },
  deleteStudent: async (userId) => {
    const { data } = await api.delete(`/superadmin/users/${userId}`);
    return data;
  },
};

export const adminScopedAPI = {
  overview: (collegeId) =>
    api.get("/admin/overview", { params: { collegeId } }).then((r) => r.data),
  instructors: (collegeId) =>
    api
      .get("/admin/instructors", { params: { collegeId } })
      .then((r) => r.data),
  students: (collegeId) =>
    api.get("/admin/students", { params: { collegeId } }).then((r) => r.data),
  courses: (collegeId, params = {}) =>
    api
      .get("/admin/courses", { params: { collegeId, ...params } })
      .then((r) => r.data),
};

export const coursesAPI = {
  get: async (id, params = {}) => {
    const { user } = useAuthStore.getState();
    const role = String(user?.role || "").toUpperCase();
    const collegeId =
      params.collegeId ?? user?.collegeId ?? user?.college?.id ?? null;

    // Non-SA route for students/admins/instructors
    if (role !== "SUPERADMIN") {
      const { data } = await api.get(`/courses/${id}`, {
        params: collegeId ? { ...params, collegeId } : params,
      });
      return data;
    }

    // SA detail if needed
    const { data } = await api.get(`/superadmin/courses/${id}`, { params });
    return data;
  },

  list: async (params = {}) => {
    const { data } = await api.get("/superadmin/courses", { params });

    return data.data || data;
  },

  getStudentCourses: async (
    collegeId,
    studentId,
    search = "",
    status = "all",
    category = "all",
    scope = "assigned", // "assigned" | "enrolled"
    page = 1,
    pageSize = 20
  ) => {
    const view = scope === "assigned" ? "enrolled" : "catalog";

    // Convert "all" into undefined so the server doesn't try to filter on literal "all"
    const params = {
      view,
      collegeId: collegeId || undefined,
      search: search?.trim() || undefined,
      status: status !== "all" ? String(status) : undefined,
      category: category !== "all" ? String(category) : undefined,
      page: String(page),
      pageSize: String(pageSize),
    };

    const resp = await api.get("/superadmin/courses", { params });
    // Your calling code expects resp.data or resp.data.data; keep it consistent:
    return resp; // caller does resp?.data
  },

  getCourseCatalog: async ({
    view,
    collegeId,
    studentId,
    creatorId,
    searchTerm,
    status,
    category,
    page = 1,
    pageSize = 20,
  } = {}) => {
    const params = {
      view,
      collegeId,
      studentId,
      creatorId,
      search: searchTerm,
      status,
      category,
      page,
      pageSize,
    };

    const { data } = await api.get("/superadmin/courses", { params });

    return data?.data ?? data;
  },
  create: async (payload) => {
    const { data } = await api.post("/superadmin/courses", payload);
    return data;
  },
  update: async (id, payload) => {
    const { data } = await api.patch(`/superadmin/courses/${id}`, payload);
    return data;
  },
  remove: async (id) => {
    const { data } = await api.delete(`/superadmin/courses/${id}`);
    return data;
  },
  assign: async (
    courseId,
    { collegeId, departmentId = null, capacity = null }
  ) => {
    const { data } = await api.post(`/superadmin/courses/${courseId}/assign`, {
      collegeId,
      departmentId,
      capacity,
    });
    return data;
  },
  unassign: async (courseId, { collegeId, departmentId = null }) => {
    const { data } = await api.delete(
      `/superadmin/courses/${courseId}/unassign`,
      {
        data: { collegeId, departmentId },
      }
    );
    return data;
  },
  assignments: async (courseId) => {
    const { data } = await api.get(
      `/superadmin/courses/${courseId}/assignments`
    );
    return data;
  },
};

export const collegesAPI = {
  list: (params = {}) =>
    api.get("/colleges", { params, headers: makeHeaders() }),
  getColleges: () => api.get(`/colleges`, { headers: makeHeaders() }),
  getCollege: (id) => api.get(`/colleges/${id}`, { headers: makeHeaders() }),
  createCollege: (data) =>
    api.post(`/colleges`, data, { headers: makeHeaders() }),
  updateCollege: (id, data) =>
    api.put(`/colleges/${id}`, data, { headers: makeHeaders() }),
  deleteCollege: (id) =>
    api.delete(`/colleges/${id}`, { headers: makeHeaders() }),
  getDepartmentsForCollege: (collegeId) =>
    api.get(`/colleges/${collegeId}/departments`),
  // 🔽 NEW: permissions
  getPermissions: (collegeId) =>
    api.get(`/colleges/${collegeId}/permissions`, { headers: makeHeaders() }),

  updateLimits: (collegeId, { studentLimit, adminLimit, instructorLimit }) =>
    api.put(
      `/colleges/${collegeId}/permissions/limits`,
      { studentLimit, adminLimit, instructorLimit },
      { headers: makeHeaders() }
    ),

  updateAdminPermissions: (collegeId, userId, patch) =>
    api.put(`/colleges/${collegeId}/permissions/admin/${userId}`, patch, {
      headers: makeHeaders(),
    }),
};

export const chaptersAPI = {
  listByCourse: (courseId) =>
    api.get(`/courses/${courseId}/chapters`).then((r) => r.data),
  getChapterDetails: (chapterId) =>
    api.get(`/chapters/${chapterId}/view`).then((r) => r.data),
  create: (courseId, payload) =>
    api.post(`/courses/${courseId}/chapters`, payload).then((r) => r.data),
  update: (chapterId, payload) =>
    api.patch(`/chapters/${chapterId}`, payload).then((r) => r.data),
  remove: (chapterId) =>
    api.delete(`/chapters/${chapterId}`).then((r) => r.data),
};

export const uploadsAPI = {
  uploadFile: async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await api.post("/uploads/file", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data.url;
  },

  uploadBase64: async (dataUrl) => {
    const res = await api.post("/uploads/base64", { dataUrl });
    // support { url } or raw string
    return res.data?.url ? { url: res.data.url } : res.data;
  },
};

export const enrollmentsAPI = {
  list: (params = {}) =>
    api.get("/enrollments", { params }).then((r) => r.data),

  listByStudent: (studentId) =>
    api.get("/enrollments", { params: { studentId } }).then((r) => r.data),

  listByCourseAdmin: (courseId) =>
    api.get(`/courses/${courseId}/enrollments`).then((r) => r.data),

  enrollStudent: (courseId, studentId) =>
    api
      .post(`/courses/${courseId}/enrollments`, { studentId })
      .then((r) => r.data),

  unenroll: (enrollmentId) =>
    api.delete(`/enrollments/${enrollmentId}`).then((r) => r.data),

  listSelf: () => api.get("/enrollments/self").then((r) => r.data),

  listEnrollmentRequestsForCourse: (courseId) =>
    api.get(`/courses/${courseId}/enrollment-requests`).then((r) => r.data),

  requestEnrollment: (courseId) =>
    api.post(`/courses/${courseId}/enrollment-requests`).then((r) => r.data),

  listSelfEnrollmentRequests: () =>
    api.get("/enrollment-requests/me").then((r) => r.data),

  updateEnrollmentRequestStatus: (requestId, nextStatus) =>
    api
      .patch(`/enrollment-requests/${requestId}`, { nextStatus })
      .then((r) => r.data),

  bulkUpdateEnrollmentRequests: (ids, nextStatus) =>
    api
      .patch("/enrollment-requests/bulk", { ids, nextStatus })
      .then((r) => r.data),

  listInstructorRequests: () =>
    api.get("/instructor/enrollment-requests").then((r) => r.data),
};

export const assessmentsAPI = {
  listByChapter: (chapterId) =>
    api.get(`/chapters/${chapterId}/assessments`).then((r) => r.data),

  createForChapter: (chapterId, payload) =>
    api.post(`/chapters/${chapterId}/assessments`, payload).then((r) => r.data),

  getFinalTestByCourse: (courseId) =>
    api.get(`/courses/${courseId}/final-test`).then((r) => r.data),

  createFinalTest: (courseId, payload) =>
    api.post(`/courses/${courseId}/final-test`, payload).then((r) => r.data),

  get: (id) => api.get(`/assessments/${id}`).then((r) => r.data),

  getCertificate: (id) =>
    api.get(`/assessments/${id}/certificate`).then((r) => r.data),

  list: (params) => api.get("/assessments", { params }).then((r) => r.data),

  submitAttempt: (assessmentId, answers) =>
    api
      .post(`/assessments/${assessmentId}/attempts`, { answers })
      .then((r) => r.data),

  update: (id, payload) =>
    api.put(`/assessments/${id}`, payload).then((r) => r.data),

  remove: (id) => api.delete(`/assessments/${id}`).then((r) => r.data),
};

export const progressAPI = {
  completeChapter: (chapterId) =>
    api.post(`/progress/chapters/${chapterId}/complete`).then((r) => r.data),
  completedChapters: (courseId) =>
    api.get(`/progress/course/${courseId}/completed`).then((r) => r.data),
  courseSummary: (courseId) =>
    api.get(`/progress/course/${courseId}/summary`).then((r) => r.data),
  dashboard: () => api.get(`/progress/dashboard`).then((r) => r.data),
};

export const departmentAPI = {
  getDepartments: () => api.get("/auth/signup/departments-catalog"),
  postDepartment: (data) => api.post("auth/departments", data),
};

export default api;