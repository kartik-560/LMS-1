// src/components/CertificateDownloader.jsx
import React, { useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import Certificate from "./Certificate"; 
import { Download } from 'lucide-react';

// Accept all necessary props
const CertificateDownloader = ({ studentName, courseName, completionDate }) => {
  const certificateRef = useRef();
  const [isLoading, setIsLoading] = useState(false);

  const handleDownloadPdf = () => {
    const input = certificateRef.current;
    if (!input) return;

    setIsLoading(true);

    html2canvas(input, {
      scale: 3, 
      useCORS: true,
    }).then((canvas) => {
      const imgData = canvas.toDataURL("image/png");
      
     
      const pdf = new jsPDF('l', 'px', [1056, 816]); 
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);

      const safeStudentName = String(studentName || "student").replace(/ /g, "_");
      const safeCourseName = String(courseName || "course").replace(/ /g, "_");

      pdf.save(`Certificate-${safeStudentName}-${safeCourseName}.pdf`);
      setIsLoading(false);
    });
  };

  return (
    <div>
   
      <button
        onClick={handleDownloadPdf}
        disabled={isLoading}
        className="w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors disabled:bg-gray-400"
      >
        <Download size={20} className="mr-2 -ml-1" />
        {isLoading ? "Generating PDF..." : "Download Certificate"}
      </button>

   
      <div style={{ position: "absolute", left: "-9999px", top: "-9999px" }}>
        <Certificate
          ref={certificateRef}
          studentName={studentName}
          courseName={courseName}
          completionDate={completionDate} // Pass all props
        />
      </div>
    </div>
  );
};

export default CertificateDownloader;