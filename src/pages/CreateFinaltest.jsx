import { Plus, Trash2, Save, AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Button from "../components/ui/Button";
import { assessmentsAPI } from "../services/api";
import { coursesAPI } from "../services/api";

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
});

export default function CreateFinaltest({ initialLesson }) {
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

      if (q.type === "numerical") {
        return {
          ...baseQuestion,
          correctText: q.correctText,
        };
      }

      if (q.type === "match") {
        return {
          ...baseQuestion,
          pairs: JSON.stringify(q.pairs),
        };
      }

      if (q.type === "subjective") {
        return {
          ...baseQuestion,
          sampleAnswer: q.sampleAnswer,
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

      if (q.type === "numerical" && !q.correctText.trim()) {
        setError(`Question ${i + 1}: Please provide the correct answer`);
        return false;
      }

      if (q.type === "match" && (!q.pairs || q.pairs.length === 0)) {
        setError(`Question ${i + 1}: Please add at least one match pair`);
        return false;
      }

      if (q.type === "subjective" && !q.sampleAnswer.trim()) {
        setError(`Question ${i + 1}: Please provide a sample answer`);
        return false;
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
        isPublished: true,
        questions: transformedQuestions,
      };

      const result = await assessmentsAPI.createFinalTest(selectedCourseId, payload);

      console.log("Final test created:", result);
      setSuccess(true);

      setTimeout(() => {
        navigate(`/courses/${selectedCourseId}`);
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Failed to save final test");
      console.error("Save error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Create Final Test
        </h1>
        <p className="text-gray-600">
          Create a comprehensive final test for the entire course
        </p>
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
              value={lesson.maxAttempts}
              onChange={(e) =>
                updateLesson("maxAttempts", Number(e.target.value))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="1"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Questions</h3>
            <Button
              type="button"
              variant="primary"
              onClick={addQuestion}
              className="flex items-center gap-2"
            >
              <Plus size={18} />
              Add Question
            </Button>
          </div>

          {lesson.questions.map((q, qIdx) => (
            <div key={q.id} className="rounded-lg border-2 border-gray-200 p-5 hover:border-gray-300 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-gray-900 text-lg">
                  Question {qIdx + 1}
                </h4>
                <div className="flex gap-2">
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
                    <option value="numerical">Numerical</option>
                    <option value="match">Match the Column</option>
                    <option value="subjective">Subjective</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Question Text *
                  </label>
                  <input
                    type="text"
                    value={q.text}
                    onChange={(e) =>
                      updateQuestion(q.id, "text", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your question"
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

              {q.type === "numerical" && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Correct Answer *
                  </label>
                  <input
                    type="text"
                    value={q.correctText || ""}
                    onChange={(e) =>
                      updateQuestion(q.id, "correctText", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., 42"
                  />
                </div>
              )}

              {q.type === "match" && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Match Pairs *
                    </label>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        updateQuestion(q.id, "pairs", [
                          ...(q.pairs || []),
                          { id: crypto.randomUUID(), left: "", right: "" },
                        ])
                      }
                      className="text-sm"
                    >
                      <Plus size={14} className="mr-1" /> Add Pair
                    </Button>
                  </div>
                  {(q.pairs || []).map((p) => (
                    <div
                      key={p.id}
                      className="grid grid-cols-[1fr_1fr_auto] gap-3 items-center"
                    >
                      <input
                        type="text"
                        value={p.left}
                        onChange={(e) =>
                          updateQuestion(
                            q.id,
                            "pairs",
                            q.pairs.map((x) =>
                              x.id === p.id ? { ...x, left: e.target.value } : x
                            )
                          )
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Left item"
                      />
                      <input
                        type="text"
                        value={p.right}
                        onChange={(e) =>
                          updateQuestion(
                            q.id,
                            "pairs",
                            q.pairs.map((x) =>
                              x.id === p.id ? { ...x, right: e.target.value } : x
                            )
                          )
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Right item"
                      />
                      <button
                        type="button"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded transition-colors"
                        onClick={() =>
                          updateQuestion(
                            q.id,
                            "pairs",
                            q.pairs.filter((x) => x.id !== p.id)
                          )
                        }
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {q.type === "subjective" && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sample Answer *
                  </label>
                  <textarea
                    rows={4}
                    value={q.sampleAnswer || ""}
                    onChange={(e) =>
                      updateQuestion(q.id, "sampleAnswer", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    placeholder="Provide a sample answer for reference"
                  />
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
