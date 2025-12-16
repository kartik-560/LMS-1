import React, { useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import Certificate from "./Certificate";
import { Download } from "lucide-react";

const CertificateDownloader = ({
  studentName,
  courseName,
}) => {
  const certificateRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleDownloadPdf = async () => {
    const input = certificateRef.current;
    if (!input) return;

    setIsLoading(true);

    try {
      const canvas = await html2canvas(input, {
        scale: 3,
        useCORS: true,
        backgroundColor: null, 
      });

      const imgData = canvas.toDataURL("image/png");

      // A4 Landscape
      const pdf = new jsPDF("l", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);

      const safeName = String(studentName || "student").replace(/\s+/g, "_");
      const safeCourse = String(courseName || "course").replace(/\s+/g, "_");

      pdf.save(`Certificate_${safeName}_${safeCourse}.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      {/* Download Button */}
      <button
        onClick={handleDownloadPdf}
        disabled={isLoading}
        className="w-full flex items-center justify-center px-6 py-3 rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 transition"
      >
        <Download size={20} className="mr-2" />
        {isLoading ? "Generating PDF..." : "Download Certificate"}
      </button>

      {/* Offscreen Certificate Render */}
      <div
        style={{
          position: "absolute",
          left: "-10000px",
          top: "-10000px",
        }}
      >
        <Certificate
          ref={certificateRef}
          studentName={studentName}
          courseName={courseName}
        />
      </div>
    </div>
  );
};

export default CertificateDownloader;