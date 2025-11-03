import { useState } from "react";
import axios from "axios";
import { useForm } from "react-hook-form";
import { toast } from "react-hot-toast";

import collegeIcon from "../assets/college.png";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { collegesAPI } from "../services/api";

function AddCollegePage() {
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    defaultValues: {
      studentLimit: 100,
      adminLimit: 5,
      instructorLimit: 5,
    },
  });

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      const payload = {
        contactPerson: data.contactPerson,
        name: data.name,
        mobileNumber: data.mobileNumber,
        studentLimit: parseInt(data.studentLimit, 10),
        validity: data.validity,
        email: data.email,
        adminLimit: parseInt(data.adminLimit, 10),
        instructorLimit: parseInt(data.instructorLimit, 10),
      };

      await collegesAPI.createCollege(payload);

      toast.success("College added successfully!");
      reset();
    } catch (error) {
      console.error(error);
      const errorMessage =
        error?.response?.data?.message || "Error adding college";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full bg-white rounded-xl shadow-lg p-6 sm:p-8">
        <div className="flex items-center justify-center mb-4">
          <img
            src={collegeIcon}
            alt="College Icon"
            className="h-10 w-10 mr-3"
          />
          <h2 className="text-2xl font-bold text-gray-900">Add College</h2>
        </div>
        <p className="text-center text-gray-500 text-sm mb-6">
          Fill out the form below to add a new college to the system.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Info */}
          <div>
            <h3 className="text-base font-semibold text-gray-800 mb-4 border-l-4 border-blue-500 pl-4">
              Basic Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Contact Person Name "
                type="text"
                error={errors.contactPerson?.message}
                {...register("contactPerson", {
                  required: "Contact person name is required",
                  minLength: {
                    value: 2,
                    message: "Name must have at least 2 characters",
                  },
                })}
              />
              <Input
                label="College Name"
                type="text"
                error={errors.name?.message}
                {...register("name", {
                  required: "College name is required",
                  minLength: {
                    value: 2,
                    message: "Name must have at least 2 characters",
                  },
                })}
              />
              <Input
                label="Mobile Number"
                type="tel"
                error={errors.mobileNumber?.message}
                {...register("mobileNumber", {
                  required: "Mobile number is required",
                  pattern: {
                    value: /^\d{10}$/,
                    message: "Invalid mobile number",
                  },
                })}
              />
              <Input
                label="Email"
                type="email"
                error={errors.email?.message}
                {...register("email", {
                  required: "Email is required",
                  pattern: {
                    value: /^\S+@\S+$/i,
                    message: "Invalid email address",
                  },
                })}
              />
            </div>
          </div>

          {/* Limits */}
          <div>
            <h3 className="text-base font-semibold text-gray-800 mb-4 border-l-4 border-blue-500 pl-4">
              Access & Limits
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Student Limit"
                type="number"
                max={100}
                error={errors.studentLimit?.message}
                {...register("studentLimit", {
                  required: "Student limit is required",
                  min: { value: 0, message: "Limit cannot be negative" },
                  max: {
                    value: 100,
                    message: "Student limit cannot exceed 100",
                  },
                })}
              />
              <Input
                label="Admin Limit"
                type="number"
                max={5}
                error={errors.adminLimit?.message}
                {...register("adminLimit", {
                  required: "Admin limit is required",
                  min: { value: 0, message: "Limit cannot be negative" },
                  max: { value: 5, message: "Admin limit cannot exceed 5" },
                })}
              />
              <Input
                label="Instructor Limit"
                type="number"
                max={5}
                error={errors.instructorLimit?.message}
                {...register("instructorLimit", {
                  required: "Instructor limit is required",
                  min: { value: 0, message: "Limit cannot be negative" },
                  max: {
                    value: 5,
                    message: "Instructor limit cannot exceed 5",
                  },
                })}
              />
            </div>
          </div>

          {/* Validity */}
          <div>
            <h3 className="text-base font-semibold text-gray-800 mb-4 border-l-4 border-blue-500 pl-4">
              Validity Period
            </h3>
            <Input
              type="date"
              error={errors.validity?.message}
              {...register("validity", {
                required: "Validity period is required",
              })}
            />
          </div>

          {/* Submit */}
          <div className="pt-2 text-center">
            <Button
              type="submit"
              size="sm"
              className="w-32 mx-auto"
              loading={isLoading}
              disabled={isLoading}
            >
              Save College
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddCollegePage;
