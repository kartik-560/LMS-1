import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  PlayCircle,
  Play,
  Brain,
  FileText,
  Trophy,
} from "lucide-react";
import { toast } from "react-hot-toast";

import {
  authAPI,
  coursesAPI,
  chaptersAPI,
  enrollmentsAPI,
  progressAPI,
  FALLBACK_THUMB,
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
  const [aiInterviewStatus, setAiInterviewStatus] = useState({});
  const [availableTests, setAvailableTests] = useState([]);
  const [showCourseModal, setShowCourseModal] = useState(false);
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
  }, [hasHydrated, isAuthenticated, currentPage]); // Refetch when currentPage changes
  // --- END OF CHANGE ---

  // const fetchStudentData = async () => {
  //     const abort = new AbortController();

  //     const resetState = () => {
  //       setAssignedCourses([]);
  //       setCurrentProgress({});
  //       setAvailableTests([]);
  //       setAiInterviewStatus({});
  //       setCurrentPage(1);
  //       setTotalPages(1);
  //     };

  //     try {
  //       setLoading(true);

  //       const roleRaw = (user && user.role) ?? "";
  //       const role = String(roleRaw).toUpperCase();
  //       const studentId = String((user && user.id) ?? "").trim();

  //       if (!studentId) {
  //         toast.error("Could not identify your student account.");
  //         resetState();
  //         setLoading(false); // Stop loading
  //         return () => abort.abort();
  //       }
  //       if (!role.includes("STUDENT")) {
  //         toast.error(
  //           "This page is for students. Please log in with a student account."
  //         );
  //         resetState();
  //         setLoading(false); // Stop loading
  //         return () => abort.abort();
  //       }

  //       // --- START OF SIMPLIFIED LOGIC ---
  //       // We no longer need the enrollmentsAPI call.
  //       // We will rely directly on getStudentCourses.
  //       let myCourses = [];
  //       let totalCount = null;

  //       try {
  //         const resp = await coursesAPI.getStudentCourses(
  //           user && user.collegeId,
  //           studentId,
  //           "",
  //           "all",
  //           "all",
  //           "assigned",
  //           currentPage,
  //           PAGE_SIZE
  //         );
  //         myCourses =
  //           resp?.data?.data ?? resp?.data ?? (Array.isArray(resp) ? resp : []);
  //         totalCount =
  //           resp?.data?.total ??
  //           resp?.data?.pagination?.total ??
  //           resp?.data?.meta?.total ??
  //           null;
  //       } catch (e) {
  //         console.warn("getStudentCourses failed", e);
  //         toast.error("Failed to load your courses.");
  //         // If the API itself fails, reset and stop.
  //         resetState();
  //         setLoading(false);
  //         return () => abort.abort();
  //       }

  //       // API call succeeded, now check if it returned anything
  //       if (!Array.isArray(myCourses) || myCourses.length === 0) {
  //         // This is not an error, just an empty state.
  //         // resetState() will clear the courses and reset pagination.
  //         resetState();
  //         setLoading(false);
  //         return () => abort.abort();
  //       }

  //       // We have courses, so set total pages
  //       if (totalCount !== null) {
  //         setTotalPages(Math.ceil(totalCount / PAGE_SIZE));
  //       } else {
  //         // Succeeded but no total count, assume 1 page for the results we got
  //         setTotalPages(1);
  //       }

  //       const normalizeCourse = (c) => {
  //         const cid = c?.id ?? c?.courseId ?? c?.course?.id;
  //         return { ...c, id: cid };
  //       };

  //       myCourses = myCourses.map(normalizeCourse);
  //       // --- END OF SIMPLIFIED LOGIC ---

  //       // Fetch chapter and progress data for the courses on the current page
  //       const [chaptersList, completedChaptersList, summaries] = await Promise.all(
  //         [
  //           Promise.all(
  //             myCourses.map((c) =>
  //               chaptersAPI
  //                 .listByCourse(c.courseId ?? c.id)
  //                 .then((r) => r?.data?.data ?? r?.data ?? [])
  //                 .catch(() => [])
  //             )
  //           ),

  //           Promise.all(
  //             myCourses.map((c) =>
  //               progressAPI
  //                 .completedChapters(c.courseId ?? c.id)
  //                 .then((r) => r?.data?.data ?? r?.data ?? [])
  //                 .catch(() => [])
  //             )
  //           ),

  //           Promise.all(
  //             myCourses.map((c) =>
  //               progressAPI
  //                 .courseSummary(c.courseId ?? c.id)
  //                 .then((r) => r?.data?.data ?? null)
  //                 .catch(() => [])
  //             )
  //           ),
  //         ]
  //       );

  //       const nextProgressData = {};
  //       const nextAiStatusData = {};
  //       const nextCourseWithCounts = [];

  //       myCourses.forEach((course, i) => {
  //         const totalCourseChapters = chaptersList[i] || [];
  //         const completedCourseChapters = completedChaptersList[i] || [];

  //         nextProgressData[course.id] = {
  //           completedChapters: completedCourseChapters,
  //           courseTestResult: {}, // You might fetch this from summaries[i] if available
  //           aiInterviewResult: null, // You might fetch this from summaries[i] if available
  //         };

  //         nextCourseWithCounts.push({
  //           ...course,
  //           totalChapters: totalCourseChapters.length,
  //         });
  //       });

  //       setAssignedCourses(nextCourseWithCounts);
  //       setCurrentProgress(nextProgressData);
  //       setAiInterviewStatus(nextAiStatusData);
  //       setAvailableTests([]);

  //     } catch (error) {
  //       console.error("Error fetching student data:", error);
  //       toast.error(
  //         (error &&
  //           error.response &&
  //           error.response.data &&
  //           error.response.data.error) ||
  //           (error && error.message) ||
  //           "Failed to load dashboard data"
  //       );
  //       resetState(); // Reset on final catch-all
  //     } finally {
  //       setLoading(false);
  //     }

  //     return () => abort.abort();
  //   };

  const fetchStudentData = async () => {
    const abort = new AbortController();

    const resetState = () => {
      setAssignedCourses([]);
      setCurrentProgress({});
      setAvailableTests([]);
      setAiInterviewStatus({});
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

      // Debug the normalization step
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


      // Fetch chapters/progress/debug their structure
      const [chaptersList, completedChaptersList, summaries] = await Promise.all([
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

        Promise.all(
          myCourses.map((c) =>
            progressAPI
              .courseSummary(c.id)
              .then((r) => {
              
                if (!r || r.status === 204 || r.data === '' || r.data === null) {
                  return null;
                }
                return r?.data?.data ?? r?.data ?? null;
              })
              .catch((err) => {
                console.warn(`[Error] fetching summary for course ${c.id}:`, err);
                return null;
              })
          )
        ),
      ]);

      const nextProgressData = {};
      const nextAiStatusData = {};
      const nextCourseWithCounts = [];

      myCourses.forEach((course, i) => {
        const totalCourseChapters = chaptersList[i] || [];
        const completedCourseChapters = completedChaptersList[i] || [];

        nextProgressData[course.id] = {
          completedChapters: completedCourseChapters,
          courseTestResult: {},
          aiInterviewResult: null,
        };

        nextCourseWithCounts.push({
          ...course,
          totalChapters: totalCourseChapters.length,
          completedChaptersCount: completedCourseChapters.length,
        });
      });

      setAssignedCourses(nextCourseWithCounts);
      setCurrentProgress(nextProgressData);
      setAiInterviewStatus(nextAiStatusData);
      setAvailableTests([]);

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
      // console.log("[Done] fetchStudentData finished - loading state set to false.");
    }

    return () => abort.abort();
  };

  const startAIInterview = async (_courseId) => {
    try {
      toast("AI Interview API not wired yet");
    } catch {
      toast.error("Failed to start AI interview");
    }
  };

  const getCourseProgress = (courseId) => {
    const progress = currentProgress[courseId];
    if (!progress) return 0;

    const course = assignedCourses.find((c) => c.id === courseId);
    if (!course) return 0;

    const totalSteps = (course.totalChapters || 0) + 2;
    if (totalSteps <= 0) return 0;

    const completedSteps =
      (progress.completedChapters?.length || 0) +
      (progress.courseTestResult?.passed ? 1 : 0) +
      (progress.aiInterviewResult ? 1 : 0);

    return Math.round((completedSteps / totalSteps) * 100);
  };

  const getNextAction = (courseId) => {
    const progress = currentProgress[courseId];
    const course = assignedCourses.find((c) => c.id === courseId);

    if (!progress || !course) {
      return { type: "start", text: "Start Course" };
    }

    const allChaptersDone =
      (progress.completedChapters?.length || 0) >= course.totalChapters;

    if (!allChaptersDone) {
      return { type: "continue", text: "Continue Learning" };
    }

    if (!progress.courseTestResult?.passed) {
      return { type: "course-test", text: "Take Final Test" };
    }

    return { type: "certificate", text: "View Certificate", icon: Trophy };
  };

  // const goToCourse = async (courseId) => {
  //   if (!courseId) {
  //     toast.error("Missing course id");
  //     return;
  //   }

  //   const id = String(courseId);
  //   const encodedId = encodeURIComponent(id);

  //   try {
  //     const response = await chaptersAPI.listByCourse(id);
  //     let chapters = [];
  //     if (Array.isArray(response)) {
  //       chapters = response;
  //     } else if (response?.data?.data && Array.isArray(response.data.data)) {
  //       chapters = response.data.data;
  //     } else if (response?.data && Array.isArray(response.data)) {
  //       chapters = response.data;
  //     } else if (response?.chapters && Array.isArray(response.chapters)) {
  //       chapters = response.chapters;
  //     }

  //     console.log("Chapters for navigation:", chapters);

  //     if (!chapters || chapters.length === 0) {
  //       toast.error("No chapters found for this course");
  //       navigate(`/courses/${encodedId}`);
  //       return;
  //     }

  //     const sortedChapters = chapters
  //       .slice()
  //       .sort((a, b) => (a?.order ?? 0) - (b?.order ?? 0));

  //     const firstChapter = sortedChapters[0];
  //     const startId = firstChapter?.id ?? null;

  //     console.log("Navigating with startId:", startId);

  //     if (startId) {
  //       navigate(`/courses/${encodedId}?start=${encodeURIComponent(startId)}`, {
  //         state: {
  //           startChapterId: startId,
  //           courseId: id,
  //         },
  //         replace: false,
  //       });
  //     } else {
  //       navigate(`/courses/${encodedId}`, {
  //         state: { courseId: id },
  //       });
  //     }
  //   } catch (e) {
  //     console.error("Failed to fetch chapters:", e);
  //     toast.error("Failed to load course chapters");
  //     navigate(`/courses/${encodedId}`, {
  //       state: { courseId: id },
  //     });
  //   }
  // };

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


  const startTest = (test) => {
    toast("Test functionality to be implemented");
  };

  // --- START OF CHANGE ---
  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };
  // --- END OF CHANGE ---

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-xl text-gray-600">Loading courses...</div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 ">
      <div className="mb-6 text-3xl font-bold text-gray-900">
        <b>My Courses</b>
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
                const courseProgress = getCourseProgress(course.id);
                const nextAction = getNextAction(course.id);

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

                      <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                        {/* <Button
                          key={`continue-${course.id}`}
                          type="button"
                          className="flex-1"
                          onClick={() => goToCourse(course.id)}
                        >
                          <PlayCircle size={16} className="mr-2" />
                          Continue Learning
                        </Button> */}

                        <Button
                          key={`action-${course.id}`}
                          size="sm"
                          className="w-full sm:w-auto"
                          onClick={() => {
                            if (nextAction.type === "certificate") {
                              navigate(`/certificate/${course.id}`);
                              return;
                            }

                            if (nextAction.type === "ai-interview") {
                              startAIInterview(course.id);
                            } else if (
                              nextAction.type === "course-test" ||
                              nextAction.type === "module-test"
                            ) {
                              if (nextAction.type === "course-test") {
                                startTest(course.id);
                              } else if (nextAction.type === "module-test") {
                                const test = availableTests.find(
                                  (t) => t.courseId === course.id
                                );
                                if (test) startTest(course.id);
                                else toast("No module test available yet");
                              }
                            } else {
                              goToCourse(course.id);
                            }
                          }}
                          disabled={
                            nextAction.type === "start" && !progress
                          }
                        >
                          {nextAction.type === "certificate" && (
                            <Trophy size={16} className="mr-1" />
                          )}
                          {nextAction.type === "ai-interview" && (
                            <Brain size={16} className="mr-1" />
                          )}
                          {(nextAction.type === "course-test" ||
                            nextAction.type === "module-test") && (
                              <FileText size={16} className="mr-1" />
                            )}
                          {(nextAction.type === "continue" ||
                            nextAction.type === "start") && (
                              <Play size={16} className="mr-1" />
                            )}
                          {nextAction.text}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs sm:text-sm">
                        <span className="text-gray-600">
                          Overall Progress
                        </span>
                        <span className="font-medium text-gray-900">
                          {courseProgress}%
                        </span>
                      </div>
                      <Progress value={courseProgress} size="sm" />

                      <div className="grid grid-cols-2 gap-2 sm:gap-4 text-xs sm:text-sm">
                        <div className="text-center">
                          <div className="font-medium text-gray-900">
                            {progress?.completedChapters?.length || 0}/
                            {course.totalChapters}
                          </div>
                          <div className="text-gray-500">Chapters</div>
                        </div>
                        <div className="text-center">
                          <div className="font-medium text-gray-900">
                            {aiInterviewStatus[course.id]?.completed
                              ? "1/1"
                              : "0/1"}
                          </div>
                          <div className="text-gray-500">
                            AI Interview
                          </div>
                        </div>
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