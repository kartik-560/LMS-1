// import React, { useState, useEffect } from 'react';
// import { useParams, Link } from 'react-router-dom';
// import { assessmentsAPI } from '../services/api';
// import useAuthStore from "../store/useAuthStore";
// import CertificateDownloader from '../components/CertificateDownloader';
// import Certificate from '../components/Certificate';

// const CertificateSkeleton = () => (
//     <div className="animate-pulse">
//         <h1 className="h-10 bg-gray-300 rounded-md w-3/4 mx-auto mb-8"></h1>
//         <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12">
//             <div className="lg:col-span-2 bg-white p-8 rounded-2xl shadow-xl">
//                 <div className="h-48 bg-gray-300 rounded-lg mb-5"></div>
//                 <div className="h-7 bg-gray-300 rounded-md w-full mb-3"></div>
//                 <div className="h-5 bg-gray-300 rounded-md w-5/6 mb-2"></div>
//             </div>
//             <div className="lg:col-span-3 bg-white p-8 rounded-2xl shadow-xl">
//                 <div className="h-7 bg-gray-300 rounded-md w-1/2 mb-5"></div>
//                 <div className="h-64 bg-gray-300 rounded-lg mb-6"></div>
//                 <div className="h-12 bg-gray-300 rounded-md w-full"></div>
//             </div>
//         </div>
//     </div>
// );

// const CertificatePreviewPage = () => {
//     const { assessmentId } = useParams();
//     const { user } = useAuthStore();
//     const [displayData, setDisplayData] = useState(null);
//     const [courseData, setCourseData] = useState(null);
//     const [isLoading, setIsLoading] = useState(true);
//     const [error, setError] = useState(null);

//     useEffect(() => {
//         if (!assessmentId) {
//             setError("No assessment ID provided.");
//             setIsLoading(false);
//             return;
//         }

//         const fetchCertificateData = async () => {
//             try {
//                 setIsLoading(true);
//                 setError(null);

//                 const certificateData = await assessmentsAPI.getCertificate(assessmentId);

//                 if (!certificateData) {
//                     setError("Certificate not found. You may need to pass the assessment first.");
//                     setIsLoading(false);
//                     return;
//                 }

//                 setDisplayData({
//                     studentName: certificateData.studentName,
//                     courseName: certificateData.courseName,
//                     completionDate: new Date(certificateData.completionDate).toLocaleDateString(),
//                     score: certificateData.score,
//                     // certificateId: certificateData.certificateId,
//                 });

//                 setCourseData({
//                     title: certificateData.course?.title || certificateData.courseName,
//                     description: certificateData.course?.description || "No description available.",
//                     thumbnail: certificateData.course?.thumbnail || null,
//                 });

//             } catch (err) {
//                 console.error("Failed to fetch certificate data:", err);
//                 setError(err.response?.data?.error || "Failed to load certificate. You may not have earned a certificate yet.");
//             } finally {
//                 setIsLoading(false);
//             }
//         };

//         fetchCertificateData();
//     }, [assessmentId]);

//     return (
//         <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
//             <div className="max-w-7xl mx-auto">

//                 {isLoading && <CertificateSkeleton />}

//                 {!isLoading && error && (
//                     <div className="text-center p-10 bg-white rounded-lg shadow-xl">
//                         <h2 className="text-2xl font-semibold text-red-600 mb-4">
//                             Oops! Something went wrong.
//                         </h2>
//                         <p className="text-gray-700 mb-6">{error}</p>
//                         <Link
//                             to="/dashboard"
//                             className="px-6 py-2 text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
//                         >
//                             Go to Dashboard
//                         </Link>
//                     </div>
//                 )}

//                 {!isLoading && !error && displayData && courseData && (
//                     <>
//                         <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-8 text-center">
//                             Certificate of Completion
//                         </h1>
//                         <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12">

//                             <div className="lg:col-span-2 bg-white p-6 sm:p-8 rounded-2xl shadow-xl border border-gray-100 flex flex-col">
//                                 {/* Course Thumbnail */}
//                                 <div className="mb-5">
//                                     {courseData.thumbnail ? (
//                                         <img
//                                             src={courseData.thumbnail}
//                                             alt={courseData.title}
//                                             className="w-full h-48 object-cover rounded-lg shadow-md"
//                                             onError={(e) => {
//                                                 e.target.onerror = null;
//                                                 e.target.src = 'https://via.placeholder.com/400x300?text=Course+Image';
//                                             }}
//                                         />
//                                     ) : (
//                                         <div className="w-full h-48 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-md flex items-center justify-center">
//                                             <span className="text-white text-6xl">🏆</span>
//                                         </div>
//                                     )}
//                                 </div>

//                                 <h2 className="text-2xl font-semibold text-gray-800 mb-3">
//                                     {courseData.title}
//                                 </h2>

//                                 {courseData.description && (
//                                     <p className="text-sm text-gray-600 mb-4 line-clamp-3">
//                                         {courseData.description}
//                                     </p>
//                                 )}

//                                 <div className="border-t border-gray-200 my-4"></div>

//                                 <div className="space-y-2">
//                                     <p className="text-base text-gray-600">
//                                         <strong>Student:</strong> {displayData.studentName}
//                                     </p>
//                                     <p className="text-base text-gray-600">
//                                         <strong>Completion Date:</strong> {displayData.completionDate}
//                                     </p>
//                                     <p className="text-base text-gray-600">
//                                         <strong>Score:</strong> {displayData.score}%
//                                     </p>
//                                     {/* <p className="text-xs text-gray-500 mt-3">
//                                         <strong>Certificate ID:</strong> {displayData.certificateId}
//                                     </p> */}
//                                 </div>
//                             </div>

//                             <div className="lg:col-span-3 bg-white p-6 sm:p-8 rounded-2xl shadow-xl border border-gray-100">
//                                 <h3 className="text-xl font-semibold text-gray-800 mb-5">
//                                     Download Your Certificate
//                                 </h3>

//                                 <CertificateDownloader
//                                     studentName={displayData.studentName}
//                                     courseName={displayData.courseName}
//                                     completionDate={displayData.completionDate}
//                                     score={displayData.score}
//                                 />

//                                 <h4 className="text-lg font-semibold text-gray-700 mt-8 mb-4 border-t pt-6">
//                                     Preview
//                                 </h4>

//                                 <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50 flex justify-center items-center">
//                                     <div
//                                         className="transform scale-[0.5] origin-top"
//                                         style={{ width: "1123px", height: "784px" }}
//                                     >
//                                         <Certificate
//                                             studentName={displayData.studentName}
//                                             courseName={displayData.courseName}
//                                             completionDate={displayData.completionDate}
//                                             score={displayData.score}
//                                         />
//                                     </div>
//                                 </div>



//                             </div>
//                         </div>
//                     </>
//                 )}
//             </div>
//         </div>
//     );
// };

// export default CertificatePreviewPage;


import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { assessmentsAPI } from '../services/api';
import useAuthStore from "../store/useAuthStore";
import CertificateDownloader from '../components/CertificateDownloader';
import Certificate from '../components/Certificate';


const CertificateSkeleton = () => (
    <div className="animate-pulse">
        <h1 className="h-8 sm:h-10 bg-gray-300 rounded-md w-11/12 sm:w-3/4 mx-auto mb-6 sm:mb-8"></h1>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 sm:gap-8 lg:gap-12">
            <div className="lg:col-span-2 bg-white p-6 sm:p-8 rounded-2xl shadow-xl">
                <div className="h-40 sm:h-48 bg-gray-300 rounded-lg mb-4 sm:mb-5"></div>
                <div className="h-6 sm:h-7 bg-gray-300 rounded-md w-full mb-3"></div>
                <div className="h-4 sm:h-5 bg-gray-300 rounded-md w-5/6 mb-2"></div>
            </div>
            <div className="lg:col-span-3 bg-white p-6 sm:p-8 rounded-2xl shadow-xl">
                <div className="h-6 sm:h-7 bg-gray-300 rounded-md w-3/4 sm:w-1/2 mb-4 sm:mb-5"></div>
                <div className="h-48 sm:h-64 bg-gray-300 rounded-lg mb-6"></div>
                <div className="h-10 sm:h-12 bg-gray-300 rounded-md w-full"></div>
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
        // <div className="min-h-screen bg-gray-50 py-6 sm:py-10 px-4 sm:px-6 lg:px-8">
        //     <div className="max-w-7xl mx-auto">


        //         {isLoading && <CertificateSkeleton />}


        //         {!isLoading && error && (
        //             <div className="text-center p-6 sm:p-10 bg-white rounded-lg shadow-xl">
        //                 <h2 className="text-xl sm:text-2xl font-semibold text-red-600 mb-3 sm:mb-4">
        //                     Oops! Something went wrong.
        //                 </h2>
        //                 <p className="text-sm sm:text-base text-gray-700 mb-4 sm:mb-6">{error}</p>
        //                 <Link
        //                     to="/dashboard"
        //                     className="inline-block px-5 sm:px-6 py-2 text-sm sm:text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
        //                 >
        //                     Go to Dashboard
        //                 </Link>
        //             </div>
        //         )}


        //         {!isLoading && !error && displayData && courseData && (
        //             <>
        //                 <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-6 sm:mb-8 text-center px-2">
        //                     Certificate of Completion
        //                 </h1>
        //                 <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 sm:gap-8 lg:gap-12">


        //                     <div className="lg:col-span-2 bg-white p-4 sm:p-6 lg:p-8 rounded-xl sm:rounded-2xl shadow-xl border border-gray-100 flex flex-col">
        //                         {/* Course Thumbnail */}
        //                         <div className="mb-4 sm:mb-5">
        //                             {courseData.thumbnail ? (
        //                                 <img
        //                                     src={courseData.thumbnail}
        //                                     alt={courseData.title}
        //                                     className="w-full h-40 sm:h-48 object-cover rounded-lg shadow-md"
        //                                     onError={(e) => {
        //                                         e.target.onerror = null;
        //                                         e.target.src = 'https://via.placeholder.com/400x300?text=Course+Image';
        //                                     }}
        //                                 />
        //                             ) : (
        //                                 <div className="w-full h-40 sm:h-48 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-md flex items-center justify-center">
        //                                     <span className="text-white text-5xl sm:text-6xl">🏆</span>
        //                                 </div>
        //                             )}
        //                         </div>


        //                         <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-2 sm:mb-3">
        //                             {courseData.title}
        //                         </h2>


        //                         {courseData.description && (
        //                             <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4 line-clamp-3">
        //                                 {courseData.description}
        //                             </p>
        //                         )}


        //                         <div className="border-t border-gray-200 my-3 sm:my-4"></div>


        //                         <div className="space-y-1.5 sm:space-y-2">
        //                             <p className="text-sm sm:text-base text-gray-600">
        //                                 <strong>Student:</strong> {displayData.studentName}
        //                             </p>
        //                             <p className="text-sm sm:text-base text-gray-600">
        //                                 <strong>Completion Date:</strong> {displayData.completionDate}
        //                             </p>
        //                             <p className="text-sm sm:text-base text-gray-600">
        //                                 <strong>Score:</strong> {displayData.score}%
        //                             </p>
        //                         </div>
        //                     </div>


        //                     <div className="lg:col-span-3 bg-white p-4 sm:p-6 lg:p-8 rounded-xl sm:rounded-2xl shadow-xl border border-gray-100">
        //                         <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4 sm:mb-5">
        //                             Download Your Certificate
        //                         </h3>


        //                         <CertificateDownloader
        //                             studentName={displayData.studentName}
        //                             courseName={displayData.courseName}
        //                             completionDate={displayData.completionDate}
        //                             score={displayData.score}
        //                         />


        //                         <h4 className="text-base sm:text-lg font-semibold text-gray-700 mt-6 sm:mt-8 mb-3 sm:mb-4 border-t pt-4 sm:pt-6">
        //                             Preview
        //                         </h4>

        //                         <div className="border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
        //                             {/* Center content and add a bit of vertical padding */}
        //                             <div className="flex items-center justify-center py-4">
        //                                 <div
        //                                     className="transform"
        //                                     style={{
        //                                         width: 1123,
        //                                         height: 784,
        //                                         // responsive scale: mobile, sm, lg
        //                                         transform: `
        //   scale(${window.innerWidth < 640 ? 0.25 : window.innerWidth < 1024 ? 0.4 : 0.55})
        // `,
        //                                         transformOrigin: 'top center'
        //                                     }}
        //                                 >
        //                                     <Certificate
        //                                         studentName={displayData.studentName}
        //                                         courseName={displayData.courseName}
        //                                     />
        //                                 </div>
        //                             </div>
        //                         </div>



        //                     </div>
        //                 </div>
        //             </>
        //         )}
        //     </div>
        // </div>

        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto">

                {isLoading && <CertificateSkeleton />}

                {!isLoading && error && (
                    <div className="text-center p-8 bg-white rounded-2xl shadow-xl border border-gray-100">
                        <h2 className="text-2xl font-semibold text-red-600 mb-3">
                            Oops! Something went wrong.
                        </h2>
                        <p className="text-sm sm:text-base text-gray-700 mb-6">{error}</p>
                        <Link
                            to="/dashboard"
                            className="inline-block px-6 py-2 text-sm sm:text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
                        >
                            Go to Dashboard
                        </Link>
                    </div>
                )}

                {!isLoading && !error && displayData && courseData && (
                    <div className="space-y-10">
                        {/* Page title */}
                        <div className="text-center">
                            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">
                                Certificate of Completion
                            </h1>
                            <p className="mt-2 text-gray-600">
                                Review your course details, download, and preview your certificate.
                            </p>
                        </div>

                        {/* 1. Course details block */}
                        <section className="bg-white rounded-2xl shadow-xl border border-gray-100 p-4 sm:p-6 space-y-4">
                            <div className="flex flex-col md:flex-row md:items-start gap-4 md:gap-6">

                                {/* Thumbnail */}
                                <div className="w-full md:w-1/3">
                                    {courseData.thumbnail ? (
                                        <img
                                            src={courseData.thumbnail}
                                            alt={courseData.title}
                                            className="w-full h-40 sm:h-48 object-cover rounded-xl shadow-md"
                                            onError={(e) => {
                                                e.target.onerror = null;
                                                e.target.src =
                                                    'https://via.placeholder.com/400x300?text=Course+Image';
                                            }}
                                        />
                                    ) : (
                                        <div className="w-full h-40 sm:h-48 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-md flex items-center justify-center">
                                            <span className="text-white text-5xl">🏆</span>
                                        </div>
                                    )}
                                </div>

                                {/* Text content */}
                                <div className="flex-1 space-y-3">
                                    <h2 className="text-lg sm:text-xl font-semibold text-gray-900 break-words">
                                        {courseData.title}
                                    </h2>

                                    {courseData.description && (
                                        <p className="text-sm sm:text-base text-gray-600 line-clamp-3">
                                            {courseData.description}
                                        </p>
                                    )}

                                    <div className="border-t border-gray-200 pt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm sm:text-base">
                                        <p className="text-gray-700 break-words">
                                            <span className="font-semibold">Student:</span> {displayData.studentName}
                                        </p>
                                        <p className="text-gray-700">
                                            <span className="font-semibold">Completion Date:</span>{' '}
                                            {displayData.completionDate}
                                        </p>
                                        <p className="text-gray-700">
                                            <span className="font-semibold">Score:</span> {displayData.score}%
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </section>


                        {/* 2. Download section */}
                        <section className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-8 space-y-4">
                            <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
                                Download your certificate
                            </h3>
                            <p className="text-sm sm:text-base text-gray-600">
                                Generate a high‑quality PDF copy of your certificate.
                            </p>

                            <div className="mt-4">
                                <CertificateDownloader
                                    studentName={displayData.studentName}
                                    courseName={displayData.courseName}
                                    completionDate={displayData.completionDate}
                                    score={displayData.score}
                                />
                            </div>
                        </section>

                        {/* 3. Full‑width preview section */}
                        {/* Hide entire certificate preview on mobile */}
                        <section className="hidden sm:block bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-8 space-y-4">
                            <h4 className="text-lg sm:text-xl font-semibold text-gray-900">
                                Certificate preview
                            </h4>
                            <p className="text-sm sm:text-base text-gray-600">
                                This is exactly how your certificate will appear when downloaded.
                            </p>

                            <div className="mt-4 bg-gray-100 rounded-xl border border-gray-200 overflow-hidden">
                                <div className="w-full max-w-5xl mx-auto p-4">
                                    <Certificate
                                        studentName={displayData.studentName}
                                        courseName={displayData.courseName}
                                    />
                                </div>
                            </div>
                        </section>




                    </div>
                )}
            </div>
        </div>


    );

};

<style jsx>{`
  .certificate-container {
    width: 100%;
    max-width: 1123px;
    height: auto;
    aspect-ratio: 1123 / 784;
  }
  
  @media (max-width: 640px) {
    .certificate-container {
      transform: scale(0.85);
      transform-origin: center top;
    }
  }
  
  @media (min-width: 641px) and (max-width: 1024px) {
    .certificate-container {
      transform: scale(0.95);
      transform-origin: center top;
    }
  }
  
  @media (min-width: 1025px) {
    .certificate-container {
      transform: scale(1);
    }
  }
`}</style>
export default CertificatePreviewPage;
