import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle,
  BookOpen,
  Clock,
  ChevronRight,
  ChevronDown,
  FileText,
  Lock,
  Menu,
  X,
} from "lucide-react";
import { useLocation, useSearchParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import Button from "../components/ui/Button";
import Progress from "../components/ui/Progress";
import Badge from "../components/ui/Badge";
import useAuthStore from "../store/useAuthStore";
import {
  coursesAPI,
  chaptersAPI,
  progressAPI,
  assessmentsAPI,
  FALLBACK_THUMB,
} from "../services/api";

const CourseViewerPage = () => {
  const { user } = useAuthStore();
  const { courseId, chapterId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [currentChapter, setCurrentChapter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expanded, setExpanded] = useState(true);
  const [completedChapterIds, setCompletedChapterIds] = useState([]);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quiz, setQuiz] = useState(null);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(null);
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const startChapterIdFromState = location.state?.startChapterId ?? null;
  const startChapterIdFromQuery = searchParams.get("start");
  const preferredStartChapterId =
    startChapterIdFromState ?? startChapterIdFromQuery ?? null;

  const [contentPages, setContentPages] = useState([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [submittedQuizzes, setSubmittedQuizzes] = useState(new Set());
  const userRole = user?.role || user?.userRole || "";
  const isStaff = ["SUPERADMIN", "ADMIN", "INSTRUCTOR"].includes(userRole);

  const chapterIndexMap = useMemo(() => {
    const map = new Map();
    chapters.forEach((c, i) => map.set(c.id, i));
    return map;
  }, [chapters]);

  useEffect(() => {
    if (courseId) {
      fetchData();
    }
  }, [courseId]);

  const isQuizUnlocked = (chapter) => {
    if (!chapter?.hasQuiz) return false;

    if (isStaff) return true;

    const prior = chapters.filter((c) => (c.order || 0) < (chapter.order || 0));

    return prior.every((c) => completedChapterIds.includes(c.id));
  };

  async function fetchData() {
    setLoading(true);
    try {
      const c = await coursesAPI.get(courseId);
      setCourse({
        id: c.id,
        title: c.title,
        level: "beginner",
        instructorName:
          (Array.isArray(c.instructorNames) && c.instructorNames[0]) ||
          "Instructor",
        thumbnail: c.thumbnail || FALLBACK_THUMB,
        status: c.status,
      });

      const listRaw = await chaptersAPI.listByCourse(courseId);

      // ✅ CRITICAL DEBUG - Log the EXACT structure
      console.log('[DEBUG 1] Raw response type:', typeof listRaw);
      console.log('[DEBUG 2] Raw response keys:', Object.keys(listRaw || {}));
      console.log('[DEBUG 3] listRaw.data exists?', 'data' in (listRaw || {}));
      console.log('[DEBUG 4] listRaw.data type:', typeof listRaw?.data);
      console.log('[DEBUG 5] Full raw response:', JSON.stringify(listRaw, null, 2));

      let list = [];

      // The response is { data: [...chapters...] }
      if (listRaw?.data && Array.isArray(listRaw.data)) {
        list = listRaw.data;
        console.log('[DEBUG 6] Extracted from listRaw.data');
      } else if (Array.isArray(listRaw)) {
        list = listRaw;
        console.log('[DEBUG 6] listRaw is already an array');
      } else {
        console.error('[DEBUG 6] Could not extract chapters array!', listRaw);
      }

      console.log('[DEBUG 7] Extracted list length:', list.length);
      console.log('[DEBUG 8] First chapter:', list[0]);

      const mapped = list
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .map((ch) => {
          const hasQuiz = Array.isArray(ch.assessments) && ch.assessments.length > 0;

          console.log(`[DEBUG 9] Chapter "${ch.title}":`, {
            id: ch.id,
            order: ch.order,
            assessments: ch.assessments,
            isArray: Array.isArray(ch.assessments),
            length: ch.assessments?.length,
            hasQuiz: hasQuiz
          });

          return {
            id: ch.id,
            title: ch.title,
            duration: ch?.settings?.estimatedMinutes
              ? `${ch.settings.estimatedMinutes} min`
              : "—",
            type: hasQuiz ? "quiz" : "text",
            content: ch.content || ch.description || "",
            attachments: ch.attachments || [],
            order: ch.order || 0,
            hasQuiz: hasQuiz,
          };
        });

      console.log('[DEBUG 10] Final mapped chapters:', mapped);

      // Check specifically for the quiz chapter
      const quizChapter = mapped.find(ch => ch.title.includes('Quiz'));
      console.log('[DEBUG 11] Quiz chapter found:', quizChapter);

      setChapters(mapped);

      if (mapped.length) {
        let initial = mapped[0];
        if (preferredStartChapterId) {
          const found = mapped.find(
            (ch) => String(ch.id) === String(preferredStartChapterId)
          );
          if (found) {
            initial = found;
          }
        }
        console.log('[DEBUG 12] Initial chapter:', initial);
        setCurrentChapter(initial);
        hydrateChapter(initial.id);
      }

      const completedResponse = await progressAPI.completedChapters(courseId);
      let ids = [];

      if (Array.isArray(completedResponse)) {
        ids = completedResponse;
      } else if (completedResponse?.data?.data && Array.isArray(completedResponse.data.data)) {
        ids = completedResponse.data.data;
      } else if (completedResponse?.data && Array.isArray(completedResponse.data)) {
        ids = completedResponse.data;
      }

      setCompletedChapterIds(Array.isArray(ids) ? ids : []);
    } catch (err) {
      console.error("Course load failed:", err);
      toast.error("Failed to load course");
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const resetQuizState = () => {
      setQuiz(null);
      setQuizAnswers({});
      setQuizScore(null);
    };

    if (!currentChapter?.hasQuiz) {
      setQuizSubmitted(false);
      resetQuizState();
      return;
    }

    // ✅ Check if this quiz chapter is already completed
    const wasSubmitted = completedChapterIds.includes(currentChapter.id);
    setQuizSubmitted(wasSubmitted);

    // ✅ If already submitted, don't load the quiz
    if (wasSubmitted) {
      console.log('[DEBUG] Quiz already submitted (chapter completed), not loading questions');
      return;
    }

    const quizUnlocked = isStaff || isQuizUnlocked(currentChapter);

    if (!quizUnlocked) {
      resetQuizState();
      return;
    }

    // Only load quiz if not submitted
    loadQuizForChapter(currentChapter.id);
  }, [
    currentChapter?.id,
    currentChapter?.hasQuiz,
    isStaff,
    completedChapterIds, // ✅ Watch the full array, not just length
  ]);


  useEffect(() => {
    if (!chapters.length || !chapterId) return;

    const activeChapter = chapters.find((ch) => String(ch.id) === String(chapterId));

    if (activeChapter) {
      setCurrentChapter(activeChapter);
      if (!activeChapter.content) {
        hydrateChapter(activeChapter.id);
      }
    }
  }, [chapters, chapterId]);

  async function loadQuizForChapter(chapterId) {
    setQuizLoading(true);
    setQuiz(null);
    setQuizAnswers({});
    setQuizSubmitted(false);
    setQuizScore(null);
    try {
      const list = await assessmentsAPI.listByChapter(chapterId);
      const assessments = Array.isArray(list) ? list : [];
      if (!assessments.length) {
        setQuiz(null);
        return;
      }
      const first = assessments[0];
      let full = first;
      if (!first.questions) {
        full = await assessmentsAPI.get(first.id);
      }

      const questions = (full.questions || []).sort(
        (a, b) => (a.order || 0) - (b.order || 0)
      );

      setQuiz({
        id: full.id,
        title: full.title || "Quiz",
        questions: questions.map((q) => ({
          id: q.id,
          prompt: q.prompt,
          type: String(q.type || "").toLowerCase(),
          options: Array.isArray(q.options) ? q.options : [],
          correctOptionIndex:
            typeof q.correctOptionIndex === "number"
              ? q.correctOptionIndex
              : null,
          correctOptionIndexes: Array.isArray(q.correctOptionIndexes)
            ? q.correctOptionIndexes
            : null,
          points: q.points ?? 1,
          order: q.order ?? 1,
        })),
      });
    } catch (e) {
      console.error("Load quiz failed:", e);
      toast.error("Failed to load quiz");
      setQuiz(null);
    } finally {
      setQuizLoading(false);
    }
  }

  useEffect(() => {
    setPageIndex(0);
    if (!currentChapter?.content) {
      setContentPages([]);
      return;
    }

    const paras = String(currentChapter.content || "").split(/\n\n+/).map(p => p.trim()).filter(Boolean);
    const paragraphsPerPage = 3;
    const pages = [];
    for (let i = 0; i < paras.length; i += paragraphsPerPage) {
      pages.push(paras.slice(i, i + paragraphsPerPage).join('\n\n'));
    }

    if (pages.length === 0) pages.push(String(currentChapter.content || ""));

    setContentPages(pages);
  }, [currentChapter?.content, currentChapter?.id]);

  const getCourseProgress = () => {
    if (!chapters.length) return 0;
    const completed = chapters.filter((ch) =>
      completedChapterIds.includes(ch.id)
    ).length;
    return Math.round((completed / chapters.length) * 100);
  };

  const isChapterCompleted = (id) => completedChapterIds.includes(id);


  const isOnLastPage = () => {
    if (contentPages.length <= 1) return true;
    return pageIndex === contentPages.length - 1;
  };

  const goToNextChapter = () => {
    if (!currentChapter) return;
    const idx = chapterIndexMap.get(currentChapter.id);
    if (idx == null) return;
    const next = chapters[idx + 1];
    if (next) {
      setCurrentChapter(next);
      setPageIndex(0);
    }
  };

  const markChapterComplete = async ({ advance = true } = {}) => {

    if (isStaff) {
      console.log("Staff users don't track progress");
      if (advance) {
        goToNextChapter();
      }
      return;
    }

    if (!currentChapter) {
      console.warn("No current chapter to mark complete");
      return;
    }

    if (isChapterCompleted(currentChapter.id)) {
      console.log("Chapter already completed");
      toast.info("Chapter already completed!");
      if (advance) {
        goToNextChapter();
      }
      return;
    }

    try {
      console.log("Marking chapter complete:", currentChapter.id);
      await progressAPI.completeChapter(currentChapter.id);

      setCompletedChapterIds((prev) => {
        const newSet = new Set([...prev, currentChapter.id]);
        return Array.from(newSet);
      });

      toast.success("Chapter completed!");

      if (advance) {
        setTimeout(() => {
          goToNextChapter();
        }, 300);
      }
    } catch (e) {
      console.error("Failed to mark chapter complete:", e);
      toast.error("Failed to save progress");
    }
  };

  async function hydrateChapter(chapterId) {
    try {
      const full = await chaptersAPI.getChapterDetails(chapterId);
      const enriched = {
        id: full.id,
        title: full.title,
        duration: full?.settings?.estimatedMinutes
          ? `${full.settings.estimatedMinutes} min`
          : "—",
        type:
          Array.isArray(full.assessments) && full.assessments.length > 0
            ? "quiz"
            : "text",
        content: full.content || full.description || "",
        attachments: full.attachments || [],
        order: full.order || 0,
        hasQuiz: Array.isArray(full.assessments) && full.assessments.length > 0,
      };

      setChapters(prev =>
        prev.map(ch => (ch.id === chapterId ? { ...ch, ...enriched } : ch))
      );
      setCurrentChapter(prev =>
        prev && prev.id === chapterId ? { ...prev, ...enriched } : prev
      );
    } catch (e) {
      console.error("Failed to hydrate chapter:", e);
      toast.error("Failed to load chapter content");
    }
  }

  const handleAnswerChange = (qid, value) => {
    setQuizAnswers((prev) => ({ ...prev, [qid]: value }));
  };

  function scoreLocally(quiz, answers) {
    let score = 0;
    let max = 0;
    for (const q of quiz.questions) {
      const pts = q.points ?? 1;
      max += pts;
      const ans = answers[q.id];

      if (typeof q.correctOptionIndex === "number") {
        if (Number(ans) === q.correctOptionIndex) score += pts;
        continue;
      }
      if (Array.isArray(q.correctOptionIndexes)) {
        const normalized = Array.isArray(ans) ? ans.map(Number).sort() : [];
        const correct = [...q.correctOptionIndexes].sort();
        if (
          normalized.length === correct.length &&
          normalized.every((v, i) => v === correct[i])
        ) {
          score += pts;
        }
        continue;
      }
    }
    return { score, max };
  }

  const submitQuiz = async () => {
    if (!quiz) return;
    try {
      setQuizSubmitted(true);
      setSubmittedQuizzes((prev) => new Set(prev).add(currentChapter.id));
      const { score, max } = scoreLocally(quiz, quizAnswers);
      setQuizScore({ score, max });
      toast.success("Quiz submitted!");
      markChapterComplete({ advance: true });
    } catch (e) {
      console.error(e);
      toast.error("Failed to submit quiz");
      setQuizSubmitted(false);
    }
  };

  const handleBackNavigation = () => {
    const userRole = useAuthStore.getState().userRole;

    if (userRole === "SUPERADMIN") {
      navigate("/superadmin");
    } else if (userRole === "ADMIN") {
      navigate("/admin");
    } else if (userRole === "INSTRUCTOR") {
      navigate("/instructor");
    } else {
      navigate("/dashboard");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading course...</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <BookOpen size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Course not found</h3>
          <Button onClick={handleBackNavigation}>Back to Dashboard</Button>
        </div>
      </div>
    );
  }

  if (!loading && chapters.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <BookOpen size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No chapters available</h3>
          <p className="text-gray-600 mb-4">This course doesn't have any chapters yet.</p>
          <Button onClick={handleBackNavigation}>Back to Dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar - MODIFIED: Hide progress for staff */}
      <aside className={`transition-all duration-300 bg-white border-r border-gray-200 flex-shrink-0 ${sidebarOpen ? 'w-80' : 'w-0'} overflow-hidden`}>
        {sidebarOpen && (
          <>
            <div className="p-4 border-b">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <img src={course.thumbnail} alt="thumb" className="w-10 h-10 rounded-md object-cover flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold truncate">{course.title}</div>
                    {/* <div className="text-xs text-gray-500 truncate">by {course.instructorName}</div> */}
                  </div>
                </div>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="ml-2 p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                  title="Hide sidebar"
                >
                  <X size={18} />
                </button>
              </div>

              <Badge variant="info" size="sm" className="mb-3">{course.level}</Badge>

              {/* CONDITIONAL: Only show progress for students */}
              {!isStaff && (
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs text-gray-600">
                    <span>Progress</span>
                    <span className="font-medium">{getCourseProgress()}%</span>
                  </div>
                  <Progress value={getCourseProgress()} size="sm" />
                  <div className="text-xs text-gray-500 mt-1">
                    {completedChapterIds.length} / {chapters.length} chapters
                  </div>
                </div>
              )}
            </div>

            <div className="overflow-y-auto h-[calc(100vh-200px)] p-3">
              <div className="space-y-2">
                <div className="text-xs text-gray-500 font-medium px-2">Course Content</div>
                <div className="border rounded-lg bg-white">
                  <button
                    onClick={() => setExpanded(x => !x)}
                    className="w-full p-3 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="text-sm font-medium">Chapters</div>
                    {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>

                  {expanded && (
                    <div className="divide-y">
                      {chapters.map((chapter) => {
                        // Show lock icon for quiz chapters that are locked (students only)
                        const isLocked = !isStaff && chapter.hasQuiz && !isQuizUnlocked(chapter);

                        return (
                          <button
                            key={chapter.id}
                            onClick={() => {
                              setCurrentChapter(chapter);
                              setPageIndex(0);
                              if (!chapter.content) hydrateChapter(chapter.id);
                            }}
                            className={`w-full p-3 text-left flex items-start space-x-3 hover:bg-gray-50 transition-colors ${currentChapter?.id === chapter.id ? 'bg-primary-50 ring-1 ring-primary-200' : ''
                              }`}
                          >
                            <div className="mt-1 flex-shrink-0">
                              {/* CONDITIONAL: Only show completion status for students */}
                              {!isStaff && isChapterCompleted(chapter.id) ? (
                                <CheckCircle size={16} className="text-green-500" />
                              ) : isLocked ? (
                                <Lock size={16} className="text-gray-400" />
                              ) : (
                                <div className="w-3 h-3 border border-gray-300 rounded-full" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">{chapter.title}</div>
                              <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
                                <Clock size={12} />
                                <span>{chapter.duration}</span>
                                <span>•</span>
                                <span>{chapter.type}</span>
                                {isLocked && <span className="text-amber-600">• Locked</span>}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 border-t text-xs text-gray-500">
              <div>Course status: <span className="font-medium text-gray-900">{course.status || 'Published'}</span></div>
            </div>
          </>
        )}
      </aside>

      {/* Main panel */}
      <main className="flex-1 p-6 min-w-0">
        {/* Sticky header - MODIFIED: Hide progress for staff */}
        <div className="sticky top-6 bg-transparent z-10 mb-6">
          <div className="flex items-center justify-between bg-white border rounded-lg p-4 shadow-sm">
            <div className="flex items-center space-x-4 flex-1 min-w-0">
              {!sidebarOpen && (
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex-shrink-0"
                  title="Show sidebar"
                >
                  <Menu size={18} />
                  <span className="text-sm font-medium">Course Content</span>
                </button>
              )}

              <Button variant="ghost" size="sm" onClick={handleBackNavigation} className="flex-shrink-0">
                <ArrowLeft size={14} className="mr-2" />
              </Button>

              {currentChapter && (
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-semibold truncate">{currentChapter.title}</h2>
                  <div className="text-sm text-gray-500 truncate">{course.title} </div>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-3 flex-shrink-0 ml-4">
              {/* CONDITIONAL: Only show progress percentage for students */}
              {!isStaff && (
                <div className="text-sm text-gray-600 hidden sm:block">{getCourseProgress()}% complete</div>
              )}

              {/* CONDITIONAL: Only show completion status for students */}
              {!isStaff && currentChapter && isChapterCompleted(currentChapter.id) && (
                <div className="flex items-center space-x-2 text-green-600 text-sm font-medium">
                  <CheckCircle size={16} />
                  <span className="hidden sm:inline">Completed</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content card - MODIFIED for staff viewing */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-white border rounded-2xl shadow p-6">
            {!currentChapter ? (
              <EmptyPrompt />
            ) : currentChapter.hasQuiz ? (
              // Quizzes always unlocked for staff
              isQuizUnlocked(currentChapter) ? (
                <QuizView
                  quiz={quiz}
                  quizLoading={quizLoading}
                  quizSubmitted={quizSubmitted}
                  quizScore={quizScore}
                  quizAnswers={quizAnswers}
                  onAnswerChange={handleAnswerChange}
                  onSubmit={submitQuiz}
                  completed={isChapterCompleted(currentChapter.id)}
                  onMarkComplete={() => markChapterComplete({ advance: false })}
                  isStaff={isStaff} // Pass to QuizView
                />
              ) : (
                <LockedQuizNote />
              )
            ) : (
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    {/* <h3 className="text-2xl font-bold">{currentChapter.title}</h3> */}
                    <div className="text-2xl font-bold">{currentChapter.type} </div>
                  </div>

                  {/* CONDITIONAL: Only show completion status for students */}
                  {!isStaff && (
                    <div className="flex items-center space-x-2 ml-4 flex-shrink-0">
                      {isChapterCompleted(currentChapter.id) ? (
                        <div className="flex items-center space-x-2 text-green-600 text-sm font-medium">
                          <CheckCircle size={16} />
                          <span>Completed</span>
                        </div>
                      ) : (
                        <span className="text-sm text-amber-600 font-medium">In progress</span>
                      )}
                    </div>
                  )}
                </div>

                <div className="prose max-w-none mb-4">
                  <div className="h-72 overflow-y-auto border rounded-lg p-4 bg-gray-50">
                    {contentPages.length > 0 ? (
                      <div className="whitespace-pre-line">
                        {contentPages[pageIndex]}
                      </div>
                    ) : (
                      <div className="text-gray-600">{currentChapter.content || 'Chapter content goes here.'}</div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-6">
                  {contentPages.length > 1 && (
                    <div className="flex items-center space-x-2">
                      <Button
                        onClick={() => setPageIndex(i => Math.max(0, i - 1))}
                        disabled={pageIndex === 0}
                        variant="outline"
                        size="sm"
                      >
                        Prev Page
                      </Button>
                      <Button
                        onClick={() => setPageIndex(i => Math.min(contentPages.length - 1, i + 1))}
                        disabled={pageIndex === contentPages.length - 1}
                        size="sm"
                      >
                        Next Page
                      </Button>
                      <div className="text-sm text-gray-500">Page {pageIndex + 1} of {contentPages.length}</div>
                    </div>
                  )}

                  {contentPages.length <= 1 && <div />}

                  <div className="flex flex-wrap items-center gap-2">
                    {/* CONDITIONAL: Only show complete button for students */}
                    {!isStaff && !isChapterCompleted(currentChapter.id) && isOnLastPage() && (
                      <Button onClick={() => markChapterComplete({ advance: true })} size="sm">
                        <CheckCircle size={16} className="mr-2" />
                        Complete & Continue
                      </Button>
                    )}

                    {currentChapter.attachments && currentChapter.attachments.length > 0 && (
                      <a
                        className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
                        href={currentChapter.attachments[0]}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <FileText size={16} className="mr-2" /> Download
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

function EmptyPrompt() {
  return (
    <div className="h-full flex items-center justify-center text-gray-600 py-12">
      <div className="text-center">
        <BookOpen size={64} className="mx-auto mb-4 opacity-50" />
        <h3 className="text-xl font-semibold mb-2">Select a chapter to begin</h3>
        <p className="text-gray-500">Choose a chapter from the sidebar to start learning</p>
      </div>
    </div>
  );
}

function LockedQuizNote() {
  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="border rounded-lg p-6 bg-gray-50 text-center">
        <Lock size={28} className="mx-auto mb-3 text-gray-600" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Quiz locked</h3>
        <p className="text-sm text-gray-600">Complete the required previous chapter(s) to unlock this quiz.</p>
      </div>
    </div>
  );
}

function QuizView({
  quiz,
  quizLoading,
  quizSubmitted,
  quizScore,
  quizAnswers,
  onAnswerChange,
  onSubmit,
  onMarkComplete,
  completed,
  isStaff,
}) {
  return (
    <div className="max-w-3xl mx-auto p-6">
      <h3 className="text-2xl font-bold mb-4">Quiz</h3>

      {isStaff && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Staff Preview Mode:</strong> You're viewing this quiz in preview mode. Answer selection is disabled.
          </p>
        </div>
      )}

      {quizLoading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-2"></div>
          <p className="text-gray-600">Loading quiz…</p>
        </div>
      )}

      {/* ✅ Show completion message if submitted (for students) */}
      {!isStaff && quizSubmitted && (
        <div className="my-8 p-6 bg-green-50 border border-green-200 rounded-lg text-center">
          <CheckCircle size={48} className="mx-auto mb-4 text-green-600" />
          <h4 className="text-lg font-semibold text-green-900 mb-2">
            Quiz Completed!
          </h4>
          <p className="text-green-700 mb-2">
            You have already submitted this quiz.
          </p>
          {quizScore && (
            <p className="text-2xl font-bold text-green-800 mt-4">
              Score: {quizScore.score} / {quizScore.max}
            </p>
          )}
        </div>
      )}

      {/* ✅ Show "no quiz" only if NOT loading AND NOT submitted */}
      {!quizLoading && !quiz && !quizSubmitted && (
        <div className="text-center py-8 border rounded-lg bg-gray-50">
          <p className="text-gray-600">No quiz available for this chapter.</p>
        </div>
      )}

      {/* ✅ Show questions only if quiz loaded AND (staff OR not submitted) */}
      {!quizLoading && quiz && (isStaff || !quizSubmitted) && (
        <>
          <p className="text-gray-700 mb-4">{quiz.title}</p>
          <div className="space-y-6">
            {quiz.questions.map((q, idx) => (
              <QuestionBlock
                key={q.id}
                index={idx}
                q={q}
                value={quizAnswers[q.id]}
                onChange={(val) => onAnswerChange(q.id, val)}
                disabled={quizSubmitted || isStaff}
                isStaff={isStaff}
              />
            ))}
          </div>

          {!isStaff && (
            <div className="mt-8 flex items-center justify-between">
              {!quizSubmitted ? (
                <Button onClick={onSubmit}>Submit Quiz</Button>
              ) : (
                <div className="text-green-700 font-medium">
                  Submitted
                  {quizScore ? ` • Score: ${quizScore.score}/${quizScore.max}` : ""}
                </div>
              )}
              {!completed && (
                <Button variant="outline" onClick={onMarkComplete}>
                  <CheckCircle size={16} className="mr-2" />
                  Mark Chapter Complete
                </Button>
              )}
              {completed && (
                <div className="flex items-center space-x-2 text-green-600 font-medium">
                  <CheckCircle size={16} />
                  <span>Chapter Completed</span>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}


function QuestionBlock({ index, q, value, onChange, disabled, isStaff }) {
  const isMulti =
    Array.isArray(q.correctOptionIndexes) && q.correctOptionIndexes.length > 0;
  const isSingle =
    typeof q.correctOptionIndex === "number" && q.options?.length;

  // Apply visual styling for staff preview mode
  const containerClass = isStaff
    ? "border rounded-lg p-4 bg-gray-50 opacity-75"
    : "border rounded-lg p-4";

  if (isSingle) {
    return (
      <div className={containerClass}>
        <div className="font-medium mb-3">
          Q{index + 1}. {q.prompt}
          {isStaff && <span className="ml-2 text-xs text-blue-600">(Preview Only)</span>}
        </div>
        <div className="space-y-2">
          {q.options.map((opt, i) => (
            <label
              key={i}
              className={`flex items-center space-x-2 ${isStaff ? 'cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <input
                type="radio"
                name={`q_${q.id}`}
                disabled={disabled}
                checked={Number(value) === i}
                onChange={() => !isStaff && onChange(i)}
                className={isStaff ? 'cursor-not-allowed' : ''}
              />
              <span className={isStaff ? 'text-gray-600' : ''}>{opt}</span>
            </label>
          ))}
        </div>
      </div>
    );
  }

  if (isMulti) {
    const arr = Array.isArray(value) ? value.map(Number) : [];
    const toggle = (i) => {
      if (isStaff) return; // Prevent staff from toggling
      if (arr.includes(i)) onChange(arr.filter((x) => x !== i));
      else onChange([...arr, i]);
    };

    return (
      <div className={containerClass}>
        <div className="font-medium mb-3">
          Q{index + 1}. {q.prompt}
          <span className="text-xs text-gray-500"> (Select all that apply)</span>
          {isStaff && <span className="ml-2 text-xs text-blue-600">(Preview Only)</span>}
        </div>
        <div className="space-y-2">
          {q.options.map((opt, i) => (
            <label
              key={i}
              className={`flex items-center space-x-2 ${isStaff ? 'cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <input
                type="checkbox"
                disabled={disabled}
                checked={arr.includes(i)}
                onChange={() => toggle(i)}
                className={isStaff ? 'cursor-not-allowed' : ''}
              />
              <span className={isStaff ? 'text-gray-600' : ''}>{opt}</span>
            </label>
          ))}
        </div>
      </div>
    );
  }

  // Text/essay questions
  return (
    <div className={containerClass}>
      <div className="font-medium mb-3">
        Q{index + 1}. {q.prompt}
        {isStaff && <span className="ml-2 text-xs text-blue-600">(Preview Only)</span>}
      </div>
      <textarea
        rows={4}
        className={`w-full border rounded-lg p-2 ${isStaff ? 'bg-gray-100 cursor-not-allowed' : ''}`}
        value={String(value || "")}
        onChange={(e) => !isStaff && onChange(e.target.value)}
        disabled={disabled}
        placeholder={isStaff ? "Preview mode - input disabled" : "Type your answer…"}
      />
    </div>
  );
}
export default CourseViewerPage;