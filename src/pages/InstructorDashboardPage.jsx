import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  BookOpen,
  Users,
  TrendingUp,
  Award,
  BarChart3,
  FileText,
  Clock,
  BookMarked,
  Activity,
  Plus,
  Edit,
  Eye,
  Download,
  AlertCircle,
  UserCheck,
} from "lucide-react";
import { toast } from "react-hot-toast";
import useAuthStore from "../store/useAuthStore";
import Progress from "../components/ui/Progress";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Modal from "../components/ui/Modal";
import Input from "../components/ui/Input";

// ✅ Use your real APIs
import {
  coursesAPI,
  chaptersAPI,
  enrollmentsAPI,
  progressAPI,
  FALLBACK_THUMB,
} from "../services/api";

const InstructorDashboardPage = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [assignedCourses, setAssignedCourses] = useState([]);
  const [myStudents, setMyStudents] = useState([]);
  const [courseModules, setCourseModules] = useState({});
  const [studentProgress, setStudentProgress] = useState({});
  const [testResults, setTestResults] = useState([]); // no endpoint provided – stays empty for now
  const [loading, setLoading] = useState(true);

  const [enrollmentRequests, setEnrollmentRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [showRequestsModal, setShowRequestsModal] = useState(false);

  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [showCreateCourseModal, setShowCreateCourseModal] = useState(false);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [studentSearchTerm, setStudentSearchTerm] = useState("");
  const [courseFilter, setCourseFilter] = useState("all");

  const [stats, setStats] = useState({
    totalCourses: 0,
    totalStudents: 0,
    activeStudents: 0,
    averageProgress: 0,
    totalModules: 0,
    totalChapters: 0,
    testsGraded: 0,
    averageTestScore: 0,
  });


  const pickId = (v) => v?.id ?? v?.userId ?? v?.studentId ?? v;
  const pickEmail = (v) => v?.email ?? v?.user?.email ?? v?.student?.email ?? "";
  const pickName = (v) =>
    v?.name ??
    v?.fullName ??
    v?.user?.name ??
    v?.student?.name ??
    v?.studentName ??
    "Student";
  const pickAvatar = (v) =>
    v?.avatar ??
    v?.photoUrl ??
    v?.user?.avatar ??
    v?.student?.avatar ??
    "https://api.dicebear.com/7.x/initials/svg?seed=" + encodeURIComponent(pickName(v));


  const fetchInstructorRequests = async (courses = []) => {
    // Try instructor-wide endpoint first
    try {
      const arr = await enrollmentsAPI.listInstructorRequests();
      if (Array.isArray(arr) && arr.length > 0) return arr;
    } catch {
      // ignore and fall back
    }

    // Fallback: aggregate requests per course and annotate with course title
    const perCourse = await Promise.all(
      (courses || []).map(async (c) => {
        try {
          const items = await enrollmentsAPI.listEnrollmentRequestsForCourse(c.id);
          return (items || []).map((r) => ({
            ...r,
            courseId: r.courseId ?? c.id,
            courseTitle: r.courseTitle ?? c.title,
          }));
        } catch {
          return [];
        }
      })
    );

    return perCourse.flat();
  };

  useEffect(() => {
    if (!user?.id) return;
    fetchAll();
  }, [user?.id]);

  // const fetchAll = async () => {
  //   try {
  //     setLoading(true);
  //     const params = { pageSize: 100 };
  //     if (user.collegeId) {
  //       params.collegeId = user.collegeId;
  //     }
  //     if (user.departmentId) {
  //       params.departmentId = user.departmentId;
  //     }

  //     const rawCatalog = await coursesAPI.getCourseCatalog(params).catch(() => []);
  //     const assigned = Array.isArray(rawCatalog?.items)
  //       ? rawCatalog.items
  //       : Array.isArray(rawCatalog)
  //         ? rawCatalog
  //         : [];

  //     const normalized = assigned.map((c) => ({
  //       ...c,
  //       thumbnail: c.thumbnail || FALLBACK_THUMB,
  //       status: String(c.status || "draft").toLowerCase(),
  //     }));
  //     setAssignedCourses(normalized);

  //     const chapterLists = await Promise.all(
  //       normalized.map((course) =>
  //         chaptersAPI.listByCourse(course.id).catch((e) => {
  //           if (e?.response?.status !== 403) console.warn("chapters error", e);
  //           return [];
  //         })
  //       )
  //     );

  //     console.log("Fetched Chapter Lists:", chapterLists);

  //     const modulesData = {};
  //     let totalChapters = 0;

  //     normalized.forEach((course, idx) => {

  //       const chapters = Array.isArray(chapterLists[idx]?.data)
  //         ? chapterLists[idx].data
  //         : [];

  //       modulesData[course.id] = chapters.map((ch, i) => ({
  //         id: ch.id,
  //         title: ch.title || `Chapter ${i + 1}`,
  //         totalChapters: 1,
  //         estimatedDuration: ch.estimatedDuration || "—",
  //       }));
  //       totalChapters += chapters.length;
  //     });
  //     setCourseModules(modulesData);


  //     const instrReqs = await fetchInstructorRequests(normalized);
  //     setEnrollmentRequests(instrReqs);


  //     const enrollmentLists = await Promise.all(
  //       normalized.map((course) =>
  //         enrollmentsAPI.list({ courseId: course.id }).catch(() => [])
  //       )
  //     );

  //     console.log("Fetched Enrollment Lists:", enrollmentLists);

  //     const studentMap = new Map();
  //     const progressByStudent = {};

  //     normalized.forEach((course, idx) => {
  //       const enrollments = enrollmentLists[idx] || [];
  //       for (const e of enrollments) {
  //         const sid = e.studentId;
  //         if (!sid) continue;

  //         const existing = studentMap.get(sid) || {
  //           id: sid,
  //           name: e.studentName || "Student",
  //           email: e.studentEmail || "",
  //           avatar:
  //             "https://api.dicebear.com/7.x/initials/svg?seed=" +
  //             encodeURIComponent(e.studentName || "Student"),
  //           assignedCourses: [],
  //           lastLogin: null,
  //         };

  //         if (!existing.assignedCourses.includes(course.id)) {
  //           existing.assignedCourses.push(course.id);
  //         }
  //         studentMap.set(sid, existing);

  //         if (!progressByStudent[sid]) progressByStudent[sid] = {};
  //         progressByStudent[sid][course.id] = Number(e.progress || 0);
  //       }
  //     });

  //     const students = Array.from(studentMap.values());
  //     setMyStudents(students);
  //     setStudentProgress(progressByStudent);

  //     // Stats
  //     const totalModules = Object.values(modulesData).flat().length;
  //     const activeStudents = 0; // set from lastLogin if you start tracking it
  //     const perStudentAvg = students.map((stu) => {
  //       const ids = stu.assignedCourses || [];
  //       if (ids.length === 0) return 0;
  //       const sum = ids.reduce((acc, cid) => acc + (progressByStudent[stu.id]?.[cid] ?? 0), 0);
  //       return sum / ids.length;
  //     });
  //     const avgProgress =
  //       perStudentAvg.length > 0
  //         ? perStudentAvg.reduce((a, b) => a + b, 0) / perStudentAvg.length
  //         : 0;

  //     setStats({
  //       totalCourses: normalized.length,
  //       totalStudents: students.length,
  //       activeStudents,
  //       averageProgress: Math.round(avgProgress),
  //       totalModules,
  //       totalChapters,
  //       testsGraded: 0,
  //       averageTestScore: 0,
  //     });
  //   } catch (error) {
  //     console.error("Error loading instructor dashboard:", error);
  //     toast.error(error?.response?.data?.error || "Failed to load dashboard data");
  //   } finally {
  //     setLoading(false);
  //   }
  // };


  const fetchAll = async () => {
    try {
      setLoading(true);
      const params = { pageSize: 100 };
      if (user.collegeId) params.collegeId = user.collegeId;
      if (user.departmentId) params.departmentId = user.departmentId;

      // Step 1: Fetch courses
      const rawCatalog = await coursesAPI.getCourseCatalog(params).catch(() => []);
      const assigned = Array.isArray(rawCatalog?.items)
        ? rawCatalog.items
        : Array.isArray(rawCatalog)
          ? rawCatalog
          : [];

      const normalized = assigned.map((c) => ({
        ...c,
        thumbnail: c.thumbnail || FALLBACK_THUMB,
        status: String(c.status || "draft").toLowerCase(),
      }));
      setAssignedCourses(normalized);

      // Step 2: Batch fetch chapters (max 5 concurrent, not all at once)
      const chapterLists = await batchFetchChapters(normalized);
      const modulesData = {};
      let totalChapters = 0;

      normalized.forEach((course, idx) => {
        const chapters = chapterLists[idx] || [];
        modulesData[course.id] = chapters.map((ch, i) => ({
          id: ch.id,
          title: ch.title || `Chapter ${i + 1}`,
          totalChapters: 1,
          estimatedDuration: ch.estimatedDuration || "—",
        }));
        totalChapters += chapters.length;
      });
      setCourseModules(modulesData);

      // Step 3: Batch fetch enrollments (max 5 concurrent)
      const enrollmentLists = await batchFetchEnrollments(normalized);

      const studentMap = new Map();
      const progressByStudent = {};

      normalized.forEach((course, idx) => {
        const enrollments = enrollmentLists[idx] || [];
        for (const e of enrollments) {
          const sid = e.studentId;
          if (!sid) continue;

          const existing = studentMap.get(sid) || {
            id: sid,
            name: e.studentName || "Student",
            email: e.studentEmail || "",
            avatar:
              "https://api.dicebear.com/7.x/initials/svg?seed=" +
              encodeURIComponent(e.studentName || "Student"),
            assignedCourses: [],
            lastLogin: null,
          };

          if (!existing.assignedCourses.includes(course.id)) {
            existing.assignedCourses.push(course.id);
          }
          studentMap.set(sid, existing);

          if (!progressByStudent[sid]) progressByStudent[sid] = {};
          progressByStudent[sid][course.id] = Number(e.progress || 0);
        }
      });

      const students = Array.from(studentMap.values());
      setMyStudents(students);
      setStudentProgress(progressByStudent);

      // Step 4: Fetch enrollment requests
      const instrReqs = await fetchInstructorRequests(normalized);
      setEnrollmentRequests(instrReqs);

      // Step 5: Calculate stats
      const totalModules = Object.values(modulesData).flat().length;
      const perStudentAvg = students.map((stu) => {
        const ids = stu.assignedCourses || [];
        if (ids.length === 0) return 0;
        const sum = ids.reduce(
          (acc, cid) => acc + (progressByStudent[stu.id]?.[cid] ?? 0),
          0
        );
        return sum / ids.length;
      });
      const avgProgress =
        perStudentAvg.length > 0
          ? perStudentAvg.reduce((a, b) => a + b, 0) / perStudentAvg.length
          : 0;

      setStats({
        totalCourses: normalized.length,
        totalStudents: students.length,
        activeStudents: 0,
        averageProgress: Math.round(avgProgress),
        totalModules,
        totalChapters,
        testsGraded: 0,
        averageTestScore: 0,
      });
    } catch (error) {
      console.error("Error loading instructor dashboard:", error);
      toast.error(error?.response?.data?.error || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  // Fetch chapters in batches of 5
  const batchFetchChapters = async (courses) => {
    const results = new Array(courses.length);
    for (let i = 0; i < courses.length; i += 5) {
      const batch = courses.slice(i, i + 5);
      const batchPromises = batch.map((course, idx) =>
        chaptersAPI
          .listByCourse(course.id)
          .then((res) => {
            const chapters = Array.isArray(res?.data) ? res.data : [];
            results[i + idx] = chapters;
          })
          .catch(() => {
            results[i + idx] = [];
          })
      );
      await Promise.all(batchPromises);
    }
    return results;
  };

  // Fetch enrollments in batches of 5
  const batchFetchEnrollments = async (courses) => {
    const results = new Array(courses.length);
    for (let i = 0; i < courses.length; i += 5) {
      const batch = courses.slice(i, i + 5);
      const batchPromises = batch.map((course, idx) =>
        enrollmentsAPI
          .list({ courseId: course.id })
          .then((res) => {
            results[i + idx] = res || [];
          })
          .catch(() => {
            results[i + idx] = [];
          })
      );
      await Promise.all(batchPromises);
    }
    return results;
  };

  // const loadEnrollmentRequests = async () => {
  //   try {
  //     setLoadingRequests(true);
  //     const reqs = await fetchInstructorRequests(assignedCourses);
  //     setEnrollmentRequests(Array.isArray(reqs) ? reqs : []);
  //   } finally {
  //     setLoadingRequests(false);
  //   }
  // };

  const handleRequestAction = async (requestId, action) => {
    try {
      const next =
        action === "APPROVE" || action === "APPROVED"
          ? "APPROVED"
          : "REJECTED";
      await enrollmentsAPI.updateEnrollmentRequestStatus(requestId, next);
      setEnrollmentRequests((prev) => prev.filter((r) => r.id !== requestId));
      toast.success(next === "APPROVED" ? "Enrollment approved" : "Enrollment rejected");
    } catch (err) {
      console.error("Failed to update request", err);
      toast.error(err?.response?.data?.error || "Failed to update request");
    }
  };

  const viewCourseDetails = (course) => {
    setSelectedCourse(course);
    setShowCourseModal(true);
  };

  const viewStudentDetails = (student) => {
    setSelectedStudent(student);
    setShowStudentModal(true);
  };

  const createNewCourse = () => {
    navigate("/courses/create");
  };

  const handleCourseAction = async (courseId, action) => {
    try {
      switch (action) {
        case "edit":
          navigate(`/courses/${courseId}/edit`);
          break;
        case "view": {
          const course = assignedCourses.find((c) => c.id === courseId);
          viewCourseDetails(course);
          break;
        }
        case "analytics":
          setSelectedCourse(assignedCourses.find((c) => c.id === courseId));
          setShowAnalyticsModal(true);
          break;
        case "students":
          setShowStudentModal(true);
          break;
        default:
          break;
      }
    } catch (error) {
      toast.error("Action failed. Please try again.");
    }
  };

  // fallbacks when per-student progress is missing
  const getStudentCourseProgress = (studentId, courseId) => {
    const v = studentProgress?.[studentId]?.[courseId];
    return typeof v === "number" ? v : 0;
  };

  const getStudentStatus = (student) => {
    const recentActivity = student?.lastLogin ? new Date(student.lastLogin) : null;
    if (!recentActivity) return { status: "inactive", color: "danger" };
    const daysSinceActivity = Math.floor(
      (Date.now() - recentActivity.getTime()) / 86400000
    );
    if (daysSinceActivity === 0) return { status: "online", color: "success" };
    if (daysSinceActivity <= 3) return { status: "recent", color: "warning" };
    return { status: "inactive", color: "danger" };
  };

  const filteredStudents = myStudents.filter((student) => {
    const name = (student.name || "").toLowerCase();
    const email = (student.email || "").toLowerCase();
    const matchesSearch =
      name.includes(studentSearchTerm.toLowerCase()) ||
      email.includes(studentSearchTerm.toLowerCase());
    const matchesCourse =
      courseFilter === "all" ||
      (student.assignedCourses || []).includes(courseFilter);
    return matchesSearch && matchesCourse;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading instructor dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="w-10 sm:w-12 h-10 sm:h-12 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                <BookOpen size={24} className="text-primary-600" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                  Instructor Dashboard
                </h1>
                <p className="text-sm sm:text-base text-gray-600">
                  Manage your courses and track student progress.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center">
              <div className="w-10 sm:w-12 h-10 sm:h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <BookOpen size={24} className="text-blue-600" />
              </div>
              <div className="ml-2 sm:ml-4">
                <p className="text-xs sm:text-sm font-medium text-gray-600">My Courses</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">
                  {stats.totalCourses}
                </p>
                <p className="text-xs text-gray-500 hidden sm:block">
                  {stats.totalModules} modules, {stats.totalChapters} chapters
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <div className="w-10 sm:w-12 h-10 sm:h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Users size={24} className="text-green-600" />
              </div>
              <div className="ml-2 sm:ml-4">
                <p className="text-xs sm:text-sm font-medium text-gray-600">My Students</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">
                  {stats.totalStudents}
                </p>
                <p className="text-xs text-gray-500">{stats.activeStudents} active</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <div className="w-10 sm:w-12 h-10 sm:h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <TrendingUp size={24} className="text-purple-600" />
              </div>
              <div className="ml-2 sm:ml-4">
                <p className="text-xs sm:text-sm font-medium text-gray-600">Avg Progress</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">
                  {stats.averageProgress}%
                </p>
                <p className="text-xs text-gray-500 hidden sm:block">Across all students</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <div className="w-10 sm:w-12 h-10 sm:h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Award size={24} className="text-yellow-600" />
              </div>
              <div className="ml-2 sm:ml-4">
                <p className="text-xs sm:text-sm font-medium text-gray-600">Test Average</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">
                  {stats.averageTestScore}%
                </p>
                <p className="text-xs text-gray-500">{stats.testsGraded} graded</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* My Courses */}
          <div className="lg:col-span-2">
            <Card>
              <Card.Header className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                <Card.Title>My Courses</Card.Title>
              </Card.Header>
              <Card.Content>
                {assignedCourses.length === 0 ? (
                  <div className="text-center py-8">
                    <BookOpen size={48} className="mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No courses assigned yet
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Contact admin to get courses assigned or create your own.
                    </p>
                    <Link to="/courses/create">
                      <Button onClick={createNewCourse} className="w-full sm:w-auto">
                        Create Your First Course
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {assignedCourses.map((course) => {
                      const modules = courseModules[course.id] || [];
                      const enrolledStudents = myStudents.filter((student) =>
                        (student.assignedCourses || []).includes(course.id)
                      );
                      const avgProgress =
                        enrolledStudents.length > 0
                          ? enrolledStudents.reduce(
                            (sum, student) =>
                              sum + getStudentCourseProgress(student.id, course.id),
                            0
                          ) / enrolledStudents.length
                          : 0;

                      return (
                        <div
                          key={course.id}
                          className="border border-gray-200 rounded-lg p-4 sm:p-6 hover:shadow-sm transition-shadow"
                        >
                          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between space-y-4 lg:space-y-0">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-4">
                                <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                                  <img
                                    src={course.thumbnail || FALLBACK_THUMB}
                                    alt={course.title}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <div className="flex-1">
                                  <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-2 mb-1">
                                    <h3 className="text-base sm:text-lg font-medium text-gray-900">
                                      {course.title}
                                    </h3>
                                    <Badge
                                      variant={
                                        (course.status || "draft") === "published"
                                          ? "success"
                                          : "warning"
                                      }
                                      size="sm"
                                    >
                                      {course.status || "draft"}
                                    </Badge>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-500">
                                    <span className="flex items-center space-x-1">
                                      <Users size={14} />
                                      <span>{enrolledStudents.length} students</span>
                                    </span>
                                    <span className="flex items-center space-x-1">
                                      <BookMarked size={14} />
                                      <span>{modules.length} modules</span>
                                    </span>
                                    <span className="flex items-center space-x-1">
                                      <Clock size={14} />
                                      <span>{course.estimatedDuration || "—"}</span>
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-2">
                                <div className="flex items-center justify-between text-xs sm:text-sm">
                                  <span className="text-gray-600">Average Student Progress</span>
                                  <span className="font-medium text-gray-900">
                                    {Math.round(avgProgress)}%
                                  </span>
                                </div>
                                <Progress value={avgProgress} size="sm" />

                                <div className="flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm text-gray-500">
                                  <div className="flex items-center space-x-1">
                                    <Activity size={14} />
                                    <span className="hidden sm:inline">
                                      Updated{" "}
                                      {course.updatedAt
                                        ? new Date(course.updatedAt).toLocaleDateString()
                                        : "—"}
                                    </span>
                                    <span className="sm:hidden">Updated</span>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <FileText size={14} />
                                    <span>
                                      {course.totalChapters ??
                                        (courseModules[course.id]?.length || 0)}{" "}
                                      chapters
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2 lg:flex-col lg:space-y-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 lg:flex-none"
                                onClick={() => handleCourseAction(course.id, "edit")}
                              >
                                <Edit size={16} />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 lg:flex-none"
                                onClick={() => handleCourseAction(course.id, "view")}
                              >
                                <Eye size={16} />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 lg:flex-none"
                                onClick={() => handleCourseAction(course.id, "students")}
                              >
                                <Users size={16} />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 lg:flex-none"
                                onClick={() => handleCourseAction(course.id, "analytics")}
                              >
                                <BarChart3 size={16} />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card.Content>
            </Card>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-4 lg:space-y-6">
            {/* Enrollment Requests */}
            <Card>
              <Card.Header className="flex items-center justify-between">
                <Card.Title className="flex items-center">
                  <BookMarked size={20} className="mr-2 text-primary-600" />
                  Enrollment Requests
                </Card.Title>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setShowRequestsModal(true);
                    loadEnrollmentRequests();
                  }}
                >
                  View All
                </Button>
              </Card.Header>
              <Card.Content>
                {loadingRequests ? (
                  <p className="text-gray-500 text-center py-4">Loading requests…</p>
                ) : enrollmentRequests.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No pending requests</p>
                ) : (
                  <div className="space-y-3">
                    {enrollmentRequests.slice(0, 5).map((req) => (
                      <div key={req.id} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {req.studentName || "Student"}
                            </p>
                            <p className="text-xs text-gray-600 truncate">
                              {req.courseTitle || "Course"}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRequestAction(req.id, "REJECT")}
                            >
                              <AlertCircle size={14} className="mr-1" />
                              Reject
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleRequestAction(req.id, "APPROVE")}
                            >
                              <UserCheck size={14} className="mr-1" />
                              Approve
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card.Content>
            </Card>

            {/* Student Progress Overview */}
            <Card>
              <Card.Header className="flex items-center justify-between">
                <Card.Title className="flex items-center">
                  <Users size={20} className="mr-2 text-green-500" />
                  Student Progress
                </Card.Title>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => setShowStudentModal(true)}
                >
                  View All
                </Button>
              </Card.Header>
              <Card.Content>
                {myStudents.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No students assigned</p>
                ) : (
                  <div className="space-y-3">
                    {myStudents.slice(0, 5).map((student) => {
                      const studentStatus = getStudentStatus(student);
                      const avgProgress =
                        (student.assignedCourses || []).reduce(
                          (sum, courseId) =>
                            sum + getStudentCourseProgress(student.id, courseId),
                          0
                        ) / Math.max(1, (student.assignedCourses || []).length);

                      return (
                        <div
                          key={student.id}
                          className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer"
                          onClick={() => viewStudentDetails(student)}
                        >
                          <div className="w-8 sm:w-10 h-8 sm:h-10 rounded-full overflow-hidden bg-gray-100 relative flex-shrink-0">
                            <img
                              src={student.avatar}
                              alt={student.name}
                              className="w-full h-full object-cover"
                            />
                            <div
                              className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${studentStatus.color === "success"
                                ? "bg-green-500"
                                : studentStatus.color === "warning"
                                  ? "bg-yellow-500"
                                  : "bg-gray-400"
                                }`}
                            ></div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                              {student.name}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              {(student.assignedCourses || []).length} courses assigned
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-xs sm:text-sm font-medium text-gray-900">
                              {Math.round(avgProgress)}%
                            </div>
                            <div className="w-12 sm:w-16 bg-gray-200 rounded-full h-1.5 mt-1">
                              <div
                                className="bg-primary-600 h-1.5 rounded-full"
                                style={{ width: `${avgProgress}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card.Content>
            </Card>

            {/* Recent Test Results */}
            <Card>
              <Card.Header>
                <Card.Title className="flex items-center">
                  <FileText size={20} className="mr-2 text-orange-500" />
                  Recent Test Results
                </Card.Title>
              </Card.Header>
              <Card.Content>
                {testResults.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No test results yet</p>
                ) : (
                  <div className="space-y-3">
                    {testResults.slice(0, 5).map((result) => {
                      const student = myStudents.find((s) => s.id === result.studentId);
                      const course = assignedCourses.find((c) => c.id === result.courseId);
                      return (
                        <div key={result.id} className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="text-sm font-medium text-gray-900">
                              {student?.name}
                            </h4>
                            <Badge variant={result.passed ? "success" : "danger"} size="sm">
                              {result.score}%
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-600">{course?.title}</p>
                          <p className="text-xs text-gray-500">
                            {result.testType === "module" ? "Module Test" : "Course Test"} •{" "}
                            {new Date(result.submittedAt).toLocaleDateString()}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card.Content>
            </Card>
          </div>
        </div>
      </div>


      {/* Course Details Modal */}
      <Modal
        isOpen={showCourseModal}
        onClose={() => setShowCourseModal(false)}
        title={selectedCourse?.title}
        size="lg"
      >
        {selectedCourse && (() => {
          // ✨ NEW: Calculate progress for the selected course
          const enrolledStudentsInCourse = myStudents.filter((s) =>
            (s.assignedCourses || []).includes(selectedCourse.id)
          );
          const courseAvgProgress =
            enrolledStudentsInCourse.length > 0
              ? enrolledStudentsInCourse.reduce(
                (sum, student) =>
                  sum + getStudentCourseProgress(student.id, selectedCourse.id),
                0
              ) / enrolledStudentsInCourse.length
              : 0;

          return (
            <div className="space-y-6">
              <div className="flex items-center space-x-4">
                <img
                  src={selectedCourse.thumbnail || FALLBACK_THUMB}
                  alt={selectedCourse.title}
                  className="w-20 h-20 rounded-lg object-cover"
                />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {selectedCourse.title}
                  </h3>
                  <p className="text-gray-600">{selectedCourse.description}</p>
                  <div className="flex items-center space-x-2 mt-2">
                    <Badge variant="info">{selectedCourse.level || "—"}</Badge>
                    <Badge variant="default">{selectedCourse.category || "—"}</Badge>
                    <Badge
                      variant={
                        (selectedCourse.status || "draft") === "published"
                          ? "success"
                          : "warning"
                      }
                    >
                      {selectedCourse.status || "draft"}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* 🔄 MODIFIED: Changed grid to 4 columns to fit the new stat */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="text-xl font-bold text-blue-600">
                    {(courseModules[selectedCourse.id] || []).length}
                  </div>
                  <div className="text-sm text-blue-800">Modules</div>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="text-xl font-bold text-green-600">
                    {selectedCourse.totalChapters ??
                      (courseModules[selectedCourse.id] || []).length}
                  </div>
                  <div className="text-sm text-green-800">Chapters</div>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg">
                  <div className="text-xl font-bold text-purple-600">
                    {enrolledStudentsInCourse.length}
                  </div>
                  <div className="text-sm text-purple-800">Students</div>
                </div>
                {/* ✨ NEW: Added average progress stat card */}
                <div className="p-3 bg-yellow-50 rounded-lg">
                  <div className="text-xl font-bold text-yellow-600">
                    {Math.round(courseAvgProgress)}%
                  </div>
                  <div className="text-sm text-yellow-800">Avg. Progress</div>
                </div>
              </div>

              {/* ✨ NEW: Added a visual progress bar */}
              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-600">Average Student Progress</span>
                  <span className="font-medium text-gray-900">
                    {Math.round(courseAvgProgress)}%
                  </span>
                </div>
                <Progress value={courseAvgProgress} />
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-3">Course Modules</h4>
                <div className="space-y-2">
                  {(courseModules[selectedCourse.id] || []).map((module, index) => (
                    <div
                      key={module.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-primary-600">
                            {index + 1}
                          </span>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">
                            {module.title}
                          </h4>
                          <p className="text-xs text-gray-500">
                            {module.totalChapters} chapters • {module.estimatedDuration}
                          </p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        <Edit size={14} />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex space-x-3">
                <Button
                  className="flex-1"
                  onClick={() => {
                    setShowCourseModal(false);
                    navigate(`/courses/${selectedCourse.id}/edit`);
                  }}
                >
                  <Edit size={16} className="mr-2" />
                  Edit Course
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCourseModal(false);
                    setSelectedCourse(
                      assignedCourses.find((c) => c.id === selectedCourse.id)
                    );
                    setShowAnalyticsModal(true);
                  }}
                >
                  <BarChart3 size={16} className="mr-2" />
                  Analytics
                </Button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Student Management Modal */}
      <Modal
        isOpen={showStudentModal}
        onClose={() => setShowStudentModal(false)}
        title="Student Management"
        size="xl"
      >
        <div className="space-y-4">
          {/* Search and Filters */}
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <Input
                placeholder="Search students..."
                value={studentSearchTerm}
                onChange={(e) => setStudentSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Courses</option>
              {assignedCourses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
            <Button
              variant="outline"
              onClick={() => toast("Export functionality coming soon!")}
            >
              <Download size={16} className="mr-1" />
              Export
            </Button>
          </div>

          {/* Students List */}
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {filteredStudents.map((student) => {
              const studentStatus = getStudentStatus(student);
              const avgProgress =
                (student.assignedCourses || []).reduce(
                  (sum, courseId) =>
                    sum + getStudentCourseProgress(student.id, courseId),
                  0
                ) / Math.max(1, (student.assignedCourses || []).length);

              return (
                <div
                  key={student.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 relative">
                      <img
                        src={student.avatar}
                        alt={student.name}
                        className="w-full h-full object-cover"
                      />
                      <div
                        className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${studentStatus.color === "success"
                          ? "bg-green-500"
                          : studentStatus.color === "warning"
                            ? "bg-yellow-500"
                            : "bg-gray-400"
                          }`}
                      ></div>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{student.name}</h4>
                      <p className="text-sm text-gray-600">{student.email}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant={studentStatus.color} size="sm">
                          {studentStatus.status}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {(student.assignedCourses || []).length} courses
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      {Math.round(avgProgress)}%
                    </div>
                    <div className="text-xs text-gray-500">Average Progress</div>
                    <div className="w-20 bg-gray-200 rounded-full h-1.5 mt-1">
                      <div
                        className="bg-primary-600 h-1.5 rounded-full"
                        style={{ width: `${avgProgress}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Modal>

      {/* Enrollment Requests Modal */}
      <Modal
        isOpen={showRequestsModal}
        onClose={() => setShowRequestsModal(false)}
        title="Pending Enrollment Requests"
        size="lg"
      >
        <div className="space-y-3 max-h-[28rem] overflow-y-auto">
          {loadingRequests ? (
            <p className="text-gray-500 text-center py-6">Loading…</p>
          ) : enrollmentRequests.length === 0 ? (
            <p className="text-gray-500 text-center py-6">No pending requests</p>
          ) : (
            enrollmentRequests.map((req) => (
              <div key={req.id} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <h4 className="font-medium text-gray-900 truncate">
                      {req.studentName || "Student"}
                    </h4>
                    <p className="text-sm text-gray-600 truncate">{req.studentEmail || ""}</p>
                    <p className="text-xs text-gray-500 truncate mt-1">
                      Course: <span className="font-medium">{req.courseTitle || req.courseId}</span>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRequestAction(req.id, "REJECT")}
                    >
                      <AlertCircle size={14} className="mr-1" />
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleRequestAction(req.id, "APPROVE")}
                    >
                      <UserCheck size={14} className="mr-1" />
                      Approve
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Modal>

      {/* Analytics Modal */}
      <Modal
        isOpen={showAnalyticsModal}
        onClose={() => setShowAnalyticsModal(false)}
        title="Instructor Analytics"
        size="xl"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{stats.totalCourses}</div>
              <div className="text-sm text-blue-800">Total Courses</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{stats.totalStudents}</div>
              <div className="text-sm text-green-800">Total Students</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {stats.averageProgress}%
              </div>
              <div className="text-sm text-purple-800">Avg Progress</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">
                {stats.averageTestScore}%
              </div>
              <div className="text-sm text-yellow-800">Test Average</div>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 mb-3">Course Performance</h4>
            <div className="space-y-3">
              {assignedCourses.map((course) => {
                const enrolledStudents = myStudents.filter((s) =>
                  (s.assignedCourses || []).includes(course.id)
                );
                const avgProgress =
                  enrolledStudents.length > 0
                    ? enrolledStudents.reduce(
                      (sum, student) =>
                        sum + getStudentCourseProgress(student.id, course.id),
                      0
                    ) / enrolledStudents.length
                    : 0;

                return (
                  <div key={course.id} className="p-3 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{course.title}</h4>
                      <span className="text-sm text-gray-600">
                        {enrolledStudents.length} students
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-600">Average Progress</span>
                      <span className="font-medium">{Math.round(avgProgress)}%</span>
                    </div>
                    <Progress value={avgProgress} size="sm" />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Modal>

      {/* Create Course Modal */}
      <Modal
        isOpen={showCreateCourseModal}
        onClose={() => setShowCreateCourseModal(false)}
        title="Create New Course"
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Create a new course with modules and chapters. You can add content after
            creation.
          </p>
          <div className="text-center py-8">
            <BookOpen size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Course Builder</h3>
            <p className="text-gray-600 mb-4">Full course creation interface coming soon!</p>
            <Button onClick={() => navigate("/courses/create")}>Go to Course Builder</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default InstructorDashboardPage;
