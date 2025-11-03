// src/components/Certificate.jsx
import React, { forwardRef } from "react";
import logo from "../assets/logo.png";
import badge from "../assets/badge.png";

const Certificate = forwardRef(({ studentName, courseName }, ref) => {
  return (
    <div
  ref={ref}
  style={{
    width: "1123px",       
    height: "784px",     
    backgroundColor: "#fff",
    fontFamily: "'Poppins', 'Segoe UI', sans-serif",
    position: "relative",
    overflow: "hidden",
    boxSizing: "border-box",
    padding: 0,
  }}
>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "340px",
          overflow: "hidden",
          zIndex: 1,
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 1440 320"
          preserveAspectRatio="none"
          style={{
            width: "100%",
            height: "100%",
            position: "absolute",
            top: 0,
            left: 0,
          }}
        >

          <path
            fill="#4B2C7D"
            d="M0,160 C480,240 960,80 1440,160 L1440,0 L0,0 Z"
          />

          <path
            fill="#D4AF37"
            d="M0,160 C480,240 960,80 1440,160 L1440,170 C960,90 480,250 0,170 Z"
          />
        </svg>
      </div>

      <div
        style={{
          position: "relative",
          zIndex: 2,
          fontFamily: "Bold Sans Serif Bebas Neue, Montserrat Extra Bold",
          padding: "20px 100px 0 100px",
          color: "white",
        }}
      >
        <h1 style={{ fontSize: "48px", margin: 0, fontWeight: "bold" }}>
          CERTIFICATE
        </h1>
        <p
          style={{
            fontSize: "20px",
            letterSpacing: "4px",
            textTransform: "uppercase",
            // marginTop: "5px",
          }}
        >
          Of Completion
        </p>
      </div>

      <img
        src={badge}
        alt="Gold Badge"
        style={{
          position: "absolute",
          top: "20px",
          right: "100px",
          width: "220px",
          zIndex: 2,
        }}
      />

      <div
        style={{
          position: "absolute",
          top: "40%",
          width: "100%",
          textAlign: "center",
          padding: "0 60px",
          color: "#333",
        }}
      >
        <p
          style={{
            fontSize: "14px",
            fontWeight: "600",
            fontFamily: "Light Sans Serif",
            letterSpacing: "2px",
            margin: 0,
          }}
        >
          THIS IS TO CERTIFY THAT
        </p>

        <h2
          style={{
            fontSize: "46px",
            margin: "20px 0 10px 0",
            fontFamily: "'Garamond', serif",
            fontWeight: "bold",
            color: "#111",
          }}
        >
          {studentName}
        </h2>

        <p
          style={{
            fontSize: "18px",
            lineHeight: 1.6,
            maxWidth: "700px",
            margin: "10px auto",
            color: "#444",
          }}
        >
          has successfully completed the{" "}
          <b style={{ color: "#000", fontFamily: "Medium Sans Serif Roboto, Poppins)" }}>{courseName}</b> course,
          <br />

          presented by <span style={{ fontFamily: " Sans Serif Nexa, Futura)" }}>PugArch Technology.</span>
        </p>
      </div>

      <div
        style={{
          position: "absolute",
          bottom: "60px",
          left: "50%", // Changed
          transform: "translateX(-50%)", // Added
          display: "flex",
          flexDirection: "column",
          alignItems: "center", // Changed
        }}
      >
        <p
          style={{
            position: "absolute",
            fontSize: "10px",
            color: "#555",
            margin: "0 0 20px 0",
            top: "-6px",
            left: "8%",
          }}
        >
          Presented By:
        </p>
        <img src={logo} alt="PugArch Technology" style={{ width: "180px" }} />
        <b style={{fontSize:"10px"}}> T e c h n o l o g y</b>
      </div>
    </div>
  );
});

export default Certificate;
