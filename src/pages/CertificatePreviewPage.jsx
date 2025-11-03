import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { assessmentsAPI } from '../services/api';
import useAuthStore from "../store/useAuthStore";
import CertificateDownloader from '../components/CertificateDownloader';
import Certificate from '../components/Certificate';

const CertificateSkeleton = () => (
    <div className="animate-pulse">
        <h1 className="h-10 bg-gray-300 rounded-md w-3/4 mx-auto mb-8"></h1>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12">
            <div className="lg:col-span-2 bg-white p-8 rounded-2xl shadow-xl">
                <div className="h-48 bg-gray-300 rounded-lg mb-5"></div>
                <div className="h-7 bg-gray-300 rounded-md w-full mb-3"></div>
                <div className="h-5 bg-gray-300 rounded-md w-5/6 mb-2"></div>
            </div>
            <div className="lg:col-span-3 bg-white p-8 rounded-2xl shadow-xl">
                <div className="h-7 bg-gray-300 rounded-md w-1/2 mb-5"></div>
                <div className="h-64 bg-gray-300 rounded-lg mb-6"></div>
                <div className="h-12 bg-gray-300 rounded-md w-full"></div>
            </div>
        </div>
    </div>
);

const CertificatePreviewPage = () => {
    const { assessmentId } = useParams();
    const { user } = useAuthStore();
    const [displayData, setDisplayData] = useState(null);
    const [courseData, setCourseData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!assessmentId) {
            setError("No assessment ID provided.");
            setIsLoading(false);
            return;
        }

        const fetchCertificateData = async () => {
            try {
                setIsLoading(true);
                setError(null);

                const certificateData = await assessmentsAPI.getCertificate(assessmentId);

                if (!certificateData) {
                    setError("Certificate not found. You may need to pass the assessment first.");
                    setIsLoading(false);
                    return;
                }

                setDisplayData({
                    studentName: certificateData.studentName,
                    courseName: certificateData.courseName,
                    completionDate: new Date(certificateData.completionDate).toLocaleDateString(),
                    score: certificateData.score,
                    // certificateId: certificateData.certificateId,
                });

                setCourseData({
                    title: certificateData.course?.title || certificateData.courseName,
                    description: certificateData.course?.description || "No description available.",
                    thumbnail: certificateData.course?.thumbnail || null,
                });

            } catch (err) {
                console.error("Failed to fetch certificate data:", err);
                setError(err.response?.data?.error || "Failed to load certificate. You may not have earned a certificate yet.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchCertificateData();
    }, [assessmentId]);

    return (
        <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">

                {isLoading && <CertificateSkeleton />}

                {!isLoading && error && (
                    <div className="text-center p-10 bg-white rounded-lg shadow-xl">
                        <h2 className="text-2xl font-semibold text-red-600 mb-4">
                            Oops! Something went wrong.
                        </h2>
                        <p className="text-gray-700 mb-6">{error}</p>
                        <Link
                            to="/dashboard"
                            className="px-6 py-2 text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
                        >
                            Go to Dashboard
                        </Link>
                    </div>
                )}

                {!isLoading && !error && displayData && courseData && (
                    <>
                        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-8 text-center">
                            Certificate of Completion
                        </h1>
                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12">

                            <div className="lg:col-span-2 bg-white p-6 sm:p-8 rounded-2xl shadow-xl border border-gray-100 flex flex-col">
                                {/* Course Thumbnail */}
                                <div className="mb-5">
                                    {courseData.thumbnail ? (
                                        <img
                                            src={courseData.thumbnail}
                                            alt={courseData.title}
                                            className="w-full h-48 object-cover rounded-lg shadow-md"
                                            onError={(e) => {
                                                e.target.onerror = null;
                                                e.target.src = 'https://via.placeholder.com/400x300?text=Course+Image';
                                            }}
                                        />
                                    ) : (
                                        <div className="w-full h-48 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-md flex items-center justify-center">
                                            <span className="text-white text-6xl">🏆</span>
                                        </div>
                                    )}
                                </div>

                                <h2 className="text-2xl font-semibold text-gray-800 mb-3">
                                    {courseData.title}
                                </h2>

                                {courseData.description && (
                                    <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                                        {courseData.description}
                                    </p>
                                )}

                                <div className="border-t border-gray-200 my-4"></div>

                                <div className="space-y-2">
                                    <p className="text-base text-gray-600">
                                        <strong>Student:</strong> {displayData.studentName}
                                    </p>
                                    <p className="text-base text-gray-600">
                                        <strong>Completion Date:</strong> {displayData.completionDate}
                                    </p>
                                    <p className="text-base text-gray-600">
                                        <strong>Score:</strong> {displayData.score}%
                                    </p>
                                    {/* <p className="text-xs text-gray-500 mt-3">
                                        <strong>Certificate ID:</strong> {displayData.certificateId}
                                    </p> */}
                                </div>
                            </div>

                            <div className="lg:col-span-3 bg-white p-6 sm:p-8 rounded-2xl shadow-xl border border-gray-100">
                                <h3 className="text-xl font-semibold text-gray-800 mb-5">
                                    Download Your Certificate
                                </h3>

                                <CertificateDownloader
                                    studentName={displayData.studentName}
                                    courseName={displayData.courseName}
                                    completionDate={displayData.completionDate}
                                    score={displayData.score}
                                />

                                <h4 className="text-lg font-semibold text-gray-700 mt-8 mb-4 border-t pt-6">
                                    Preview
                                </h4>

                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50 flex justify-center items-center">
                                    <div
                                        className="transform scale-[0.5] origin-top"
                                        style={{ width: "1123px", height: "784px" }}
                                    >
                                        <Certificate
                                            studentName={displayData.studentName}
                                            courseName={displayData.courseName}
                                            completionDate={displayData.completionDate}
                                            score={displayData.score}
                                        />
                                    </div>
                                </div>



                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default CertificatePreviewPage;
