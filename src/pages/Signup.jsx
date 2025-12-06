import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import { BookOpen, Mail, Shield, Loader2, Lock } from "lucide-react";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { authAPI } from "../services/api";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import useAuthStore from "../store/useAuthStore";
import { GoogleLogin } from "@react-oauth/google";
import { setAuthToken } from "../services/token";
import { normalizeRole, ROLE } from "../store/useAuthStore";
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

  // const handleGoogleSignup = async (credentialResponse) => {
  //   setIsLoading(true);
  //   try {
  //     const resp = await authAPI.googleSignup({
  //       credential: credentialResponse.credential,
  //     });

  //     const payload = resp?.data?.data ?? resp?.data ?? resp;
  //     const user = payload?.user;
  //     const token = payload?.token;

  //     if (!user || !token) {
  //       throw new Error("Malformed signup response");
  //     }

  //     await new Promise((resolve) => setTimeout(resolve, 200));

  //     toast.success("Sign up successful!");
  //     navigate("/login", { replace: true });
  //   } catch (e) {
  //     console.error("Google signup error:", e);
  //     toast.error(
  //       e?.response?.data?.message || e?.message || "Google signup failed"
  //     );
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };

  const handleGoogleSignup = async (credentialResponse) => {
    setIsLoading(true);
    try {
      const resp = await authAPI.googleSignup({
        credential: credentialResponse.credential,
      });

      const payload = resp?.data?.data;
      const user = payload?.user;
      const token = payload?.token;

      if (!user || !token) {
        throw new Error("Malformed signup response");
      }

      const canonicalRole = normalizeRole(user.role);
      const userForStore = {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: canonicalRole,
        collegeId: user.collegeId,
        departmentId: user.departmentId,
        departmentName: user.departmentName || user.department?.name || null,
      }

      // ✅ SYNCHRONOUS localStorage save FIRST
      localStorage.setItem("token", token);
      localStorage.setItem("user_role", canonicalRole);
      localStorage.setItem("user", JSON.stringify(userForStore));

      // ✅ Update store
      useAuthStore.getState().login(userForStore, token);

      toast.success("Sign up successful!");

      const rolePath = {
        [ROLE.INSTRUCTOR]: "/instructor",
        [ROLE.ADMIN]: "/admin",
        [ROLE.STUDENT]: "/dashboard"
      }[canonicalRole] || "/dashboard";

      // ✅ Navigate AFTER store update
      setTimeout(() => {
        navigate(rolePath, { replace: true });
      }, 5000);

    } catch (e) {
      console.error("Google signup error:", e);
      toast.error(e?.response?.data?.message || "Signup failed");
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
    setIsLoading(true);
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
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        {/* Header */}
        <header className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-r from-primary-600 to-purple-600 rounded-3xl flex items-center justify-center shadow-lg">
            <BookOpen size={28} className="text-white" />
          </div>

          <h1 className="mt-4 text-center text-2xl sm:text-3xl font-extrabold text-gray-900">
            Welcome to PugArch LMS
          </h1>

          <p className="mt-2 text-sm sm:text-base text-gray-600 text-center">
            Sign in or create an account to access your learning dashboard.
          </p>

          <Link
            to="/login"
            className="mt-3 text-sm text-primary-700 hover:underline focus:outline-none focus:ring-2 focus:ring-primary-300 rounded px-2 py-1"
          >
            Already have an account? Log in
          </Link>
        </header>

        {/* Card */}
        <main className="bg-white py-8 px-6 sm:px-8 shadow-xl rounded-2xl border border-gray-100">
          {/* Choice Step */}
          {step === "choice" && (
            <div className="space-y-4">
              {/* Google Login Button */}
              <div className="w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg">
                <GoogleLogin
                  onSuccess={handleGoogleSignup}
                  onError={handleGoogleSignupError}
                  size="large"
                  text="signup_with"
                  shape="rectangular"
                  className="w-full"

                  ux_mode="popup"
                  context="signup"
                />
              </div>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-gray-500">Or</span>
                </div>
              </div>

              {/* Email Button */}
              <Button
                onClick={() => setStep("email")}
                variant="outline"
                className="w-full flex items-center justify-center gap-2"
                size="lg"
                aria-label="Sign up with email"
              >
                <Mail size={18} className="text-gray-500" />
                <span>Sign up with email</span>
              </Button>

              <p className="text-center text-xs text-gray-500 pt-2">
                By continuing you agree to our{" "}
                <Link to="/terms" className="text-primary-600 hover:underline">
                  Terms
                </Link>{" "}
                and{" "}
                <Link to="/privacy" className="text-primary-600 hover:underline">
                  Privacy Policy
                </Link>
                .
              </p>
            </div>
          )}

          {/* Email + OTP Step */}
          {step === "email" && (
            <form
              className="space-y-5"
              onSubmit={handleSubmit(otpSent ? handleVerifyOtp : handleSendOtp)}
              aria-label="Email signup form"
            >
              <div>
                <Input
                  id="email"
                  label="Email address"
                  type="email"
                  placeholder="name@example.com"
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
                      size={18}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                  }
                  className="pl-10"
                  aria-invalid={!!errors.email}
                  required
                />
              </div>

              {otpSent && (
                <div>
                  <Input
                    id="otp"
                    label="OTP"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="Enter the 6 digit code"
                    error={errors.otp?.message}
                    {...register("otp", {
                      required: "OTP is required",
                      maxLength: {
                        value: 6,
                        message: "OTP must be exactly 6 digits"
                      },
                      pattern: {
                        value: /^\d{6}$/,
                        message: "OTP must be exactly 6 digits"
                      }
                    })}
                    aria-invalid={!!errors.otp}
                  />

                  <p className="mt-2 text-xs text-gray-500">
                    Didn't receive the code? Check your spam folder or resend after a few seconds.
                  </p>
                </div>
              )}

              <div className="space-y-3">
                <Button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2"
                  disabled={isLoading || isLocked}
                  size="lg"
                  aria-busy={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>{otpSent ? "Verifying OTP..." : "Sending OTP..."}</span>
                    </>
                  ) : isLocked ? (
                    <>
                      <Lock size={16} />
                      <span>Locked ({formatLockTime(lockTimer)})</span>
                    </>
                  ) : (
                    <span>{otpSent ? "Verify OTP" : "Send OTP"}</span>
                  )}
                </Button>

                <Button
                  type="button"
                  onClick={() => setStep("choice")}
                  variant="ghost"
                  className="w-full"
                  aria-label="Go back to signup choice"
                >
                  ← Back
                </Button>
              </div>
            </form>
          )}

          {/* Security Note */}
          <div className="mt-6 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-center gap-2">
              <Shield size={14} className="text-gray-500 flex-shrink-0" />
              <span className="text-xs sm:text-sm text-gray-600">
                Your data is protected with enterprise-grade security.
              </span>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="mt-8 text-center">
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
          <p className="mt-3 text-xs text-gray-400">© 2025 Pugarch. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
};

export default SignupPage;
