import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import { BookOpen, Mail, Shield } from "lucide-react";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { authAPI } from "../services/api";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import useAuthStore from "../store/useAuthStore";
import { GoogleLogin } from "@react-oauth/google";
const SignupPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [step, setStep] = useState("choice");
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockTimer, setLockTimer] = useState(0);

  const { login } = useAuthStore();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm();

  const getCanonicalRole = (u) => {
    const roleRaw = String(u?.role || "")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z]/g, "_");

    switch (roleRaw) {
      case "SUPERADMIN":
        return "SUPERADMIN";
      case "ADMIN":
        return "ADMIN";
      case "INSTRUCTOR":
        return "INSTRUCTOR";
      case "STUDENT":
        return "STUDENT";
      default:
        return "STUDENT";
    }
  };


  const startLockTimer = () => {
    setIsLocked(true);
    setLockTimer(15 * 60);
    const interval = setInterval(() => {
      setLockTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsLocked(false);
          setLoginAttempts(0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const formatLockTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };


  // ✅ Google Signup Handler
  // ✅ Google Signup Handler
  const handleGoogleSignup = async (credentialResponse) => {
    setIsLoading(true);
    try {
      const resp = await authAPI.googleSignup({
        credential: credentialResponse.credential,
      });

      const payload = resp?.data?.data ?? resp?.data ?? resp;
      const user = payload?.user;
      const token = payload?.token;

      if (!user || !token) {
        throw new Error("Malformed signup response");
      }

      const canonicalRole = getCanonicalRole(user);

      const userForStore = {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: canonicalRole,
        collegeId: user.collegeId,
        departmentId: user.departmentId,
      };

      // ✅ Save to localStorage
      localStorage.setItem("auth_token", token);
      localStorage.setItem("user_role", canonicalRole);
      localStorage.setItem("user", JSON.stringify(userForStore));
      // ❌ REMOVED: setAuthToken(token);

      // ✅ Update Zustand store
      login(userForStore, token);

      await new Promise((resolve) => setTimeout(resolve, 200));

      toast.success("Sign up successful!");

      switch (canonicalRole) {
        case "SUPERADMIN":
          navigate("/superadmin", { replace: true });
          break;
        case "ADMIN":
          navigate("/admin", { replace: true });
          break;
        case "INSTRUCTOR":
          navigate("/instructor", { replace: true });
          break;
        default:
          navigate("/dashboard", { replace: true });
          break;
      }
    } catch (e) {
      console.error("Google signup error:", e);
      toast.error(
        e?.response?.data?.message || e?.message || "Google signup failed"
      );
    } finally {
      setIsLoading(false);
    }
  };



  const handleGoogleSignupError = () => {
    console.error("Google Signup Failed");
    toast.error("Google signup failed. Please try again.");
  };

  const handleSendOtp = async ({ email }) => {
    setIsLoading(true);
    try {
      const response = await authAPI.loginOtpBegin({ email });
      toast.success("OTP sent successfully!");
      setOtpSent(true);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to send OTP");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async ({ email, otp }) => {

    try {
      const response = await authAPI.loginOtpVerify(email, otp);

      const registration = response.registration;

      localStorage.setItem("reg_data", JSON.stringify(registration));
      sessionStorage.setItem("reg_data", JSON.stringify(registration));


      toast.success("OTP verified!");
      navigate("/register-first", { replace: true });

    } catch (e) {
      console.error("OTP verification failed:", e);
      toast.error(e?.response?.data?.message || "Invalid OTP");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-6">
          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-r from-primary-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
            <BookOpen size={28} className="text-white" />
          </div>
        </div>

        <div className="text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Welcome to PugArch LMS
          </h2>
          <p className="text-sm sm:text-base text-gray-600 mb-3">
            Sign in to access your learning dashboard
          </p>
          <Link to="/login">

            <div className="text-large text-blue-700">
              Login to your account
            </div>
          </Link>
        </div>
      </div>

      <div className="mt-6 sm:mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-6 px-4 sm:py-8 sm:px-10 shadow-xl sm:rounded-2xl border border-gray-100">
          {step === "choice" && (
            <div className="space-y-4">
              {/* Google button */}
              <div className="w-full flex items-center justify-center">
                <GoogleLogin
                  onSuccess={handleGoogleSignup}
                  onError={handleGoogleSignupError}
                  size="large"
                  width="100%"
                  text="signup_with"
                  shape="rectangular"
                />
              </div>


              {/* Email button */}
              <Button
                onClick={() => setStep("email")}
                variant="outline"
                className="w-full flex items-center justify-center space-x-2"
                size="lg"
              >
                <Mail size={20} className="text-gray-500" />
                <span>Signup with Email</span>
              </Button>
            </div>
          )}

          {step === "email" && (
            <form
              className="space-y-5 sm:space-y-6"
              onSubmit={handleSubmit(otpSent ? handleVerifyOtp : handleSendOtp)}
            >
              <Input
                label="Email address"
                type="email"
                placeholder="Enter your email"
                error={errors.email?.message}
                {...register("email", {
                  required: "Email is required",
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: "Please enter a valid email address",
                  },
                })}
                leftElement={
                  <Mail
                    size={20}
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  />
                }
                className="pl-10"
              />

              {otpSent && (
                <Input
                  label="OTP"
                  type="text"
                  placeholder="Enter the OTP"
                  error={errors.otp?.message}
                  {...register("otp", {
                    required: "OTP is required",
                    minLength: {
                      value: 4,
                      message: "OTP must be at least 4 digits",
                    },
                  })}
                />
              )}

              <Button
                type="submit"
                className="w-full flex items-center justify-center"
                disabled={isLoading || isLocked}
                size="lg"
              >
                {/* {isLoading && (
                  <Loader2 size={20} className="mr-2 animate-spin" />
                )} */}
                {isLocked && !isLoading && <Lock size={20} className="mr-2" />}
                {isLoading
                  ? otpSent
                    ? "Verifying OTP..."
                    : "Sending OTP..."
                  : isLocked
                    ? `Locked (${formatLockTime(lockTimer)})`
                    : otpSent
                      ? "Verify OTP"
                      : "Send OTP"}
              </Button>

              {/* Back button */}
              <Button
                type="button"
                onClick={() => setStep("choice")}
                variant="ghost"
                className="w-full"
              >
                ← Back
              </Button>
            </form>
          )}

          <div className="mt-5 sm:mt-6 p-3 bg-gray-50 rounded-lg text-center">
            <div className="flex items-center justify-center space-x-2">
              <Shield size={14} className="text-gray-500" />
              <span className="text-xs sm:text-sm text-gray-600">
                Your data is protected with enterprise-grade security
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-6 sm:mt-8 text-center">
        <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-gray-500">
          <Link to="/help" className="hover:text-gray-700 transition-colors">
            Help Center
          </Link>
          <Link to="/privacy" className="hover:text-gray-700 transition-colors">
            Privacy
          </Link>
          <Link to="/terms" className="hover:text-gray-700 transition-colors">
            Terms
          </Link>
        </div>
        <p className="mt-2 text-xs text-gray-400">
          © 2025 Pugarch. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default SignupPage;
