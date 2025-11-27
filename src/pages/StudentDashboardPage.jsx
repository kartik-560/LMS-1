import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  BookOpen,
  Clock,
  Award,
  Play,
  CheckCircle,
  Target,
  FileText,
  Lock,
  Brain,
  Trophy,
  GraduationCap,
} from "lucide-react";
import { toast } from "react-hot-toast";

import {
  coursesAPI,
  chaptersAPI,
  FALLBACK_THUMB,
  assessmentsAPI
} from "../services/api";
import useAuthStore from "../store/useAuthStore";
import Progress from "../components/ui/Progress";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import { progressAPI } from "../services/api";

const StudentDashboardPage = () => {
  const { user, isAuthenticated, hasHydrated } = useAuthStore();
  const navigate = useNavigate();

  const [assignedCourses, setAssignedCourses] = useState([]);
  const [currentProgress, setCurrentProgress] = useState({});
  const [availableTests, setAvailableTests] = useState([]);
  const [completedTests, setCompletedTests] = useState([]);
  const [aiInterviewStatus, setAiInterviewStatus] = useState({});
  const [loading, setLoading] = useState(true);
  const [showCourseModal, setShowCourseModal] = useState(false);

  const [showTestModal, setShowTestModal] = useState(false);
  const [selectedTest, setSelectedTest] = useState(null);

  const [stats, setStats] = useState({
    totalCourses: 0,
    completedChapters: 0,
    averageTestScore: 0,
    totalTimeSpent: 0,
    certificatesEarned: 0,
  });

  useEffect(() => {
    if (!hasHydrated || !isAuthenticated) {
      setLoading(false);
      return;
    }
    fetchStudentData();

  }, [hasHydrated, isAuthenticated]);

  const fetchStudentData = async () => {
    const abort = new AbortController();

    const resetState = () => {
      setAssignedCourses([]);
      setCurrentProgress({});
      setAvailableTests([]);
      setCompletedTests([]);
      setAiInterviewStatus({});
      setStats({
        totalCourses: 0,
        completedChapters: 0,
        averageTestScore: 0,
        totalTimeSpent: 0,
        certificatesEarned: 0,
      });
    };

    try {
      setLoading(true);

      const role = String(user?.role || "").toUpperCase();
      const studentId = String(user?.id || "").trim();

      if (!studentId) {
        toast.error("Could not identify your student account.");
        resetState();
        return () => abort.abort();
      }
      if (!role.includes("STUDENT")) {
        toast.error(
          "This page is for students. Please log in with a student account."
        );
        resetState();
        return () => abort.abort();
      }

      let myCourses = [];
      try {
        const resp = await coursesAPI.getStudentCourses(
          user?.collegeId,
          studentId,
          "", "all", "all", "assigned", 1, 3
        );
        myCourses =
          resp?.data?.data ?? resp?.data ?? (Array.isArray(resp) ? resp : []);
      } catch (e) {
        console.warn("getStudentCourses failed; will try fallback", e);
      }

      if (!Array.isArray(myCourses) || myCourses.length === 0) {
        const resp = await coursesAPI.getCourseCatalog({
          view: "enrolled",
          collegeId: user?.collegeId,
          page: 1,
          pageSize: 3,
          sortBy: "createdAt",
          order: "desc",
        }).catch(() => null);

        myCourses =
          resp?.data?.data ?? resp?.data ?? (Array.isArray(resp) ? resp : []);
      }

      const normalizeCourse = (c) => {
        // ✅ Log to debug


        // ✅ If it's an enrollment object with nested course
        if (c.course && typeof c.course === 'object') {

          return {
            ...c.course,
            id: c.course.id,
            enrollmentId: c.id, // Keep enrollment ID for reference
            enrollmentStatus: c.status
          };
        }

        // ✅ If it has courseId (enrollment structure)
        if (c.courseId && !c.course) {

          return { ...c, id: c.courseId };
        }


        return { ...c, id: c.id };
      };


      myCourses = myCourses.map(normalizeCourse); 

      if (!Array.isArray(myCourses) || myCourses.length === 0) {
        resetState();
        return () => abort.abort();
      }

      // NEW: Try to get all enrolled courses for comprehensive certificate count
      let allEnrolledCourses = [...myCourses]; // Default to displayed courses

      try {
        // Attempt to fetch all enrollments
        const enrollmentsResp = await enrollmentsAPI.listSelf();
        const enrollments = enrollmentsResp?.data ?? enrollmentsResp ?? [];

        if (Array.isArray(enrollments) && enrollments.length > 0) {
          allEnrolledCourses = enrollments.map(enrollment => {
            const course = enrollment.course ?? enrollment;
            return normalizeCourse(course);
          });

        }
      } catch (err) {
        console.warn('Enrollments API not available, using displayed courses only:', err);
        // Fallback: just use the 3 displayed courses
      }

      // Fetch all necessary data in parallel
      const [chaptersList, completedChaptersList, summaries, certificatesData] = await Promise.all([
        // 1. Get total chapters for each displayed course
        Promise.all(
          myCourses.map((c) =>
            chaptersAPI
              .listByCourse(c.courseId ?? c.id)
              .then((r) => r?.data?.data ?? r?.data ?? [])
              .catch((err) => {
                console.warn(`Failed to fetch chapters for course ${c.id}:`, err);
                return [];
              })
          )
        ),
        // 2. Get completed chapters for each displayed course
        Promise.all(
          myCourses.map((c) =>
            progressAPI
              .completedChapters(c.courseId ?? c.id)
              .then((r) => r?.data?.data ?? r?.data ?? [])
              .catch((err) => {
                console.warn(`Failed to fetch completed chapters for course ${c.id}:`, err);
                return [];
              })
          )
        ),
        // 3. Get the summary for each displayed course
        Promise.all(
          myCourses.map((c) =>
            progressAPI
              .courseSummary(c.courseId ?? c.id)
              .then((r) => r?.data?.data ?? r?.data ?? {})
              .catch((err) => {
                console.warn(`Failed to fetch summary for course ${c.id}:`, err);
                return {};
              })
          )
        ),
        // 4. NEW: Fetch certificates for ALL enrolled courses (not just displayed 3)
        Promise.all(
          allEnrolledCourses.map(async (c) => {
            try {
              const courseId = c.courseId ?? c.id;

              const finalTestResp = await assessmentsAPI
                .getFinalTestByCourse(courseId)
                .catch(() => null);

              const finalTest = finalTestResp?.data ?? finalTestResp;

              if (!finalTest || !finalTest.id) {
                return null;
              }

              const certificateResp = await assessmentsAPI
                .getCertificate(finalTest.id)
                .catch(() => null);

              const certificate = certificateResp?.data ?? certificateResp;

              if (certificate && (certificate.certificateId || certificate.id)) {

                return { courseId, certificate };
              }

              return null;
            } catch (err) {
              return null;
            }
          })
        ),
      ]);

      const validCertificates = certificatesData.filter(c => c !== null);
      const totalCertsEarned = validCertificates.length;

      const certificateMap = new Map();
      validCertificates.forEach(({ courseId, certificate }) => {
        certificateMap.set(courseId, certificate);
      });

      const nextProgressData = {};
      const nextAiStatusData = {};
      const nextCourseWithData = [];

      let totalChaptersDone = 0;
      let weightedScoreSum = 0;
      let totalTestsTaken = 0;
      let totalTimeSpentMinutes = 0;

      myCourses.forEach((course, i) => {
        const totalCourseChapters = chaptersList[i] || [];
        const completedCourseChapters = completedChaptersList[i] || [];
        const sum = summaries[i] || {};

        // Check certificate from map
        const certificate = certificateMap.get(course.id);

        const total = totalCourseChapters.length;
        const done = completedCourseChapters.length;

        const hasCertificate = !!certificate;

        const progressData = {
          completedChapters: completedCourseChapters,
          courseTestResult: { passed: sum.courseTestResult?.passed || false },
          aiInterviewResult: { completed: sum.aiInterviewResult?.completed || false },
          certificate: certificate,
        };

        // Pre-calculate Progress
        const totalSteps = total + 2;
        const completedSteps =
          done +
          (progressData.courseTestResult.passed ? 1 : 0) +
          (progressData.aiInterviewResult.completed ? 1 : 0);

        const courseProgress = totalSteps > 0
          ? Math.round((completedSteps / totalSteps) * 100)
          : 0;

        // Pre-calculate Next Action
        const allChaptersDone = done >= total;
        let nextAction;

        if (!allChaptersDone) {
          nextAction = { type: "continue", text: "Continue Learning" };
        } else if (!progressData.courseTestResult.passed) {
          nextAction = { type: "course-test", text: "Take Final Test" };
        } else {
          nextAction = { type: "completed", text: "Course Complete", icon: Trophy };
        }

        nextCourseWithData.push({
          ...course,
          totalChapters: total,
          courseProgress: courseProgress,
          nextAction: nextAction,
          hasCertificate: hasCertificate,
        });

        nextProgressData[course.id] = progressData;
        nextAiStatusData[course.id] = { completed: progressData.aiInterviewResult.completed };
        totalChaptersDone += done;

        // Aggregate test scores from summary
        const taken = Number(sum.tests?.taken ?? 0);
        const avg = Number(sum.tests?.averagePercent ?? 0);
        weightedScoreSum += avg * taken;
        totalTestsTaken += taken;

        // Aggregate time spent from course summary
        const courseTimeSpent = Number(sum.timeSpent ?? 0);
        totalTimeSpentMinutes += courseTimeSpent;
      });

      // Single state commit
      setAssignedCourses(nextCourseWithData);
      setCurrentProgress(nextProgressData);
      setAiInterviewStatus(nextAiStatusData);
      setCompletedTests([]);
      setAvailableTests([]);

      setStats({
        totalCourses: allEnrolledCourses.length, // Use all enrolled courses count
        completedChapters: totalChaptersDone,
        averageTestScore: totalTestsTaken
          ? Math.round(weightedScoreSum / totalTestsTaken)
          : 0,
        totalTimeSpent: totalTimeSpentMinutes,
        certificatesEarned: totalCertsEarned, // Actual certificate count
      });

    } catch (error) {
      console.error("Error fetching student data:", error);
      toast.error(
        (error?.response?.data?.error) ||
        (error?.message) ||
        "Failed to load dashboard data"
      );
      resetState();
    } finally {
      setLoading(false);
    }

    return () => abort.abort();
  };

  const goToCourse = async (courseId) => {
    if (!courseId) {
      toast.error("Missing course id");
      return;
    }

    const id = String(courseId);
    const encodedId = encodeURIComponent(id);

    try {

      const response = await chaptersAPI.listByCourse(id);

      const chapters = response?.data?.data ?? response?.data ?? response ?? [];

      if (!Array.isArray(chapters) || chapters.length === 0) {

        toast("This course has no chapters yet");

        setShowCourseModal?.(false);
        navigate(`/courses/${encodedId}`);
        return;
      }

      // Sort and get first chapter
      const sortedChapters = chapters.slice().sort((a, b) => (a?.order ?? 0) - (b?.order ?? 0));
      const firstChapter = sortedChapters[0];

      setShowCourseModal?.(false);

      if (firstChapter?.id) {
        navigate(`/courses/${encodedId}?start=${encodeURIComponent(firstChapter.id)}`, {
          state: { startChapterId: firstChapter.id },
        });
      } else {
        navigate(`/courses/${encodedId}`);
      }

    } catch (error) {
      console.error("Failed to load course:", error);

      if (error?.response?.status === 404) {
        toast.error("This course is not available or has been removed");
      } else {
        toast.error("Failed to load course. Please try again.");
      }

      setShowCourseModal?.(false);
    }
  };

  const goToFinalTest = async (courseId) => {
    try {
      const finalTestResp = await assessmentsAPI.getFinalTestByCourse(courseId);

      // Properly unwrap the response
      const finalTest = finalTestResp?.data ?? finalTestResp;

      if (!finalTest || !finalTest.id) {
        toast.error("Final test not available for this course");
        return;
      }

      // Navigate to test with state to track course completion
      navigate(`/view_finaltest?assessmentId=${finalTest.id}`, {
        state: { courseId: courseId }
      });
    } catch (error) {
      console.error("Failed to fetch final test:", error);
      toast.error("Failed to load final test");
    }
  };

  const startTest = (test) => {
    setSelectedTest(test);
    setShowTestModal(true);
  };


  const formatTimeSpent = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">
            Loading your learning dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4 mb-4">
            <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
              <GraduationCap size={24} className="text-primary-600" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Welcome back, {user?.fullName || user?.name || "Student"}!
              </h1>
              <p className="text-sm sm:text-base text-gray-600">
                Continue your learning journey and unlock new opportunities.
              </p>

            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center">
              <div className="w-10 sm:w-12 h-10 sm:h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <BookOpen size={24} className="text-blue-600" />
              </div>
              <div className="ml-2 sm:ml-4">
                <p className="text-xs sm:text-sm font-medium text-gray-600">
                  Assigned Courses
                </p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">
                  {stats.totalCourses}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <div className="w-10 sm:w-12 h-10 sm:h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle size={24} className="text-green-600" />
              </div>
              <div className="ml-2 sm:ml-4">
                <p className="text-xs sm:text-sm font-medium text-gray-600">
                  Chapters Done
                </p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">
                  {stats.completedChapters}
                </p>
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
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <div className="w-10 sm:w-12 h-10 sm:h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                <Clock size={24} className="text-indigo-600" />
              </div>
              <div className="ml-2 sm:ml-4">
                <p className="text-xs sm:text-sm font-medium text-gray-600">
                  Time Spent
                </p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">
                  {formatTimeSpent(stats.totalTimeSpent)}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <div className="w-10 sm:w-12 h-10 sm:h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <Trophy size={24} className="text-red-600" />
              </div>
              <div className="ml-2 sm:ml-4">
                <p className="text-xs sm:text-sm font-medium text-gray-600">
                  Certificates
                </p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">
                  {stats.certificatesEarned}
                </p>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* My Courses */}
          <div className="lg:col-span-2">
            <Card>
              <Card.Header className="flex items-center justify-between">
                <Card.Title>My Learning Path</Card.Title>
                <Link to="/courses-list">
                  <button className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75">
                    View My Courses
                  </button>
                </Link>
              </Card.Header>
              <Card.Content>
                {assignedCourses.length === 0 ? (
                  <div className="text-center py-8">
                    <BookOpen
                      size={48}
                      className="mx-auto text-gray-400 mb-4"
                    />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No courses assigned yet
                    </h3>
                    <p className="text-gray-600">
                      Contact your instructor to get assigned to courses.
                    </p>
                  </div>
                ) : (

                  <div className="space-y-6">
                    {assignedCourses.map((course) => {
                      const progress = currentProgress[course.id];
                      const completedCount = progress?.completedChapters?.length || 0;
                      const totalCount = course.totalChapters || 1; // Prevent division by zero
                      const actualProgress = Math.round((completedCount / totalCount) * 100);

                      return (
                        <div
                          key={course.id}
                          className="border border-gray-200 rounded-lg p-4 sm:p-6 hover:shadow-sm transition-shadow"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between space-y-4 sm:space-y-0 mb-4">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-3">
                                <div className="w-10 sm:w-12 h-10 sm:h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                                  <img
                                    src={course.thumbnail || FALLBACK_THUMB}
                                    alt={course.title}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <div>
                                  <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                                    {course.title}
                                  </h3>
                                  <p className="text-sm text-gray-600">
                                    by{" "}
                                    {course.instructorNames?.[0] ||
                                      "Instructor"}
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                              {/* Always show primary action button */}
                              <Button
                                key={`primary-${course.id}`}
                                size="sm"
                                className="w-full sm:w-auto"
                                onClick={() => goToCourse(course.id)}
                              >
                                <Play size={16} className="mr-1" />
                                {(() => {
                                  // ✅ Check both courseProgress and actual completion
                                  const progress = course.courseProgress || 0;
                                  const progressObj = currentProgress[course.id];
                                  const completedChapters = progressObj?.completedChapters?.length || 0;
                                  const totalChapters = course.totalChapters || 0;

                                  const isComplete = progress >= 100 || (totalChapters > 0 && completedChapters >= totalChapters);

                                  if (!progress || progress === 0) return "Start Course";
                                  if (isComplete) return "View Course";
                                  return "Continue Learning";
                                })()}
                              </Button>

                              {/* Final Test Button */}
                              {(() => {
                                const completedTests = JSON.parse(localStorage.getItem("completedTests") || "{}");
                                const isTestCompleted = completedTests[course.id]?.completed;

                                // ✅ Check both progress sources
                                const progress = course.courseProgress || 0;
                                const progressObj = currentProgress[course.id];
                                const completedChapters = progressObj?.completedChapters?.length || 0;
                                const totalChapters = course.totalChapters || 0;

                                const isComplete = progress >= 100 || (totalChapters > 0 && completedChapters >= totalChapters);

                                if (isComplete && !isTestCompleted && course.nextAction?.type === "course-test") {
                                  return (
                                    <Button
                                      key={`test-${course.id}`}
                                      size="sm"
                                      variant="outline"
                                      className="w-full sm:w-auto"
                                      onClick={() => goToFinalTest(course.id)}
                                    >
                                      <FileText size={16} className="mr-1" />
                                      Take Final Test
                                    </Button>
                                  );
                                }
                                return null;
                              })()}

                            </div>

                          </div>

                          <div className="space-y-3">
                            <div className="flex items-center justify-between text-xs sm:text-sm">
                              <span className="text-gray-600">
                                Overall Progress
                              </span>

                              <span className="font-medium text-gray-900">
                                {actualProgress}%
                              </span>
                            </div>

                            <Progress value={actualProgress} size="sm" />

                            <div className="grid grid-cols-2 gap-2 sm:gap-4 text-xs sm:text-sm">
                              <div className="text-center">
                                <div className="font-medium text-gray-900">

                                  {progress?.completedChapters?.length || 0}/
                                  {course.totalChapters}
                                </div>
                                <div className="text-gray-500">Chapters</div>
                              </div>
                              {/* <div className="text-center">
                                <div className="font-medium text-gray-900">

                                  {aiInterviewStatus[course.id]?.completed
                                    ? "1/1"
                                    : "0/1"}
                                </div>
                                <div className="text-gray-500">
                                  AI Interview
                                </div>
                              </div> */}
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
            {/* Available Tests */}
            <Card>
              <Card.Header>
                <Card.Title className="flex items-center">
                  <FileText size={20} className="mr-2 text-blue-500" />
                  Available Tests
                  {availableTests.length > 0 && (
                    <Badge variant="primary" size="sm" className="ml-2">
                      {availableTests.length}
                    </Badge>
                  )}
                </Card.Title>
              </Card.Header>
              <Card.Content>
                {availableTests.length === 0 ? (
                  <div className="text-center py-4">
                    <CheckCircle
                      size={32}
                      className="mx-auto text-green-500 mb-2"
                    />
                    <p className="text-sm text-gray-600">No tests available</p>
                    <p className="text-xs text-gray-500">
                      Complete more chapters to unlock tests
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {availableTests.map((test) => (
                      <div
                        key={test.id}
                        className="p-3 sm:p-4 bg-blue-50 rounded-lg border border-blue-200"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between space-y-2 sm:space-y-0 mb-2">
                          <div>
                            <h4 className="text-sm sm:text-base font-medium text-gray-900">
                              {test.title}
                            </h4>
                            <p className="text-xs text-gray-600">
                              {test.courseTitle}
                            </p>
                            {test.moduleTitle && (
                              <p className="text-xs text-gray-500">
                                Section: {test.moduleTitle}
                              </p>
                            )}
                          </div>
                          <Badge
                            variant="warning"
                            size="sm"
                            className="self-start"
                          >
                            test
                          </Badge>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                          <div className="text-xs text-gray-500 flex-1">
                            {test.questions} questions • {test.duration} min •{" "}
                            {test.passingScore}% to pass
                          </div>
                          <Button
                            size="sm"
                            onClick={() => startTest(test)}
                            className="w-full sm:w-auto"
                          >
                            Start Test
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card.Content>
            </Card>


          </div>
        </div>
      </div>

    </div>
  );
};

export default StudentDashboardPage;
