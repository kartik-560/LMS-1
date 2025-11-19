import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Shield,
  Building2,
  Users,
  BookOpen,
  Settings,
  School,
  Edit,
  Trash2,
  Award,
  Search,
  Save,
  RotateCcw,
  Pencil,
  Plus,
} from "lucide-react";
import { AssignCourseModal } from "./AssignCourseModal";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Badge from "../components/ui/Badge";
import Modal from "../components/ui/Modal";
import Tabs, {
  TabsList,
  TabsTrigger,
  TabsContent,
} from "../components/ui/Tabs";
import { useCallback } from "react";
import useAuthStore from "../store/useAuthStore";

import { superAdminAPI, coursesAPI, collegesAPI ,departmentAPI} from "../services/api";

const normalizeRole = (r) =>
  String(r || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z]/g, "_");

export default function SuperAdminDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
  const arr = (v) => (Array.isArray(v) ? v : []);
  const roleNorm = normalizeRole(user?.role);
  const isSuperAdmin = roleNorm === "SUPERADMIN";
  const isAdminOnly = roleNorm === "ADMIN";
  const isAdmin = isSuperAdmin || isAdminOnly;
  const [colleges, setColleges] = useState([]);
  const [allAdmins, setAllAdmins] = useState([]);
  const [allInstructors, setAllInstructors] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [allCourses, setAllCourses] = useState([]);
  const [systemAnalytics, setSystemAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCollegeId, setSelectedCollegeId] = useState(null);
  const [collegesSearch, setCollegesSearch] = useState("");
  const [collegeDetailTab, setCollegeDetailTab] = useState("instructors");
  const [selectedCollege, setSelectedCollege] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showCollegeModal, setShowCollegeModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [showCreateCollegeModal, setShowCreateCollegeModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [editingPermissions, setEditingPermissions] = useState({});
  const [studentSearch, setStudentSearch] = useState("");
  const [studentFilter, setStudentFilter] = useState("all");
  const [selectedFilterValue, setSelectedFilterValue] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState(null);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [unassigningId, setUnassigningId] = useState(null);
  const [collegeDetailVM, setCollegeDetailVM] = useState(null);
  const [collegeLoading, setCollegeLoading] = useState(false);
  const [collegeError, setCollegeError] = useState("");
  const [permRaw, setPermRaw] = useState([]);
  const [permLoading, setPermLoading] = useState(false);
 const [allDepartments, setAllDepartments] = useState([]);
const [loadingDepartments, setLoadingDepartments] = useState(false);

  const [permLimits, setPermLimits] = useState({
    studentLimit: 0,
    adminLimit: 0,
    instructorLimit: 0,
  });
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [collegeCertificateCounts, setCollegeCertificateCounts] = useState(
    new Map()
  );
  const [permAdmins, setPermAdmins] = useState([]);
  const [loadedTabs, setLoadedTabs] = useState(new Set(["colleges"]));
  const [activeTab, setActiveTab] = useState("colleges");
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [courseToAssign, setCourseToAssign] = useState(null);
  const [collegeDepartments, setCollegeDepartments] = useState([]);

  const asArray = (p) => {
    if (Array.isArray(p)) return p;
    if (p && typeof p === "object") {
      if (Array.isArray(p.data)) return p.data;
      if (Array.isArray(p.items)) return p.items;
      if (Array.isArray(p.results)) return p.results;
      if (p.data && typeof p.data === "object") {
        if (Array.isArray(p.data.items)) return p.data.items;
        if (Array.isArray(p.data.results)) return p.data.results;
      }
    }
    return [];
  };

  async function fetchPermissions(collegeId) {
    setPermLoading(true);
    try {
      const { data } = await collegesAPI.getPermissions(collegeId);
      const payload = data?.data ?? data ?? {};
      const limits = payload.limits ?? {
        studentLimit: 0,
        adminLimit: 0,
        instructorLimit: 0,
      };
      const permsRaw =
        payload.adminPermissions ?? payload.admins ?? payload.records ?? [];

      setPermLimits(limits);
      setPermRaw(permsRaw); // store raw
      // hydrate with whatever admins we already have in VM
      const vmAdmins = collegeDetailVM?.lists?.admins ?? [];
      setPermAdmins(hydrateAdminPerms(permsRaw, vmAdmins));
    } catch (e) {
      toast.error(
        e?.response?.data?.error || e.message || "Unable to load permissions"
      );
    } finally {
      setPermLoading(false);
    }
  }

  function hydrateAdminPerms(permsRaw, vmAdmins = []) {
    // index admins by id from VM (name/email/avatar/role)
    const adminIndex = new Map(
      (vmAdmins ?? []).map((a) => [
        a.id,
        {
          id: a.id,
          name: a.name || a.fullName || "Admin",
          email: a.email || "",
          avatar: a.avatar || "",
          role: String(a.role || "").toUpperCase() || "ADMIN",
        },
      ])
    );

    // map permissions by admin id
    const permsById = new Map();
    for (const r of permsRaw ?? []) {
      const id = r.userId || r.adminId || r.id;
      if (!id) continue;
      const p = r.permissions ?? {
        canCreateCourses: !!r.canCreateCourses,
        canCreateTests: !!r.canCreateTests,
        canManageTests: !!r.canManageTests,
      };
      permsById.set(id, p);

      // ensure we have a base profile even if VM doesn't
      if (!adminIndex.has(id)) {
        adminIndex.set(id, {
          id,
          name: "Admin",
          email: "",
          avatar: "",
          role: "ADMIN",
        });
      }
    }

    // union of all ids (VM admins + permission rows)
    const allIds = Array.from(adminIndex.keys()).sort((a, b) =>
      (adminIndex.get(a).name || "").localeCompare(adminIndex.get(b).name || "")
    );

    return allIds.map((id) => ({
      ...adminIndex.get(id),
      permissions: {
        canCreateCourses: false,
        canCreateTests: false,
        canManageTests: false,
        ...(permsById.get(id) || {}),
      },
    }));
  }

  useEffect(() => {
    if (!selectedCollegeId || collegeDetailTab !== "permissions") return;

    const id = collegeDetailVM?.college?.id;
    if (id) {
      fetchPermissions(id);
    }
  }, [collegeDetailTab, selectedCollegeId, collegeDetailVM?.college?.id]);

  useEffect(() => {
    const vmAdmins = collegeDetailVM?.lists?.admins ?? [];
    setPermAdmins(hydrateAdminPerms(permRaw, vmAdmins));
  }, [collegeDetailVM?.lists?.admins, permRaw]);

  async function saveLimits() {
    try {
      await collegesAPI.updateLimits(collegeDetailVM.college.id, permLimits);
      toast.success("Limits saved");
    } catch (e) {
      toast.error(
        e?.response?.data?.error || e.message || "Failed to save limits"
      );
    }
  }

  async function saveAdminToggle(userId, patch) {
    try {

      await collegesAPI.updateAdminPermissions(
        collegeDetailVM.college.id,
        userId,
        patch
      );
      setPermAdmins((prev) =>
        prev.map((a) =>
          a.id === userId
            ? { ...a, permissions: { ...a.permissions, ...patch } }
            : a
        )
      );

      toast.success("Permission updated successfully");
    } catch (e) {
      console.error("Error updating permission:", e);
      toast.error(e?.response?.data?.error || e.message || "Failed to update");
    }
  }

  const fetchCollegePermissions = async () => {
    try {
      setPermLoading(true);

      const permResponse = await collegesAPI.getPermissions(collegeDetailVM.college.id);
      const { limits, adminPermissions } = permResponse.data;

      setPermLimits(limits);
      setPermAdmins(adminPermissions);

    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to load permissions");
    } finally {
      setPermLoading(false);
    }
  };


  useEffect(() => {
    console.log('🔥 useEffect triggered', {
      tab: collegeDetailTab,
      collegeId: collegeDetailVM?.college?.id
    });

    if (collegeDetailTab === "permissions" && collegeDetailVM?.college?.id) {
      console.log('🔥 Calling fetchCollegePermissions');
      fetchCollegePermissions();
    } else {
      console.log('❌ Conditions not met');
    }
  }, [collegeDetailTab, collegeDetailVM?.college?.id]);


  const handleApiError = (err, fallback) => {
    const msg =
      err?.response?.data?.message ||
      err?.response?.data?.error ||
      err?.message ||
      fallback;

    if (err?.response?.status === 403) {
      toast.error("Forbidden: You need ADMIN or SUPER_ADMIN role.");
    } else {
      toast.error(msg);
    }
    console.error(msg, err);
  };

  useEffect(() => {
    if (!isAdmin) {
      toast.error("You are not authorized to view the Super Admin dashboard.");
      navigate("/dashboard", { replace: true });
      return;
    }
    fetchInitialData();
  }, []);

  const normalizeUsers = (arr = []) =>
    arr.map((u) => ({
      id: u.id,
      name: u.name || u.fullName || "",
      email: u.email || "",
      role: String(u.role || "").toLowerCase(),
      isActive: !!u.isActive,
      permissions: u.permissions || {},
      collegeId: u.collegeId || "",
      collegeName: u.collegeName || u.college?.name || "N/A",
      departmentId: u.departmentId || "",
      departmentName: u.departmentName || u.department?.name || "N/A",
      avatar:
        u.avatar ||
        `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(
          u.name || u.email || "U"
        )}`,
    }));

  const getFilteredUsers = (users, defaultRole) => {
    let filtered = Array.isArray(users) ? users : [];

    if (filterRole !== "all") {
      filtered = filtered.filter(
        (u) => String(u.role || defaultRole || "").toLowerCase() === filterRole
      );
    }
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          String(u.name || "")
            .toLowerCase()
            .includes(q) ||
          String(u.email || "")
            .toLowerCase()
            .includes(q)
      );
    }
    return filtered;
  };
  const extractOverview = (o) => o?.overview || o?.data?.overview || o || {};

  const normalizeOverview = (ov) => ({
    totalAdmins:
      ov.totalAdmins ?? ov.admins ?? ov.adminCount ?? ov.countAdmins ?? 0,
    totalInstructors:
      ov.totalInstructors ?? ov.instructors ?? ov.instructorCount ?? 0,
    totalStudents: ov.totalStudents ?? ov.students ?? ov.studentCount ?? 0,
    totalCourses: ov.totalCourses ?? ov.courses ?? ov.courseCount ?? 0,
    totalColleges: ov.totalColleges ?? ov.colleges ?? ov.collegeCount ?? 0,
  });

  const fetchInitialData = async () => {
    try {
      setLoading(true);

      const [overviewRaw, collegesRaw] = await Promise.all([
        superAdminAPI.getOverview(),
        collegesAPI.list().then((r) => r.data),
      ]);

      const ov = extractOverview(overviewRaw);
      const normalizedOv = normalizeOverview(ov);
      const colleges = asArray(collegesRaw);

      setColleges(colleges);
      setSystemAnalytics({
        overview: normalizedOv,
        performanceMetrics:
          overviewRaw?.performanceMetrics ??
          overviewRaw?.data?.performanceMetrics ??
          null,
        collegeBreakdown:
          overviewRaw?.courseBreakdown ??
          overviewRaw?.data?.courseBreakdown ??
          null,
      });
    } catch (err) {
      handleApiError(err, "Failed to load system data");
    } finally {
      setLoading(false);
    }
  };

  // Fetch admins data
  const fetchAdmins = async () => {
    if (loadedTabs.has("admins")) return; // Already loaded

    try {
      setLoadingUsers(true);
      const adminsRaw = await superAdminAPI.getAdmins();
      const admins = asArray(adminsRaw);

      setAllAdmins(
        normalizeUsers(admins).map((a) => ({
          ...a,
          avatar:
            a.avatar ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(
              a.name || "Admin"
            )}&background=random`,
        }))
      );

      setLoadedTabs((prev) => new Set([...prev, "admins"]));
    } catch (err) {
      handleApiError(err, "Failed to load admins");
    } finally {
      setLoadingUsers(false);
    }
  };

  // Fetch instructors data
  const fetchInstructors = async () => {
    if (loadedTabs.has("instructors")) return; // Already loaded

    try {
      setLoadingUsers(true);
      const instructorsRaw = await superAdminAPI.getInstructors();
      const instructors = asArray(instructorsRaw);

      const normalizedInstructors = normalizeUsers(instructors).map((i) => ({
        ...i,
        avatar:
          i.avatar ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(
            i.name || "Instructor"
          )}&background=random`,
      }));

      setAllInstructors(normalizedInstructors);
      setLoadedTabs((prev) => new Set([...prev, "instructors"]));
    } catch (err) {
      handleApiError(err, "Failed to load instructors");
    } finally {
      setLoadingUsers(false);
    }
  };

  // Fetch students data
  const fetchStudents = async () => {
    if (loadedTabs.has("students")) return; // Already loaded

    try {
      setLoadingUsers(true);
      const studentsRaw = await superAdminAPI.getStudents();
      const students = asArray(studentsRaw);
      const normalizedStudents = normalizeUsers(students);

      setAllStudents(
        normalizedStudents.map((s) => {
          const originalStudent = students.find((st) => st.id === s.id);
          return {
            ...s,
            enrolledCoursesCount: originalStudent?.enrolledCoursesCount || 0,
            avatar:
              s.avatar ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(
                s.name || "Student"
              )}&background=random`,
          };
        })
      );

      setLoadedTabs((prev) => new Set([...prev, "students"]));
    } catch (err) {
      handleApiError(err, "Failed to load students");
    } finally {
      setLoadingUsers(false);
    }
  };

  // Fetch courses data
  const fetchCourses = async () => {
    if (loadedTabs.has("assignments")) return;

    try {
      setLoadingCourses(true);
      const coursesRaw = await coursesAPI.list();
      const courses = asArray(coursesRaw);

      setAllCourses(
        courses.map((c) => ({
          ...c,
          thumbnail: c.thumbnail || "https://picsum.photos/seed/course/300/200",
          status: c.status || "draft",
        }))
      );

      setLoadedTabs((prev) => new Set([...prev, "assignments"]));
    } catch (err) {
      handleApiError(err, "Failed to load courses");
    } finally {
      setLoadingCourses(false);
    }
  };

const fetchDepartments = async () => {
  if (loadedTabs.has("departments")) return;

  try {
    setLoadingDepartments(true);
    const response = await departmentAPI.getDepartments();
    
    // Try different possible structures
    let departments = [];
      
    if (response?.data?.data?.items) {
      departments = response.data.data.items;
      
    } else if (response?.data?.items) {
      departments = response.data.items;
      console.log("Found at: response.data.items");
    } else if (Array.isArray(response?.data?.data)) {
      departments = response.data.data;
  
    } else if (Array.isArray(response?.data)) {
      departments = response.data;
   
    }
    
   
    
    setAllDepartments(departments);
    setLoadedTabs((prev) => new Set([...prev, "departments"]));
  } catch (error) {
    console.error("Error fetching departments:", error);
    toast.error("Failed to load departments");
    setAllDepartments([]);
  } finally {
    setLoadingDepartments(false);
  }
};



  const handleTabChange = async (tabValue) => {
    setActiveTab(tabValue);

    // Fetch data based on which tab is selected
    switch (tabValue) {
      case "admins":
        await fetchAdmins();
        break;
      case "instructors":
        await fetchInstructors();
        break;
      case "students":
        await fetchStudents();
        break;
      case "assignments":
        await fetchCourses();
        break;
        case "departments":  // 👈 ADD THIS CASE
      await fetchDepartments();
      break;
      case "colleges":
        // Already loaded on initial mount
        break;
      default:
        break;
    }
  };

  const collegesWithCounts = useMemo(() => {
    if (!colleges) return [];


    return colleges.map((college) => {

    return colleges.map(college => {


      const instructorCount = college.instructorCount || 0;
      const studentCount = college.studentCount || 0;
      const courseCount = college.courseCount || 0;
      const certificatesCount = college.certificatesGenerated || 0;

      return {
        ...college,
        instructorCount,
        studentCount,
        enrolledStudents: studentCount,
        courseCount,
        certificatesGenerated: certificatesCount,
      };
    });

  }, [colleges]);

  },
    [colleges]);


  const filteredColleges = useMemo(() => {
    const q = (collegesSearch || "").toLowerCase();
    const list = colleges || []; // 👈 Use the new enriched list
    if (!q) return list;
    return list.filter(
      (c) =>
        (c.name || "").toLowerCase().includes(q) ||
        (c.email || "").toLowerCase().includes(q)
    );
  }, [colleges, collegesSearch]);

  // useEffect(() => {
  //   if (!selectedCollegeId) return;

  //   const run = async () => {
  //     setCollegeLoading(true);
  //     setCollegeError("");
  //     try {
  //       const [collegeRes, deptRes] = await Promise.all([
  //         collegesAPI.getCollege(selectedCollegeId),
  //         collegesAPI
  //           .getDepartmentsForCollege(selectedCollegeId)
  //           .catch((err) => {
  //             console.warn("Departments fetch failed:", err);
  //             return { data: [] };
  //           }),
  //       ]);

  //       const { data: raw } = collegeRes;
  //       const payload = raw?.data ?? raw ?? {};

  //       const co = payload?.college ?? {};
  //       const lists = payload?.lists ?? {};
  //       const counts = payload?.counts ?? {};

  //       const courses = lists?.courses ?? [];
  //       const instructors = lists?.instructors ?? [];
  //       const students = lists?.students ?? [];
  //       const admins = lists?.admins ?? [];

  //       // Handle departments response - could be { data: [...] } or just [...]
  //       let departments = [];
  //       if (deptRes) {
  //         if (Array.isArray(deptRes)) {
  //           departments = deptRes;
  //         } else if (deptRes.data && Array.isArray(deptRes.data)) {
  //           departments = deptRes.data;
  //         } else if (deptRes.data && Array.isArray(deptRes.data.data)) {
  //           departments = deptRes.data.data;
  //         }
  //       }

  //       console.log("Departments fetched:", departments);

  //       const idToTitle = new Map(
  //         courses.map((c) => [c.id, c.title || c.name || "Untitled Course"])
  //       );

  //       const normInstructors = instructors.map((i) => {
  //         const assigned = i.assignedCourseIds || i.assignedCourses || [];
  //         return {
  //           ...i,
  //           role: String(i.role || "").toUpperCase(),
  //           collegeName: co?.name || "",
  //           assignedCourseIds: assigned,
  //           assignedCourseNames: assigned
  //             .map((cid) => idToTitle.get(cid))
  //             .filter(Boolean),
  //         };
  //       });

  //       const normStudents = students.map((s) => {
  //         const enrolled = s.enrolledCoursesCount || 0;
  //         return {
  //           ...s,
  //           role: String(s.role || "").toUpperCase(),
  //           enrolledCourses: enrolled || 0,
  //           finalTestsTaken: s.finalTestAttemptsCount || 0,
  //           interviewsAttempted: s.assessmentAttempts || 0,
  //           certificationsCompleted: s.certificatesCount || 0,
  //         };
  //       });

  //       const normAdmins = admins.map((a) => {
  //         const assigned = a.assignedCourseIds || a.assignedCourses || [];
  //         return {
  //           ...a,
  //           role: String(a.role || "").toUpperCase(), // ✅ if UI filters by "ADMIN"
  //           collegeName: co?.name || "",
  //           assignedCourseIds: assigned,
  //           assignedCourseNames: assigned
  //             .map((cid) => idToTitle.get(cid))
  //             .filter(Boolean),
  //         };
  //       });

  //       setCollegeDetailVM({
  //         college: co,
  //         lists: {
  //           courses,
  //           instructors: normInstructors,
  //           students: normStudents,
  //           admins: normAdmins,
  //         },
  //         counts,
  //       });

  //       setCollegeDepartments(departments);

  //       console.log("payload:", payload);
  //     } catch (e) {
  //       setCollegeError(e?.message || "Failed to load college");
  //     } finally {
  //       setCollegeLoading(false);
  //     }
  //   };

  //   run();
  // }, [selectedCollegeId]);

useEffect(() => {
  if (!selectedCollegeId) return;

  const run = async () => {
    setCollegeLoading(true);
    setCollegeError("");
    try {
      const [collegeRes, deptRes] = await Promise.all([
        collegesAPI.getCollege(selectedCollegeId),
        collegesAPI.getDepartmentsForCollege(selectedCollegeId).catch(err => {
          console.warn("Departments fetch failed:", err);
          return { data: [] };
        })
      ]);

      const { data: raw } = collegeRes;
      const payload = raw?.data ?? raw ?? {};

      const co = payload?.college ?? {};
      const lists = payload?.lists ?? {};
      const counts = payload?.counts ?? {};

      const courses = lists?.courses ?? [];
      const instructors = lists?.instructors ?? [];
      const students = lists?.students ?? [];
      const admins = lists?.admins ?? [];

      // ✅ Handle departments response with counts
      let departments = [];
      if (deptRes) {
        // Extract the array from various response structures
        const rawDepts = deptRes?.data?.data?.items 
                      || deptRes?.data?.data 
                      || deptRes?.data?.items
                      || deptRes?.data 
                      || deptRes;
        
        if (Array.isArray(rawDepts)) {
          departments = rawDepts;
        }
      }
      
      console.log("Departments fetched:", departments);

      const idToTitle = new Map(
        courses.map((c) => [c.id, c.title || c.name || "Untitled Course"])
      );

      const normInstructors = instructors.map((i) => {
        const assigned = i.assignedCourseIds || i.assignedCourses || [];
        return {
          ...i,
          role: String(i.role || "").toUpperCase(),
          collegeName: co?.name || "",
          assignedCourseIds: assigned,
          assignedCourseNames: assigned.map((cid) => idToTitle.get(cid)).filter(Boolean),
        };
      });

      const normStudents = students.map((s) => {
        const enrolled = s.enrolledCoursesCount || 0;
        return {
          ...s,
          role: String(s.role || "").toUpperCase(),
          enrolledCourses: enrolled || 0,
          finalTestsTaken: s.finalTestAttemptsCount || 0,
          interviewsAttempted: s.assessmentAttempts || 0,
          certificationsCompleted: s.certificatesCount || 0,
        };
      });

      const normAdmins = admins.map((a) => {
        const assigned = a.assignedCourseIds || a.assignedCourses || [];
        return {
          ...a,
          role: String(a.role || "").toUpperCase(),
          collegeName: co?.name || "",
          assignedCourseIds: assigned,
          assignedCourseNames: assigned.map((cid) => idToTitle.get(cid)).filter(Boolean),
        };
      });

      setCollegeDetailVM({
        college: co,
        lists: {
          courses,
          instructors: normInstructors,
          students: normStudents,
          admins: normAdmins,
        },
        counts,
      });

      setCollegeDepartments(departments);

      console.log("payload:", payload);

    } catch (e) {
      setCollegeError(e?.message || "Failed to load college");
    } finally {
      setCollegeLoading(false);
    }
  };

  run();
}, [selectedCollegeId]);

  const handleOpenAssignModal = (course) => {
    setCourseToAssign(course);
    setIsAssignModalOpen(true);
  };

  const handleCloseAssignModal = () => {
    setCourseToAssign(null);
    setIsAssignModalOpen(false);
  };

  const handleAssignSuccess = () => {
    handleCloseAssignModal();
  };

  const getCourseInstructors = useCallback(
    (courseId) =>
      (allInstructors || []).filter(
        (i) =>
          Array.isArray(i.assignedCourses) &&
          i.assignedCourses.includes(courseId)
      ),
    [allInstructors]
  );
  const getCourseStudents = useCallback(
    (courseId) =>
      (allStudents || []).filter(
        (s) =>
          Array.isArray(s.assignedCourses) &&
          s.assignedCourses.includes(courseId)
      ),
    [allStudents]
  );

  const goEdit = useCallback(
    (courseId) => navigate(`/courses/${courseId}/edit`),
    [navigate]
  );

  const canEditCourse = useCallback(
    (course) => {
      if (!course) return false;
      if (isSuperAdmin) return true;

      if (isAdminOnly) return true;

      const uid = user?.id;
      return course.creatorId === uid || course.managerId === uid;
    },
    [isSuperAdmin, isAdminOnly, user?.id]
  );

  const getFilterOptions = useCallback(() => {
    if (studentFilter === "college") {
      return (collegesWithCounts || []).map((c) => c.name).filter(Boolean);
    }
    if (studentFilter === "course") {
      return (allCourses || []).map((c) => c.title).filter(Boolean);
    }
    return [];
  }, [studentFilter, collegesWithCounts, allCourses]);

  const getFilteredStudents = useCallback(() => {
    let filtered = allStudents || [];

    if (studentSearch) {
      const q = studentSearch.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          (s.name || "").toLowerCase().includes(q) ||
          (s.email || "").toLowerCase().includes(q)
      );
    }

    if (studentFilter !== "all" && selectedFilterValue) {
      filtered = filtered.filter((student) => {
        // No need to filter by courses since backend handles enrollment count
        // Simply return students and filter by college if needed

        if (studentFilter === "college") {
          return (
            student.collegeId === selectedFilterValue ||
            student.collegeName === selectedFilterValue
          );
        }

        return true;
      });
    }

    return filtered;
  }, [allStudents, studentSearch, studentFilter, selectedFilterValue]);

  const savePermissions = async () => {
    try {
      await superAdminAPI.updateUserPermissions(
        selectedUser.id,
        editingPermissions
      );

      if (
        String(selectedUser.role).toLowerCase() === "admin" ||
        String(selectedUser.role).toUpperCase() === "SUPER_ADMIN"
      ) {
        setAllAdmins((prev) =>
          prev.map((a) =>
            a.id === selectedUser.id
              ? { ...a, permissions: editingPermissions }
              : a
          )
        );
      } else if (String(selectedUser.role).toLowerCase() === "instructor") {
        setAllInstructors((prev) =>
          prev.map((i) =>
            i.id === selectedUser.id
              ? { ...i, permissions: editingPermissions }
              : i
          )
        );
      }

      toast.success("Permissions updated successfully");
      setShowPermissionsModal(false);
      setSelectedUser(null);
      setEditingPermissions({});
    } catch (err) {
      handleApiError(err, "Failed to update permissions");
    }
  };

  const handleUnassign = async (course) => {
    if (
      !window.confirm(
        `Are you sure you want to unassign "${course.title}" from this college?`
      )
    ) {
      return;
    }

    setUnassigningId(course.id);
    try {
      await coursesAPI.unassign(course.id, {
        collegeId: selectedCollegeId,
        departmentId: course.departmentId || null,
      });

      toast.success("Course unassigned successfully.");
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to unassign course.");
      console.error("Unassign failed:", err);
    } finally {
      setUnassigningId(null);
    }
  };

  const handleDeleteStudent = (student) => {
    setStudentToDelete(student);
    setShowDeleteModal(true);
  };

  const confirmDeleteStudent = async () => {
    if (!studentToDelete) return;
    try {
      await superAdminAPI.deleteStudent(studentToDelete.id);
      setAllStudents((prev) => prev.filter((s) => s.id !== studentToDelete.id));
      toast.success(
        `Student "${studentToDelete.name}" has been deleted successfully`
      );
    } catch (err) {
      handleApiError(err, "Failed to delete student");
    } finally {
      setShowDeleteModal(false);
      setStudentToDelete(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading system dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <div className="mb-6 lg:mb-8">
          <div className="flex flex-col gap-4">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="w-12 h-12 flex-none bg-purple-100 rounded-full flex items-center justify-center">
                  <Shield size={24} className="text-purple-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 truncate">
                    Super Admin Dashboard
                  </h1>
                  <p className="text-gray-600 mt-1 text-sm sm:text-base line-clamp-2">
                    System-wide management and analytics across all institutions
                  </p>
                </div>
              </div>
            </div>

            {/* Buttons Section */}
            <div className="grid grid-cols-2 gap-2 sm:gap-3 md:flex md:flex-wrap lg:gap-4">
              <Link to="/add_college" className="col-span-1">
                <Button size="sm" className="w-full">
                  <Plus size={16} className="mr-2" />
                  <span className="hidden sm:inline">Add College</span>
                  <span className="sm:hidden">College</span>
                </Button>
              </Link>

              <Link to="/courses/create" className="col-span-1">
                <Button size="sm" className="w-full">
                  <Plus size={16} className="mr-2" />
                  <span className="hidden sm:inline">Create Course</span>
                  <span className="sm:hidden">Course</span>
                </Button>
              </Link>

              <Link to="/create_finaltest" className="col-span-1">
                <Button size="sm" className="w-full">
                  <Plus size={16} className="mr-2" />
                  <span className="hidden sm:inline">Create Final Test</span>
                  <span className="sm:hidden">Test</span>
                </Button>
              </Link>

              <Link
                to="/register"
                state={{ allowWhenLoggedIn: true }}
                className="col-span-1"
              >
                <Button size="sm" className="w-full">
                  <Plus size={16} className="mr-2" />
                  <span className="hidden sm:inline">Add User</span>
                  <span className="sm:hidden">User</span>
                </Button>
              </Link>

              <Link to="/add_department" state={{ allowWhenLoggedIn: true }} className="col-span-1">
                <Button size="sm" className="w-full">
                  <Plus size={16} className="mr-2" />
                  <span className="hidden sm:inline">Add Department</span>
                  <span className="sm:hidden">college</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6 mb-6 lg:mb-8">
          <Card
            className={`p-4 sm:p-6 cursor-pointer hover:shadow-lg hover:scale-105 transition-all duration-200 ${
              activeTab === "colleges" ? "ring-2 ring-red-500 bg-red-50" : ""
            }`}
            onClick={() => setActiveTab("colleges")}
          >
            <div className="flex items-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-100 rounded-lg flex items-center justify-center flex-none">
                <School size={20} className="text-red-600 sm:w-6 sm:h-6" />
              </div>
              <div className="ml-3 sm:ml-4 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-600">
                  Colleges
                </p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 truncate">
                  {systemAnalytics?.overview?.totalColleges || 0}
                </p>
              </div>
            </div>
          </Card>

          <Card
            className={`p-4 sm:p-6 cursor-pointer hover:shadow-lg hover:scale-105 transition-all duration-200 ${
              activeTab === "permissions" ? "ring-2 ring-red-500 bg-red-50" : ""
            }`}
            onClick={() => setActiveTab("admins")}
          >
            <div className="flex items-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-100 rounded-lg flex items-center justify-center flex-none">
                <Shield size={20} className="text-red-600 sm:w-6 sm:h-6" />
              </div>
              <div className="ml-3 sm:ml-4 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-600">
                  Admins
                </p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 truncate">
                  {systemAnalytics?.overview?.totalAdmins || 0}
                </p>
              </div>
            </div>
          </Card>

          <Card
            className={`p-4 sm:p-6 cursor-pointer hover:shadow-lg hover:scale-105 transition-all duration-200 ${
              activeTab === "permissions"
                ? "ring-2 ring-green-500 bg-green-50"
                : ""
            }`}
            onClick={() => setActiveTab("instructors")}
          >
            <div className="flex items-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-lg flex items-center justify-center flex-none">
                <Award size={20} className="text-green-600 sm:w-6 sm:h-6" />
              </div>
              <div className="ml-3 sm:ml-4 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-600">
                  Instructors
                </p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 truncate">
                  {systemAnalytics?.overview?.totalInstructors || 0}
                </p>
              </div>
            </div>
          </Card>

          <Card
            className={`p-4 sm:p-6 cursor-pointer hover:shadow-lg hover:scale-105 transition-all duration-200 ${
              activeTab === "students"
                ? "ring-2 ring-purple-500 bg-purple-50"
                : ""
            }`}
            onClick={() => setActiveTab("students")}
          >
            <div className="flex items-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-none">
                <Users size={20} className="text-purple-600 sm:w-6 sm:h-6" />
              </div>
              <div className="ml-3 sm:ml-4 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-600">
                  Students
                </p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 truncate">
                  {systemAnalytics?.overview?.totalStudents || 0}
                </p>
              </div>
            </div>
          </Card>

          <Card
            className={`p-4 sm:p-6 cursor-pointer hover:shadow-lg hover:scale-105 transition-all duration-200 ${
              activeTab === "assignments"
                ? "ring-2 ring-yellow-500 bg-yellow-50"
                : ""
            }`}
            onClick={() => setActiveTab("assignments")}
          >
            <div className="flex items-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-yellow-100 rounded-lg flex items-center justify-center flex-none">
                <BookOpen size={20} className="text-yellow-600 sm:w-6 sm:h-6" />
              </div>
              <div className="ml-3 sm:ml-4 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-600">
                  Courses
                </p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 truncate">
                  {systemAnalytics?.overview?.totalCourses || 0}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <div className="mb-4 sm:mb-6 sticky top-0 z-10 bg-gray-50 -mx-4 px-4 sm:mx-0 sm:px-0">
            <div className="relative overflow-x-auto no-scrollbar">
              <TabsList
                className="flex gap-2 min-w-max snap-x snap-mandatory"
                aria-label="Dashboard sections"
              >
                <TabsTrigger
                  value="colleges"
                  className="whitespace-nowrap snap-start px-3 sm:px-4 py-2 text-xs sm:text-sm"
                >
                  Colleges
                </TabsTrigger>

                <TabsTrigger
                  value="admins"
                  className="whitespace-nowrap snap-start px-3 sm:px-4 py-2 text-xs sm:text-sm"
                >
                  Admins
                </TabsTrigger>
                <TabsTrigger
                  value="instructors"
                  className="whitespace-nowrap snap-start px-3 sm:px-4 py-2 text-xs sm:text-sm"
                >
                  Instructor
                </TabsTrigger>

                <TabsTrigger
                  value="students"
                  className="whitespace-nowrap snap-start px-3 sm:px-4 py-2 text-xs sm:text-sm"
                >
                  Students
                </TabsTrigger>

                <TabsTrigger
                  value="assignments"
                  className="whitespace-nowrap snap-start px-3 sm:px-4 py-2 text-xs sm:text-sm"
                >
                  Course Assignments
                </TabsTrigger>
                <TabsTrigger
                  value="departments"
                  className="whitespace-nowrap snap-start px-3 sm:px-4 py-2 text-xs sm:text-sm"
                >
                  Departments
                </TabsTrigger>
              </TabsList>
            </div>
          </div>

          {/* Colleges Tab */}
          <TabsContent value="colleges">
            {selectedCollegeId ? (
              <>
                {collegeLoading && (
                  <div className="flex items-center justify-center p-6">
                    <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
                  </div>
                )}

                {!collegeLoading && collegeError && (
                  <div className="p-6">
                    <p className="text-sm text-red-600">{collegeError}</p>
                    <button
                      onClick={() => setSelectedCollegeId(null)}
                      className="mt-3 text-primary-600 underline"
                    >
                      Back to College Directory
                    </button>
                  </div>
                )}

                {!collegeLoading &&
                  !collegeError &&
                  collegeDetailVM &&
                  (() => {
                    const { college, lists, counts } = collegeDetailVM || {};
                    const collegeCourses = lists?.courses ?? [];
                    const collegeInstructors = lists?.instructors ?? [];
                    const collegeStudents = lists?.students ?? [];

                    const stats = {
                      instructors: counts?.instructors ?? 0,
                      courses: counts?.courses ?? 0,
                      studentsAssigned: counts?.studentsAssigned ?? 0,
                      studentsEnrolled: counts?.studentsEnrolled ?? 0,
                      certificatesGenerated: counts?.certificatesGenerated ?? 0,
                    };

                    return (
                      <div className="space-y-6">
                        {/* Back Button */}
                        <div className="flex items-center gap-4">
                          <button
                            onClick={() => setSelectedCollegeId(null)}
                            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition"
                          >
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 19l-7-7 7-7"
                              />
                            </svg>
                            Back to College Directory
                          </button>
                        </div>

                        {/* College Stats Card */}
                        <Card className="p-6">
                          <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
                            {/* Avatar and College Info */}
                            <div className="flex items-center gap-4 flex-1">
                              <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100 flex-none">
                                <img
                                  src={
                                    college?.avatar ||
                                    `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                      college?.name || "College"
                                    )}&background=random`
                                  }
                                  alt={college?.name || "College"}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="min-w-0">
                                <h3 className="text-xl font-semibold text-gray-900 truncate">
                                  {college?.name || "—"}
                                </h3>
                                <p className="text-sm text-gray-600 truncate">
                                  {college?.email || ""}
                                </p>
                              </div>
                            </div>

                            {/* Permissions Button */}
                            <button
                              onClick={() => setCollegeDetailTab("permissions")}
                              className={`px-5 py-2 rounded-lg text-sm font-medium border transition shadow-sm whitespace-nowrap w-full md:w-auto ${
                                collegeDetailTab === "permissions"
                                  ? "border-primary-500 bg-primary-50 text-primary-600"
                                  : "border-gray-300 bg-white text-gray-600 hover:text-gray-800 hover:border-gray-400"
                              }`}
                            >
                              Permissions
                            </button>
                          </div>

                          {/* Correct 5-Column Stats Grid */}
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            <div className="text-center p-4 bg-red-50 rounded-lg">
                              <div className="text-2xl font-bold text-red-600">
                                {stats.instructors}
                              </div>
                              <div className="text-sm text-red-800">
                                Instructors
                              </div>
                            </div>
                            <div className="text-center p-4 bg-blue-50 rounded-lg">
                              <div className="text-2xl font-bold text-blue-600">
                                {stats.studentsAssigned}
                              </div>
                              <div className="text-sm text-blue-800">
                                Students
                              </div>
                            </div>
                            <div className="text-center p-4 bg-green-50 rounded-lg">
                              <div className="text-2xl font-bold text-green-600">
                                {stats.studentsEnrolled}
                              </div>
                              <div className="text-sm text-green-800">
                                Enrolled
                              </div>
                            </div>
                            <div className="text-center p-4 bg-yellow-50 rounded-lg">
                              <div className="text-2xl font-bold text-yellow-600">
                                {stats.courses}
                              </div>
                              <div className="text-sm text-yellow-800">
                                Courses
                              </div>
                            </div>
                            <div className="text-center p-4 bg-purple-50 rounded-lg">
                              <div className="text-2xl font-bold text-purple-600">
                                {stats.certificatesGenerated}
                              </div>
                              <div className="text-sm text-purple-800">
                                Certificates
                              </div>
                            </div>
                          </div>
                        </Card>

                        {/* College Sub-tabs */}
                        <Card className="p-4">
                          <div className="mb-4">
                            <div className="flex gap-2 border-b border-gray-200 overflow-x-auto">
                              <button
                                onClick={() => setCollegeDetailTab("admin")}
                                className={`px-4 py-2 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                                  collegeDetailTab === "admin"
                                    ? "border-primary-500 text-primary-600"
                                    : "border-transparent text-gray-500 hover:text-gray-700"
                                }`}
                              >
                                Admins (
                                {(collegeDetailVM?.lists?.admins ?? []).length})
                              </button>

                              <button
                                onClick={() =>
                                  setCollegeDetailTab("instructors")
                                }
                                className={`px-4 py-2 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                                  collegeDetailTab === "instructors"
                                    ? "border-primary-500 text-primary-600"
                                    : "border-transparent text-gray-500 hover:text-gray-700"
                                }`}
                              >
                                Instructors ({collegeInstructors.length})
                              </button>

                              <button
                                onClick={() => setCollegeDetailTab("students")}
                                className={`px-4 py-2 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                                  collegeDetailTab === "students"
                                    ? "border-primary-500 text-primary-600"
                                    : "border-transparent text-gray-500 hover:text-gray-700"
                                }`}
                              >
                                Students ({collegeStudents.length})
                              </button>

                              <button
                                onClick={() =>
                                  setCollegeDetailTab("departments")
                                }
                                className={`px-4 py-2 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                                  collegeDetailTab === "departments"
                                    ? "border-primary-500 text-primary-600"
                                    : "border-transparent text-gray-500 hover:text-gray-700"
                                }`}
                              >
                                Departments ({collegeDepartments?.length ?? 0})
                              </button>

                              <button
                                onClick={() => setCollegeDetailTab("courses")}
                                className={`px-4 py-2 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                                  collegeDetailTab === "courses"
                                    ? "border-primary-500 text-primary-600"
                                    : "border-transparent text-gray-500 hover:text-gray-700"
                                }`}
                              >
                                Courses ({collegeCourses.length})
                              </button>
                            </div>
                          </div>

                          {/* Instructors Tab */}
                          {collegeDetailTab === "instructors" && (
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="text-xs text-gray-500 uppercase border-b border-gray-200">
                                    <th className="py-3 px-3 text-left">
                                      Instructor
                                    </th>
                                    <th className="py-3 px-3 text-left">
                                      College
                                    </th>
                                    <th className="py-3 px-3 text-left">
                                      Assigned Courses
                                    </th>
                                    <th className="py-3 px-3 text-center">
                                      Actions
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {collegeInstructors.length === 0 ? (
                                    <tr>
                                      <td
                                        colSpan={4}
                                        className="py-8 text-center text-gray-500"
                                      >
                                        No instructors assigned to this college.
                                      </td>
                                    </tr>
                                  ) : (
                                    collegeInstructors.map((instructor) => (
                                      <tr
                                        key={instructor.id}
                                        className="border-b border-gray-100 hover:bg-gray-50 transition"
                                      >
                                        <td className="py-4 px-3">
                                          <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 flex-none">
                                              <img
                                                src={
                                                  instructor.avatar ||
                                                  `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                                    instructor.name ||
                                                      "Instructor"
                                                  )}&background=random`
                                                }
                                                alt={
                                                  instructor.name ||
                                                  "Instructor"
                                                }
                                                className="w-full h-full object-cover"
                                              />
                                            </div>
                                            <div className="min-w-0">
                                              <h4 className="font-medium text-gray-900 truncate">
                                                {instructor.name || "—"}
                                              </h4>
                                              <p className="text-sm text-gray-600 truncate">
                                                {instructor.email || ""}
                                              </p>
                                            </div>
                                          </div>
                                        </td>
                                        <td className="py-4 px-3">
                                          <span className="font-medium text-gray-900">
                                            {instructor.collegeName ||
                                              college?.name ||
                                              "—"}
                                          </span>
                                        </td>
                                        <td className="py-4 px-3">
                                          <div className="flex flex-wrap gap-1">
                                            {(
                                              instructor.assignedCourseNames ??
                                              []
                                            ).length > 0 ? (
                                              instructor.assignedCourseNames.map(
                                                (courseName, index) => (
                                                  <Badge
                                                    key={index}
                                                    variant="outline"
                                                    size="sm"
                                                  >
                                                    {courseName}
                                                  </Badge>
                                                )
                                              )
                                            ) : (
                                              <span className="text-gray-400 text-xs">
                                                No courses assigned
                                              </span>
                                            )}
                                          </div>
                                        </td>
                                        <td className="py-4 px-3">
                                          <div className="flex gap-2 justify-center">
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              onClick={() =>
                                                toast.info(
                                                  "Edit instructor coming soon"
                                                )
                                              }
                                              className="flex items-center gap-1"
                                            >
                                              <Edit size={14} />
                                              Edit
                                            </Button>
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              onClick={() =>
                                                toast.error(
                                                  "Delete instructor coming soon"
                                                )
                                              }
                                              className="flex items-center gap-1 text-red-600 hover:text-red-700 hover:border-red-300"
                                            >
                                              <Trash2 size={14} />
                                              Delete
                                            </Button>
                                          </div>
                                        </td>
                                      </tr>
                                    ))
                                  )}
                                </tbody>
                              </table>
                            </div>
                          )}

                          {/* Students Tab */}
                          {collegeDetailTab === "students" && (
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="text-xs text-gray-500 uppercase border-b border-gray-200">
                                    <th className="py-3 px-4 text-left">
                                      Student
                                    </th>
                                    <th className="py-3 px-4 text-left">
                                      Courses Enrolled
                                    </th>
                                    <th className="py-3 px-4 text-left">
                                      Final Tests
                                    </th>
                                    <th className="py-3 px-4 text-left">
                                      Interviews
                                    </th>
                                    <th className="py-3 px-4 text-left">
                                      Certifications
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {collegeStudents.length === 0 ? (
                                    <tr>
                                      <td
                                        colSpan={5}
                                        className="py-8 text-center text-gray-500"
                                      >
                                        No students enrolled in this college.
                                      </td>
                                    </tr>
                                  ) : (
                                    collegeStudents.map((student) => (
                                      <tr
                                        key={student.id}
                                        className="border-b border-gray-100 hover:bg-gray-50 transition"
                                      >
                                        <td className="py-4 px-4">
                                          <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 flex-none">
                                              <img
                                                src={
                                                  student.avatar ||
                                                  `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                                    student.name || "Student"
                                                  )}&background=random`
                                                }
                                                alt={student.name || "Student"}
                                                className="w-full h-full object-cover"
                                              />
                                            </div>
                                            <div className="min-w-0">
                                              <h4 className="font-medium text-gray-900 truncate">
                                                {student.name || "—"}
                                              </h4>
                                              <p className="text-sm text-gray-600 truncate">
                                                {student.email || ""}
                                              </p>
                                            </div>
                                          </div>
                                        </td>

                                        {/* Courses Enrolled: count + list in one cell */}
                                        <td className="py-4 px-4">
                                          <div className="text-center">
                                            <Badge variant="info" size="sm">
                                              {student.enrolledCoursesCount ??
                                                0}
                                            </Badge>
                                          </div>
                                        </td>

                                        <td className="py-4 px-4">
                                          <div className="text-center">
                                            <span className="font-medium text-blue-600">
                                              {student.finalTestsTaken ?? 0}
                                            </span>
                                          </div>
                                        </td>
                                        <td className="py-4 px-4">
                                          <div className="text-center">
                                            <span className="font-medium text-green-600">
                                              {student.interviewsAttempted ?? 0}
                                            </span>
                                          </div>
                                        </td>
                                        <td className="py-4 px-4">
                                          <div className="text-center">
                                            <span className="font-medium text-purple-600">
                                              {student.certificationsCompleted ??
                                                0}
                                            </span>
                                          </div>
                                        </td>
                                      </tr>
                                    ))
                                  )}
                                </tbody>
                              </table>
                            </div>
                          )}

                          {collegeDetailTab === "admin" && (
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="text-xs text-gray-500 uppercase border-b border-gray-200">
                                    <th className="py-3 px-4 text-left">
                                      Admin
                                    </th>
                                    <th className="py-3 px-4 text-left">
                                      College
                                    </th>
                                    <th className="py-3 px-4 text-left">
                                      Managed Courses
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(collegeDetailVM?.lists?.admins ?? [])
                                    .length === 0 ? (
                                    <tr>
                                      <td
                                        colSpan={3}
                                        className="py-8 text-center text-gray-500"
                                      >
                                        No admins assigned to this college.
                                      </td>
                                    </tr>
                                  ) : (
                                    collegeDetailVM.lists.admins.map(
                                      (admin) => (
                                        <tr
                                          key={admin.id}
                                          className="border-b border-gray-100 hover:bg-gray-50 transition"
                                        >
                                          <td className="py-4 px-4">
                                            <div className="flex items-center gap-3">
                                              <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 flex-none">
                                                <img
                                                  src={
                                                    admin.avatar ||
                                                    `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                                      admin.fullName || "Admin"
                                                    )}&background=random`
                                                  }
                                                  alt={
                                                    admin.fullName || "Admin"
                                                  }
                                                  className="w-full h-full object-cover"
                                                />
                                              </div>
                                              <div className="min-w-0">
                                                <h4 className="font-medium text-gray-900 truncate">
                                                  {admin.fullName || "—"}
                                                </h4>
                                                <p className="text-sm text-gray-600 truncate">
                                                  {admin.email || ""}
                                                </p>
                                              </div>
                                            </div>
                                          </td>
                                          <td className="py-4 px-4">
                                            <span className="font-medium text-gray-900">
                                              {admin.collegeName}
                                            </span>
                                          </td>
                                          <td className="py-4 px-4">
                                            <div className="flex flex-wrap gap-1">
                                              {(admin.assignedCourseNames ?? [])
                                                .length > 0 ? (
                                                admin.assignedCourseNames.map(
                                                  (cname, idx) => (
                                                    <Badge
                                                      key={idx}
                                                      variant="outline"
                                                      size="sm"
                                                    >
                                                      {cname}
                                                    </Badge>
                                                  )
                                                )
                                              ) : (
                                                <span className="text-gray-400 text-xs">
                                                  No courses assigned
                                                </span>
                                              )}
                                            </div>
                                          </td>
                                        </tr>
                                      )
                                    )
                                  )}
                                </tbody>
                              </table>
                            </div>
                          )}

                          {/* Courses Tab */}
                          {collegeDetailTab === "courses" && (
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b border-gray-200 text-xs uppercase text-gray-500">
                                    <th className="py-3 px-4 text-left">
                                      Course
                                    </th>
                                    <th className="py-3 px-4 text-left">
                                      Status
                                    </th>
                                    {/* Renamed Header */}
                                  </tr>
                                </thead>
                                <tbody>
                                  {collegeCourses.length === 0 ? (
                                    <tr>
                                      <td
                                        colSpan={3}
                                        className="py-8 text-center text-gray-500"
                                      >
                                        No courses assigned to this college.
                                      </td>
                                    </tr>
                                  ) : (
                                    collegeCourses.map((course) => {
                                      const active =
                                        (course.status || "").toLowerCase() ===
                                        "published";
                                      return (
                                        <tr
                                          key={course.id}
                                          className="border-b border-gray-100 transition hover:bg-gray-50"
                                        >
                                          <td className="py-4 px-4">
                                            <div className="flex items-center gap-3">
                                              <div className="w-12 h-12 flex-none overflow-hidden rounded-lg bg-gray-100">
                                                <img
                                                  src={
                                                    course.thumbnail ||
                                                    "/placeholder.png"
                                                  }
                                                  alt={course.title}
                                                  className="h-full w-full object-cover"
                                                />
                                              </div>
                                              <div className="min-w-0">
                                                <h4 className="truncate font-medium text-gray-900">
                                                  {course.title}
                                                </h4>
                                                {/* <p className="truncate text-sm text-gray-600">
                                                  {course.description || "No description"}
                                                </p> */}
                                              </div>
                                            </div>
                                          </td>

                                          <td className="py-4 px-4">
                                            <button
                                              onClick={() =>
                                                handleUnassign(course)
                                              }
                                              disabled={
                                                unassigningId === course.id
                                              }
                                              className="inline-flex h-8 items-center justify-center rounded-md bg-red-50 px-3 text-sm font-medium text-red-600 transition-colors hover:bg-red-100 disabled:pointer-events-none disabled:opacity-50"
                                            >
                                              {unassigningId === course.id ? (
                                                // Simple spinner for loading state
                                                <svg
                                                  className="h-4 w-4 animate-spin"
                                                  xmlns="http://www.w3.org/2000/svg"
                                                  fill="none"
                                                  viewBox="0 0 24 24"
                                                >
                                                  <circle
                                                    className="opacity-25"
                                                    cx="12"
                                                    cy="12"
                                                    r="10"
                                                    stroke="currentColor"
                                                    strokeWidth="4"
                                                  ></circle>
                                                  <path
                                                    className="opacity-75"
                                                    fill="currentColor"
                                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                                  ></path>
                                                </svg>
                                              ) : (
                                                "Unassign"
                                              )}
                                            </button>
                                          </td>
                                        </tr>
                                      );
                                    })
                                  )}
                                </tbody>
                              </table>
                            </div>
                          )}

                          {/* Departments Tab */}
                          {collegeDetailTab === "departments" && (
                            <div>
                              {collegeLoading ? (
                                <div className="flex items-center justify-center p-8">
                                  <p className="text-gray-600 text-lg">
                                    Loading departments...
                                  </p>
                                </div>
                              ) : (
                                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                  <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                      <thead className="bg-gray-50">
                                        <tr>
                                          <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                                            Department
                                          </th>
                                          <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider">
                                            Instructors
                                          </th>
                                          <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider">
                                            Students
                                          </th>
                                          <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider">
                                            Courses
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody className="bg-white divide-y divide-gray-200">
                                        {collegeDepartments.length === 0 ? (
                                          <tr>
                                            <td
                                              colSpan="4"
                                              className="px-6 py-12 text-center"
                                            >
                                              <Building2
                                                size={48}
                                                className="mx-auto text-gray-400 mb-2"
                                              />
                                              <p className="text-gray-600 font-medium">
                                                No departments found
                                              </p>
                                              <p className="text-gray-500 text-sm mt-1">
                                                This college hasn't added any
                                                departments yet.
                                              </p>
                                            </td>
                                          </tr>
                                        ) : (
                                          collegeDepartments.map((dept) => (
                                            <tr
                                              key={dept.id}
                                              className="hover:bg-gray-50"
                                            >
                                              <td className="px-6 py-4">
                                                <div className="flex items-center">
                                                  <Building2
                                                    size={20}
                                                    className="text-gray-400 mr-3 flex-shrink-0"
                                                  />
                                                  <div>
                                                    <div className="font-medium text-gray-900">
                                                      {dept.name ||
                                                        dept.departmentName ||
                                                        "—"}
                                                    </div>
                                                    {dept.description && (
                                                      <div className="text-sm text-gray-500 mt-0.5">
                                                        {dept.description}
                                                      </div>
                                                    )}
                                                  </div>
                                                </div>
                                              </td>
                                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-50 text-blue-700 text-sm font-medium">
                                                  {dept.instructorCount || 0}
                                                </span>
                                              </td>
                                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-50 text-green-700 text-sm font-medium">
                                                  {dept.studentCount || 0}
                                                </span>
                                              </td>
                                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-purple-50 text-purple-700 text-sm font-medium">
                                                  {dept.courseCount || 0}
                                                </span>
                                              </td>
                                            </tr>
                                          ))
                                        )}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {collegeDetailTab === "permissions" && (
                            <div className="space-y-6">
                              {/* Limits */}
                              <Card className="p-5">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                  Admin Permissions
                                </h3>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                  <div>
                                    <label className="block text-xs text-gray-600 mb-1">
                                      Max Instructors Allowed (0–20)
                                    </label>
                                    <Input
                                      type="number"
                                      min={0}
                                      max={20}
                                      value={permLimits.instructorLimit}
                                      onChange={(e) =>
                                        setPermLimits((s) => ({
                                          ...s,
                                          instructorLimit:
                                            Number(e.target.value) || 0,
                                        }))
                                      }
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs text-gray-600 mb-1">
                                      Max Admins Allowed
                                    </label>
                                    <Input
                                      type="number"
                                      min={0}
                                      value={permLimits.adminLimit}
                                      onChange={(e) =>
                                        setPermLimits((s) => ({
                                          ...s,
                                          adminLimit:
                                            Number(e.target.value) || 0,
                                        }))
                                      }
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs text-gray-600 mb-1">
                                      Max Students Allowed
                                    </label>
                                    <Input
                                      type="number"
                                      min={0}
                                      value={permLimits.studentLimit}
                                      onChange={(e) =>
                                        setPermLimits((s) => ({
                                          ...s,
                                          studentLimit:
                                            Number(e.target.value) || 0,
                                        }))
                                      }
                                    />
                                  </div>
                                </div>

                                <div className="mt-4">
                                  <Button
                                    onClick={saveLimits}
                                    disabled={permLoading}
                                  >
                                    {permLoading ? "Saving..." : "Save Changes"}
                                  </Button>
                                </div>
                              </Card>

                              {/* Admin toggles */}
                              <Card className="p-5">
                                <h4 className="text-base font-semibold text-gray-900 mb-4">
                                  Permission Settings
                                </h4>

                                {/* Loading state */}
                                {permLoading && (
                                  <p className="text-sm text-gray-500">
                                    Loading permissions…
                                  </p>
                                )}

                                <div className="space-y-4">
                                  {/* Empty state only when not loading */}
                                  {!permLoading && permAdmins.length === 0 && (
                                    <p className="text-sm text-gray-500">
                                      No admins found for this college.
                                    </p>
                                  )}

                                  {permAdmins.map((admin) => (
                                    <div
                                      key={admin.id}
                                      className="border border-gray-200 rounded-lg p-4"
                                    >
                                      <div className="flex items-start gap-4">
                                        {/* Avatar */}
                                        <div className="w-12 h-12 rounded-full overflow-hidden bg-cyan-400 flex-none flex items-center justify-center">
                                          <span className="text-white font-semibold text-lg">
                                            {admin.name?.charAt(0)?.toUpperCase() || "A"}
                                          </span>
                                        </div>

                                        {/* Info and Permissions */}
                                        <div className="min-w-0 flex-1">
                                          {/* Name and Email */}
                                          <div className="font-medium text-gray-900">
                                            {admin.name}
                                          </div>
                                          <div className="text-sm text-gray-600">
                                            {admin.email}
                                          </div>

                                          {/* Permissions Row */}
                                          <div className="mt-3 flex flex-wrap gap-3">
                                            {[
                                              {
                                                key: "canCreateCourses",
                                                label: "Create Courses",
                                              },
                                              {
                                                key: "canCreateTests",
                                                label: "Create FinalTests",
                                              },
                                              {
                                                key: "canManageTests",
                                                label: "Manage Tests",
                                              },
                                            ].map(({ key, label }) => {
                                              const checked = !!admin.permissions?.[key];
                                              return (
                                                <label
                                                  key={key}
                                                  className="flex items-center justify-between gap-3 border border-gray-200 rounded-lg px-4 py-2 hover:bg-gray-50 cursor-pointer transition"
                                                >
                                                  <span className="text-sm text-gray-700 whitespace-nowrap">
                                                    {label}
                                                  </span>
                                                  <input
                                                    type="checkbox"
                                                    className="h-5 w-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                                                    checked={checked}
                                                    disabled={permLoading}
                                                    onChange={(e) =>
                                                      saveAdminToggle(
                                                        admin.id,
                                                        {
                                                          [key]: e.target.checked,
                                                        }
                                                      )
                                                    }
                                                    aria-label={label}
                                                  />
                                                </label>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </Card>
                            </div>
                          )}
                        </Card>
                      </div>
                    );
                  })()}
              </>
            ) : (
              <Card className="p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  College Directory
                </h3>
                <div className="mb-4">
                  <div className="relative">
                    <Input
                      placeholder="Search colleges..."
                      value={collegesSearch}
                      onChange={(e) => setCollegesSearch(e.target.value)}
                      className="w-full pr-10"
                    />
                    <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-gray-500 uppercase border-b border-gray-200">
                        <th className="py-3 px-4 text-left">College</th>
                        <th className="py-3 px-4 text-left">Instructors</th>
                        <th className="py-3 px-4 text-left">Students</th>
                        <th className="py-3 px-4 text-left">Enrolled</th>
                        <th className="py-3 px-4 text-left">Courses</th>
                        <th className="py-3 px-4 text-left">Certificates</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(filteredColleges?.length ?? 0) === 0 ? (
                        <tr>
                          <td
                            colSpan={7}
                            className="py-8 text-center text-gray-500"
                          >
                            No colleges found.
                          </td>
                        </tr>
                      ) : (
                        filteredColleges.map((college) => {
                          const managed = arr(college.managedCourseIds);
                          const assigned = arr(college.assignedCourses);
                          const instructorCount = num(college.instructorCount);
                          const studentCount = num(college.studentCount);
                          const enrolled = num(college.enrolledStudents);
                          const certs = num(college.certificatesGenerated);
                          const courseCount = num(college.courseCount);

                          return (
                            <tr
                              key={college.id}
                              className={`border-b border-gray-100 hover:bg-gray-50 transition cursor-pointer ${
                                selectedCollegeId === college.id
                                  ? "bg-primary-50"
                                  : ""
                              }`}
                              onClick={() => setSelectedCollegeId(college.id)}
                            >
                              <td className="py-4 px-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 flex-none">
                                    <img
                                      src={
                                        college.avatar ||
                                        `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                          college.name || "College"
                                        )}&background=random`
                                      }
                                      alt={college.name}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                  <div className="min-w-0">
                                    <h4 className="font-medium text-gray-900 truncate">
                                      {college.name}
                                    </h4>
                                    <p className="text-xs text-gray-500 truncate">
                                      {college.email}
                                    </p>
                                  </div>
                                </div>
                              </td>

                              <td className="py-4 px-4">
                                <div className="text-center">
                                  <div className="text-lg font-bold text-blue-600">
                                    {instructorCount}
                                  </div>
                                </div>
                              </td>

                              <td className="py-4 px-4">
                                <div className="text-center">
                                  <div className="text-lg font-bold text-green-600">
                                    {studentCount}
                                  </div>
                                </div>
                              </td>

                              <td className="py-4 px-4">
                                <div className="text-center">
                                  <div className="text-lg font-bold text-purple-600">
                                    {enrolled}
                                  </div>
                                </div>
                              </td>

                              <td className="py-4 px-4">
                                <div className="text-center">
                                  <Badge variant="info" size="sm">
                                    {courseCount}
                                  </Badge>
                                </div>
                              </td>

                              <td className="py-4 px-4">
                                <div className="text-center">
                                  <Badge variant="success" size="sm">
                                    {certs}
                                  </Badge>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="assignments">
            {loadingCourses ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                <p>Loading courses...</p>
              </div>
            ) : (
              <div className="space-y-6">
                <Card className="p-5 sm:p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Course-User Assignments
                  </h3>
                  <div className="space-y-4">
                    {allCourses.map((course) => {
                      // const instructors = getCourseInstructors(course.id);
                      // const students = getCourseStudents(course.id);
                      return (
                        <div
                          key={course.id}
                          className="border border-gray-200 rounded-lg p-4"
                        >
                          <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 mb-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-none">
                                <img
                                  src={course.thumbnail}
                                  alt={course.title}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-medium text-gray-900 truncate">
                                  {course.title}
                                </h4>
                              </div>
                            </div>

                            <div className="flex gap-2 flex-wrap items-center">
                              {canEditCourse(course) && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => goEdit(course.id)}
                                  className="ml-auto bg-amber-300"
                                >
                                  <Pencil size={14} className="mr-1" />
                                  Edit
                                </Button>
                              )}

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenAssignModal(course)}
                                className="ml-auto bg-green-500 text-white hover:bg-green-600"
                              >
                                <Pencil size={14} className="mr-1" />
                                Assign Course
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </div>
            )}
          </TabsContent>

          {courseToAssign && (
            <AssignCourseModal
              isOpen={isAssignModalOpen}
              onClose={handleCloseAssignModal}
              onSuccess={handleAssignSuccess}
              course={courseToAssign}
              colleges={colleges}
            />
          )}

          <TabsContent value="students">
            {loadingUsers ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                <p>Loading students...</p>
              </div>
            ) : (
              <div className="space-y-6">
                <Card className="p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-center">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setStudentFilter(
                            studentFilter === "all"
                              ? "college"
                              : studentFilter === "college"
                              ? "course"
                              : "all"
                          );
                          setSelectedFilterValue("");
                        }}
                        className="flex items-center gap-2"
                      >
                        <Settings size={14} />
                        {studentFilter === "all"
                          ? "Filter"
                          : studentFilter === "college"
                          ? "College"
                          : "Course"}
                      </Button>

                      {studentFilter !== "all" && (
                        <select
                          value={selectedFilterValue}
                          onChange={(e) =>
                            setSelectedFilterValue(e.target.value)
                          }
                          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        >
                          <option value="">
                            Select{" "}
                            {studentFilter === "college" ? "College" : "Course"}
                          </option>
                          {getFilterOptions().map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    {/* Search Input */}
                    <div className="sm:col-span-2">
                      <div className="relative">
                        <Input
                          placeholder="Search students by name or email..."
                          value={studentSearch}
                          onChange={(e) => setStudentSearch(e.target.value)}
                          className="w-full pr-10"
                        />
                        <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
                      </div>
                    </div>

                    <Badge variant="info" className="justify-center">
                      {getFilteredStudents().length} of {allStudents.length}
                    </Badge>
                  </div>
                </Card>

                {/* Student list */}
                <Card className="p-5 sm:p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Student Directory
                  </h3>

                  <div className="divide-y divide-gray-200 border border-gray-200 rounded-lg">
                    {getFilteredStudents().map((student) => {
                      return (
                        <div
                          key={student.id}
                          className="flex items-center justify-between p-4"
                        >
                          {/* Avatar + name + email */}
                          <div className="flex items-center gap-4 min-w-0">
                            <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 flex-none">
                              <img
                                src={student.avatar}
                                alt={student.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-medium text-gray-900 truncate">
                                {student.name || "Unnamed"}
                              </h4>
                              <p className="text-sm text-gray-600 truncate">
                                {student.email}
                              </p>
                            </div>
                          </div>

                          {/* Badges and courses */}
                          <div className="flex items-center gap-4">
                            <div className="flex flex-col items-end gap-1 text-sm">
                              <div className="flex gap-2">
                                <Badge variant="info" size="sm">
                                  {student.enrolledCoursesCount || 0} courses
                                </Badge>
                                {student?.status && (
                                  <Badge
                                    variant={
                                      String(student.status).toLowerCase() ===
                                      "active"
                                        ? "success"
                                        : "secondary"
                                    }
                                    size="sm"
                                  >
                                    {String(student.status)}
                                  </Badge>
                                )}
                              </div>
                            </div>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteStudent(student)}
                              className="flex items-center gap-1 text-red-600 hover:text-red-700 hover:border-red-300"
                            >
                              <Trash2 size={14} />
                              Delete
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {getFilteredStudents().length === 0 && (
                    <p className="text-sm text-gray-500 italic mt-2">
                      {allStudents.length === 0
                        ? "No students found."
                        : "No students match the current filters."}
                    </p>
                  )}
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="admins">
            {loadingUsers ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                <p>Loading admins...</p>
              </div>
            ) : (
              <Card>
                <Card.Header>
                  <div className="flex items-center justify-between">
                    <Card.Title>Admins List</Card.Title>
                    <Badge variant="info">{allAdmins.length} Total</Badge>
                  </div>
                </Card.Header>
                <Card.Content>
                  {allAdmins.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Shield size={48} className="mx-auto mb-4 opacity-50" />
                      <p>No admins found</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Avatar
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Name
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Email
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              College
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {allAdmins.map((admin) => (
                            <tr key={admin.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <img
                                  src={admin.avatar}
                                  alt={admin.name}
                                  className="h-10 w-10 rounded-full"
                                />
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {admin.name || "N/A"}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {admin.email}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {admin.collegeName || "N/A"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Card.Content>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="instructors">
            {loadingUsers ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                <p>Loading instructors...</p>
              </div>
            ) : (
              <Card>
                <Card.Header>
                  <div className="flex items-center justify-between">
                    <Card.Title>Instructors List</Card.Title>
                    <Badge variant="success">
                      {allInstructors.length} Total
                    </Badge>
                  </div>
                </Card.Header>
                <Card.Content>
                  {allInstructors.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Award size={48} className="mx-auto mb-4 opacity-50" />
                      <p>No instructors found</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Avatar
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Name
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Email
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              College
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Department
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {allInstructors.map((instructor) => (
                            <tr
                              key={instructor.id}
                              className="hover:bg-gray-50"
                            >
                              <td className="px-6 py-4 whitespace-nowrap">
                                <img
                                  src={instructor.avatar}
                                  alt={instructor.name}
                                  className="h-10 w-10 rounded-full"
                                />
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {instructor.name || "N/A"}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {instructor.email}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {instructor.collegeName || "N/A"}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {instructor.departmentName || "N/A"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Card.Content>
              </Card>
            )}
          </TabsContent>

        <TabsContent value="departments">
  {loadingDepartments ? (
    <div className="text-center py-8">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
      <p>Loading departments...</p>
    </div>
  ) : (
    <Card>
      <Card.Header>
        <div className="flex items-center justify-between">
          <Card.Title>Departments List</Card.Title>
          <Badge variant="info">
            {allDepartments.length} Total
          </Badge>
        </div>
      </Card.Header>
      <Card.Content>
        {allDepartments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <School size={48} className="mx-auto mb-4 opacity-50" />
            <p>No departments found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Department Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Department Name
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {allDepartments.map((department, index) => (
                  <tr
                    key={department.key || index}
                    className="hover:bg-gray-50 transition"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {department.key}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-purple-100 rounded-full flex items-center justify-center">
                          <School size={20} className="text-purple-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {department.name}
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card.Content>
    </Card>
  )}
</TabsContent>

        </Tabs>

        <Modal
          isOpen={showPermissionsModal}
          onClose={() => {
            setShowPermissionsModal(false);
            setSelectedUser(null);
            setEditingPermissions({});
          }}
          title={`Manage Permissions - ${selectedUser?.name ?? ""}`}
          size="lg"
        >
          {selectedUser && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 flex-none">
                  <img
                    src={selectedUser.avatar}
                    alt={selectedUser.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <h3 className="font-medium text-gray-900 truncate">
                    {selectedUser.name}
                  </h3>
                  <p className="text-sm text-gray-600 truncate">
                    {selectedUser.email}
                  </p>
                  <Badge
                    variant={
                      String(selectedUser.role).toLowerCase() === "admin" ||
                      String(selectedUser.role).toUpperCase() === "SUPERADMIN"
                        ? "danger"
                        : "warning"
                    }
                  >
                    {String(selectedUser.role).toLowerCase()}
                  </Badge>
                </div>
              </div>

              {String(selectedUser.role).toLowerCase() === "admin" && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-800 mb-1">
                    Max Instructors Allowed{" "}
                    <span className="text-gray-500">(0–20)</span>
                  </label>
                  <input
                    type="number"
                    value={editingPermissions.maxInstructorsAllowed || 0}
                    onChange={(e) =>
                      setEditingPermissions((prev) => ({
                        ...prev,
                        maxInstructorsAllowed: Math.min(
                          Number(e.target.value),
                          20
                        ),
                      }))
                    }
                    min={0}
                    max={20}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm 
                  shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 
                  focus:ring-offset-1 transition duration-200 ease-in-out"
                  />
                </div>
              )}

              {String(selectedUser.role).toLowerCase() === "admin" && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-800 mb-1">
                    Max Students Allowed{" "}
                    <span className="text-gray-500">(e.g. 0–500)</span>
                  </label>
                  <input
                    type="number"
                    value={editingPermissions.maxStudentsAllowed || 0}
                    onChange={(e) =>
                      setEditingPermissions((prev) => ({
                        ...prev,
                        maxStudentsAllowed: Math.max(0, Number(e.target.value)),
                      }))
                    }
                    min={0}
                    max={500}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm 
                  shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 
                  focus:ring-offset-1 transition duration-200 ease-in-out"
                  />
                </div>
              )}

              <div>
                <h4 className="font-medium text-gray-900 mb-4">
                  Permission Settings
                </h4>
                <div className="space-y-4">
                  {(String(selectedUser.role).toLowerCase() === "admin" ||
                    String(selectedUser.role).toUpperCase() ===
                      "SUPERADMIN") && (
                    <>
                      {[
                        {
                          key: "canCreateCourses",
                          title: "Create Courses",
                          desc: "Allow user to create new courses",
                        },
                        {
                          key: "canCreateTests",
                          title: "Create Tests",
                          desc: "Allow user to create and manage tests",
                        },
                        {
                          key: "canManageTests",
                          title: "Manage Tests",
                          desc: "Allow user to edit and delete tests",
                        },
                      ].map((item) => (
                        <div
                          key={item.key}
                          className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                        >
                          <div className="pr-4">
                            <h5 className="font-medium text-gray-900">
                              {item.title}
                            </h5>
                            <p className="text-sm text-gray-600">{item.desc}</p>
                          </div>
                          <button
                            onClick={() =>
                              setEditingPermissions((p) => ({
                                ...p,
                                [item.key]: !p[item.key],
                              }))
                            }
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              editingPermissions[item.key]
                                ? "bg-primary-600"
                                : "bg-gray-200"
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                editingPermissions[item.key]
                                  ? "translate-x-6"
                                  : "translate-x-1"
                              }`}
                            />
                          </button>
                        </div>
                      ))}
                    </>
                  )}

                  {String(selectedUser.role).toLowerCase() === "instructor" && (
                    <>
                      {[
                        {
                          key: "canCreateCourses",
                          title: "Create Courses",
                          desc: "Allow instructor to create new courses",
                        },
                        {
                          key: "canCreateTests",
                          title: "Create Tests",
                          desc: "Allow instructor to create tests",
                        },
                        {
                          key: "canManageTests",
                          title: "Manage Tests",
                          desc: "Allow instructor to edit and delete their tests",
                        },
                        {
                          key: "canManageStudents",
                          title: "Manage Students",
                          desc: "Allow instructor to manage assigned students",
                        },
                        {
                          key: "canViewAnalytics",
                          title: "View Analytics",
                          desc: "Allow instructor to view analytics",
                        },
                      ].map((item) => (
                        <div
                          key={item.key}
                          className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                        >
                          <div className="pr-4">
                            <h5 className="font-medium text-gray-900">
                              {item.title}
                            </h5>
                            <p className="text-sm text-gray-600">{item.desc}</p>
                          </div>
                          <button
                            onClick={() =>
                              setEditingPermissions((p) => ({
                                ...p,
                                [item.key]: !p[item.key],
                              }))
                            }
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              editingPermissions[item.key]
                                ? "bg-primary-600"
                                : "bg-gray-200"
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                editingPermissions[item.key]
                                  ? "translate-x-6"
                                  : "translate-x-1"
                              }`}
                            />
                          </button>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() =>
                    setEditingPermissions({
                      ...(selectedUser.permissions || {}),
                      maxInstructorsAllowed:
                        selectedUser.permissions?.maxInstructorsAllowed ?? 0,
                    })
                  }
                >
                  <RotateCcw size={16} className="mr-2" />
                  Reset
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowPermissionsModal(false);
                    setSelectedUser(null);
                    setEditingPermissions({});
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={savePermissions}>
                  <Save size={16} className="mr-2" />
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </Modal>

        <Modal
          isOpen={showCollegeModal}
          onClose={() => {
            setShowCollegeModal(false);
            setSelectedCollege(null);
          }}
          title={selectedCollege?.name}
          size="lg"
        >
          <div className="space-y-6">
            <p className="text-gray-600">
              College details will appear here once the college API is
              available.
            </p>
          </div>
        </Modal>

        <Modal
          isOpen={showCreateCollegeModal}
          onClose={() => setShowCreateCollegeModal(false)}
          title="Create New College"
          size="lg"
        >
          <div className="space-y-4">
            <p className="text-gray-600">
              Add a new educational institution to the platform.
            </p>
            <div className="text-center py-8">
              <Building2 size={48} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                College Registration
              </h3>
              <p className="text-gray-600 mb-4">
                Full college creation interface coming soon!
              </p>
              <Button
                onClick={() =>
                  toast("College creation functionality coming soon!")
                }
              >
                Create College
              </Button>
            </div>
          </div>
        </Modal>

        <Modal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setStudentToDelete(null);
          }}
          title="Delete Student"
          size="md"
        >
          {studentToDelete && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100 flex-none">
                  <img
                    src={studentToDelete.avatar}
                    alt={studentToDelete.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">
                    {studentToDelete.name}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {studentToDelete.email}
                  </p>
                </div>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 text-red-600 mt-0.5">
                    <svg fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-red-800">
                      Warning: This action cannot be undone
                    </h4>
                    <p className="text-sm text-red-700 mt-1">
                      Are you sure you want to delete this student? This will
                      permanently remove the student and all their associated
                      data from the system.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setStudentToDelete(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  onClick={confirmDeleteStudent}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  <Trash2 size={16} className="mr-2" />
                  Delete Student
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
}
