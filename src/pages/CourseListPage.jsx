import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  PlayCircle,
  Play,
  Brain,
  FileText,
  Trophy,
  ArrowLeft
} from "lucide-react";
import { toast } from "react-hot-toast";

import {
  coursesAPI,
  chaptersAPI,
  progressAPI,
  FALLBACK_THUMB,
  assessmentsAPI
} from "../services/api";
import useAuthStore from "../store/useAuthStore";
import Progress from "../components/ui/Progress";
import Button from "../components/ui/Button";

// --- START OF CHANGE ---
const PAGE_SIZE = 10;
// --- END OF CHANGE ---

const CourseListPage = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [assignedCourses, setAssignedCourses] = useState([]);
  const [currentProgress, setCurrentProgress] = useState({});
  const hasHydrated = true;

  // --- START OF CHANGE ---
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Reset to page 1 when auth state changes
  useEffect(() => {
    setCurrentPage(1);
  }, [isAuthenticated]);
  // --- END OF CHANGE ---

  useEffect(() => {
    if (!hasHydrated || !isAuthenticated) {
      setLoading(false);
      return;
    }
    fetchStudentData();
    // --- START OF CHANGE ---
  }, [hasHydrated, isAuthenticated, currentPage]);


  const fetchStudentData = async () => {
    const abort = new AbortController();

    const resetState = () => {
      setAssignedCourses([]);
      setCurrentProgress({});
      setCurrentPage(1);
      setTotalPages(1);
    };

    try {
      setLoading(true);

      const roleRaw = (user && user.role) ?? "";
      const role = String(roleRaw).toUpperCase();
      const studentId = String((user && user.id) ?? "").trim();

      if (!studentId) {
        toast.error("Could not identify your student account.");
        resetState();
        setLoading(false);
        return () => abort.abort();
      }

      if (!role.includes("STUDENT")) {
        toast.error("This page is for students. Please log in with a student account.");
        resetState();
        setLoading(false);
        return () => abort.abort();
      }

      let myCourses = [];
      let totalCount = null;

      try {
        const resp = await coursesAPI.getStudentCourses(
          user && user.collegeId,
          studentId,
          "",
          "all",
          "all",
          "assigned",
          currentPage,
          PAGE_SIZE
        );

        if (!resp || resp.status === 204 || resp.data === '' || resp.data === null) {
          resetState();
          setLoading(false);
          return () => abort.abort();
        }

        myCourses = resp?.data?.data ?? resp?.data ?? (Array.isArray(resp) ? resp : []);
        totalCount =
          resp?.data?.total ??
          resp?.data?.pagination?.total ??
          resp?.data?.meta?.total ??
          null;

      } catch (e) {
        console.error("[Error] getStudentCourses error:", e);

        if (e.response && e.response.status === 204) {
          resetState();
          setLoading(false);
          return () => abort.abort();
        }

        toast.error("Failed to load your courses.");
        resetState();
        setLoading(false);
        return () => abort.abort();
      }

      if (!Array.isArray(myCourses) || myCourses.length === 0) {
        resetState();
        setLoading(false);
        return () => abort.abort();
      }

      if (totalCount !== null) {
        setTotalPages(Math.ceil(totalCount / PAGE_SIZE));
      } else {
        setTotalPages(1);
      }

      const normalizeCourse = (c) => {
        if (c.course && typeof c.course === 'object') {
          return {
            ...c.course,
            id: c.course.id,
            enrollmentId: c.id,
            enrollmentStatus: c.status
          };
        }

        if (c.courseId && !c.course) {
          return { ...c, id: c.courseId };
        }

        return { ...c, id: c.id };
      };

      myCourses = myCourses.map(normalizeCourse);

      // ✅ Only fetch chapters and completed chapters (removed summaries)
      const [chaptersList, completedChaptersList] = await Promise.all([
        Promise.all(
          myCourses.map((c) =>
            chaptersAPI
              .listByCourse(c.id)
              .then((r) => {
                if (!r || r.status === 204 || r.data === '' || r.data === null) {
                  return [];
                }
                if (Array.isArray(r)) return r;
                if (r?.data?.data && Array.isArray(r.data.data)) return r.data.data;
                if (r?.data && Array.isArray(r.data)) return r.data;
                return [];
              })
              .catch((err) => {
                console.warn(`[Error] fetching chapters for course ${c.id}:`, err);
                return [];
              })
          )
        ),

        Promise.all(
          myCourses.map((c) =>
            progressAPI
              .completedChapters(c.id)
              .then((r) => {
                if (!r || r.status === 204 || r.data === '' || r.data === null) {
                  return [];
                }
                if (Array.isArray(r)) return r;
                if (r?.data?.data && Array.isArray(r.data.data)) return r.data.data;
                if (r?.data && Array.isArray(r.data)) return r.data;
                return [];
              })
              .catch((err) => {
                console.warn(`[Error] fetching completed chapters for course ${c.id}:`, err);
                return [];
              })
          )
        ),
      ]);

      const nextProgressData = {};
      const nextCourseWithCounts = [];

      myCourses.forEach((course, i) => {
        const totalCourseChapters = chaptersList[i] || [];
        const completedCourseChapters = completedChaptersList[i] || [];

        nextProgressData[course.id] = {
          completedChapters: completedCourseChapters,
        };

        // Calculate nextAction based on progress
        const completedCount = completedCourseChapters.length;
        const totalCount = totalCourseChapters.length;
        const isComplete = totalCount > 0 && completedCount >= totalCount;

        // Check if test is completed from localStorage
        const completedTests = JSON.parse(localStorage.getItem("completedTests") || "{}");
        const isTestCompleted = completedTests[course.id]?.completed;

        let nextAction = { type: "start", text: "Start Course" };

        if (completedCount > 0 && !isComplete) {
          nextAction = { type: "continue", text: "Continue Learning" };
        } else if (isComplete && !isTestCompleted) {
          nextAction = { type: "course-test", text: "Take Final Test" };
        } else if (isComplete && isTestCompleted) {
          nextAction = { type: "certificate", text: "View Certificate" };
        }

        nextCourseWithCounts.push({
          ...course,
          totalChapters: totalCourseChapters.length,
          completedChaptersCount: completedCourseChapters.length,
          nextAction,
        });
      });

      setAssignedCourses(nextCourseWithCounts);
      setCurrentProgress(nextProgressData);

    } catch (error) {
      console.error("[Error] In fetchStudentData:", error);
      toast.error(
        (error &&
          error.response &&
          error.response.data &&
          error.response.data.error) ||
        (error && error.message) ||
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

      let chapters = [];

      if (Array.isArray(response)) {
        chapters = response;
      } else if (response?.data?.data && Array.isArray(response.data.data)) {
        chapters = response.data.data;
      } else if (response?.data && Array.isArray(response.data)) {
        chapters = response.data;
      } else if (response?.chapters && Array.isArray(response.chapters)) {
        chapters = response.chapters;
      }



      if (!chapters || chapters.length === 0) {
        navigate(`/courses/${encodedId}`, {
          state: { courseId: id },
        });
        return;
      }

      const sortedChapters = [...chapters].sort((a, b) =>
        (a?.order ?? 0) - (b?.order ?? 0)
      );

      const firstChapter = sortedChapters[0];
      const startId = firstChapter?.id ?? null;

      if (startId) {
        navigate(`/courses/${encodedId}?start=${encodeURIComponent(startId)}`, {
          state: {
            startChapterId: startId,
            courseId: id,
          },
          replace: false,
        });
      } else {
        navigate(`/courses/${encodedId}`, {
          state: { courseId: id },
        });
      }
    } catch (e) {
      console.error("Failed to fetch chapters:", e);
      toast.error("Failed to load course chapters");
      navigate(`/courses/${encodedId}`, {
        state: { courseId: id },
      });
    }
  };

  // --- START OF CHANGE ---
  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };
  // --- END OF CHANGE ---

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


  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-xl text-gray-600">Loading courses...</div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 ">
      <div className="flex items-center justify-between mb-6">
        {/* Page Title */}
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          My Courses
        </h1>

        {/* Back to Dashboard Button - Top Right */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/dashboard")}
          className="flex items-center"
        >
          <ArrowLeft size={18} className="mr-2" />
          Back to Dashboard
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 hover:shadow-lg transition-shadow">
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
          <>
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
                        {/* Primary Action Button */}
                        <Button
                          key={`primary-${course.id}`}
                          size="sm"
                          className="w-full sm:w-auto"
                          onClick={() => goToCourse(course.id)}
                        >
                          <Play size={16} className="mr-1" />
                          {/* ✅ Use actualProgress directly */}
                          {actualProgress === 0
                            ? "Start Course"
                            : actualProgress >= 100
                              ? "View Course"
                              : "Continue Learning"}
                        </Button>

                        {/* Final Test Button */}
                        {(() => {
                          const completedTests = JSON.parse(
                            localStorage.getItem("completedTests") || "{}"
                          );
                          const isTestCompleted = completedTests[course.id]?.completed;

                          // ✅ Use actualProgress and check for nextAction
                          const hasTest = course.nextAction?.type === "course-test";

                          if (actualProgress >= 100 && !isTestCompleted && hasTest) {
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

                        {/* View Certificate Button */}
                        {(() => {
                          const completedTests = JSON.parse(
                            localStorage.getItem("completedTests") || "{}"
                          );
                          const isTestCompleted = completedTests[course.id]?.completed;

                          if (isTestCompleted) {
                            return (
                              <Button
                                key={`certificate-${course.id}`}
                                size="sm"
                                variant="outline"
                                className="w-full sm:w-auto"
                                onClick={() => navigate(`/certificate/${course.id}`)}
                              >
                                <Trophy size={16} className="mr-1" />
                                View Certificate
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

            {/* --- START OF CHANGE: Pagination Controls --- */}
            {totalPages > 1 && (
              <div className="flex justify-between items-center mt-8 pt-4 border-t border-gray-200">
                <Button
                  onClick={handlePrevPage}
                  disabled={currentPage === 1}
                  variant="outline"
                  size="sm"
                >
                  Previous
                </Button>
                <span className="text-sm text-gray-700">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  variant="outline"
                  size="sm"
                >
                  Next
                </Button>
              </div>
            )}
            {/* --- END OF CHANGE --- */}
          </>
        )}
      </div>
    </div>
  );
};

export default CourseListPage;