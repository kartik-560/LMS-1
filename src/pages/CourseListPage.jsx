import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  PlayCircle,
  Play,
  Brain,
  FileText,
  Trophy,
  ArrowLeft,
  Loader2
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

const PAGE_SIZE = 10;

const CourseListPage = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [assignedCourses, setAssignedCourses] = useState([]);
  const [currentProgress, setCurrentProgress] = useState({});
  const hasHydrated = true;

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [isAuthenticated]);

  useEffect(() => {
    if (!hasHydrated || !isAuthenticated) {
      setLoading(false);
      return;
    }
    fetchStudentData();
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

        const completedCount = completedCourseChapters.length;
        const totalCount = totalCourseChapters.length;
        const isComplete = totalCount > 0 && completedCount >= totalCount;

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

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const goToFinalTest = async (courseId) => {
    try {
      const finalTestResp = await assessmentsAPI.getFinalTestByCourse(courseId);

      const finalTest = finalTestResp?.data ?? finalTestResp;

      if (!finalTest || !finalTest.id) {
        toast.error("Final test not available for this course");
        return;
      }

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
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-lg text-gray-600 font-medium">Loading your courses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 bg-gray-800 px-[20px] py-[20px] rounded-3xl ">
          <h1 className="text-3xl font-bold text-white">
            My Courses
          </h1>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/dashboard")}
            className="flex items-center text-cenetr text-white bg-[#4285F4] "
          >
            <ArrowLeft size={18} className="mr-2" />
            Back to Dashboard
          </Button>
        </div>

        {assignedCourses.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <BookOpen size={64} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No courses assigned yet
            </h3>
            <p className="text-gray-600">
              Contact your instructor to get assigned to courses.
            </p>
          </div>
        ) : (
          <>
            {/* Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {assignedCourses.map((course) => {
                const progress = currentProgress[course.id];
                const completedCount = progress?.completedChapters?.length || 0;
                const totalCount = course.totalChapters || 1;
                const actualProgress = Math.round((completedCount / totalCount) * 100);

                const completedTests = JSON.parse(
                  localStorage.getItem("completedTests") || "{}"
                );
                const isTestCompleted = completedTests[course.id]?.completed;
                const hasTest = course.nextAction?.type === "course-test";

                return (
                  <div
                    key={course.id}
                    className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col"
                  >
                    {/* Course Thumbnail */}
                    <div className="relative h-48 bg-gradient-to-br from-purple-500 to-blue-600 overflow-hidden">
                      <img
                        src={course.thumbnail || FALLBACK_THUMB}
                        alt={course.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-3 right-3">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-500 text-white shadow-lg">
                          published
                        </span>
                      </div>
                    </div>

                    {/* Course Content */}
                    <div className="p-5 flex-1 flex flex-col">
                      {/* Title & Instructor */}
                      <div className="mb-4">
                        <h3 className="text-lg font-bold text-gray-900 mb-1 line-clamp-2">
                          {course.title}
                        </h3>
                        {/* <p className="text-sm text-gray-600">
                          by {course.instructorNames?.[0] || "Instructor"}
                        </p> */}
                      </div>

                      {/* Progress Section */}
                      <div className="mb-4 flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-gray-700">
                            Progress
                          </span>
                          <span className="text-sm font-bold text-blue-600">
                            {actualProgress}%
                          </span>
                        </div>
                        <Progress value={actualProgress} className="h-2 mb-3" />

                        {/* Stats */}
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2 mt-7 text-gray-600">
                            <BookOpen size={16} />
                            <span>
                              {completedCount}/{totalCount} Chapters
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="space-y-2">
                        <Button
                          size="sm"
                          className="w-full justify-center"
                          onClick={() => goToCourse(course.id)}
                        >
                          <Play size={16} className="mr-2" />
                          {actualProgress === 0
                            ? "Start Course"
                            : actualProgress >= 100
                              ? "View Course"
                              : "Continue Learning"}
                        </Button>

                        {actualProgress >= 100 && !isTestCompleted && hasTest && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full justify-center"
                            onClick={() => goToFinalTest(course.id)}
                          >
                            <FileText size={16} className="mr-2" />
                            Take Final Test
                          </Button>
                        )}

                        {isTestCompleted && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full justify-center"
                            onClick={() => navigate(`/certificate/${course.id}`)}
                          >
                            <Trophy size={16} className="mr-2" />
                            View Certificate
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-between items-center mt-8 pt-6">
                <Button
                  onClick={handlePrevPage}
                  disabled={currentPage === 1}
                  variant="outline"
                  size="sm"
                >
                  Previous
                </Button>
                <span className="text-sm font-medium text-gray-700">
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
          </>
        )}
      </div>
    </div>
  );
};

export default CourseListPage;
