import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import { authAPI } from "../services/api";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";

const ForgotPasswordPage = () => {
  const [step, setStep] = useState(1); // 1=email+otp, 2=otp verify, 3=new password
  const [email, setEmail] = useState("");

  const { register, handleSubmit, watch, formState: { errors }, reset } = useForm();

  // ✅ Step 1: Send OTP to user's email
  const handleSendOtp = async ({ email }) => {
    try {
      await authAPI.sendOtp({ email }); // ⬅️ create this API in your backend
      setEmail(email);
      toast.success("OTP sent to your email");
      setStep(2);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to send OTP");
    }
  };

  // ✅ Step 2: Verify OTP
  const handleVerifyOtp = async ({ otp }) => {
    try {
      await authAPI.verifyOtp({ email, otp }); // ⬅️ backend: verify and return success
      toast.success("OTP verified successfully");
      setStep(3);
      reset(); // clear otp field for next step
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
    try {
      await authAPI.resetPassword({ email, newPassword });
      toast.success("Password reset successful");
      // Optionally redirect to login
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
