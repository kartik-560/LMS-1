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


import {
  coursesAPI,
  chaptersAPI,
  enrollmentsAPI,
  FALLBACK_THUMB,
  assessmentsAPI,
} from "../services/api";

const InstructorDashboardPage = () => {
  const { user } = useAuthStore();
  const departmentName = user?.department?.name || user?.departmentName || null;
  const collegeName = user?.college?.name || user?.collegeName || null;
  const [assignedCourses, setAssignedCourses] = useState([]);
  const [myStudents, setMyStudents] = useState([]);
  const [courseModules, setCourseModules] = useState({});
  const [studentProgress, setStudentProgress] = useState({});
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState([]);
  const [enrollmentRequests, setEnrollmentRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [showRequestsModal, setShowRequestsModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);

  // NEW: chapters for selected course
  const [selectedCourseChapters, setSelectedCourseChapters] = useState([]);
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [openChapterId, setOpenChapterId] = useState(null);

  const [studentSearchTerm, setStudentSearchTerm] = useState("");
  const [testScoresByStudent, setTestScoresByStudent] = useState({});

  const [students, setStudents] = useState([]);


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

  const pickId = (v) => {
    if (v == null) return undefined;
    if (typeof v === "string" || typeof v === "number") return String(v);
    if (typeof v === "object") {
      if (v.id != null) return String(v.id);
      if (v.studentId != null) return String(v.studentId);
      if (v.userId != null) return String(v.userId);
      if (v.student && v.student.id != null) return String(v.student.id);
      if (v.user && v.user.id != null) return String(v.user.id);
    }
    return undefined;
  };

  const fetchInstructorRequests = async (courses = []) => {
    try {
      const arr = await enrollmentsAPI.listInstructorRequests();
      if (Array.isArray(arr) && arr.length > 0) return arr;
    } catch {
      // ignore and fall back
    }

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

  const fetchAll = async () => {
    try {
      setLoading(true);
      const params = { pageSize: 100 };
      if (user.collegeId) params.collegeId = user.collegeId;
      if (user.departmentId) params.departmentId = user.departmentId;


      // 1) Courses
      const rawCatalog = await coursesAPI.getCourseCatalog(params).catch(() => []);
      const assigned = Array.isArray(rawCatalog?.items)
        ? rawCatalog.items
        : Array.isArray(rawCatalog)
          ? rawCatalog
          : [];


      const normalized = assigned.map((c) => ({
        ...c,
        id: pickId(c) ?? String(c.id ?? ""),
        thumbnail: c.thumbnail || FALLBACK_THUMB,
        status: String(c.status || "draft").toLowerCase(),
      }));
      setAssignedCourses(normalized);
      setCourses(normalized);

      // 2) Chapters / modules
      const chapterLists = await batchFetchChapters(normalized);
      const modulesData = {};
      let totalChapters = 0;


      normalized.forEach((course, idx) => {
        const chapters = chapterLists[idx] || [];
        modulesData[course.id] = chapters.map((ch, i) => ({
          id: pickId(ch) ?? String(ch.id ?? `${course.id}-ch-${i}`),
          title: ch.title || `Chapter ${i + 1}`,
          totalChapters: 1,
          estimatedDuration: ch.estimatedDuration || "—",
        }));
        totalChapters += chapters.length;
      });
      setCourseModules(modulesData);


      // 3) Enrollments (gives you real students + progress)
      const enrollmentLists = await batchFetchEnrollments(normalized);


      const studentMap = new Map();
      const progressByStudent = {};


      normalized.forEach((course, idx) => {
        const enrollments = enrollmentLists[idx] || [];
        const courseIdStr = String(course.id);

        for (const e of enrollments) {
          // IMPORTANT: use real user/student id (matches AssessmentAttempt.studentId)
          const sid =
            e.student?.id ||
            e.user?.id ||
            e.studentId ||
            e.userId ||
            null;

          if (!sid) continue;

          const studentName =
            e.fullName ?? e.name ?? e.student?.name ?? e.user?.name ?? "";
          const studentEmail =
            e.studentEmail ?? e.email ?? e.student?.email ?? e.user?.email ?? "";

          const existing =
            studentMap.get(sid) || {
              id: sid, // now same as AssessmentAttempt.studentId
              fullName: studentName || "Student",
              email: studentEmail || "",
              avatar:
                "https://api.dicebear.com/7.x/initials/svg?seed=" +
                encodeURIComponent(studentName || "Student"),
              assignedCourses: [],
              lastLogin:
                e.lastLogin ??
                e.lastSeen ??
                (e.student && e.student.lastLogin) ??
                null,
            };

          if (!existing.assignedCourses.includes(courseIdStr)) {
            existing.assignedCourses.push(courseIdStr);
          }
          studentMap.set(sid, existing);

          if (!progressByStudent[sid]) progressByStudent[sid] = {};

          const chapters = e.student?.chapterProgress || [];
          if (chapters.length > 0) {
            const completed = chapters.filter((ch) => ch.isCompleted).length;
            const total = chapters.length;
            const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
            progressByStudent[sid][courseIdStr] = pct;
          } else {
            const rawProg =
              e.progress ?? e.studentProgress ?? e.progressPercent ?? 0;
            const prog = Number(rawProg);
            progressByStudent[sid][courseIdStr] = Number.isFinite(prog)
              ? Math.max(0, Math.min(100, prog))
              : 0;
          }
        }
      });


      const students = Array.from(studentMap.values());
      setMyStudents(students);
      setStudentProgress(progressByStudent);



      // 4) Instructor enrollment requests
      const instrReqs = await fetchInstructorRequests(normalized);
      setEnrollmentRequests(instrReqs);

      // 5) Stats with real average progress
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

      setStats((prev) => ({
        ...prev, // keep testsGraded & averageTestScore from scores effect
        totalCourses: normalized.length,
        totalStudents: students.length,
        activeStudents: 0,
        averageProgress: Math.round(avgProgress || 0),
        totalModules,
        totalChapters,
      }));
    } catch (error) {
      console.error("Error loading instructor dashboard:", error);
      toast.error(
        error?.response?.data?.error || "Failed to load dashboard data"
      );
    } finally {
      setLoading(false);
    }
  };

  const batchFetchChapters = async (courses) => {
    const results = new Array(courses.length);
    for (let i = 0; i < courses.length; i += 5) {
      const batch = courses.slice(i, i + 5);
      const batchPromises = batch.map((course, idx) =>
        // chaptersAPI likely accepts a string id — using course.id (already string)
        chaptersAPI
          .listByCourse(course.id)
          .then((res) => {
            const chapters = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
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

  const batchFetchEnrollments = async (courses) => {
    const results = new Array(courses.length);
    for (let i = 0; i < courses.length; i += 5) {
      const batch = courses.slice(i, i + 5);
      const batchPromises = batch.map((course, idx) =>
        enrollmentsAPI
          .list({ courseId: course.id })
          .then((res) => {
            results[i + idx] = Array.isArray(res) ? res : res?.data ?? res ?? [];
          })
          .catch(() => {
            results[i + idx] = [];
          })
      );
      await Promise.all(batchPromises);
    }
    return results;
  };

  const handleRequestAction = async (requestId, action) => {
    try {
      const next =
        action === "APPROVE" || action === "APPROVED" ? "APPROVED" : "REJECTED";
      await enrollmentsAPI.updateEnrollmentRequestStatus(requestId, next);
      setEnrollmentRequests((prev) => prev.filter((r) => r.id !== requestId));
      toast.success(next === "APPROVED" ? "Enrollment approved" : "Enrollment rejected");
    } catch (err) {
      console.error("Failed to update request", err);
      toast.error(err?.response?.data?.error || "Failed to update request");
    }
  };

  const fetchCourseChapters = async (courseId) => {
    try {
      setLoadingChapters(true);
      setSelectedCourseChapters([]);
      const res = await chaptersAPI.listByCourse(courseId);
      const chapters = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setSelectedCourseChapters(chapters);
    } catch (err) {
      console.error("Failed to load chapters", err);
      setSelectedCourseChapters([]);
      toast.error("Failed to load chapters");
    } finally {
      setLoadingChapters(false);
    }
  };

  const viewCourseDetails = async (course) => {
    if (!course) return;
    setSelectedCourse(course);
    // fetch full chapters (content) BEFORE opening modal
    await fetchCourseChapters(course.id);
    setOpenChapterId(null);
    setShowCourseModal(true);
  };

  const viewStudentDetails = (student) => {
    setSelectedStudent(student);
    setShowStudentModal(true);
  };

  const handleCourseAction = async (courseId, action) => {
    try {
      switch (action) {
        case "view": {
          const course = assignedCourses.find((c) => String(c.id) === String(courseId));
          await viewCourseDetails(course);
          break;
        }
        case "analytics":
          setSelectedCourse(assignedCourses.find((c) => String(c.id) === String(courseId)));
          setShowAnalyticsModal(true);
          break;
        case "students":
          setSelectedCourse(assignedCourses.find((c) => String(c.id) === String(courseId)));
          setShowStudentModal(true);
          break;
        default:
          break;
      }
    } catch (error) {
      toast.error("Action failed. Please try again.");
    }
  };

  const getStudentCourseProgress = (studentId, courseId) => {
    const s = String(studentId);
    const c = String(courseId);
    const v = studentProgress?.[s]?.[c];
    const n = typeof v === "number" && Number.isFinite(v) ? v : 0;
    return Math.max(0, Math.min(100, n));
  };

  const filteredStudents = students.filter((student) => {
    const studentName = (student?.fullName || student?.name || '').toLowerCase();
    const matchesSearch = studentName.includes(studentSearchTerm.toLowerCase());
    return matchesSearch;
  });

  useEffect(() => {
    const fetchScores = async () => {
      try {
        if (!courses || courses.length === 0) return;

        const params = {};
        if (user?.collegeId) params.collegeId = user.collegeId;
        if (user?.departmentId) params.departmentId = user.departmentId;

        const allScores = [];

        for (const course of courses) {
          const courseIdStr = String(course.id);

          const resp = await assessmentsAPI
            .getFinalScoresByCourse(courseIdStr, params)
            .catch(() => null);

          const data = Array.isArray(resp?.data)
            ? resp.data
            : Array.isArray(resp)
              ? resp
              : [];

          allScores.push(...data);
        }

        // Build testScoresByStudent[studentId][courseId] = [scores...]
        const map = {};

        allScores.forEach((a) => {
          const sid = String(a.studentId);
          const cid = String(a.courseId || "");
          if (!cid) return;
          if (typeof a.score !== "number") return;

          if (!map[sid]) map[sid] = {};
          if (!map[sid][cid]) map[sid][cid] = [];
          map[sid][cid].push(a.score);
        });

        setTestScoresByStudent(map);

        // ---- compute averages for stats ----
        const avg = (arr) =>
          !arr || arr.length === 0
            ? 0
            : arr.reduce((a, b) => a + b, 0) / arr.length;

        if (!myStudents || myStudents.length === 0) return;

        const perStudentTestAvg = myStudents.map((stu) => {
          const ids = stu.assignedCourses || [];
          if (ids.length === 0) return 0;

          const scores = ids.flatMap(
            (cid) => map[stu.id]?.[cid] || []
          );
          return avg(scores);
        });
       
        const globalTestAvg =
          perStudentTestAvg.length > 0 ? avg(perStudentTestAvg) : 0;

        const testsGraded = perStudentTestAvg.filter((v) => v > 0).length;

        setStats((prev) => ({
          ...prev,
          testsGraded,
          averageTestScore: Math.round(globalTestAvg || 0),
        }));
    

      } catch (err) {
        console.error("Error loading scores:", err);
      }
    };

    fetchScores();
  }, [courses, user, myStudents]);



  useEffect(() => {
    async function fetchStudents() {
      try {
        const response = await enrollmentsAPI.listInstructorDepartmentStudents();
        setStudents(response.data || []);
      } catch (error) {
        console.error("Failed to load students", error);
      }
    }
    fetchStudents();
  }, []);

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
                <div className="flex items-center space-x-2 mb-1 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                    Instructor Dashboard
                  </h1>
                  {departmentName && (
                    <Badge variant="primary" size="sm" className="mt-1 sm:mt-0">
                      {departmentName}
                    </Badge>
                  )}
                </div>
                <p className="text-sm sm:text-base text-gray-600">
                  Manage your courses and track student progress.
                </p>
                {collegeName && (
                  <p className="text-xs text-gray-500 mt-1">
                    {collegeName}
                  </p>
                )}
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
                <p className="text-lg sm:text-2xl font-bold text-gray-900">{stats.totalCourses}</p>
                <p className="text-xs text-gray-500 hidden sm:block">
                  {stats.totalChapters} chapters
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
                <p className="text-lg sm:text-2xl font-bold text-gray-900">{stats.totalStudents}</p>
                {/* <p className="text-xs text-gray-500">{stats.activeStudents} active</p> */}
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
                <p className="text-lg sm:text-2xl font-bold text-gray-900">{stats.averageProgress}%</p>
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
                <p className="text-xs sm:text-sm font-medium text-gray-600">
                  Test Average
                </p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">
                  {stats.averageTestScore}%
                </p>
                <p className="text-xs text-gray-500">
                  {stats.testsGraded} graded
                </p>
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
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No courses assigned yet</h3>
                    <p className="text-gray-600 mb-4">Contact admin to get courses assigned.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {assignedCourses.map((course) => {
                      const modules = courseModules[course.id] || [];
                      const enrolledStudents = myStudents.filter((student) =>
                        (student.assignedCourses || []).includes(String(course.id))
                      );
                      const avgProgress =
                        enrolledStudents.length > 0
                          ? enrolledStudents.reduce(
                            (sum, student) => sum + getStudentCourseProgress(student.id, course.id),
                            0
                          ) / enrolledStudents.length
                          : 0;


                      const completedStudentsCount = enrolledStudents.filter(
                        (student) => getStudentCourseProgress(student.id, course.id) >= 100
                      ).length;
                      const totalStudentsCount = enrolledStudents.length;
                      const completionPercent =
                        totalStudentsCount === 0 ? 0 : (completedStudentsCount / totalStudentsCount) * 100;


                      return (
                        <div
                          key={course.id}
                          className="border border-gray-200 rounded-lg p-4 sm:p-6 hover:shadow-sm transition-shadow"
                        >
                          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between space-y-4 lg:space-y-0">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-4">
                                <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                                  <img src={course.thumbnail || FALLBACK_THUMB} alt={course.title} className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1">
                                  <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-2 mb-1">
                                    <h3 className="text-base sm:text-lg font-medium text-gray-900">{course.title}</h3>
                                    <Badge
                                      variant={(course.status || "draft") === "published" ? "success" : "warning"}
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
                                      <span>{modules.length} Chapter</span>
                                    </span>


                                  </div>
                                </div>
                              </div>


                              <div className="space-y-2">
                                <div className="flex items-center justify-between text-xs sm:text-sm">
                                  <span className="text-gray-600">Course Completion</span>
                                  <span className="font-medium text-gray-900">
                                    {completedStudentsCount} of {totalStudentsCount} students
                                  </span>
                                </div>
                                <Progress value={Math.round(avgProgress)} size="sm" />
                              </div>
                            </div>


                            {/* Action buttons */}
                            <div className="flex flex-wrap gap-2 lg:flex-col lg:space-y-2">
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
                <Button size="sm" variant="outline" onClick={() => setShowRequestsModal(true)}>
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
                            <p className="text-sm font-medium text-gray-900 truncate">{req.studentName || "Student"}</p>
                            <p className="text-xs text-gray-600 truncate">{req.courseTitle || "Course"}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleRequestAction(req.id, "REJECT")}>
                              <AlertCircle size={14} className="mr-1" />
                              Reject
                            </Button>
                            <Button size="sm" onClick={() => handleRequestAction(req.id, "APPROVE")}>
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
                  Enrolled Student
                </Card.Title>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => setShowStudentModal(true)}>
                    View All
                  </Button>

                </div>
              </Card.Header>
              <Card.Content>
                {filteredStudents.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No students enrolled</p>
                ) : (
                  <div className="space-y-3">
                    {filteredStudents.slice(0, 5).map((student) => (
                      <div
                        key={student.id}
                        className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer"
                        onClick={() => viewStudentDetails(student)}
                      >
                        <div className="w-8 sm:w-10 h-8 sm:h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-lg">👨‍🎓</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                            {student.fullName}
                          </p>
                        </div>
                        <div className="text-xs sm:text-sm font-medium text-gray-400 flex-shrink-0">
                          View
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card.Content>
            </Card>

            {/* Recent Test Results */}
            {/* <Card>
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
                      const student = myStudents.find((s) => String(s.id) === String(result.studentId));
                      const course = assignedCourses.find((c) => String(c.id) === String(result.courseId));
                      return (
                        <div key={result.id} className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="text-sm font-medium text-gray-900">{student?.name}</h4>
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
            </Card> */}
          </div>
        </div>
      </div>

      {/* Course Details Modal */}
      <Modal isOpen={showCourseModal} onClose={() => setShowCourseModal(false)} title={selectedCourse?.title} size="lg">
        {selectedCourse && (
          <div className="space-y-6">
            <div className="flex items-center space-x-4">
              <img src={selectedCourse.thumbnail || FALLBACK_THUMB} alt={selectedCourse.title} className="w-20 h-20 rounded-lg object-cover" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{selectedCourse.title}</h3>
                <p className="text-gray-600">{selectedCourse.description}</p>
                <div className="flex items-center space-x-2 mt-2">
                  <Badge variant="info">{selectedCourse.level || "—"}</Badge>
                  <Badge variant="default">{selectedCourse.category || "—"}</Badge>
                  <Badge variant={(selectedCourse.status || "draft") === "published" ? "success" : "warning"}>
                    {selectedCourse.status || "draft"}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="text-xl font-bold text-blue-600">{(courseModules[selectedCourse.id] || []).length}</div>
                <div className="text-sm text-blue-800">Modules</div>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <div className="text-xl font-bold text-green-600">{selectedCourse.totalChapters ?? (courseModules[selectedCourse.id] || []).length}</div>
                <div className="text-sm text-green-800">Chapters</div>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <div className="text-xl font-bold text-purple-600">{myStudents.filter((s) => (s.assignedCourses || []).includes(String(selectedCourse.id))).length}</div>
                <div className="text-sm text-purple-800">Students</div>
              </div>
              <div className="p-3 bg-yellow-50 rounded-lg">
                <div className="text-xl font-bold text-yellow-600">
                  {Math.round(
                    myStudents
                      .filter((s) => (s.assignedCourses || []).includes(String(selectedCourse.id)))
                      .reduce((sum, s) => sum + getStudentCourseProgress(s.id, selectedCourse.id), 0) /
                    Math.max(
                      1,
                      myStudents.filter((s) => (s.assignedCourses || []).includes(String(selectedCourse.id))).length
                    )
                  )}
                  %
                </div>
                <div className="text-sm text-yellow-800">Avg. Progress</div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-600">Average Student Progress</span>
                <span className="font-medium text-gray-900">
                  {Math.round(
                    myStudents
                      .filter((s) => (s.assignedCourses || []).includes(String(selectedCourse.id)))
                      .reduce((sum, s) => sum + getStudentCourseProgress(s.id, selectedCourse.id), 0) /
                    Math.max(
                      1,
                      myStudents.filter((s) => (s.assignedCourses || []).includes(String(selectedCourse.id))).length
                    )
                  )}
                  %
                </span>
              </div>
              <Progress
                value={
                  myStudents.length === 0
                    ? 0
                    : myStudents
                      .filter((s) => (s.assignedCourses || []).includes(String(selectedCourse.id)))
                      .reduce((sum, s) => sum + getStudentCourseProgress(s.id, selectedCourse.id), 0) /
                    Math.max(
                      1,
                      myStudents.filter((s) => (s.assignedCourses || []).includes(String(selectedCourse.id))).length
                    )
                }
              />
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-3">Course Modules & Chapters</h4>

              {/* Chapters list (with content) */}
              {loadingChapters ? (
                <div className="text-center py-6 text-gray-600">Loading chapters…</div>
              ) : selectedCourseChapters.length === 0 ? (
                <div className="text-sm text-gray-500">No chapters available for this course.</div>
              ) : (
                <div className="space-y-3">
                  {selectedCourseChapters.map((chapter, idx) => {
                    const isOpen = openChapterId === chapter.id;
                    // Try to find safe text content fields
                    const htmlContent = chapter.contentHtml ?? chapter.html ?? chapter.bodyHtml;
                    const textContent = chapter.content ?? chapter.text ?? chapter.body ?? chapter.description ?? "";
                    return (
                      <div key={chapter.id || `${selectedCourse.id}-ch-${idx}`} className="border border-gray-200 rounded-lg overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setOpenChapterId(isOpen ? null : chapter.id)}
                          className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium text-primary-600">{idx + 1}</span>
                            </div>
                            <div className="text-left">
                              <div className="text-sm font-medium text-gray-900">{chapter.title || `Chapter ${idx + 1}`}</div>
                              <div className="text-xs text-gray-500">{chapter.estimatedDuration || "—"}</div>
                            </div>
                          </div>
                          <div className="text-xs text-gray-500">{isOpen ? "Hide" : "View"}</div>
                        </button>

                        {isOpen && (
                          <div className="p-4 bg-white text-sm text-gray-800">
                            {htmlContent ? (
                              // We render HTML if present. Ensure your backend provides only safe HTML.
                              <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
                            ) : textContent ? (
                              <pre className="whitespace-pre-wrap break-words">{textContent}</pre>
                            ) : (
                              <div className="text-xs text-gray-500">No content for this chapter.</div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex space-x-3">
              {/* analytics button could live here */}
            </div>
          </div>
        )}
      </Modal>

      {/* Student Management Modal */}
      <Modal isOpen={showStudentModal} onClose={() => setShowStudentModal(false)} title="Enrolled Students" size="xl">
        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <Input
                placeholder="Search students..."
                value={studentSearchTerm}
                onChange={(e) => setStudentSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {filteredStudents.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No students found
              </div>
            ) : (
              filteredStudents.map((student) => (
                <div key={student.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:shadow-sm transition-shadow">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-xl">👨‍🎓</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{student.fullName}</h4>

                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </Modal>

      {/* Enrollment Requests Modal */}
      <Modal isOpen={showRequestsModal} onClose={() => setShowRequestsModal(false)} title="Pending Enrollment Requests" size="lg">
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
                    <h4 className="font-medium text-gray-900 truncate">{req.studentName || "Student"}</h4>
                    <p className="text-sm text-gray-600 truncate">{req.studentEmail || ""}</p>
                    <p className="text-xs text-gray-500 truncate mt-1">
                      Course: <span className="font-medium">{req.courseTitle || req.courseId}</span>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleRequestAction(req.id, "REJECT")}>
                      <AlertCircle size={14} className="mr-1" />
                      Reject
                    </Button>
                    <Button size="sm" onClick={() => handleRequestAction(req.id, "APPROVE")}>
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
      <Modal isOpen={showAnalyticsModal} onClose={() => setShowAnalyticsModal(false)} title="Course Analytics" size="xl">
        {selectedCourse && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{(courseModules[selectedCourse.id] || []).length}</div>
                <div className="text-sm text-blue-800">Modules</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {myStudents.filter((s) => (s.assignedCourses || []).includes(String(selectedCourse.id))).length}
                </div>
                <div className="text-sm text-green-800">Enrolled Students</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {Math.round(
                    myStudents
                      .filter((s) => (s.assignedCourses || []).includes(String(selectedCourse.id)))
                      .reduce((sum, s) => sum + getStudentCourseProgress(s.id, selectedCourse.id), 0) /
                    Math.max(
                      1,
                      myStudents.filter((s) => (s.assignedCourses || []).includes(String(selectedCourse.id))).length
                    )
                  )}
                  %
                </div>
                <div className="text-sm text-purple-800">Avg Progress</div>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">{selectedCourse.totalChapters ?? (courseModules[selectedCourse.id] || []).length}</div>
                <div className="text-sm text-yellow-800">Total Chapters</div>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-3">Student Progress Breakdown</h4>
              <div className="space-y-3">
                {myStudents
                  .filter((s) => (s.assignedCourses || []).includes(String(selectedCourse.id)))
                  .map((student) => {
                    const progress = getStudentCourseProgress(student.id, selectedCourse.id);
                    return (
                      <div key={student.id} className="p-3 border border-gray-200 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            <img src={student.avatar} alt={student.name} className="w-8 h-8 rounded-full" />
                            <div>
                              <h4 className="font-medium text-gray-900">{student.name}</h4>
                              <p className="text-xs text-gray-500">{student.email}</p>
                            </div>
                          </div>
                          <span className="text-sm font-medium">{Math.round(progress)}%</span>
                        </div>
                        <Progress value={progress} size="sm" />
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default InstructorDashboardPage;
