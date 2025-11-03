import React, { useEffect, useMemo, useState, forwardRef } from "react";
import { Link } from "react-router-dom";
import {
  Shield,
  Users,
  GraduationCap,
  BookOpen,
  Target,
  Activity,
  Award,
  BarChart3,
  Search,
  UserCheck,
  UserX,
  Eye,
  Edit,
  Plus,
  Download,
  X,
  Check,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  superAdminAPI,
  coursesAPI,
  adminScopedAPI,
  authAPI,
  FALLBACK_THUMB,
  enrollmentsAPI,
  assessmentsAPI,
} from "../services/api";
import useAuthStore from "../store/useAuthStore";

// const useAuthStore = () => ({
//   user: { fullName: "Admin User" },
//   token: "mock-jwt-token",
//   logout: () => console.log("Logged out"),
// });

const Button = forwardRef(
  (
    { variant = "primary", size = "md", className = "", children, ...props },
    ref
  ) => {
    const baseClasses =
      "inline-flex items-center justify-center rounded-md font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors";
    const variantClasses = {
      primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
      outline:
        "border border-gray-300 bg-transparent text-gray-700 hover:bg-gray-50",
      ghost: "bg-transparent text-gray-600 hover:bg-gray-100",
      danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
      accent:
        "bg-purple-600 text-white hover:bg-purple-700 focus:ring-purple-500",
    };
    const sizeClasses = {
      sm: "px-3 py-1.5 text-sm",
      md: "px-4 py-2 text-base",
      lg: "px-6 py-3 text-lg",
    };
    const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;
    return (
      <button ref={ref} className={classes} {...props}>
        {children}
      </button>
    );
  }
);

const Card = ({ className = "", children }) => (
  <div
    className={`bg-white shadow-sm rounded-lg border border-gray-200 ${className}`}
  >
    {children}
  </div>
);
Card.Header = ({ children }) => (
  <div className="p-4 sm:p-6 border-b border-gray-200">{children}</div>
);
Card.Title = ({ children }) => (
  <h3 className="text-lg font-semibold text-gray-800">{children}</h3>
);
Card.Content = ({ children, className = "" }) => (
  <div className={`p-4 sm:p-6 ${className}`}>{children}</div>
);

const Badge = ({
  variant = "default",
  size = "md",
  className = "",
  children,
}) => {
  const baseClasses =
    "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
  const variantClasses = {
    default: "bg-gray-100 text-gray-800",
    success: "bg-green-100 text-green-800",
    danger: "bg-red-100 text-red-800",
    warning: "bg-yellow-100 text-yellow-800",
    info: "bg-blue-100 text-blue-800",
  };
  const classes = `${baseClasses} ${variantClasses[variant]} ${className}`;
  return <span className={classes}>{children}</span>;
};

const Modal = ({ isOpen, onClose, title, children, size = "md" }) => {
  if (!isOpen) return null;
  const sizeClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
  };
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 transition-opacity"
      onClick={onClose}
    >
      <div
        className={`bg-white rounded-lg shadow-xl m-4 w-full ${sizeClasses[size]} transform transition-all`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between p-4 border-b rounded-t">
          <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm p-1.5 ml-auto inline-flex items-center"
          >
            <X size={20} />
            <span className="sr-only">Close modal</span>
          </button>
        </div>
        <div className="p-6 space-y-6">{children}</div>
      </div>
    </div>
  );
};

const Progress = ({ value = 0, variant = "primary", size = "md" }) => {
  const variantClasses = {
    primary: "bg-blue-600",
    success: "bg-green-500",
    accent: "bg-purple-500",
  };
  return (
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div
        className={`${variantClasses[variant]} h-2 rounded-full`}
        style={{ width: `${value}%` }}
      ></div>
    </div>
  );
};


const uiAvatar = (name = "User") =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(
    name
  )}&background=random`;

const fmtDate = (d) => {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString();
  } catch {
    return "—";
  }
};


export default function AdminDashboardPage() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const [userFilter, setUserFilter] = useState("all");
  const [courseFilter, setCourseFilter] = useState("all");

  const [selectedUsers, setSelectedUsers] = useState([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState(null);

  const [overview, setOverview] = useState({
    courses: 0,
    students: 0,
    instructors: 0,
    avgCourseCompletion: 0,
    users: 0
  });
  const [instructors, setInstructors] = useState([]);
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [studentStats, setStudentStats] = useState({});
  const [loadingStats, setLoadingStats] = useState(false);
  const [loadedTabs, setLoadedTabs] = useState(new Set(["overview"]));

  const [loadingStates, setLoadingStates] = useState({
    overview: false,
    instructors: false,
    students: false,
    courses: false,
  });

  const normRole = (r) => String(r || "").replace(/[^A-Z]/gi, "").toUpperCase();

  async function makeAdminAdapter() {
    const { user } = useAuthStore.getState();
    const role = normRole(user?.role);
    const collegeId = user?.collegeId || user?.college?.id || null;

    const normalizeTotals = (raw) => {
      const t = raw?.overview?.totals || raw?.overview || raw?.totals || raw || {};
      return { data: { totals: t } };
    };

    return {
      overview: async () => {
        if (role === "SUPERADMIN") {
          const data = await superAdminAPI.getOverview();

          return data;
        }
        const data = await adminScopedAPI.overview(collegeId);
        return data;

      },

      instructors: async () => {
        if (role === "SUPERADMIN") {
          const data = await superAdminAPI.getInstructors();   // array
          return { data };
        }
        const data = await adminScopedAPI.instructors(collegeId); // { data: [...] } or array
        return Array.isArray(data) ? { data } : { data: data?.data ?? [] };
      },

      students: async () => {
        if (role === "SUPERADMIN") {
          const data = await superAdminAPI.getStudents();      // array
          return { data };
        }
        const data = await adminScopedAPI.students(collegeId); // { data: [...] }
        return Array.isArray(data) ? { data } : { data: data?.data ?? [] };
      },

      courses: async () => {
        if (role === "SUPERADMIN") {
          const list = await coursesAPI.list();                // superadmin sees all
          return { data: Array.isArray(list) ? list : list?.data ?? [] };
        }
        const data = await adminScopedAPI.courses(collegeId);  // { data: [...] }
        return Array.isArray(data) ? { data } : { data: data?.data ?? [] };
      },
    };
  }

  const instructorCourseIndex = useMemo(() => {
    const map = {};
    for (const c of courses || []) {
      const ids =
        c.instructorIds ||
        (Array.isArray(c.instructors) ? c.instructors.map((x) => x.id) : []) ||
        [];
      ids.forEach((id) => {
        if (!id) return;
        if (!map[id]) map[id] = { count: 0, titles: [] };
        map[id].count += 1;
        if (c.title) map[id].titles.push(c.title);
      });
    }
    return map;
  }, [courses]);

  const courseTitleById = useMemo(() => {
    const map = {};
    for (const c of courses) map[c.id] = c.title || c.id;
    return map;
  }, [courses]);

  const stats = useMemo(() => {
    const ov = overview?.totals ?? overview ?? {};
    const totalInstructors =
      (typeof ov.instructors === "number" ? ov.instructors : undefined) ??
      instructors.length;
    const totalStudents =
      (typeof ov.students === "number" ? ov.students : undefined) ??
      students.length;
    const totalCourses =
      (typeof ov.courses === "number" ? ov.courses : undefined) ??
      courses.length;

    const activeUsers =
      [...instructors, ...students].filter((u) => u.isActive).length || 0;

    const completionRate = Math.floor(Math.random() * 30) + 70;
    const averageGrade = Math.floor(Math.random() * 20) + 75;

    return {
      totalInstructors,
      totalStudents,
      totalCourses,
      activeUsers,
      completionRate,
      averageGrade,
    };
  }, [overview, instructors, students, courses,]);

  // useEffect(() => {
  //   (async () => {
  //     try {
  //       setLoading(true);

  //       const api = await makeAdminAdapter();

  //       const [ov, ins, stu, cr] = await Promise.all([
  //         api.overview(),
  //         api.instructors(),
  //         api.students(),
  //         api.courses(),
  //       ]);

  //       setOverview(ov?.data?.overview ?? { courses: 0, students: 0, instructors: 0 });

  //       const normInstructors = (ins?.data || []).map((i) => ({
  //         id: i.id,
  //         fullName: i.fullName || i.name || "Instructor",
  //         email: i.email,
  //         isActive: !!i.isActive,
  //         lastLogin: i.lastLogin,
  //         avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(i.fullName || i.name || "I")}&background=random`,
  //         assignedCourses: i.assignedCourses || null,
  //       }));

  //       const normStudents = (stu?.data || []).map((s) => ({
  //         id: s.id,
  //         fullName: s.fullName || s.name || "Student",
  //         email: s.email,
  //         isActive: !!s.isActive,
  //         lastLogin: s.lastLogin,
  //         avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(s.fullName || s.name || "S")}&background=random`,
  //         assignedCourses: s.assignedCourses || [],
  //         progress: {},
  //       }));

  //       setInstructors(normInstructors);
  //       setStudents(normStudents);

  //       const normCourses = (cr?.data || []).map((c) => ({
  //         id: c.id,
  //         title: c.title,
  //         description: c.description || "",
  //         thumbnail: c.thumbnail || FALLBACK_THUMB,
  //         status: c.status || "draft",
  //         level: c.level ?? null,
  //         totalModules: c.totalModules ?? 0,
  //         totalChapters: c.totalChapters ?? 0,
  //         studentCount: c.studentCount || 0,
  //         instructorNames: c.instructorNames || [],
  //         instructorIds: c.instructorIds || (Array.isArray(c.instructors) ? c.instructors.map((x) => x.id) : []),
  //       }));

  //       setCourses(normCourses);
  //     } catch (e) {
  //       console.error("Admin dashboard load error:", e);
  //       toast.error("Failed to load admin dashboard data.");
  //     } finally {
  //       setLoading(false);
  //     }
  //   })();
  // }, []);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const api = await makeAdminAdapter();
        const ov = await api.overview();
        setOverview(ov?.data?.overview ?? { courses: 0, students: 0, instructors: 0 });
        setLoadedTabs(new Set(["overview"]));
      } catch (e) {
        console.error("Admin overview load error:", e);
        toast.error("Failed to load overview.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);


  const handleTabChange = async (tabName) => {
    // Skip if already loaded
    if (loadedTabs.has(tabName)) {
      return;
    }

    try {
      // Set loading for this specific tab
      setLoadingStates(prev => ({ ...prev, [tabName]: true }));
      const api = await makeAdminAdapter();

      if (tabName === "instructors") {
        const ins = await api.instructors();
        const normInstructors = (ins?.data || []).map((i) => ({
          id: i.id,
          fullName: i.fullName || i.name || "Instructor",
          email: i.email,
          isActive: !!i.isActive,
          lastLogin: i.lastLogin,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(i.fullName || i.name || "I")}&background=random`,
          assignedCourses: i.assignedCourses || null,
        }));
        setInstructors(normInstructors);
      }

      if (tabName === "students") {
        const stu = await api.students();
        const normStudents = (stu?.data || []).map((s) => ({
          id: s.id,
          fullName: s.fullName || s.name || "Student",
          email: s.email,
          isActive: !!s.isActive,
          lastLogin: s.lastLogin,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(s.fullName || s.name || "S")}&background=random`,
          assignedCourses: s.assignedCourses || [],
          progress: {},
        }));
        setStudents(normStudents);

        const statsMap = (stu?.data || []).reduce((acc, s) => {
          acc[s.id] = {
            finalTests: s.finalTests || 0,
            interviews: s.interviews || 0,
            certifications: s.certifications || 0,
          };
          return acc;
        }, {});
        setStudentStats(statsMap);
      }

      if (tabName === "courses") {
        const cr = await api.courses();
        const normCourses = (cr?.data || []).map((c) => ({
          id: c.id,
          title: c.title,
          description: c.description || "",
          thumbnail: c.thumbnail || FALLBACK_THUMB,
          status: c.status || "draft",
          level: c.level ?? null,
          totalModules: c.totalModules ?? 0,
          totalChapters: c.totalChapters ?? 0,
          studentCount: c.studentCount || 0,
          instructorNames: c.instructorNames || [],
          instructorIds: c.instructorIds || (Array.isArray(c.instructors) ? c.instructors.map((x) => x.id) : []),
        }));
        setCourses(normCourses);
      }

      setLoadedTabs(prev => new Set([...prev, tabName]));
    } catch (e) {
      console.error(`Error loading ${tabName}:`, e);
      toast.error(`Failed to load ${tabName}.`);
    } finally {
      // Clear loading for this specific tab
      setLoadingStates(prev => ({ ...prev, [tabName]: false }));
    }
  };

  const filteredInstructors = useMemo(() => {
    const q = (searchTerm || "").toLowerCase();
    return instructors.filter((i) => {
      const matchesSearch =
        (i.fullName || "").toLowerCase().includes(q) ||
        (i.email || "").toLowerCase().includes(q);
      const matchesFilter =
        userFilter === "all" ||
        (userFilter === "active" && i.isActive) ||
        (userFilter === "inactive" && !i.isActive);
      return matchesSearch && matchesFilter;
    });
  }, [instructors, searchTerm, userFilter]);

  const filteredStudents = useMemo(() => {
    const q = (searchTerm || "").toLowerCase();
    return students.filter((s) => {
      const matchesSearch =
        (s.fullName || "").toLowerCase().includes(q) ||
        (s.email || "").toLowerCase().includes(q);
      const matchesFilter =
        userFilter === "all" ||
        (userFilter === "active" && s.isActive) ||
        (userFilter === "inactive" && !s.isActive);
      return matchesSearch && matchesFilter;
    });
  }, [students, searchTerm, userFilter]);

  const filteredCourses = useMemo(() => {
    const q = (searchTerm || "").toLowerCase();
    return courses.filter((c) => {
      const matchesSearch =
        (c.title || "").toLowerCase().includes(q) ||
        (c.description || "").toLowerCase().includes(q);
      const matchesFilter =
        courseFilter === "all" ||
        (courseFilter === "published" && c.status === "published") ||
        (courseFilter === "draft" && c.status === "draft");
      return matchesSearch && matchesFilter;
    });
  }, [courses, searchTerm, courseFilter]);

  const toggleUserSelection = (id) => {
    setSelectedUsers((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleUserAction = async (userId, action) => {
    try {
      if (action === "activate" || action === "deactivate") {
        const active = action === "activate";
        setInstructors((arr) =>
          arr.map((u) => (u.id === userId ? { ...u, isActive: active } : u))
        );
        setStudents((arr) =>
          arr.map((u) => (u.id === userId ? { ...u, isActive: active } : u))
        );
        toast.success(`User ${active ? "activated" : "deactivated"}`);
      } else if (action === "view" || action === "edit") {
        const u =
          [...instructors, ...students].find((x) => x.id === userId) || null;
        setSelectedUser(u);
        setShowUserModal(true);
      }
    } catch (e) {
      toast.error(`Failed to ${action} user`);
    }
  };

  // useEffect(() => {
  //   const loadStudents = async () => {
  //     try {
  //       setLoading(true);


  //       const { user } = useAuthStore.getState();
  //       const collegeId = user?.collegeId || user?.college?.id;

  //       if (!collegeId) {
  //         toast.error("College ID not found");
  //         return;
  //       }

  //       console.log("Loading students for college:", collegeId);

  //       // Get students - already includes stats
  //       const response = await adminScopedAPI.students(collegeId);
  //       const studentsData = response.data || response;

  //       console.log("Students with stats:", studentsData);

  //       setStudents(studentsData);

  //       // Convert to stats map for easier lookup
  //       const statsMap = studentsData.reduce((acc, s) => {
  //         acc[s.id] = {
  //           finalTests: s.finalTests || 0,
  //           interviews: s.interviews || 0,
  //           certifications: s.certifications || 0,
  //         };
  //         return acc;
  //       }, {});

  //       setStudentStats(statsMap);
  //       setLoadingStats(false);
  //     } catch (e) {
  //       console.error("Error loading students:", e);
  //       toast.error("Failed to load students");
  //     } finally {
  //       setLoading(false);
  //     }
  //   };

  //   loadStudents();
  // }, []);


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  const SimpleLoader = () => (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <div className="inline-block">
          <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        </div>
        <p className="mt-4 text-gray-600 text-sm">Loading...</p>
      </div>
    </div>
  );


  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-100 rounded-full flex items-center justify-center">
                <Shield size={20} className="text-red-600 sm:w-6 sm:h-6" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                  Admin Dashboard
                </h1>
                <p className="text-sm sm:text-base text-gray-600">
                  Welcome{user?.fullName ? `, ${user.fullName}` : ""}.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 sm:gap-3">


              <Link to="/courses/create">
                <Button size="sm" className="w-full sm:w-auto">
                  <Plus size={16} className="mr-2" />
                  Create Course
                </Button>
              </Link>

              <Link to="/register" state={{ allowWhenLoggedIn: true }}>
                <Button size="sm" className="w-full sm:w-auto">
                  <Plus size={16} className="mr-2" />
                  Add User
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Top stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
          <Card className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center">
              <div className="w-8 ea-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users
                  size={16}
                  className="text-blue-600 sm:w-5 sm:h-5 lg:w-6 lg:h-6"
                />
              </div>
              <div className="ml-2 sm:ml-3 lg:ml-4">
                <p className="text-xs sm:text-sm font-medium text-gray-600">
                  Instructors
                </p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
                  {overview.instructors}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center">
              <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <GraduationCap
                  size={16}
                  className="text-green-600 sm:w-5 sm:h-5 lg:w-6 lg:h-6"
                />
              </div>
              <div className="ml-2 sm:ml-3 lg:ml-4">
                <p className="text-xs sm:text-sm font-medium text-gray-600">
                  Students
                </p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
                  {overview.students}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center">
              <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <BookOpen
                  size={16}
                  className="text-purple-600 sm:w-5 sm:h-5 lg:w-6 lg:h-6"
                />
              </div>
              <div className="ml-2 sm:ml-3 lg:ml-4">
                <p className="text-xs sm:text-sm font-medium text-gray-600">
                  Courses
                </p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
                  {overview.courses}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center">
              <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Activity
                  size={16}
                  className="text-yellow-600 sm:w-5 sm:h-5 lg:w-6 lg:h-6"
                />
              </div>
              <div className="ml-2 sm:ml-3 lg:ml-4">
                <p className="text-xs sm:text-sm font-medium text-gray-600">
                  Active Users
                </p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
                  {overview.users}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center">
              <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                <Target
                  size={16}
                  className="text-indigo-600 sm:w-5 sm:h-5 lg:w-6 lg:h-6"
                />
              </div>
              <div className="ml-2 sm:ml-3 lg:ml-4">
                <p className="text-xs sm:text-sm font-medium text-gray-600">
                  Completion
                </p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
                  {stats.completionRate}%
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center">
              <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <Award
                  size={16}
                  className="text-red-600 sm:w-5 sm:h-5 lg:w-6 lg:h-6"
                />
              </div>
              <div className="ml-2 sm:ml-3 lg:ml-4">
                <p className="text-xs sm:text-sm font-medium text-gray-600">
                  Avg Grade
                </p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
                  {stats.averageGrade}%
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Tabs */}
        {/* <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-4 sm:space-x-6 lg:space-x-8 overflow-x-auto">
              {[
                { id: "overview", name: "Overview", icon: BarChart3 },
                { id: "instructors", name: "Instructors", icon: Users },
                { id: "students", name: "Students", icon: GraduationCap },
                { id: "courses", name: "Courses", icon: BookOpen },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setSelectedUsers([]);
                  }}
                  className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === tab.id
                    ? "border-primary-500 text-primary-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                >
                  <tab.icon size={16} />
                  <span className="hidden sm:inline">{tab.name}</span>
                  <span className="sm:hidden">{tab.name.charAt(0)}</span>
                </button>
              ))}
            </nav>
          </div>
        </div> */}

        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-4 sm:space-x-6 lg:space-x-8 overflow-x-auto">
              {[
                { id: "overview", name: "Overview", icon: BarChart3 },
                { id: "instructors", name: "Instructors", icon: Users },
                { id: "students", name: "Students", icon: GraduationCap },
                { id: "courses", name: "Courses", icon: BookOpen },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setSelectedUsers([]);
                    handleTabChange(tab.id); // Add this line
                  }}
                  className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === tab.id
                    ? "border-primary-500 text-primary-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                >
                  <tab.icon size={16} />
                  <span className="hidden sm:inline">{tab.name}</span>
                  <span className="sm:hidden">{tab.name.charAt(0)}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Overview */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <Card.Header>
                <Card.Title>Recent Activity</Card.Title>
              </Card.Header>
              <Card.Content>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <UserCheck size={16} className="text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        New student enrolled
                      </p>
                      <p className="text-xs text-gray-500">2 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <BookOpen size={16} className="text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        Course published
                      </p>
                      <p className="text-xs text-gray-500">5 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <Award size={16} className="text-purple-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        Certificate issued
                      </p>
                      <p className="text-xs text-gray-500">1 day ago</p>
                    </div>
                  </div>
                </div>
              </Card.Content>
            </Card>

            <Card>
              <Card.Header>
                <Card.Title>Performance Metrics</Card.Title>
              </Card.Header>
              <Card.Content>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">
                        Course Completion Rate
                      </span>
                      <span className="font-medium">
                        {stats.completionRate}%
                      </span>
                    </div>
                    <Progress value={stats.completionRate} size="sm" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">
                        Student Satisfaction
                      </span>
                      <span className="font-medium">92%</span>
                    </div>
                    <Progress value={92} size="sm" variant="success" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Instructor Rating</span>
                      <span className="font-medium">88%</span>
                    </div>
                    <Progress value={88} size="sm" variant="accent" />
                  </div>
                </div>
              </Card.Content>
            </Card>
          </div>
        )}

        {/* Instructors */}
        {activeTab === "instructors" && (

          <div>
            {loadingStates[activeTab] ? (
              <SimpleLoader />
            ) : (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 mb-6">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                    <div className="relative">
                      <Search
                        size={20}
                        className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                      />
                      <input
                        type="text"
                        placeholder="Search instructors..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full sm:w-auto pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                    <select
                      value={userFilter}
                      onChange={(e) => setUserFilter(e.target.value)}
                      className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="all">All Status</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                            Instructor
                          </th>
                          <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider">
                            Courses Assigned
                          </th>
                          <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                            Course Names
                          </th>
                          <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider">
                            Last Login
                          </th>
                          <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredInstructors.map((instructor) => (
                          <tr key={instructor.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <img
                                  src={instructor.avatar}
                                  alt={instructor.fullName}
                                  className="w-9 h-9 rounded-full mr-3"
                                />
                                <div>
                                  <div className="font-medium text-gray-900">
                                    {instructor.fullName}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {instructor.email}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${instructor.isActive
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                                  }`}
                              >
                                {instructor.isActive ? "Active" : "Inactive"}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-50 text-blue-700 text-sm font-medium">
                                {instructor.assignedCourses?.length ??
                                  (instructorCourseIndex[instructor.id]?.count ||
                                    0)}
                              </span>
                            </td>

                            <td className="px-6 py-4 text-sm text-gray-500">
                              {instructorCourseIndex[instructor.id]?.titles
                                ?.length ? (
                                instructorCourseIndex[instructor.id].titles.join(
                                  ", "
                                )
                              ) : (
                                <span className="text-gray-500">No Course</span>
                              )}
                            </td>

                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                              {fmtDate(instructor.lastLogin)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex items-center justify-end space-x-2">
                                <button
                                  onClick={() =>
                                    handleUserAction(instructor.id, "edit")
                                  }
                                  className="text-blue-600 hover:text-blue-900"
                                  title="Edit"
                                >
                                  <Edit size={16} />
                                </button>
                                <button
                                  onClick={() =>
                                    handleUserAction(
                                      instructor.id,
                                      instructor.isActive
                                        ? "deactivate"
                                        : "activate"
                                    )
                                  }
                                  className={`${instructor.isActive
                                    ? "text-green-600 hover:text-green-900"
                                    : "text-red-600 hover:text-red-900"
                                    }`}
                                  title={
                                    instructor.isActive ? "Deactivate" : "Activate"
                                  }
                                >
                                  {instructor.isActive ? (
                                    <Check size={16} />
                                  ) : (
                                    <X size={16} />
                                  )}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Students */}
        {activeTab === "students" && (
          <div>
            {loadingStates[activeTab] ? (
              <SimpleLoader />
            ) : (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 mb-6">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                    <div className="relative">
                      <Search
                        size={20}
                        className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                      />
                      <input
                        type="text"
                        placeholder="Search students..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full sm:w-auto pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                    <select
                      value={userFilter}
                      onChange={(e) => setUserFilter(e.target.value)}
                      className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="all">All Status</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                    {selectedUsers.length > 0 && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            selectedUsers.forEach((id) =>
                              handleUserAction(id, "activate")
                            )
                          }
                          className="w-full sm:w-auto"
                        >
                          <UserCheck size={16} className="mr-1" />
                          <span className="hidden sm:inline">
                            Activate ({selectedUsers.length})
                          </span>
                          <span className="sm:hidden">Activate</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            selectedUsers.forEach((id) =>
                              handleUserAction(id, "deactivate")
                            )
                          }
                          className="w-full sm:w-auto"
                        >
                          <UserX size={16} className="mr-1" />
                          Deactivate
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                            Student
                          </th>
                          {/* <th className="px-6 py-3 pl-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                        Course
                      </th> */}
                          <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider">
                            Enrolled
                          </th>
                          <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider">
                            Final Tests
                          </th>
                          <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider">
                            Interviews
                          </th>
                          <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider">
                            Certifications
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {/* {filteredStudents.map((s) => {
                      const finalTests = Math.floor(Math.random() * 5);
                      const interviews = Math.floor(Math.random() * 5);
                      const certifications = Math.floor(Math.random() * 5);

                      return (
                        <tr key={s.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <img
                                src={s.avatar}
                                alt={s.fullName}
                                className="w-9 h-9 rounded-full mr-3"
                              />
                              <div>
                                <div className="font-medium text-gray-900">
                                  {s.fullName}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {s.email}
                                </div>
                              </div>
                            </div>
                          </td>
                          
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-50 text-blue-700 text-sm font-medium">
                              {s.assignedCourses?.length || 0}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className="text-blue-700 font-medium">
                              {finalTests}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className="text-green-600 font-medium">
                              {interviews}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className="text-purple-600 font-medium">
                              {certifications}
                            </span>
                          </td>
                        </tr>
                      );
                    })} */}

                        {filteredStudents.map((s) => {
                          const stats = studentStats[s.id] || {
                            finalTests: 0,
                            interviews: 0,
                            certifications: 0
                          };

                          return (
                            <tr key={s.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <img
                                    src={s.avatar}
                                    alt={s.fullName}
                                    className="w-9 h-9 rounded-full mr-3"
                                  />
                                  <div>
                                    <div className="font-medium text-gray-900">
                                      {s.fullName}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                      {s.email}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-50 text-blue-700 text-sm font-medium">
                                  {s.assignedCourses?.length || 0}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <span className="text-blue-700 font-medium">
                                  {loadingStats ? "..." : stats.finalTests}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <span className="text-green-600 font-medium">
                                  {loadingStats ? "..." : stats.interviews}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <span className="text-purple-600 font-medium">
                                  {loadingStats ? "..." : stats.certifications}
                                </span>
                              </td>
                            </tr>
                          );
                        })}

                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Courses */}
        {activeTab === "courses" && (
          <div>
            {loadingStates[activeTab] ? (
              <SimpleLoader />
            ) : (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 mb-6">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                    <div className="relative">
                      <Search
                        size={20}
                        className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                      />
                      <input
                        type="text"
                        placeholder="Search courses..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full sm:w-auto pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                    <select
                      value={courseFilter}
                      onChange={(e) => setCourseFilter(e.target.value)}
                      className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="all">All Status</option>
                      <option value="published">Published</option>
                      <option value="draft">Draft</option>
                    </select>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toast("Export coming soon!")}
                      className="w-full sm:w-auto"
                    >
                      <Download size={16} className="mr-2" />
                      Export
                    </Button>
                    <Link to="/courses/create" className="w-full sm:w-auto">
                      <Button size="sm" className="w-full sm:w-auto">
                        <Plus size={16} className="mr-2" />
                        <span className="hidden sm:inline">Create Course</span>
                        <span className="sm:hidden">Create</span>
                      </Button>
                    </Link>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {filteredCourses.map((course) => (
                    <Card
                      key={course.id}
                      className="overflow-hidden hover:shadow-lg transition-shadow"
                    >
                      <div className="aspect-video bg-gray-100">
                        <img
                          src={course.thumbnail || FALLBACK_THUMB}
                          alt={course.title}
                          className="w-full h-full object-cover"
                          onError={(e) => (e.currentTarget.src = FALLBACK_THUMB)}
                        />
                      </div>
                      <Card.Content className="p-4 sm:p-6">
                        <div className="flex items-center justify-between mb-2">
                          <Badge
                            variant={
                              course.status === "published" ? "success" : "warning"
                            }
                            size="sm"
                          >
                            {course.status}
                          </Badge>
                          <Badge variant="info" size="sm">
                            {course.level ?? "—"}
                          </Badge>
                        </div>

                        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                          {course.title}
                        </h3>
                        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                          {course.description}
                        </p>

                        <div className="flex items-center justify-between text-xs sm:text-sm text-gray-500 mb-4">
                          <span>{course.totalModules} modules</span>
                          <span>{course.totalChapters} chapters</span>
                          <span>{course.studentCount} students</span>
                        </div>

                        <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedCourse(course);
                              setShowCourseModal(true);
                            }}
                            className="w-full sm:w-auto"
                          >
                            <Eye size={16} className="mr-1" />
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toast.info("Course editor coming soon!")}
                            className="w-full sm:w-auto"
                          >
                            <Edit size={16} className="mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toast.info("Analytics coming soon!")}
                            className="w-full sm:w-auto"
                          >
                            <BarChart3 size={16} />
                          </Button>
                        </div>
                      </Card.Content>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* User Modal */}
      <Modal
        isOpen={showUserModal}
        onClose={() => setShowUserModal(false)}
        title={selectedUser?.fullName}
        size="lg"
      >
        {selectedUser && (
          <div className="space-y-6 p-4 sm:p-0">
            <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
              <img
                src={selectedUser.avatar}
                alt={selectedUser.fullName}
                className="w-16 h-16 rounded-full mx-auto sm:mx-0"
              />
              <div className="text-center sm:text-left">
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedUser.fullName}
                </h3>
                <p className="text-gray-600 break-all">{selectedUser.email}</p>
                <div className="flex flex-wrap justify-center sm:justify-start items-center gap-2 mt-2">
                  <Badge variant="info" size="sm">
                    {instructors.some((i) => i.id === selectedUser.id)
                      ? "instructor"
                      : "student"}
                  </Badge>
                  <Badge
                    variant={selectedUser.isActive ? "success" : "danger"}
                    size="sm"
                  >
                    {selectedUser.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Login
                </label>
                <p className="text-sm text-gray-900">
                  {fmtDate(selectedUser.lastLogin)}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assigned Courses
                </label>
                <p className="text-sm text-gray-900">
                  {selectedUser.assignedCourses?.length ??
                    instructorCourseIndex[selectedUser.id]?.count ??
                    0}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
              <Button
                onClick={() =>
                  handleUserAction(
                    selectedUser.id,
                    selectedUser.isActive ? "deactivate" : "activate"
                  )
                }
                variant={selectedUser.isActive ? "danger" : "accent"}
                className="w-full sm:w-auto"
              >
                {selectedUser.isActive ? "Deactivate User" : "Activate User"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowUserModal(false)}
                className="w-full sm:w-auto"
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Course Modal */}
      <Modal
        isOpen={showCourseModal}
        onClose={() => setShowCourseModal(false)}
        title={selectedCourse?.title}
        size="lg"
      >
        {selectedCourse && (
          <div className="space-y-6 p-4 sm:p-0">
            <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
              <img
                src={selectedCourse.thumbnail || FALLBACK_THUMB}
                alt={selectedCourse.title}
                className="w-20 h-20 rounded-lg object-cover mx-auto sm:mx-0"
                onError={(e) => (e.currentTarget.src = FALLBACK_THUMB)}
              />
              <div className="text-center sm:text-left">
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedCourse.title}
                </h3>
                <p className="text-gray-600">
                  {selectedCourse.instructorNames?.join(", ") || "—"}
                </p>
                <div className="flex flex-wrap justify-center sm:justify-start items-center gap-2 mt-2">
                  <Badge variant="info" size="sm">
                    {selectedCourse.level ?? "—"}
                  </Badge>
                  <Badge
                    variant={
                      selectedCourse.status === "published"
                        ? "success"
                        : "warning"
                    }
                    size="sm"
                  >
                    {selectedCourse.status}
                  </Badge>
                </div>
              </div>
            </div>

            <p className="text-gray-600 text-sm sm:text-base">
              {selectedCourse.description || "—"}
            </p>

            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="text-xl font-bold text-blue-600">
                  {selectedCourse.totalModules}
                </div>
                <div className="text-sm text-blue-800">Modules</div>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <div className="text-xl font-bold text-green-600">
                  {selectedCourse.totalChapters}
                </div>
                <div className="text-sm text-green-800">Chapters</div>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <div className="text-xl font-bold text-purple-600">
                  {selectedCourse.studentCount}
                </div>
                <div className="text-sm text-purple-800">Students</div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
              <Button
                onClick={() => toast.info("Course editor coming soon!")}
                className="w-full sm:w-auto"
              >
                <Edit size={16} className="mr-2" />
                Edit Course
              </Button>
              <Button
                variant="outline"
                onClick={() => toast.info("Analytics coming soon!")}
                className="w-full sm:w-auto"
              >
                <BarChart3 size={16} className="mr-2" />
                View Analytics
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowCourseModal(false)}
                className="w-full sm:w-auto"
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}