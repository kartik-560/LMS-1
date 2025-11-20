import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { BookOpen, Shield, Mail, Eye, EyeOff,Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";
import { authAPI } from "../services/api";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import useAuthStore from "../store/useAuthStore";
import { setAuthToken } from "../services/token";
import { jwtDecode } from 'jwt-decode';
import { GoogleLogin } from '@react-oauth/google';

const LoginPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState("choice");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const ROLE = {
    SUPERADMIN: "SUPERADMIN",
    ADMIN: "ADMIN",
    INSTRUCTOR: "INSTRUCTOR",
    STUDENT: "STUDENT",
  };

  const normalizeRole = (raw) =>
    String(raw || "")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z]/g, "_");

  const getCanonicalRole = (u) => {
    const candidates = [
      u?.role,
      u?.Role,
      u?.userRole,
      u?.roleName,
      Array.isArray(u?.roles) ? u.roles[0] : undefined,
      Array.isArray(u?.roles) && typeof u.roles[0] === "object"
        ? u.roles[0]?.name
        : undefined,
    ];
    const roleRaw = normalizeRole(candidates.find(Boolean));
    switch (roleRaw) {
      case "SUPERADMIN":
        return ROLE.SUPERADMIN;
      case "ADMIN":
        return ROLE.ADMIN;
      case "INSTRUCTOR":
        return ROLE.INSTRUCTOR;
      case "STUDENT":
        return ROLE.STUDENT;
      default:
        return ROLE.STUDENT;
    }
  };


  const handleGoogleSuccess = async (credentialResponse) => {
    setIsLoading(true);
    try {
      // ✅ Send ONLY credential to backend
      const resp = await authAPI.googleLogin({
        credential: credentialResponse.credential,
      });

      const payload = resp?.data?.data ?? resp?.data ?? resp;
      const user = payload?.user;
      const token = payload?.token;

      if (!user || !token) throw new Error("Malformed login response");

      // ✅ Use role from backend response
      const canonicalRole = getCanonicalRole(user);

      const userForStore = {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: canonicalRole, // ✅ From backend
        collegeId: user.collegeId,
        departmentId: user.departmentId,
      };

      // ✅ Save to localStorage

      setAuthToken(token);
      localStorage.setItem("auth_token", token);
      localStorage.setItem("user_role", canonicalRole);
      localStorage.setItem("user", JSON.stringify(userForStore));
      useAuthStore.getState().login(userForStore, token);


      await new Promise(resolve => setTimeout(resolve, 200));

      toast.success("Login successful!");

      // ✅ Use navigate with replace
      switch (canonicalRole) {
        case ROLE.SUPERADMIN:
          navigate("/superadmin", { replace: true });
          break;
        case ROLE.ADMIN:
          navigate("/admin", { replace: true });
          break;
        case ROLE.INSTRUCTOR:
          navigate("/instructor", { replace: true });
          break;
        default:
          navigate("/dashboard", { replace: true });
          break;
      }
    } catch (e) {
      console.error("Google login error:", e);
      toast.error(e?.response?.data?.message || "Google login failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleError = () => {
    console.error("Google Login Failed");
    toast.error("Google login failed. Please try again.");
  };


  const handleEmailSignup = async ({ email, password }) => {
    setIsLoading(true);
    try {
      const resp = await authAPI.login({ email, password });

      const payload = resp?.data?.data ?? resp?.data ?? resp;
      const user = payload?.user;
      const token = payload?.token;
      if (!user || !token) throw new Error("Malformed login response");

      const canonicalRole = getCanonicalRole(user);

      const userForStore = {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: canonicalRole,
        collegeId: user.collegeId,
      };


      setAuthToken(token);
      localStorage.setItem("auth_token", token);
      localStorage.setItem("user_role", canonicalRole);
      localStorage.setItem("user", JSON.stringify(userForStore));
      useAuthStore.getState().login(userForStore, token);


      switch (canonicalRole) {
        case ROLE.SUPERADMIN:
          navigate("/superadmin", { replace: true });
          break;
        case ROLE.ADMIN:
          navigate("/admin", { replace: true });
          break;
        case ROLE.INSTRUCTOR:
          navigate("/instructor", { replace: true });
          break;
        default:
          navigate("/dashboard", { replace: true });
          break;
      }
    } catch (e) {
      console.error("Login error:", e);
      toast.error(e?.response?.data?.message || e?.message || "Login failed");
    } finally {
      setIsLoading(false);
    }
  };


 
return (
  <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center py-8 px-4 sm:px-6 lg:px-8">
    <div className="w-full max-w-md">
      {/* Logo */}
      <div className="flex justify-center mb-6">
        <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-r from-primary-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
          <BookOpen size={28} className="text-white" />
        </div>
      </div>

      {/* Title */}
      <div className="text-center mb-8">
        <h2 className="text-2xl sm:text-3xl font-semibold text-gray-900 mb-2">
          Welcome to PugArch LMS
        </h2>
        <p className="text-sm sm:text-base text-gray-600 mb-3">
          Login to access your learning account
        </p>
        <Link 
          to="/signup" 
          className="inline-block text-sm text-primary-700 hover:underline focus:outline-none focus:ring-2 focus:ring-primary-200 rounded px-2 py-1"
        >
          Sign up for an account
        </Link>
      </div>

      {/* Card */}
      <div className="bg-white py-8 px-6 sm:px-8 shadow-xl rounded-2xl border border-gray-100">
        {/* CHOICE STEP */}
        {step === "choice" && (
          <div className="space-y-4">
            {/* Google Login Button */}
            <div className="w-full [&>div]:w-full [&>div>div]:w-full">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                size="large"
                text="continue_with"
                shape="rectangular"
                width="400"
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

            {/* Email Login Button */}
            <Button
              onClick={() => setStep("email")}
              variant="outline"
              className="w-full flex items-center justify-center gap-2"
              size="lg"
              aria-label="Login with Email"
            >
              <Mail size={18} className="text-gray-500" />
              <span>Login with Email</span>
            </Button>

            <p className="text-xs text-gray-500 text-center pt-2">
              Continue with Google or login using your email & password.
            </p>
          </div>
        )}

        {/* EMAIL LOGIN STEP */}
        {step === "email" && (
          <form
            className="space-y-5"
            onSubmit={handleSubmit(handleEmailSignup)}
            aria-label="Email login form"
          >
            {/* Email Field */}
            <div>
              <Input
                label="Email address"
                id="email"
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
                    size={18} 
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" 
                  />
                }
                className="pl-10"
                aria-invalid={!!errors.email}
              />
            </div>

            {/* Password Field */}
            <div>
              <div className="relative">
                <Input
                  label="Password"
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  error={errors.password?.message}
                  {...register("password", {
                    required: "Password is required",
                    minLength: { 
                      value: 6, 
                      message: "Password must be at least 6 characters" 
                    },
                  })}
                  className="pr-10"
                  aria-invalid={!!errors.password}
                />
                
                {/* Password Toggle - positioned relative to input */}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-9 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-200 rounded"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {/* Forgot Password Link */}
              <div className="text-right mt-2">
                <button
                  type="button"
                  onClick={() => navigate("/forgot-password")}
                  className="text-sm text-primary-600 hover:underline focus:outline-none focus:ring-2 focus:ring-primary-200 rounded px-2 py-1"
                >
                  Forgot Password?
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full flex items-center justify-center gap-2"
              disabled={isLoading}
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Logging in...</span>
                </>
              ) : (
                <span>Login</span>
              )}
            </Button>

            {/* Back Button */}
            <Button
              type="button"
              onClick={() => setStep("choice")}
              variant="ghost"
              className="w-full"
              aria-label="Go back to login options"
            >
              ← Back
            </Button>
          </form>
        )}

        {/* Security Note */}
        <div className="mt-6 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-center gap-2">
            <Shield size={14} className="text-gray-500 flex-shrink-0" />
            <span className="text-xs sm:text-sm text-gray-600">
              Your data is protected with enterprise-grade security
            </span>
          </div>
        </div>
      </div>

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

export default LoginPage;
