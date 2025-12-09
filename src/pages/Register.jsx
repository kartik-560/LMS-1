import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { authAPI } from "../services/api";
import { normalizeRole, ROLE } from "../store/useAuthStore";
import useAuthStore from "../store/useAuthStore";
import { setAuthToken } from "../services/token";
const Register = () => {
  const navigate = useNavigate();
  const [role, setRole] = useState("");
  const [userData, setUserData] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    const storedData = localStorage.getItem("reg_data");


    if (storedData) {
      try {
        const parsedData = JSON.parse(storedData);


        setUserData(parsedData);
        setRole(parsedData.role);
      } catch (error) {
        console.error("Error parsing JSON from localStorage:", error);
        navigate("/otp");
      }
    } else {
      navigate("/otp");
    }
  }, [navigate]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    getValues,
  } = useForm();


  useEffect(() => {
    if (userData) {

      setValue("fullName", userData?.fullName || "");
      setValue("email", userData?.email || "");
      setValue("mobile", userData?.mobile || "");
      setValue("year", userData?.year || "");

      setValue("department", userData?.department?.name || "");
      setValue("rollNumber", userData?.rollNumber || "");
    }
  }, [userData, setValue]);

  // const onSubmit = async (formData) => {
  //   try {

  //     const registrationData = JSON.parse(localStorage.getItem("reg_data"));

  //     if (!registrationData) {
  //       toast.error("No registration data found. Please verify OTP first.");
  //       navigate("/signup");
  //       return;
  //     }

  //     formData.email = registrationData.email;
  //     formData.collegeId = registrationData.collegeId;
  //     if (registrationData.department?.id) {
  //       formData.departmentId = registrationData.department.id;
  //     }


  //     const response = await authAPI.completeSignup(formData);

  //     if (response.success) {
  //       toast.success("Registration complete! Please log in.");
  //       navigate("/login");
  //     } else {
  //       toast.error(response.message || "Registration failed");
  //     }
  //   } catch (error) {
  //     console.error("Error during registration:", error);
  //     toast.error(
  //       error?.response?.data?.message || "Something went wrong. Please try again."
  //     );
  //   }
  // };

  const onSubmit = async (formData) => {
    try {
      const registrationData = JSON.parse(localStorage.getItem("reg_data"));

      if (!registrationData) {
        toast.error("No registration data found. Please verify OTP first.");
        navigate("/signup");
        return;
      }

      formData.email = registrationData.email;
      formData.collegeId = registrationData.collegeId;
      if (registrationData.department?.id) {
        formData.departmentId = registrationData.department.id;
      }

      const resp = await authAPI.completeSignup(formData);

      // apiData IS { user, token }
      const apiData = resp?.data;


      const user = apiData?.user;
      const token = apiData?.token;

      if (!user || !token) {
        console.warn("Signup failed shape:", {
          user,
          token,
        });
        toast.error("Registration failed");
        return;
      }

      const canonicalRole = normalizeRole(user.role);

      const userForStore = {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: canonicalRole,
        collegeId: user.collegeId,
        departmentId: user.departmentId,
        tokenVersion: user.tokenVersion,
      };

      localStorage.setItem("token", token);
      localStorage.setItem("user_role", canonicalRole);
      localStorage.setItem("user", JSON.stringify(userForStore));

      setAuthToken(token);
      useAuthStore.getState().login(userForStore, token);

      toast.success("Registration complete! Logged in.");

      const rolePath =
        {
          [ROLE.SUPERADMIN]: "/superadmin",
          [ROLE.ADMIN]: "/admin",
          [ROLE.INSTRUCTOR]: "/instructor",
          [ROLE.STUDENT]: "/dashboard",
        }[canonicalRole] || "/dashboard";

      navigate(rolePath, { replace: true });
    } catch (error) {
      console.error("Error during registration:", error);
      toast.error(
        error?.response?.data?.message ||
        error?.message ||
        "Something went wrong. Please try again."
      );
    }
  };


  if (!userData) {
    return <div>Loading...</div>;
  }

  return (
    <div className="max-w-lg mx-auto p-8 bg-white border rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-center">Complete Your Registration</h2>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

        <div>
          <label className="block text-sm font-medium mb-1">Full Name</label>
          <input
            type="text"
            {...register("fullName", { required: "Full name is required" })}
            className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
          />
          {errors.fullName && (
            <p className="text-red-500 text-xs mt-1">{errors.fullName.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            type="email"
            {...register("email")}
            className="w-full border rounded-lg px-3 py-2 bg-gray-100 text-gray-600"
            readOnly
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Mobile</label>
          <input
            type="text"
            {...register("mobile", {
              required: "Mobile is required",
              maxLength: { value: 10, message: "Mobile number must be 10 digits" },
              minLength: { value: 10, message: "Mobile number must be 10 digits" },
              pattern: { value: /^[0-9]+$/, message: "Only numbers allowed" },
            })}
            className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
          />
          {errors.mobile && (
            <p className="text-red-500 text-xs mt-1">{errors.mobile.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Password</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              {...register("password", { required: "Password is required" })}
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((p) => !p)}
              className="absolute right-3 top-2 text-sm"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
          {errors.password && (
            <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Confirm Password</label>
          <div className="relative">
            <input
              type={showConfirmPassword ? "text" : "password"}
              {...register("confirmPassword", {
                required: "Confirm password is required",
                validate: (value) =>
                  value === getValues("password") || "Passwords do not match",
              })}
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((p) => !p)}
              className="absolute right-3 top-2 text-sm"
            >
              {showConfirmPassword ? "Hide" : "Show"}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-red-500 text-xs mt-1">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        {role === "STUDENT" && (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">Year</label>
              <input
                type="text"
                {...register("year")}
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                disabled
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Department</label>
              <input
                type="text"
                {...register("department")}
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                disabled
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Roll Number</label>
              <input
                type="text"
                {...register("rollNumber")}
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                disabled
              />
            </div>
          </>
        )}

        {role === "INSTRUCTOR" && (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">Role</label>
              <input
                type="text"
                value={role}
                disabled
                className="w-full border rounded-lg px-3 py-2 bg-gray-100 text-gray-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Department</label>
              <input
                type="text"
                {...register("department")}
                disabled
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </>
        )}

        {role === "ADMIN" && (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">Role</label>
              <input
                type="text"
                value={role}
                disabled
                className="w-full border rounded-lg px-3 py-2 bg-gray-100 text-gray-600"
              />
            </div>
          </>
        )}

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition"
        >
          Complete Registration
        </button>
      </form>
    </div>
  );
};

export default Register;
