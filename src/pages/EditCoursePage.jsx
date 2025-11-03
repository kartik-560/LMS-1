
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { BookOpen, Plus, Trash2, Save, ArrowLeft, Eye } from "lucide-react";
import { toast } from "react-hot-toast";

import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import useAuthStore from "../store/useAuthStore";
import ImagePicker from "./Imagepicker";

import api, {
  coursesAPI,
  chaptersAPI,
  uploadsAPI,
  assessmentsAPI,
} from "../services/api";

const unwrap = (res) =>
  res?.data?.data ??
  res?.data?.result ??
  res?.data?.course ??
  res?.data?.items ??
  res?.data ??
  res;

const normRole = (r) =>
  String(r || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

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

// API <-> UI question mappers (same logic you had)
const mapAPIQuestionToUI = (q = {}) => {
  const type = String(q.type || "subjective").toLowerCase();
  const prompt = q.prompt ?? q.text ?? q.question ?? "";
  const sampleAnswer = q.sampleAnswer ?? q.expectedAnswer ?? q.rubric ?? "";
  const correctText = q.correctText ?? q.answer ?? q.answerText ?? q.expected ?? "";

  const rawOptions = Array.isArray(q.options) ? q.options : [];
  const optionsAsObjects = rawOptions.map((opt, i) => {
    if (typeof opt === "string") {
      return { id: crypto.randomUUID(), text: opt, correct: false, _i: i };
    }
    return {
      id: crypto.randomUUID(),
      text: opt?.text ?? opt?.label ?? "",
      correct: Boolean(opt?.correct ?? opt?.isCorrect ?? false),
      _i: i,
    };
  });

  const coIdx = typeof q.correctOptionIndex === "number" ? q.correctOptionIndex : null;
  const coIdxs = Array.isArray(q.correctOptionIndexes)
    ? q.correctOptionIndexes
    : Array.isArray(q.correctIndexes)
      ? q.correctIndexes
      : null;

  let options = optionsAsObjects;
  if (type === "single" && coIdx != null) {
    options = options.map((o) => ({ ...o, correct: o._i === coIdx }));
  }
  if (type === "multiple" && coIdxs) {
    const set = new Set(coIdxs);
    options = options.map((o) => ({ ...o, correct: set.has(o._i) }));
  }
  options = options.map(({ _i, ...rest }) => rest);

  const pairsSrc = Array.isArray(q.pairs) ? q.pairs : Array.isArray(q.matches) ? q.matches : [];
  const pairs = pairsSrc.map((p) => ({
    id: crypto.randomUUID(),
    left: p?.left ?? p?.l ?? p?.a ?? "",
    right: p?.right ?? p?.r ?? p?.b ?? "",
  }));

  const base = { id: crypto.randomUUID(), text: prompt, sampleAnswer, correctText, pairs };

  if (type === "single" || type === "multiple") return { ...base, type, options };
  if (type === "numerical") return { ...base, type, options: [] };
  if (type === "match") return { ...base, type, options: [] };
  return { ...base, type: "subjective", options: [] };
};

const mapUIQuestionsToAPI = (qs = []) =>
  qs.map((q, idx) => {
    const type = String(q.type || "subjective").toLowerCase();

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
      const ans = q.correctText || q.sampleAnswer || "";
      return {
        prompt: q.text || "",
        type: "numerical",
        options: [],
        correctText: ans,
        answerText: ans,
        points: 1,
        order: idx + 1,
      };
    }

    if (type === "match") {
      const pairs = (q.pairs || [])
        .filter((p) => (p.left || "").trim() || (p.right || "").trim())
        .map((p) => ({ left: p.left ?? "", right: p.right ?? "" }));
      return { prompt: q.text || "", type: "match", options: [], pairs, matches: pairs, points: 1, order: idx + 1 };
    }

    return {
      prompt: q.text || "",
      type: "subjective",
      options: [],
      sampleAnswer: q.sampleAnswer || "",
      points: 1,
      order: idx + 1,
    };
  });

/* ------------------------------ component ------------------------------ */
export default function EditCoursePage() {
  const { courseId } = useParams();
  const navigate = useNavigate();

  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);

  const roleNorm = normRole(user?.role);
  const isSuperAdmin = roleNorm === "SUPERADMIN";
  const isAdminOnly = roleNorm === "ADMIN";

  const [isLoading, setIsLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [showPreview, setShowPreview] = useState(false);

  const [base64DataUrl, setBase64DataUrl] = useState(null);
  const [courseImage, setCourseImage] = useState(null); // preview image (like Create)

  // Lessons shaped exactly like CreateCoursePage + hidden ids for update
  const [lessons, setLessons] = useState([
    {
      id: crypto.randomUUID(),
      type: "text",
      title: "",
      content: "",
      pdfFile: null,
      quizTitle: "",
      quizDurationMinutes: "",
      questions: [emptyQuizQuestion()],
      // internal IDs for editing
      _chapterId: null,
      _assessmentId: null,
    },
  ]);

  const [chaptersToDelete, setChaptersToDelete] = useState([]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm();
  const watchedValues = watch();

  /* ------------------------------ lesson ops (same UX as Create) ------------------------------ */
  const addLesson = (type = "text") => {
    setLessons((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        type,
        title: "",
        content: "",
        pdfFile: null,
        quizTitle: "",
        quizDurationMinutes: "",
        questions: [emptyQuizQuestion()],
        _chapterId: null,
        _assessmentId: null,
      },
    ]);
  };

  const removeLesson = (id) => {

    const lessonToRemove = lessons.find(l => l.id === id);

    if (lessonToRemove?._chapterId) {
      setChaptersToDelete(prev => [...prev, lessonToRemove._chapterId]);
    }
    setLessons((prev) => (prev.length > 1 ? prev.filter((l) => l.id !== id) : prev));
  };

  const updateLesson = (id, field, value) => {
    setLessons((prev) => prev.map((l) => (l.id === id ? { ...l, [field]: value } : l)));
  };

  const addQuestion = (lessonId) => {
    setLessons((prev) =>
      prev.map((l) =>
        l.id === lessonId ? { ...l, questions: [...l.questions, emptyQuizQuestion()] } : l
      )
    );
  };

  const removeQuestion = (lessonId, qid) => {
    setLessons((prev) =>
      prev.map((l) =>
        l.id === lessonId
          ? {
            ...l,
            questions: l.questions.length > 1 ? l.questions.filter((q) => q.id !== qid) : l.questions,
          }
          : l
      )
    );
  };

  const updateQuestion = (lessonId, qid, field, value) => {
    setLessons((prev) =>
      prev.map((l) => {
        if (l.id !== lessonId) return l;
        const questions = l.questions.map((q) => (q.id === qid ? { ...q, [field]: value } : q));
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
              options: [...q.options, { id: crypto.randomUUID(), text: "", correct: false }],
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
          q.id === qid ? { ...q, options: q.options.filter((o) => o.id !== oid) } : q
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
          let options = q.options.map((o) => (o.id === oid ? { ...o, [field]: value } : o));
          if (field === "correct" && value && q.type === "single") {
            options = options.map((o) => ({ ...o, correct: o.id === oid }));
          }
          return { ...q, options };
        });
        return { ...l, questions };
      })
    );
  };

  useEffect(() => {
    const loadCourseData = async () => {
      try {
        setInitialLoading(true);
        if (token) api.defaults.headers.common.Authorization = `Bearer ${token}`;

        const courseRes = await coursesAPI.get(courseId);
        const c = unwrap(courseRes);
        if (!c?.id) throw new Error("Course not found");

        reset({
          title: c?.title || "",
          category: c?.category || "",
          description: c?.description || "",
        });
        setCourseImage(c?.thumbnail || null);

        const chaptersRes = await chaptersAPI.listByCourse(courseId);
        let chapters = unwrap(chaptersRes) || [];
        chapters.sort((a, b) => (a?.order || 0) - (b?.order || 0));

    

        const assessmentPromises = chapters.map(ch =>
          assessmentsAPI.listByChapter(ch.id)
            .then(res => unwrap(res))
            .then(assessments => ({ chapterId: ch.id, assessments: assessments || [] }))
            .catch(err => {
              console.error(`Could not load assessments for chapter ${ch.id}`, err);
              return { chapterId: ch.id, assessments: [] };
            })
        );

        const chapterAssessments = await Promise.all(assessmentPromises);

        const assessmentMap = new Map(
          chapterAssessments.map(item => [item.chapterId, item.assessments[0]])
        );

        const builtLessons = chapters.map(ch => {
          const assessment = assessmentMap.get(ch.id);

          if (assessment) {
            const durationMin = assessment.timeLimitSeconds ? Math.round(Number(assessment.timeLimitSeconds) / 60) : "";
            const uiQuestions = (assessment.questions || []).map(mapAPIQuestionToUI);

            return {
              id: crypto.randomUUID(),
              type: "test",
              quizTitle: assessment?.title || ch?.title || "",
              content: ch?.content || "", // <-- FIX: Always include the chapter's content
              quizDurationMinutes: durationMin,
              questions: uiQuestions.length ? uiQuestions : [emptyQuizQuestion()],
              _chapterId: ch.id,
              _assessmentId: assessment.id,
              // Unused fields for this lesson type
              title: "",
              pdfFile: null,
            };
          } else {
            return {
              id: crypto.randomUUID(),
              type: "text",
              title: ch?.title || "",
              content: ch?.content || "",
              _chapterId: ch.id,
              // Unused fields for this lesson type
              pdfFile: null,
              quizTitle: "",
              quizDurationMinutes: "",
              questions: [emptyQuizQuestion()],
              _assessmentId: null,
            };
          }
        });

        setLessons(builtLessons.length ? builtLessons : [/* default empty lesson */]);

      } catch (err) {
        console.error(err);
        toast.error(err?.response?.data?.message || "Failed to load course.");
        navigate(-1);
      } finally {
        setInitialLoading(false);
      }
    };

    loadCourseData();
  }, [courseId, token, navigate, reset]);

  /* ------------------------------ validation & submit ------------------------------ */
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
        if (!String(l.quizDurationMinutes).trim() || Number(l.quizDurationMinutes) <= 0) {
          toast.error(`Chapter ${i + 1}: quiz duration (minutes) is required`);
          return false;
        }
        for (const [j, q] of (l.questions || []).entries()) {
          if (!q.text?.trim()) {
            toast.error(`Question ${j + 1} in Chapter ${i + 1}: text is required`);
            return false;
          }
          if (q.type === "single" || q.type === "multiple") {
            const filled = (q.options || []).filter((o) => o.text?.trim());
            if (filled.length < 2) {
              toast.error(`Question ${j + 1} in Chapter ${i + 1}: at least 2 options`);
              return false;
            }
            const correct = filled.filter((o) => o.correct).length;
            if (q.type === "single" && correct !== 1) {
              toast.error(`Question ${j + 1} in Chapter ${i + 1}: exactly 1 correct option`);
              return false;
            }
            if (q.type === "multiple" && correct < 1) {
              toast.error(`Question ${j + 1} in Chapter ${i + 1}: mark at least 1 correct`);
              return false;
            }
          }
          if (q.type === "numerical" && !q.correctText?.trim()) {
            toast.error(`Question ${j + 1} in Chapter ${i + 1}: correct answer is required`);
            return false;
          }
          if (q.type === "match") {
            const validPairs = (q.pairs || []).filter((p) => p.left?.trim() && p.right?.trim());
            if (validPairs.length < 1) {
              toast.error(`Question ${j + 1} in Chapter ${i + 1}: add at least one valid pair`);
              return false;
            }
          }
        }
      }
    }
    return true;
  };

  const onSubmit = async (data) => {
    if (!validateBeforeSubmit()) return;

    setIsLoading(true);
    try {
      if (token) api.defaults.headers.common.Authorization = `Bearer ${token}`;

      // thumbnail (like Create UX)
      let thumbnailUrl = courseImage || null;
      if (base64DataUrl) {
        try {
          const up = await uploadsAPI.uploadBase64(base64DataUrl);
          if (up?.url) thumbnailUrl = up.url;
          else if (typeof up === "string") thumbnailUrl = up;
        } catch (e) {
          console.warn("Thumbnail upload failed, keeping old:", e);
        }
      }

      // update course itself
      await coursesAPI.update(courseId, {
        title: data.title,
        thumbnail: thumbnailUrl,
        category: data.category,
        description: data.description,
        status: "published",
      });


      for (const chapterId of chaptersToDelete) {
        try {
          await chaptersAPI.remove(chapterId);
        } catch (err) {
          // Log a warning but don't stop the whole process
          console.warn(`Failed to delete chapter ${chapterId}:`, err);
        }
      }

      for (const [index, l] of lessons.entries()) {
        const order = index + 1;

        if (l.type === "text") {
          // (optional) upload PDF if selected
          let attachments = [];
          if (l.pdfFile) {
            const pdfUrl = await uploadsAPI.uploadFile(l.pdfFile);
            if (pdfUrl) attachments.push(pdfUrl);
          }

          const chapterPayload = {
            title: l.title,
            content: l.content,
            attachments,
            order,
            isPublished: true,
          };

          if (l._chapterId) {
            await chaptersAPI.update(l._chapterId, chapterPayload);

            if (l._assessmentId) {
              try {
                await assessmentsAPI.remove(l._assessmentId);
              } catch { }
            }
          } else {
            const chRes = await chaptersAPI.create(courseId, chapterPayload);
            l._chapterId = chRes?.data?.id ?? chRes?.id ?? chRes;
          }
        } else {
          // test
          const chapterPayload = {
            title: l.quizTitle?.trim() || `Quiz ${order}`,
            order,
            isPublished: true,
          };

          if (l._chapterId) {
            await chaptersAPI.update(l._chapterId, chapterPayload);
          } else {
            const chRes = await chaptersAPI.create(courseId, chapterPayload);
            l._chapterId = chRes?.data?.id ?? chRes?.id ?? chRes;
          }

          const minutes = Number(l.quizDurationMinutes || 0);
          const assessPayload = {
            title: l.quizTitle?.trim() || chapterPayload.title,
            type: "quiz",
            scope: "chapter",
            timeLimitSeconds: minutes > 0 ? minutes * 60 : null,
            maxAttempts: 1,
            isPublished: true,
            order: 1,
            questions: mapUIQuestionsToAPI(l.questions || []),
          };

          if (l._assessmentId) {
            await assessmentsAPI.update(l._assessmentId, assessPayload);
          } else {
            const aRes = await assessmentsAPI.createForChapter(l._chapterId, assessPayload);
            l._assessmentId = aRes?.data?.id ?? aRes?.id ?? aRes;
          }
        }
      }

      toast.success("Course updated successfully.");
      if (isSuperAdmin) navigate("/superadmin");
      else if (isAdminOnly) navigate("/admin");
      else if (roleNorm === "INSTRUCTOR") navigate("/instructor");
      else navigate("/");
    } catch (err) {
      console.error("EditCourse error:", err);
      toast.error(err?.response?.data?.message || "Failed to update the course.");
    } finally {
      setIsLoading(false);
    }
  };

  /* ------------------------------ preview (same as Create) ------------------------------ */
  const coursePreview = useMemo(
    () => ({
      title: watchedValues.title || "Course Title",
      description: watchedValues.description || "Course description will appear here...",
      instructor: user?.fullName || "You",
      lessons,
      image: courseImage || "https://via.placeholder.com/400x250?text=Course+Image",
    }),
    [watchedValues, lessons, courseImage, user?.fullName]
  );

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 rounded w-1/3" />
            <div className="h-10 bg-gray-200 rounded w-1/2" />
            <div className="h-64 bg-gray-200 rounded w-full" />
          </div>
        </div>
      </div>
    );
  }

  /* ------------------------------ UI cloned to match Create ------------------------------ */
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
              <h1 className="text-3xl font-bold text-gray-900">Edit Course</h1>
              <p className="text-gray-600">Update details, chapters and quizzes</p>
            </div>
          </div>

          <div className="flex space-x-4">
            <Button variant={!showPreview ? "default" : "outline"} onClick={() => setShowPreview(false)}>
              <BookOpen size={16} className="mr-2" />
              Edit Course
            </Button>
            <Button variant={showPreview ? "default" : "outline"} onClick={() => setShowPreview(true)}>
              <Eye size={16} className="mr-2" />
              Preview
            </Button>
          </div>
        </div>

        {!showPreview ? (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Basic Information</h2>

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
                <label className="block text-sm font-medium text-gray-700 mb-2">Course Description</label>
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
                  <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
                )}
              </div>

              {/* Thumbnail (same control as Create) */}
              <ImagePicker
                onFileAsBase64={(dataUrl) => {
                  setBase64DataUrl(dataUrl);
                  setCourseImage(dataUrl);
                }}
                // show current preview if exists
                initialPreview={courseImage || undefined}
              />
            </div>

            {/* Lessons List — same UI as Create */}
            {lessons.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="space-y-4">
                  {lessons.map((lesson, idx) => (
                    <div key={lesson.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {lesson.type === "text" && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Chapter Title</label>
                            <input
                              type="text"
                              value={lesson.title}
                              onChange={(e) => updateLesson(lesson.id, "title", e.target.value)}
                              required
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                              placeholder={`Chapter ${idx + 1}`}
                            />
                          </div>
                        )}

                        {lesson.type === "text" && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                            <select
                              value={lesson.type}
                              onChange={(e) => updateLesson(lesson.id, "type", e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            >
                              <option value="text">Text & PDF</option>
                              {/* You can re-enable this if you want to switch from Text to Quiz */}
                              {/* <option value="test">Quiz</option> */}
                            </select>
                          </div>
                        )}
                        <div className={lesson.type === 'test' ? "hidden md:block" : "hidden"} />
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


                      <div className="mt-4 space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Chapter Content</label>
                          <textarea
                            rows={3}
                            value={lesson.content}
                            onChange={(e) => updateLesson(lesson.id, "content", e.target.value)}
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
                            onChange={(e) => updateLesson(lesson.id, "pdfFile", e.target.files[0])}
                            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                          />
                          {lesson.pdfFile && (
                            <p className="mt-2 text-sm text-gray-600">Selected: {lesson.pdfFile.name}</p>
                          )}
                        </div>
                      </div>


                      {lesson.type === 'test' && (
                        <div className="mt-4 space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-2">
                              <label className="block text-sm font-medium text-gray-700 mb-1">Quiz Title</label>
                              <input
                                type="text"
                                value={lesson.quizTitle}
                                onChange={(e) => updateLesson(lesson.id, "quizTitle", e.target.value)}
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
                                onChange={(e) => updateLesson(lesson.id, "quizDurationMinutes", e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                placeholder="30"
                              />
                            </div>
                          </div>

                          <div className="space-y-4">
                            {lesson.questions.map((q, qIdx) => (
                              <div key={q.id} className="rounded-lg border border-gray-200 p-4">
                                <div className="flex items-center justify-between mb-3">
                                  <h4 className="font-medium text-gray-900">Question {qIdx + 1}</h4>
                                  <div className="flex gap-2">
                                    <Button type="button" variant="outline" onClick={() => addQuestion(lesson.id)}>
                                      <Plus size={14} />
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      onClick={() => removeQuestion(lesson.id, q.id)}
                                      disabled={lesson.questions.length === 1}
                                    >
                                      <Trash2 size={14} />
                                    </Button>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                                    <select
                                      value={q.type}
                                      onChange={(e) => updateQuestion(lesson.id, q.id, "type", e.target.value)}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                    >
                                      <option value="single">Single Correct Option</option>
                                      <option value="multiple">Multiple Correct Options</option>
                                      <option value="numerical">Numerical/Fill in the Blank</option>
                                      <option value="match">Match the Column</option>
                                      <option value="subjective">Subjective</option>
                                    </select>
                                  </div>

                                  <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Question</label>
                                    <input
                                      type="text"
                                      value={q.text}
                                      onChange={(e) => updateQuestion(lesson.id, q.id, "text", e.target.value)}
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
                                              updateOption(lesson.id, q.id, o.id, "correct", e.target.checked)
                                            }
                                          />
                                          <input
                                            type="text"
                                            value={o.text}
                                            onChange={(e) =>
                                              updateOption(lesson.id, q.id, o.id, "text", e.target.value)
                                            }
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                            placeholder="Option text"
                                          />
                                          <button
                                            type="button"
                                            className="text-red-500 hover:text-red-600"
                                            onClick={() => removeOption(lesson.id, q.id, o.id)}
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
                                        updateQuestion(lesson.id, q.id, "correctText", e.target.value)
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
                                          updateQuestion(lesson.id, q.id, "pairs", [
                                            ...(q.pairs || []),
                                            { id: crypto.randomUUID(), left: "", right: "" },
                                          ])
                                        }
                                      >
                                        <Plus size={14} className="mr-1" />
                                        Add Pair
                                      </Button>
                                    </div>

                                    {(q.pairs || []).map((p) => (
                                      <div key={p.id} className="grid grid-cols-[1fr_1fr_auto] gap-3 items-center">
                                        <input
                                          type="text"
                                          value={p.left}
                                          onChange={(e) =>
                                            updateQuestion(
                                              lesson.id,
                                              q.id,
                                              "pairs",
                                              (q.pairs || []).map((x) =>
                                                x.id === p.id ? { ...x, left: e.target.value } : x
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
                                                x.id === p.id ? { ...x, right: e.target.value } : x
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
                                              (q.pairs || []).filter((x) => x.id !== p.id)
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
                                        updateQuestion(lesson.id, q.id, "sampleAnswer", e.target.value)
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

            {/* Add Chapter & Add Quiz buttons — same as Create */}
            <div className="flex justify-center space-x-2 mt-6">
              <Button type="button" onClick={() => addLesson("text")} variant="outline">
                <Plus size={16} className="mr-2" />
                Add Chapter
              </Button>
              <Button type="button" onClick={() => addLesson("test")} variant="outline">
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
                Save Changes
              </Button>
            </div>
          </form>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="max-w-4xl mx-auto">
              <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden mb-6">
                <img src={coursePreview.image} alt={coursePreview.title} className="w-full h-full object-cover" />
              </div>

              <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{coursePreview.title}</h1>
                <p className="text-gray-600 text-lg mb-4">{coursePreview.description}</p>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Course Content</h2>
                <div className="space-y-3">
                  {coursePreview.lessons.map((l, i) => (
                    <div key={l.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-primary-600">{i + 1}</span>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">
                          {l.type === "test" ? l.quizTitle || `Quiz ${i + 1}` : l.title || `Chapter ${i + 1}`}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {l.type === "test"
                            ? `Quiz • ${(l.questions || []).length} questions${l.quizDurationMinutes ? ` • ${l.quizDurationMinutes} min` : ""
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
