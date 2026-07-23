import { Plus, Trash2, Save, AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Button from "../components/ui/Button";
import { assessmentsAPI } from "../services/api";
import { coursesAPI } from "../services/api";
import useAuthStore from "../store/useAuthStore";

const createNewQuestion = () => ({
  id: crypto.randomUUID(),
  type: "single",
  text: "",
  options: [
    { id: crypto.randomUUID(), text: "", correct: false },
    { id: crypto.randomUUID(), text: "", correct: false },
  ],
  pairs: [],
  correctText: "",
  sampleAnswer: "",
  points: 1,
  language: "javascript",
  executionTimeLimit: 3000, // Time limit in milliseconds
  testCases: [{ input: "", expectedOutput: "", isHidden: false }],
  codeStub: "// Write your code here\n",
});

export default function CreateFinaltest({ initialLesson }) {
  const userRole = useAuthStore((state) => state.userRole);
  const { courseId: urlCourseId } = useParams();
  const navigate = useNavigate();

  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState(urlCourseId || "");
  const [loadingCourses, setLoadingCourses] = useState(true);

  const [lesson, setLesson] = useState(
    initialLesson || {
      quizTitle: "",
      quizDurationMinutes: 60,
      maxAttempts: 1,
      passingMark: 70,
      questions: [createNewQuestion()],
    }
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    if (initialLesson) setLesson(initialLesson);
  }, [initialLesson]);

  const fetchCourses = async () => {
    try {
      setLoadingCourses(true);
      const response = await coursesAPI.list();

      const courseData = response?.data?.data || response?.data || response || [];
      setCourses(Array.isArray(courseData) ? courseData : []);
    } catch (err) {
      console.error("Failed to fetch courses:", err);
      setError("Failed to load courses. Please refresh the page.");
    } finally {
      setLoadingCourses(false);
    }
  };

  const updateLesson = (field, value) => {
    setLesson((prev) => ({ ...prev, [field]: value }));
  };

  const addQuestion = () => {
    setLesson((prev) => ({
      ...prev,
      questions: [...prev.questions, createNewQuestion()],
    }));
  };

  const removeQuestion = (questionId) => {
    setLesson((prev) => ({
      ...prev,
      questions: prev.questions.filter((q) => q.id !== questionId),
    }));
  };

  const updateQuestion = (questionId, field, value) => {
    setLesson((prev) => ({
      ...prev,
      questions: prev.questions.map((q) =>
        q.id === questionId ? { ...q, [field]: value } : q
      ),
    }));
  };

  const addOption = (questionId) => {
    setLesson((prev) => ({
      ...prev,
      questions: prev.questions.map((q) =>
        q.id === questionId
          ? {
            ...q,
            options: [
              ...q.options,
              { id: crypto.randomUUID(), text: "", correct: false },
            ],
          }
          : q
      ),
    }));
  };

  const removeOption = (questionId, optionId) => {
    setLesson((prev) => ({
      ...prev,
      questions: prev.questions.map((q) =>
        q.id === questionId
          ? { ...q, options: q.options.filter((o) => o.id !== optionId) }
          : q
      ),
    }));
  };

  const updateOption = (questionId, optionId, field, value) => {
    setLesson((prev) => ({
      ...prev,
      questions: prev.questions.map((q) =>
        q.id === questionId
          ? {
            ...q,
            options: q.options.map((o) =>
              o.id === optionId ? { ...o, [field]: value } : o
            ),
          }
          : q
      ),
    }));
  };

  const transformQuestionsForAPI = () => {
    return lesson.questions.map((q, index) => {
      const baseQuestion = {
        prompt: q.text,
        type: q.type,
        points: q.points || 1,
        order: index + 1,
      };

      if (q.type === "single") {
        const correctIndex = q.options.findIndex((o) => o.correct);
        return {
          ...baseQuestion,
          options: q.options.map((o) => o.text),
          correctOptionIndex: correctIndex >= 0 ? correctIndex : null,
        };
      }

      if (q.type === "multiple") {
        const correctIndexes = q.options
          .map((o, idx) => (o.correct ? idx : null))
          .filter((idx) => idx !== null);
        return {
          ...baseQuestion,
          options: q.options.map((o) => o.text),
          correctOptionIndexes: correctIndexes,
        };
      }

      if (q.type === "coding") {
        return {
          ...baseQuestion,
          language: q.language,
          executionTimeLimit: q.executionTimeLimit,
          codeStub: q.codeStub,
          testCases: q.testCases,
        };
      }

      return baseQuestion;
    });
  };

  const validateForm = () => {
    if (!selectedCourseId) {
      setError("Please select a course");
      return false;
    }

    if (!lesson.quizTitle.trim()) {
      setError("Please enter a final test title");
      return false;
    }

    if (lesson.quizDurationMinutes < 1) {
      setError("Duration must be at least 1 minute");
      return false;
    }

    if (lesson.passingMark === undefined || lesson.passingMark === null) {
      setError("Please enter a passing mark");
      return false;
    }
    if (
      Number.isNaN(Number(lesson.passingMark)) ||
      lesson.passingMark < 0 ||
      lesson.passingMark > 100
    ) {
      setError("Passing mark must be a number between 0 and 100");
      return false;
    }

    if (lesson.questions.length === 0) {
      setError("Please add at least one question");
      return false;
    }

    for (let i = 0; i < lesson.questions.length; i++) {
      const q = lesson.questions[i];

      if (!q.text.trim()) {
        setError(`Question ${i + 1}: Please enter question text`);
        return false;
      }

      if (q.type === "single" || q.type === "multiple") {
        if (q.options.length < 2) {
          setError(`Question ${i + 1}: Please add at least 2 options`);
          return false;
        }

        const hasEmptyOption = q.options.some((o) => !o.text.trim());
        if (hasEmptyOption) {
          setError(`Question ${i + 1}: All options must have text`);
          return false;
        }

        const hasCorrectAnswer = q.options.some((o) => o.correct);
        if (!hasCorrectAnswer) {
          setError(`Question ${i + 1}: Please mark at least one correct answer`);
          return false;
        }
      }
      if (q.type === "coding") {
        if (!q.testCases || q.testCases.length === 0) {
          setError(`Question ${i + 1}: Please add at least one test case for the programming question.`);
          return false;
        }
        const hasEmptyOutput = q.testCases.some(tc => !tc.expectedOutput.trim());
        if (hasEmptyOutput) {
          setError(`Question ${i + 1}: All programming test cases must have an expected output to evaluate against.`);
          return false;
        }
      }
    }

    return true;
  };

  const handleSave = async () => {
    setError(null);
    setSuccess(false);

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const transformedQuestions = transformQuestionsForAPI();

      const payload = {
        title: lesson.quizTitle,
        timeLimitSeconds: lesson.quizDurationMinutes * 60,
        maxAttempts: lesson.maxAttempts || 1,
        passingMark: lesson.passingMark,
        isPublished: true,
        questions: transformedQuestions,
      };

      const result = await assessmentsAPI.createFinalTest(selectedCourseId, payload);

      console.log("Final test created:", result);
      setSuccess(true);

      setTimeout(() => {
        if (userRole === "SUPERADMIN") {
          navigate(`/superadmin`);
        } else if (userRole === "ADMIN") {
          navigate(`/admin`);
        } else {
          navigate(`/`);
        }
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Failed to save final test");
      console.error("Save error:", err);
    } finally {
      setLoading(false);
    }
  };

  const getDashboardPath = () => {
    if (!userRole) return "/";

    const normalized = String(userRole).toUpperCase();

    if (normalized === "SUPERADMIN") return "/superadmin";
    if (normalized === "ADMIN") return "/admin";
    if (normalized === "INSTRUCTOR") return "/instructor";
    if (normalized === "STUDENT") return "/dashboard"; 

    return "/";
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Create Final Test
          </h1>
          <p className="text-gray-600">
            Create a comprehensive final test for the entire course
          </p>
        </div>

        <Button
          variant="outline"
          onClick={() => navigate(getDashboardPath())}
        >
          Back to Dashboard
        </Button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-red-900">Error</h3>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="font-semibold text-green-900 mb-1">Success!</h3>
          <p className="text-green-700 text-sm">
            Final test saved successfully. Redirecting...
          </p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Course *
            </label>
            {loadingCourses ? (
              <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-gray-600 text-sm">Loading courses...</span>
              </div>
            ) : (
              <select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={!!urlCourseId}
              >
                <option value="">-- Select a course --</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.title} {course.code ? `(${course.code})` : ''}
                  </option>
                ))}
              </select>
            )}
            {urlCourseId && (
              <p className="mt-1 text-xs text-gray-500">
                Course is pre-selected from the URL
              </p>
            )}
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Final Test Title *
            </label>
            <input
              type="text"
              value={lesson.quizTitle}
              onChange={(e) => updateLesson("quizTitle", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Course Final Exam"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Duration (minutes) *
            </label>
            <input
              type="number"
              min="1"
              value={lesson.quizDurationMinutes}
              onChange={(e) =>
                updateLesson("quizDurationMinutes", Number(e.target.value))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="60"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Attempts
            </label>
            <input
              type="number"
              min="1"
              max="3"
              value={lesson.maxAttempts}
              onChange={(e) =>
                updateLesson("maxAttempts", Number(e.target.value))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Passing Mark (%) *
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={lesson.passingMark}
              onChange={(e) =>
                updateLesson("passingMark", Number(e.target.value))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., 70"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Questions</h3>
          </div>

          {lesson.questions.map((q, qIdx) => (
            <div key={q.id} className="rounded-lg border-2 border-gray-200 p-5 hover:border-gray-300 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-gray-900 text-lg">
                  Question {qIdx + 1}
                </h4>
                <div className="flex gap-2">
                  {qIdx === lesson.questions.length - 1 && (
                    <Button
                      type="button"
                      variant="primary"
                      onClick={addQuestion}
                      className="flex items-center gap-2"
                    >
                      <Plus size={18} />
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => removeQuestion(q.id)}
                    disabled={lesson.questions.length === 1}
                    title="Remove this question"
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type *
                  </label>
                  <select
                    value={q.type}
                    onChange={(e) =>
                      updateQuestion(q.id, "type", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="single">Single Choice</option>
                    <option value="multiple">Multiple Choice</option>
                    <option value="coding">Programming / Coding</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Question Text *
                  </label>
                  <textarea
                    rows={6}
                    value={q.text}
                    onChange={(e) => updateQuestion(q.id, "text", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
                    placeholder="Enter your problem statement or question. Use Enter for new lines."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Points
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={q.points || 1}
                    onChange={(e) =>
                      updateQuestion(q.id, "points", Number(e.target.value))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="1"
                  />
                </div>
              </div>

              {(q.type === "single" || q.type === "multiple") && (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Options (check correct answers) *
                    </label>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => addOption(q.id)}
                      className="text-sm"
                    >
                      <Plus size={14} className="mr-1" /> Add Option
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {q.options.map((o, optIdx) => (
                      <div
                        key={o.id}
                        className="grid grid-cols-[32px_1fr_32px] gap-3 items-center"
                      >
                        <div className="flex items-center justify-center">
                          <input
                            type="checkbox"
                            className="h-5 w-5 text-blue-600 rounded"
                            checked={o.correct}
                            onChange={(e) =>
                              updateOption(q.id, o.id, "correct", e.target.checked)
                            }
                          />
                        </div>
                        <input
                          type="text"
                          value={o.text}
                          onChange={(e) =>
                            updateOption(q.id, o.id, "text", e.target.value)
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder={`Option ${String.fromCharCode(65 + optIdx)}`}
                        />
                        <button
                          type="button"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded transition-colors"
                          onClick={() => removeOption(q.id, o.id)}
                          disabled={q.options.length <= 2}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {q.type === "coding" && (
                <div className="mt-4 p-5 bg-slate-50 border border-slate-200 rounded-lg space-y-4">
                  <h5 className="font-semibold text-slate-800 border-b pb-2">Coding Problem Settings</h5>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Target Language</label>
                      <select
                        value={q.language}
                        onChange={(e) => updateQuestion(q.id, "language", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        {/* ONLY SUPPORTED CLIENT-SIDE LANGUAGES ADDED HERE */}
                        <option value="javascript">JavaScript</option>
                        <option value="python">Python 3</option>
                        <option value="cpp">C / C++</option>
                        <option value="php">PHP</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Execution Time Limit (ms)</label>
                      <input
                        type="number"
                        value={q.executionTimeLimit}
                        onChange={(e) => updateQuestion(q.id, "executionTimeLimit", Number(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        placeholder="3000"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Initial Code Stub</label>
                    <textarea
                      rows={4}
                      value={q.codeStub}
                      onChange={(e) => updateQuestion(q.id, "codeStub", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm bg-slate-900 text-green-400"
                      placeholder="function solution(input) { ... }"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2 mt-4">
                      <label className="block text-sm font-medium text-gray-700">Test Cases</label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => updateQuestion(q.id, "testCases", [...q.testCases, { input: "", expectedOutput: "", isHidden: false }])}
                      >
                        <Plus size={14} className="mr-1" /> Add Test Case
                      </Button>
                    </div>

                    {q.testCases.map((tc, tcIdx) => (
                      <div key={tcIdx} className="grid grid-cols-12 gap-3 mb-3 items-start bg-white p-3 border rounded shadow-sm">
                        <div className="col-span-5">
                          <label className="text-xs text-gray-500 mb-1 block">Standard Input (stdin)</label>
                          <textarea
                            value={tc.input}
                            onChange={(e) => {
                              const newTCs = [...q.testCases];
                              newTCs[tcIdx].input = e.target.value;
                              updateQuestion(q.id, "testCases", newTCs);
                            }}
                            className="w-full px-2 py-1 border rounded font-mono text-sm"
                            rows={2}
                          />
                        </div>
                        <div className="col-span-5">
                          <label className="text-xs text-gray-500 mb-1 block">Expected Output</label>
                          <textarea
                            value={tc.expectedOutput}
                            onChange={(e) => {
                              const newTCs = [...q.testCases];
                              newTCs[tcIdx].expectedOutput = e.target.value;
                              updateQuestion(q.id, "testCases", newTCs);
                            }}
                            className="w-full px-2 py-1 border rounded font-mono text-sm"
                            rows={2}
                          />
                        </div>
                        <div className="col-span-2 flex flex-col items-end gap-2 pt-5">
                          <label className="flex items-center text-sm gap-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={tc.isHidden}
                              onChange={(e) => {
                                const newTCs = [...q.testCases];
                                newTCs[tcIdx].isHidden = e.target.checked;
                                updateQuestion(q.id, "testCases", newTCs);
                              }}
                            /> Hidden
                          </label>
                          <button
                            type="button"
                            className="text-red-500 hover:text-red-700 p-1"
                            disabled={q.testCases.length === 1}
                            onClick={() => {
                              const newTCs = q.testCases.filter((_, i) => i !== tcIdx);
                              updateQuestion(q.id, "testCases", newTCs);
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="pt-6 border-t flex gap-3 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(-1)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleSave}
            disabled={loading || !selectedCourseId}
            className="flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Saving...
              </>
            ) : (
              <>
                <Save size={18} />
                Save Final Test
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}