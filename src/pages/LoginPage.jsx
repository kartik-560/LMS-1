import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { BookOpen, Shield, Mail, Eye, EyeOff } from "lucide-react";
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

        collegeId: user.permissions?.collegeId,
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
            Login to access your learning account
          </p>
          <Link to="/signup">
            <div className="text-large text-blue-700 hover:underline">
              Sign up for an account
            </div>
          </Link>
        </div>
      </div>

      <div className="mt-6 sm:mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-6 px-4 sm:py-8 sm:px-10 shadow-xl sm:rounded-2xl border border-gray-100">
          {step === "choice" && (
            <div className="space-y-4">
              <div className="w-full flex items-center justify-center space-x-2">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  size="large"
                  width="100%"
                  text="continue_with"
                  shape="rectangular"
                />
              </div>

              {/* <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Or</span>
                </div>
              </div> */}

              <Button
                onClick={() => setStep("email")}
                variant="outline"
                className="w-full flex items-center justify-center space-x-2 bg-blue-600"
                size="lg"
              >
                <Mail size={20} className="text-gray-500" />
                <span>Login with Email</span>
              </Button>
            </div>
          )}

          {step === "email" && (
            <form
              className="space-y-5 sm:space-y-6"
              onSubmit={handleSubmit(handleEmailSignup)}
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

              <div>
                <Input
                  label="Password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  error={errors.password?.message}
                  {...register("password", {
                    required: "Password is required",
                    minLength: {
                      value: 6,
                      message: "Password must be at least 6 characters",
                    },
                  })}
                  className="pr-10"

                  rightElement={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 cursor-pointer focus:outline-none"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  }

                />

                <div className="text-right mt-1">
                  <button
                    type="button"
                    onClick={() => navigate("/forgot-password")}
                    className="text-sm text-blue-600 hover:underline focus:outline-none"
                  >
                    Forgot Password?
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full flex items-center justify-center"
                disabled={isLoading}
                size="lg"
              >
                {isLoading ? "Logging in..." : "Login"}
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

export default LoginPage;
