import React, { forwardRef } from "react";
import Badge from "../assets/badge.png";
import Logo from "../assets/Logo.png";
import BackgroundImage from "../assets/certificate_BG.png"; // Add this background image to your assets
import Signature from "../assets/Sign.png"; // Handwritten signature image
const Certificate = forwardRef(
  ({ studentName, courseName, signerName = "Authorized Signatory",
    signerDesignation = "Director", }, ref) => {
    return (
      <div
        ref={ref}
        style={{
          width: "1200px",
          height: "850px",
          backgroundImage: `url(${BackgroundImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          fontFamily: "'Inter', 'Segoe UI', sans-serif",
          position: "relative",
          overflow: "hidden",
          margin: "0 auto",
        }}
      >
        {/* ================= MAIN CONTENT ================= */}
        <div
          style={{
            position: "relative",
            zIndex: 2,
            textAlign: "center",
            paddingTop: "140px",
          }}
        >
          <h1
            style={{
              fontFamily: "'Playfair Display', 'Libre Baskerville', serif",
              fontSize: "64px",
              margin: 0,
              fontWeight: 700,
              color: "#000000",
              letterSpacing: "1px",
            }}
          >
            Certificate of Completion
          </h1>

          <p
            style={{
              marginTop: "30px",
              fontSize: "20px",
              color: "#1a1a1a",
              letterSpacing: "0.5px",
              fontWeight: 400,
            }}
          >
            This is to certify that
          </p>

          <h2
            style={{
              fontFamily: "'Great Vibes', 'Alex Brush', 'Allura', cursive",
              fontSize: "50px",
              margin: "24px 0 18px",   // 🔥 bottom margin matters
              fontWeight: 400,
              color: "#000000",
              lineHeight: 1.25,
            }}
          >
            {studentName || "Morgan Maxwell"}
          </h2>

          <div
            style={{
              width: "640px",
              height: "2px",
              background: "#000000",
              margin: "0 auto 30px",
            }}
          />

          <p
            style={{
              fontSize: "20px",
              lineHeight: 1.7,
              maxWidth: "750px",
              margin: "0 auto",
              color: "#1a1a1a",
              fontWeight: 400,
            }}
          >
            has successfully completed the{" "}
            <strong style={{ fontWeight: 700 }}>
              {courseName || "Career Enhancement Upskilling Course"}
            </strong>
            ,<br />
            presented by PugArch Technology
          </p>
        </div>

        {/* ================= BADGE ================= */}
        <img
          src={Badge}
          alt="Badge"
          style={{
            position: "absolute",
            bottom: "100px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "170px",
            height: "auto",
            zIndex: 3,
          }}
        />

        {/* ================= PRESENTED BY SECTION ================= */}

        <div
          style={{
            position: "absolute",
            bottom: "145px",
            left: "350px",
            transform: "translateX(-50%)",
            zIndex: 3,
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontSize: "11px",
              fontWeight: 700,
              marginBottom: "6px",
              color: "#000",
              letterSpacing: "0.3px",
            }}
          >
            Presented By:
          </p>

          <img
            src={Logo}
            alt="PugArch Logo"
            style={{
              width: "230px",
              display: "block",
              margin: "0 auto 4px auto",
            }}
          />

          <p
            style={{
              fontSize: "13px",
              fontWeight: 600,
              color: "#000",
              margin: 0,
              letterSpacing: "0.2px",
            }}
          >
            Technology Pvt. Ltd.
          </p>
        </div>


        {/* ================= SIGNATURE SECTION ================= */}
        {/* <div
          style={{
            position: "absolute",
            bottom: "160px",
            right: "200px",
            textAlign: "center",
            zIndex: 3,
            width: "260px",
          }}
        >
   
          <img
            src={Signature}
            alt="Authorized Signature"
            style={{
              width: "180px",
              margin: "0 auto 6px",
              display: "block",
            }}
          />

          
          <div
            style={{
              width: "240px",
              height: "2px",
              background: "#000",
              margin: "0 auto 6px",
            }}
          />

          <p
            style={{
              fontSize: "14px",
              fontWeight: 600,
              color: "#000",
              margin: "4px 0 2px",
            }}
          >
            {signerName}
          </p>

          <p
            style={{
              fontSize: "12px",
              fontWeight: 400,
              color: "#444",
              margin: 0,
              letterSpacing: "0.4px",
            }}
          >
            {signerDesignation}
          </p>
        </div> */}
      </div>
    );
  }
);

export default Certificate;

