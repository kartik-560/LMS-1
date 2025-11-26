import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import { authAPI } from "../services/api";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { useNavigate } from "react-router-dom";
const ForgotPasswordPage = () => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const navigate = useNavigate();
  const [resetToken, setResetToken] = useState(null);
  const { register, handleSubmit, watch, formState: { errors }, reset } = useForm();

  // ✅ Step 1: Send OTP to user's email
  const handleSendOtp = async ({ email: e }) => {
    try {
      await authAPI.sendOtp({ email: e });
      setEmail(e);
      toast.success("OTP sent to your email");
      setStep(2);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to send OTP");
    }
  };

  // ✅ Step 2: Verify OTP
  const handleVerifyOtp = async ({ otp }) => {
    try {
      const res = await authAPI.verifyOtp({ email, otp });
      // backend response: { success: true, message, data: { token } }
      const token = res?.data?.token ?? res?.token ?? null;
      if (!token) {
        toast.error("OTP verification failed (no token returned)");
        return;
      }
      setResetToken(token);
      toast.success("OTP verified successfully");
      setStep(3);
      // reset otp input if you use react-hook-form or similar
    } catch (err) {
      toast.error(err?.response?.data?.message || "Invalid OTP");
    }
  };

  // ✅ Step 3: Reset Password
  const handleResetPassword = async ({ newPassword, confirmPassword }) => {
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (!resetToken) {
      toast.error("Missing reset token. Re-verify OTP.");
      return;
    }

    try {
      await authAPI.resetPasswordWithToken({
        token: resetToken,
        newPassword,
        confirmPassword,
      });
      toast.success("Password reset successful");
      setResetToken(null);
      setEmail("");
      setStep(1);
      navigate("/login");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to reset password");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white shadow-xl rounded-2xl p-6 max-w-md w-full">
        <h2 className="text-xl font-bold mb-4 text-center text-blue-600">
          Forgot Password
        </h2>

        {/* 🧭 STEP 1: EMAIL INPUT */}
        {step === 1 && (
          <form onSubmit={handleSubmit(handleSendOtp)} className="space-y-4">
            <Input
              label="Email address"
              type="email"
              placeholder="Enter your email"
              error={errors.email?.message}
              {...register("email", { required: "Email is required" })}
            />
            <Button type="submit" className="w-full">
              Send OTP
            </Button>
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="w-full text-sm text-gray-700 font-medium py-2 rounded-lg bord border-gray-200 hover:bg-gray-100 transition"
            >
              ← Back to Login
            </button>
          </form>
        )}

        {/* 🧭 STEP 2: OTP INPUT */}
        {step === 2 && (
          <form onSubmit={handleSubmit(handleVerifyOtp)} className="space-y-4">
            <Input
              label="OTP"
              type="text"
              placeholder="Enter the OTP sent to your email"
              error={errors.otp?.message}
              {...register("otp", { required: "OTP is required" })}
            />
            <Button type="submit" className="w-full">
              Verify OTP
            </Button>
          </form>
        )}

        {/* 🧭 STEP 3: NEW PASSWORD FIELDS */}
        {step === 3 && (
          <form onSubmit={handleSubmit(handleResetPassword)} className="space-y-4">
            <Input
              label="New Password"
              type="password"
              placeholder="Enter new password"
              error={errors.newPassword?.message}
              {...register("newPassword", { required: "New password is required" })}
            />
            <Input
              label="Confirm Password"
              type="password"
              placeholder="Re-enter new password"
              error={errors.confirmPassword?.message}
              {...register("confirmPassword", { required: "Please confirm your password" })}
            />
            <Button type="submit" className="w-full">
              Reset Password
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
