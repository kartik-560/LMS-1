import { Clock, CheckCircle, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Button from "../components/ui/Button";
import { assessmentsAPI, authAPI } from "../services/api";

export default function ViewFinalTest() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const assessmentId = searchParams.get('assessmentId');

    const [assessment, setAssessment] = useState(null);
    const [answers, setAnswers] = useState({});
    const [timeRemaining, setTimeRemaining] = useState(0);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [result, setResult] = useState(null);
    const [showWarning, setShowWarning] = useState(false);
    const [userName, setUserName] = useState("Student");

    // ✅ Certificate generation states
    const [certificateStatus, setCertificateStatus] = useState("not_generated"); // "not_generated", "generating", "generated"
    const [certificateError, setCertificateError] = useState(null);

    useEffect(() => {
        if (!assessmentId) {
            setError("Assessment ID is missing from the URL");
            setLoading(false);
            return;
        }
        fetchAssessment();
        fetchUserData();
    }, [assessmentId]);

    useEffect(() => {
        if (timeRemaining <= 0 || isSubmitted) return;

        const timer = setInterval(() => {
            setTimeRemaining((prev) => {
                if (prev <= 1) {
                    handleSubmit();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [timeRemaining, isSubmitted]);

    const fetchAssessment = async () => {
        if (!assessmentId || assessmentId === 'null') {
            setError("Invalid assessment ID");
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            const data = await assessmentsAPI.get(assessmentId);

            if (data.alreadyAttempted) {
                setIsSubmitted(true);
                setResult(data.attemptResult);
                setAssessment(data);
                setLoading(false);
                return;
            }

            setAssessment(data);
            setTimeRemaining(data.timeLimitSeconds || 1800);
            setLoading(false);
        } catch (err) {
            setError(err.response?.data?.error || err.message || "Failed to fetch assessment");
            setLoading(false);
        }
    };

    const fetchUserData = async () => {
        try {
            const user = await authAPI.me();
            setUserName(user.fullName || user.name || user.username || "Student");
        } catch (err) {
            console.error("Failed to fetch user:", err);
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    };

    const handleAnswerChange = (questionId, answer) => {
        setAnswers((prev) => ({
            ...prev,
            [questionId]: answer,
        }));
    };

    const handleSingleChoice = (questionId, optionIndex) => {
        handleAnswerChange(questionId, optionIndex);
    };

    const handleMultipleChoice = (questionId, optionIndex) => {
        setAnswers((prev) => {
            const current = prev[questionId] || [];
            const isSelected = current.includes(optionIndex);

            return {
                ...prev,
                [questionId]: isSelected
                    ? current.filter((idx) => idx !== optionIndex)
                    : [...current, optionIndex],
            };
        });
    };

    const handleMatchPair = (questionId, pairIndex, value) => {
        setAnswers((prev) => {
            const currentPairs = prev[questionId] || {};
            return {
                ...prev,
                [questionId]: {
                    ...currentPairs,
                    [pairIndex]: value,
                },
            };
        });
    };

    const handleSubmit = async () => {
        if (!showWarning && !isSubmitted) {
            setShowWarning(true);
            return;
        }

        try {
            setIsSubmitted(true);
            const data = await assessmentsAPI.submitAttempt(assessmentId, answers);
            setResult({
                score: data.score,
                submittedAt: data.submittedAt,
                earnedPoints: data.earnedPoints,
                totalPoints: data.totalPoints,
                attemptNumber: data.attemptNumber,
                attemptsRemaining: data.attemptsRemaining,
                maxAttempts: data.maxAttempts,
                certificateGenerated: data.certificateGenerated,
            });

            // Check if certificate was already generated during submission
            if (data.certificateGenerated && data.score >= 70) {
                setCertificateStatus("generated");
            }
        } catch (err) {
            setError(err.response?.data?.error || err.message || "Failed to submit assessment");
            setIsSubmitted(false);
            setShowWarning(false);
        }
    };

    // ✅ Function to generate certificate
    const handleGenerateCertificate = async () => {
        try {
            setCertificateStatus("generating");
            setCertificateError(null);

            // Try to fetch the certificate (it should already exist from submission)
            const certificate = await assessmentsAPI.getCertificate(assessmentId);

            if (certificate) {
                setCertificateStatus("generated");
            } else {
                throw new Error("Certificate not found");
            }
        } catch (error) {
            console.error("Error generating certificate:", error);
            setCertificateStatus("not_generated");

            if (error.response?.status === 404) {
                setCertificateError("Certificate not found. It may not have been created. Please contact support.");
            } else {
                setCertificateError("Failed to generate certificate. Please try again.");
            }
        }
    };

    // ✅ Function to view certificate
    const handleViewCertificate = () => {
        navigate(`/certificate/${assessmentId}`);
    };

    const getAnsweredQuestionsCount = () => {
        return Object.keys(answers).length;
    };

    const isQuestionAnswered = (questionId) => {
        const answer = answers[questionId];
        if (Array.isArray(answer)) return answer.length > 0;
        if (typeof answer === "object" && answer !== null) {
            return Object.keys(answer).length > 0;
        }
        return answer !== undefined && answer !== null && answer !== "";
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading assessment...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center max-w-md p-6 bg-red-50 rounded-lg">
                    <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Error</h2>
                    <p className="text-red-600 mb-4">{error}</p>
                    <Button onClick={() => navigate(-1)}>Go Back</Button>
                </div>
            </div>
        );
    }

    if (!assessment) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p className="text-gray-600">Assessment not found</p>
            </div>
        );
    }

    const currentQuestion = assessment.questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / assessment.questions.length) * 100;
    const answeredCount = getAnsweredQuestionsCount();

    // ✅ Success screen with two-step certificate flow
    if (isSubmitted && result) {
        return (
            <div className="max-w-4xl mx-auto p-6">
                <div className="bg-white rounded-lg shadow-lg p-8 text-center">
                    <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
                    <h2 className="text-3xl font-bold text-gray-900 mb-3">
                        Assessment Submitted Successfully!
                    </h2>
                    <p className="text-gray-600 mb-8">
                        Congratulations! You have completed the final test.
                    </p>

                    <div className="max-w-md mx-auto bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 mb-8">
                        <div className="space-y-4">
                            <div className="flex justify-between items-center pb-3 border-b">
                                <span className="text-gray-700 font-medium">Total Questions:</span>
                                <span className="text-2xl font-bold text-gray-900">
                                    {assessment.questions.length}
                                </span>
                            </div>
                            <div className="flex justify-between items-center pb-3 border-b">
                                <span className="text-gray-700 font-medium">Your Score:</span>
                                <span className="text-3xl font-bold text-green-600">{result.score}%</span>
                            </div>
                            {result.totalPoints && (
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-700 font-medium">Points Earned:</span>
                                    <span className="text-xl font-bold text-indigo-600">
                                        {result.earnedPoints} / {result.totalPoints}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ✅ Two-Step Certificate Flow */}
                    {result.score >= 70 && (
                        <div className="mb-6">
                            <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4 mb-4">
                                <p className="text-yellow-800 font-medium">
                                    🎉 Congratulations! You've earned a certificate!
                                </p>
                            </div>

                            {/* Step 1: Generate Certificate Button */}
                            {certificateStatus === "not_generated" && (
                                <Button
                                    variant="primary"
                                    onClick={handleGenerateCertificate}
                                    className="bg-blue-600 hover:bg-blue-700 min-w-[250px]"
                                >
                                    🎓 Get Certificate
                                </Button>
                            )}

                            {/* Step 2: Generating State */}
                            {certificateStatus === "generating" && (
                                <div className="flex items-center justify-center gap-3 p-4 bg-blue-50 rounded-lg">
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                                    <span className="text-blue-700 font-medium">Generating your certificate...</span>
                                </div>
                            )}

                            {/* Step 3: View Certificate Button */}
                            {certificateStatus === "generated" && (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-center gap-2 p-3 bg-green-50 rounded-lg">
                                        <CheckCircle className="w-5 h-5 text-green-600" />
                                        <span className="text-green-700 font-medium">Certificate generated successfully!</span>
                                    </div>
                                    <Button
                                        variant="primary"
                                        onClick={handleViewCertificate}
                                        className="bg-green-600 hover:bg-green-700 min-w-[250px]"
                                    >
                                        📜 View & Download Certificate
                                    </Button>
                                </div>
                            )}

                            {/* Error Message */}
                            {certificateError && (
                                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                                    <p className="text-red-700 text-sm">{certificateError}</p>
                                    <Button
                                        variant="outline"
                                        onClick={handleGenerateCertificate}
                                        className="mt-3"
                                        size="sm"
                                    >
                                        Try Again
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex gap-4 justify-center mt-6">
                        <Button
                            variant="outline"
                            onClick={() => navigate(
                                assessment.scope === "course"
                                    ? `/courses/${assessment.courseId}`
                                    : `/chapters/${assessment.chapterId}`
                            )}
                        >
                            Back to {assessment.scope === "course" ? "Course" : "Chapter"}
                        </Button>
                        <Button
                            variant="primary"
                            onClick={() => navigate("/dashboard")}
                        >
                            Go to Dashboard
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto p-6">
            <div className="bg-white rounded-lg shadow-lg">
                <div className="border-b p-6">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                            <h1 className="text-2xl font-bold text-gray-900 mb-2">
                                {assessment.title}
                            </h1>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                                <span>Question {currentQuestionIndex + 1} of {assessment.questions.length}</span>
                                <span>•</span>
                                <span>{answeredCount} answered</span>
                            </div>
                        </div>
                        <div
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-lg font-bold ${timeRemaining < 60
                                    ? "bg-red-100 text-red-700 animate-pulse"
                                    : timeRemaining < 300
                                        ? "bg-orange-100 text-orange-700"
                                        : "bg-blue-100 text-blue-700"
                                }`}
                        >
                            <Clock size={20} />
                            {formatTime(timeRemaining)}
                        </div>
                    </div>

                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>

                <div className="p-8">
                    <div className="mb-6">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="inline-flex items-center px-3 py-1 bg-purple-100 text-purple-800 text-sm font-medium rounded-full">
                                {currentQuestion.type === "single" && "Single Choice"}
                                {currentQuestion.type === "multiple" && "Multiple Choice"}
                                {currentQuestion.type === "numerical" && "Numerical Answer"}
                                {currentQuestion.type === "match" && "Match the Column"}
                                {currentQuestion.type === "subjective" && "Subjective"}
                            </span>
                            <span className="text-sm text-gray-600">
                                {currentQuestion.points || 1} {currentQuestion.points === 1 ? "point" : "points"}
                            </span>
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900">
                            {currentQuestion.prompt}
                        </h3>
                    </div>

                    <div className="space-y-3">
                        {currentQuestion.type === "single" && (
                            <>
                                {currentQuestion.options.map((option, idx) => (
                                    <label
                                        key={idx}
                                        className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all ${answers[currentQuestion.id] === idx
                                                ? "border-blue-500 bg-blue-50"
                                                : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                                            }`}
                                    >
                                        <input
                                            type="radio"
                                            name={`question-${currentQuestion.id}`}
                                            value={idx}
                                            checked={answers[currentQuestion.id] === idx}
                                            onChange={() => handleSingleChoice(currentQuestion.id, idx)}
                                            className="w-5 h-5 text-blue-600 mt-0.5"
                                        />
                                        <span className="ml-3 text-gray-900 flex-1">
                                            <span className="font-medium mr-2">
                                                {String.fromCharCode(65 + idx)}.
                                            </span>
                                            {option}
                                        </span>
                                    </label>
                                ))}
                            </>
                        )}

                        {currentQuestion.type === "multiple" && (
                            <>
                                {currentQuestion.options.map((option, idx) => (
                                    <label
                                        key={idx}
                                        className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all ${(answers[currentQuestion.id] || []).includes(idx)
                                                ? "border-blue-500 bg-blue-50"
                                                : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                                            }`}
                                    >
                                        <input
                                            type="checkbox"
                                            value={idx}
                                            checked={(answers[currentQuestion.id] || []).includes(idx)}
                                            onChange={() => handleMultipleChoice(currentQuestion.id, idx)}
                                            className="w-5 h-5 text-blue-600 rounded mt-0.5"
                                        />
                                        <span className="ml-3 text-gray-900 flex-1">
                                            <span className="font-medium mr-2">
                                                {String.fromCharCode(65 + idx)}.
                                            </span>
                                            {option}
                                        </span>
                                    </label>
                                ))}
                            </>
                        )}

                        {currentQuestion.type === "numerical" && (
                            <input
                                type="text"
                                value={answers[currentQuestion.id] || ""}
                                onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-lg"
                                placeholder="Enter your answer"
                            />
                        )}

                        {currentQuestion.type === "match" && (
                            <div className="space-y-3">
                                {currentQuestion.pairs && JSON.parse(currentQuestion.pairs).map((pair, idx) => (
                                    <div
                                        key={idx}
                                        className="grid grid-cols-2 gap-4 p-4 border-2 border-gray-200 rounded-lg"
                                    >
                                        <div className="flex items-center font-medium text-gray-700">
                                            <span className="mr-2 text-blue-600">{idx + 1}.</span>
                                            {pair.left}
                                        </div>
                                        <input
                                            type="text"
                                            value={answers[currentQuestion.id]?.[idx] || ""}
                                            onChange={(e) =>
                                                handleMatchPair(currentQuestion.id, idx, e.target.value)
                                            }
                                            className="px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                                            placeholder="Enter match"
                                        />
                                    </div>
                                ))}
                            </div>
                        )}

                        {currentQuestion.type === "subjective" && (
                            <textarea
                                rows={8}
                                value={answers[currentQuestion.id] || ""}
                                onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none resize-none"
                                placeholder="Write your answer here..."
                            />
                        )}
                    </div>
                </div>

                <div className="border-t p-6">
                    <div className="flex justify-between items-center mb-6">
                        <Button
                            variant="outline"
                            onClick={() => setCurrentQuestionIndex((prev) => prev - 1)}
                            disabled={currentQuestionIndex === 0}
                        >
                            <ChevronLeft size={18} className="mr-1" />
                            Previous
                        </Button>

                        {currentQuestionIndex < assessment.questions.length - 1 ? (
                            <Button
                                variant="primary"
                                onClick={() => setCurrentQuestionIndex((prev) => prev + 1)}
                            >
                                Next
                                <ChevronRight size={18} className="ml-1" />
                            </Button>
                        ) : (
                            <Button
                                variant="primary"
                                onClick={handleSubmit}
                                className="bg-green-600 hover:bg-green-700"
                            >
                                Submit Assessment
                            </Button>
                        )}
                    </div>

                    <div className="border-t pt-6">
                        <p className="text-sm font-medium text-gray-700 mb-3">
                            Question Navigator:
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {assessment.questions.map((q, idx) => (
                                <button
                                    key={q.id}
                                    onClick={() => setCurrentQuestionIndex(idx)}
                                    className={`w-10 h-10 rounded-lg font-medium text-sm transition-all ${idx === currentQuestionIndex
                                            ? "bg-blue-600 text-white ring-2 ring-blue-300"
                                            : isQuestionAnswered(q.id)
                                                ? "bg-green-100 text-green-800 border-2 border-green-500"
                                                : "bg-white text-gray-700 border-2 border-gray-300 hover:border-blue-300"
                                        }`}
                                    title={isQuestionAnswered(q.id) ? "Answered" : "Not answered"}
                                >
                                    {idx + 1}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {showWarning && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-md p-6">
                        <h3 className="text-xl font-bold text-gray-900 mb-3">
                            Submit Assessment?
                        </h3>
                        <p className="text-gray-600 mb-2">
                            You have answered {answeredCount} out of {assessment.questions.length} questions.
                        </p>
                        <p className="text-gray-600 mb-6">
                            Are you sure you want to submit? This action cannot be undone.
                        </p>
                        <div className="flex gap-3 justify-end">
                            <Button variant="outline" onClick={() => setShowWarning(false)}>
                                Cancel
                            </Button>
                            <Button variant="primary" onClick={handleSubmit}>
                                Confirm Submit
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
