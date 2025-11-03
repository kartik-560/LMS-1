import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { BookOpen, Plus, Trash2, Save, ArrowLeft, Eye } from "lucide-react";
import { toast } from "react-hot-toast";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import useAuthStore from "../store/useAuthStore";
import ImagePicker from "./Imagepicker";

import  {
  coursesAPI,
  chaptersAPI,
  uploadsAPI,
  assessmentsAPI,
} from "../services/api";

const emptyQuizQuestion = () => ({
  id: crypto.randomUUID(),
  type: "single",
  text: "",
  options: [
    { id: crypto.randomUUID(), text: "", correct: false },
    { id: crypto.randomUUID(), text: "", correct: false },
  ],
  correctText: "",
  pairs: [{ id: crypto.randomUUID(), left: "", right: "" }],
  sampleAnswer: "",
});

export default function CreateCoursePage() {
  const navigate = useNavigate();

  const token = useAuthStore((s) => s.token);

  const user = useAuthStore((s) => s.user);

  const [isLoading, setIsLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [courseImage, setCourseImage] = useState(null);
  const [base64DataUrl, setBase64DataUrl] = useState(null);

  const [canCreate, setCanCreate] = useState(undefined);

  // --- role helpers (normalize: remove punctuation, uppercase)
  const role = user?.role || "";
  const normRole = (r) =>
    String(r || "")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");
  const roleNorm = normRole(role);
  const isSuperAdmin = roleNorm === "SUPERADMIN";
  const isAdminOnly = roleNorm === "ADMIN";
  const isAdmin = isSuperAdmin || isAdminOnly;

  useEffect(() => {
    if (!user) return;
    const allowed =
      isSuperAdmin ||
      isAdminOnly ||
      (roleNorm === "INSTRUCTOR" && !!user?.permissions?.canCreateCourses);
    setCanCreate(allowed);
  }, [user, roleNorm, isSuperAdmin, isAdminOnly]);

  const [lessons, setLessons] = useState([
    {
      id: Date.now(),
      type: "text",
      title: "",
      content: "",
      pdfFile: null,
      quizTitle: "",
      quizDurationMinutes: "",
      questions: [emptyQuizQuestion()],
    },
  ]);

  const addLesson = (type = "text") => {
    setLessons((prev) => [
      ...prev,
      {
        id: Date.now(),
        type,
        title: "",
        content: "",
        pdfFile: null,
        quizTitle: "",
        quizDurationMinutes: "",
        questions: [emptyQuizQuestion()],
      },
    ]);
  };

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm();
  const watchedValues = watch();

  const removeLesson = (id) => {
    setLessons((prev) =>
      prev.length > 1 ? prev.filter((l) => l.id !== id) : prev
    );
  };
  const updateLesson = (id, field, value) => {
    setLessons((prev) =>
      prev.map((l) => (l.id === id ? { ...l, [field]: value } : l))
    );
  };

  const addQuestion = (lessonId) => {
    setLessons((prev) =>
      prev.map((l) =>
        l.id === lessonId
          ? { ...l, questions: [...l.questions, emptyQuizQuestion()] }
          : l
      )
    );
  };
  const removeQuestion = (lessonId, qid) => {
    setLessons((prev) =>
      prev.map((l) =>
        l.id === lessonId
          ? {
            ...l,
            questions:
              l.questions.length > 1
                ? l.questions.filter((q) => q.id !== qid)
                : l.questions,
          }
          : l
      )
    );
  };
  const updateQuestion = (lessonId, qid, field, value) => {
    setLessons((prev) =>
      prev.map((l) => {
        if (l.id !== lessonId) return l;
        const questions = l.questions.map((q) =>
          q.id === qid ? { ...q, [field]: value } : q
        );
        return { ...l, questions };
      })
    );
  };

  const addOption = (lessonId, qid) => {
    setLessons((prev) =>
      prev.map((l) => {
        if (l.id !== lessonId) return l;
        const questions = l.questions.map((q) =>
          q.id === qid
            ? {
              ...q,
              options: [
                ...q.options,
                { id: crypto.randomUUID(), text: "", correct: false },
              ],
            }
            : q
        );
        return { ...l, questions };
      })
    );
  };
  const removeOption = (lessonId, qid, oid) => {
    setLessons((prev) =>
      prev.map((l) => {
        if (l.id !== lessonId) return l;
        const questions = l.questions.map((q) =>
          q.id === qid
            ? { ...q, options: q.options.filter((o) => o.id !== oid) }
            : q
        );
        return { ...l, questions };
      })
    );
  };
  const updateOption = (lessonId, qid, oid, field, value) => {
    setLessons((prev) =>
      prev.map((l) => {
        if (l.id !== lessonId) return l;
        const questions = l.questions.map((q) => {
          if (q.id !== qid) return q;
          let options = q.options.map((o) =>
            o.id === oid ? { ...o, [field]: value } : o
          );
          if (field === "correct" && value && q.type === "single") {
            options = options.map((o) => ({ ...o, correct: o.id === oid }));
          }
          return { ...q, options };
        });
        return { ...l, questions };
      })
    );
  };

  const validateBeforeSubmit = () => {
    for (const [i, l] of lessons.entries()) {
      if (l.type === "text") {
        if (!l.title?.trim()) {
          toast.error(`Chapter ${i + 1}: title is required`);
          return false;
        }
      } else if (l.type === "test") {
        if (!l.quizTitle?.trim()) {
          toast.error(`Chapter ${i + 1}: quiz title is required`);
          return false;
        }
        if (
          !String(l.quizDurationMinutes).trim() ||
          Number(l.quizDurationMinutes) <= 0
        ) {
          toast.error(`Chapter ${i + 1}: quiz duration (minutes) is required`);
          return false;
        }
        for (const [j, q] of (l.questions || []).entries()) {
          if (!q.text?.trim()) {
            toast.error(
              `Question ${j + 1} in Chapter ${i + 1}: text is required`
            );
            return false;
          }
          if (q.type === "single" || q.type === "multiple") {
            const filled = (q.options || []).filter((o) => o.text?.trim());
            if (filled.length < 2) {
              toast.error(
                `Question ${j + 1} in Chapter ${i + 1}: at least 2 options`
              );
              return false;
            }
            const correct = filled.filter((o) => o.correct).length;
            if (q.type === "single" && correct !== 1) {
              toast.error(
                `Question ${j + 1} in Chapter ${i + 1}: exactly 1 correct option`
              );
              return false;
            }
            if (q.type === "multiple" && correct < 1) {
              toast.error(
                `Question ${j + 1} in Chapter ${i + 1}: mark at least 1 correct`
              );
              return false;
            }
          }
          if (q.type === "numerical") {
            if (!q.correctText?.trim()) {
              toast.error(
                `Question ${j + 1} in Chapter ${i + 1}: correct answer is required`
              );
              return false;
            }
          }
          if (q.type === "match") {
            const validPairs = (q.pairs || []).filter(
              (p) => p.left?.trim() && p.right?.trim()
            );
            if (validPairs.length < 1) {
              toast.error(
                `Question ${j + 1} in Chapter ${i + 1}: add at least one valid pair`
              );
              return false;
            }
          }
        }
      }
    }
    return true;
  };

  // map quiz UI questions -> backend question shape
  const mapQuestionsForAPI = (qs = []) =>
    qs.map((q, idx) => {
      const type = String(q.type || "").toLowerCase();

      if (type === "single" || type === "multiple") {
        const options = (q.options || []).map((o) => o.text || "");
        const correctIdxs = (q.options || [])
          .map((o, i) => (o?.correct ? i : -1))
          .filter((i) => i >= 0);

        return {
          prompt: q.text || "",
          type,
          options,
          correctOptionIndex: type === "single" ? correctIdxs[0] ?? null : null,
          correctOptionIndexes: type === "multiple" ? correctIdxs : [],
          points: 1,
          order: idx + 1,
        };
      }

      if (type === "numerical") {
        return {
          prompt: q.text || "",
          type: "numerical",
          options: [],
          correctText: q.correctText || "",
          points: 1,
          order: idx + 1,
        };
      }

      if (type === "match") {
        const pairs = (q.pairs || []).map((p) => ({
          left: p?.left ?? "",
          right: p?.right ?? "",
        }));
        return {
          prompt: q.text || "",
          type: "match",
          options: [],
          pairs,
          points: 1,
          order: idx + 1,
        };
      }

      // subjective
      return {
        prompt: q.text || "",
        type: "subjective",
        options: [],
        sampleAnswer: q.sampleAnswer || "",
        points: 1,
        order: idx + 1,
      };
    });

  const onSubmit = async (data) => {
    if (!validateBeforeSubmit()) return;
    const creatorId = user?.id;

    if (!creatorId) {
      toast.error("Login session expired. Please log in again.");
      return;
    }
    setIsLoading(true);
    try {
      // interceptor already injects token
      let thumbnailUrl = null;
      if (base64DataUrl) {
        const up = await uploadsAPI.uploadBase64(base64DataUrl);
        thumbnailUrl = up?.url || null;
      }

      const coursePayload = {
        creatorId: creatorId,
        title: data.title,
        thumbnail: thumbnailUrl,
        status: "published",
        category: data.category,
        description: data.description,
      };

      const course = await coursesAPI.create(coursePayload);
      const courseId = course?.id ?? course?.data?.id ?? null;
      if (!courseId) throw new Error("Failed to create course");

      // Create chapters (and assessments for quiz chapters)
      for (const [index, lesson] of lessons.entries()) {
        const chapterPayload = {
          title: lesson.type === "test" ? lesson.quizTitle : lesson.title,
          order: index + 1,
          isPublished: true,
        };

        if (lesson.type === "text") {
          chapterPayload.content = lesson.content;

          if (lesson.pdfFile) {
            const pdfUrl = await uploadsAPI.uploadFile(lesson.pdfFile);
            chapterPayload.attachments = [pdfUrl];
          }

          await chaptersAPI.create(courseId, chapterPayload);
        } else {
          // Quiz chapter
          const chRes = await chaptersAPI.create(courseId, chapterPayload);
          const chapterId = chRes?.id ?? chRes?.data?.id ?? chRes;
          if (!chapterId)
            throw new Error("Chapter id missing for quiz creation");

          const minutes = Number(lesson.quizDurationMinutes || 0);
          await assessmentsAPI.createForChapter(chapterId, {
            title:
              lesson.quizTitle?.trim() ||
              `Quiz for ${chapterPayload.title || `Chapter ${index + 1}`}`,
            type: "quiz",
            scope: "chapter",
            timeLimitSeconds: minutes > 0 ? minutes * 60 : null,
            maxAttempts: 1,
            isPublished: true,
            order: 1,
            questions: mapQuestionsForAPI(lesson.questions || []),
          });
        }
      }

      toast.success("Course, chapters, and quizzes created!");
      if (isSuperAdmin) navigate("/superadmin");
      else if (isAdminOnly) navigate("/admin");
      else if (roleNorm === "INSTRUCTOR") navigate("/instructor");
      else navigate("/");
    } catch (err) {
      console.error("CreateCourse error:", err);
      toast.error(
        err?.response?.data?.message || "Failed to create the course."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const coursePreview = {
    title: watchedValues.title || "Course Title",
    description:
      watchedValues.description || "Course description will appear here...",
    instructor: user?.fullName || "You",
    lessons,
    image:
      courseImage || "https://via.placeholder.com/400x250?text=Course+Image",
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <button
              onClick={() => {
                if (isSuperAdmin) navigate("/superadmin");
                else if (isAdminOnly) navigate("/admin");
                else if (roleNorm === "INSTRUCTOR") navigate("/instructor");
                else navigate("/");
              }}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Create New Course
              </h1>
              <p className="text-gray-600">
                Share your knowledge and start earning
              </p>
            </div>
          </div>

          <div className="flex space-x-4">
            <Button
              variant={!showPreview ? "default" : "outline"}
              onClick={() => setShowPreview(false)}
            >
              <BookOpen size={16} className="mr-2" />
              Edit Course
            </Button>
            <Button
              variant={showPreview ? "default" : "outline"}
              onClick={() => setShowPreview(true)}
            >
              <Eye size={16} className="mr-2" />
              Preview
            </Button>
          </div>
        </div>

        {!showPreview ? (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                Basic Information
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Input
                    label="Course Title"
                    placeholder="Enter course title"
                    error={errors.title?.message}
                    {...register("title", {
                      required: "Course title is required",
                      minLength: { value: 10, message: "Min 10 characters" },
                    })}
                  />
                </div>

                <div>
                  <Input
                    label="Category"
                    placeholder="e.g., Programming, Design, Business"
                    error={errors.category?.message}
                    {...register("category", {
                      required: "Category is required",
                    })}
                  />
                </div>
              </div>

              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Course Description
                </label>
                <textarea
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Describe what students will learn in this course..."
                  {...register("description", {
                    required: "Description is required",
                    minLength: { value: 100, message: "Min 100 characters" },
                  })}
                />
                {errors.description && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.description.message}
                  </p>
                )}
              </div>

              {/* Thumbnail */}
              <ImagePicker
                onFileAsBase64={(dataUrl) => {
                  setBase64DataUrl(dataUrl);
                  setCourseImage(dataUrl);
                }}
              />
            </div>

            {/* Lessons List */}
            {lessons.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="space-y-4">
                  {lessons.map((lesson, idx) => (
                    <div
                      key={lesson.id}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {lesson.type === "text" ? (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Chapter Title
                            </label>
                            <input
                              type="text"
                              value={lesson.title}
                              onChange={(e) =>
                                updateLesson(lesson.id, "title", e.target.value)
                              }
                              required
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                              placeholder={`Chapter ${idx + 1}`}
                            />
                          </div>
                        ) : (
                          <div className="hidden md:block" />
                        )}

                        {lesson.type === "text" && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Type
                            </label>
                            <select
                              value={lesson.type}
                              onChange={(e) =>
                                updateLesson(lesson.id, "type", e.target.value)
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            >
                              <option value="text">Text & PDF</option>
                            
                            </select>
                          </div>
                        )}

                        <div className="hidden md:block" />
                        <div className="flex items-end">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => removeLesson(lesson.id)}
                            disabled={lessons.length === 1}
                            className="w-full"
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </div>

                      {lesson.type === "text" ? (
                        <div className="mt-4 space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Chapter Content
                            </label>
                            <textarea
                              rows={3}
                              value={lesson.content}
                              onChange={(e) =>
                                updateLesson(
                                  lesson.id,
                                  "content",
                                  e.target.value
                                )
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                              placeholder="Describe what this lesson covers..."
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Upload PDF (Optional)
                            </label>
                            <input
                              type="file"
                              accept="application/pdf"
                              onChange={(e) =>
                                updateLesson(
                                  lesson.id,
                                  "pdfFile",
                                  e.target.files[0]
                                )
                              }
                              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                            />
                            {lesson.pdfFile && (
                              <p className="mt-2 text-sm text-gray-600">
                                Selected: {lesson.pdfFile.name}
                              </p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="mt-4 space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-2">
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Quiz Title
                              </label>
                              <input
                                type="text"
                                value={lesson.quizTitle}
                                onChange={(e) =>
                                  updateLesson(
                                    lesson.id,
                                    "quizTitle",
                                    e.target.value
                                  )
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                placeholder="e.g., Chapter 1 Quiz"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Duration (minutes)
                              </label>
                              <input
                                type="number"
                                min="1"
                                value={lesson.quizDurationMinutes}
                                onChange={(e) =>
                                  updateLesson(
                                    lesson.id,
                                    "quizDurationMinutes",
                                    e.target.value
                                  )
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                placeholder="30"
                              />
                            </div>
                          </div>

                          <div className="space-y-4">
                            {lesson.questions.map((q, qIdx) => (
                              <div
                                key={q.id}
                                className="rounded-lg border border-gray-200 p-4"
                              >
                                <div className="flex items-center justify-between mb-3">
                                  <h4 className="font-medium text-gray-900">
                                    Question {qIdx + 1}
                                  </h4>
                                  <div className="flex gap-2">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      onClick={() =>
                                        addQuestion(lesson.id)
                                      }
                                      title="Add question below"
                                    >
                                      <Plus size={14} />
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      onClick={() =>
                                        removeQuestion(lesson.id, q.id)
                                      }
                                      disabled={lesson.questions.length === 1}
                                      title="Remove this question"
                                    >
                                      <Trash2 size={14} />
                                    </Button>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Type
                                    </label>
                                    <select
                                      value={q.type}
                                      onChange={(e) =>
                                        updateQuestion(
                                          lesson.id,
                                          q.id,
                                          "type",
                                          e.target.value
                                        )
                                      }
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                    >
                                      <option value="single">
                                        Single Correct Option
                                      </option>
                                      <option value="multiple">
                                        Multiple Correct Options
                                      </option>
                                      <option value="numerical">
                                        Numerical/Fill in the Blank
                                      </option>
                                      <option value="match">
                                        Match the Column
                                      </option>
                                      <option value="subjective">
                                        Subjective
                                      </option>
                                    </select>
                                  </div>

                                  <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Question
                                    </label>
                                    <input
                                      type="text"
                                      value={q.text}
                                      onChange={(e) =>
                                        updateQuestion(
                                          lesson.id,
                                          q.id,
                                          "text",
                                          e.target.value
                                        )
                                      }
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                      placeholder="Enter question"
                                    />
                                  </div>
                                </div>

                                {q.type === "single" || q.type === "multiple" ? (
                                  <div className="mt-4">
                                    <div className="flex items-center justify-between mb-2">
                                      <label className="block text-sm font-medium text-gray-700">
                                        Options (mark correct)
                                      </label>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => addOption(lesson.id, q.id)}
                                      >
                                        <Plus size={14} className="mr-1" />
                                        Add Option
                                      </Button>
                                    </div>

                                    <div className="space-y-2">
                                      {q.options.map((o) => (
                                        <div
                                          key={o.id}
                                          className="grid grid-cols-[24px_1fr_32px] gap-3 items-center"
                                        >
                                          <input
                                            type="checkbox"
                                            className="h-4 w-4"
                                            checked={o.correct}
                                            onChange={(e) =>
                                              updateOption(
                                                lesson.id,
                                                q.id,
                                                o.id,
                                                "correct",
                                                e.target.checked
                                              )
                                            }
                                          />
                                          <input
                                            type="text"
                                            value={o.text}
                                            onChange={(e) =>
                                              updateOption(
                                                lesson.id,
                                                q.id,
                                                o.id,
                                                "text",
                                                e.target.value
                                              )
                                            }
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                            placeholder="Option text"
                                          />
                                          <button
                                            type="button"
                                            className="text-red-500 hover:text-red-600"
                                            onClick={() =>
                                              removeOption(lesson.id, q.id, o.id)
                                            }
                                            title="Remove option"
                                          >
                                            <Trash2 size={16} />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ) : q.type === "numerical" ? (
                                  <div className="mt-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Correct Answer (text/number)
                                    </label>
                                    <input
                                      type="text"
                                      value={q.correctText || ""}
                                      onChange={(e) =>
                                        updateQuestion(
                                          lesson.id,
                                          q.id,
                                          "correctText",
                                          e.target.value
                                        )
                                      }
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                      placeholder="e.g., 42 or 'HyperText Markup Language'"
                                    />
                                  </div>
                                ) : q.type === "match" ? (
                                  <div className="mt-4 space-y-2">
                                    <div className="flex items-center justify-between">
                                      <label className="block text-sm font-medium text-gray-700">
                                        Match Pairs (Left ↔ Right)
                                      </label>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() =>
                                          updateQuestion(
                                            lesson.id,
                                            q.id,
                                            "pairs",
                                            [
                                              ...(q.pairs || []),
                                              {
                                                id: crypto.randomUUID(),
                                                left: "",
                                                right: "",
                                              },
                                            ]
                                          )
                                        }
                                      >
                                        <Plus size={14} className="mr-1" />
                                        Add Pair
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
                                              lesson.id,
                                              q.id,
                                              "pairs",
                                              (q.pairs || []).map((x) =>
                                                x.id === p.id
                                                  ? { ...x, left: e.target.value }
                                                  : x
                                              )
                                            )
                                          }
                                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                          placeholder="Left"
                                        />
                                        <input
                                          type="text"
                                          value={p.right}
                                          onChange={(e) =>
                                            updateQuestion(
                                              lesson.id,
                                              q.id,
                                              "pairs",
                                              (q.pairs || []).map((x) =>
                                                x.id === p.id
                                                  ? {
                                                    ...x,
                                                    right: e.target.value,
                                                  }
                                                  : x
                                              )
                                            )
                                          }
                                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                          placeholder="Right"
                                        />
                                        <button
                                          type="button"
                                          className="text-red-500 hover:text-red-600"
                                          onClick={() =>
                                            updateQuestion(
                                              lesson.id,
                                              q.id,
                                              "pairs",
                                              (q.pairs || []).filter(
                                                (x) => x.id !== p.id
                                              )
                                            )
                                          }
                                          title="Remove pair"
                                        >
                                          <Trash2 size={16} />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="mt-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Sample Answer (optional)
                                    </label>
                                    <textarea
                                      rows={3}
                                      value={q.sampleAnswer || ""}
                                      onChange={(e) =>
                                        updateQuestion(
                                          lesson.id,
                                          q.id,
                                          "sampleAnswer",
                                          e.target.value
                                        )
                                      }
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                      placeholder="Provide guidance for graders or expected points to cover"
                                    />
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add Chapter & Add Quiz buttons */}
            <div className="flex justify-center space-x-2 mt-6">
              <Button
                type="button"
                onClick={() => addLesson("text")}
                variant="outline"
              >
                <Plus size={16} className="mr-2" />
                Add Chapter
              </Button>
              <Button
                type="button"
                onClick={() => addLesson("test")}
                variant="outline"
              >
                <Plus size={16} className="mr-2" />
                Add Quiz
              </Button>
            </div>

            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (isSuperAdmin) navigate("/superadmin");
                  else if (isAdminOnly) navigate("/admin");
                  else if (roleNorm === "INSTRUCTOR") navigate("/instructor");
                  else navigate("/dashboard");
                }}
              >
                Cancel
              </Button>
              <Button type="submit" loading={isLoading} disabled={isLoading}>
                <Save size={16} className="mr-2" />
                Create Course
              </Button>
            </div>
          </form>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="max-w-4xl mx-auto">
              <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden mb-6">
                <img
                  src={coursePreview.image}
                  alt={coursePreview.title}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {coursePreview.title}
                </h1>
                <p className="text-gray-600 text-lg mb-4">
                  {coursePreview.description}
                </p>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Course Content
                </h2>
                <div className="space-y-3">
                  {coursePreview.lessons.map((l, i) => (
                    <div
                      key={i}
                      className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-primary-600">
                          {i + 1}
                        </span>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">
                          {l.type === "test"
                            ? l.quizTitle || `Quiz ${i + 1}`
                            : l.title || `Chapter ${i + 1}`}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {l.type === "test"
                            ? `Quiz • ${(l.questions || []).length} questions${l.quizDurationMinutes
                              ? ` • ${l.quizDurationMinutes} min`
                              : ""
                            }`
                            : "Text lesson"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
