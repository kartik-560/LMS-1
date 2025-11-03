import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { coursesAPI, collegesAPI } from "../services/api.js";
const XIcon = (props) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
    >
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
    </svg>
);


export function AssignCourseModal({ course, colleges, isOpen, onClose, onSuccess }) {
    // --- STATE MANAGEMENT ---
    const [selectedCollegeId, setSelectedCollegeId] = useState("");
    const [departments, setDepartments] = useState([]);
    const [selectedDepartmentId, setSelectedDepartmentId] = useState("");
    const [capacity, setCapacity] = useState("");

    const [isLoading, setIsLoading] = useState(false);
    // Using the loading state name from your new code
    const [loadingDepartments, setLoadingDepartments] = useState(false);
    const [error, setError] = useState("");

    // --- DATA FETCHING (YOUR PROVIDED USEEFFECT) ---
    useEffect(() => {
        async function fetchDepartmentsForCollege() {
            if (!selectedCollegeId) {
                setDepartments([]);
                return;
            }
            try {
                setLoadingDepartments(true);
                // Using your API call structure
                const res = await collegesAPI.getDepartmentsForCollege(selectedCollegeId);

                // Using your new data extraction logic
                setDepartments(res.data?.data?.items || []);

                // This replicates the functionality of resetField("departmentId") for vanilla React state
                setSelectedDepartmentId("");

            } catch (err) {
                console.error("💥 FAILED to fetch departments:", err);
                toast.error("Failed to load departments for this college.");
                setDepartments([]);
            } finally {
                setLoadingDepartments(false);
            }
        }

        fetchDepartmentsForCollege();
    }, [selectedCollegeId]); // Dependency array updated

    const handleSubmit = async (e) => {
        e.preventDefault();
        // (Submit logic remains the same)
        if (!selectedCollegeId) {
            setError("A college must be selected.");
            return;
        }
        setIsLoading(true);
        setError("");
        try {
            const payload = {
                collegeId: selectedCollegeId,
                departmentId: selectedDepartmentId || null,
                capacity: capacity ? parseInt(capacity, 10) : null,
            };
          
            await coursesAPI.assign(course.id, payload);
            toast.success(`Course "${course.title}" assigned successfully!`);
            onSuccess();
        } catch (err) {
            const errorMessage = err.response?.data?.error || "An unexpected error occurred.";
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) {
        return null;
    }

    // --- RENDER (Using Tailwind Styled HTML) ---
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
            <div className="relative w-full max-w-lg rounded-lg border bg-white p-6 shadow-lg">
                {/* Header Section */}
                <div className="flex flex-col space-y-1.5 text-center sm:text-left">
                    <h2 className="text-lg font-semibold leading-none tracking-tight">Assign Course</h2>
                    <p className="text-sm text-gray-500">
                        Assign "{course?.title}" to a college or a specific department.
                    </p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        {/* College Selection */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <label htmlFor="college" className="text-right text-sm font-medium">
                                College
                            </label>
                            <select
                                id="college"
                                value={selectedCollegeId}
                                onChange={(e) => setSelectedCollegeId(e.target.value)}
                                disabled={isLoading}
                                className="col-span-3 flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <option value="" disabled>Select a college</option>
                                {(colleges || []).map((college) => (
                                    <option key={college.id} value={college.id}>{college.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Department Selection (Conditional) */}
                        {selectedCollegeId && (
                            <div className="grid grid-cols-4 items-center gap-4">
                                <label htmlFor="department" className="text-right text-sm font-medium">
                                    Department
                                </label>
                                <select
                                    id="department"
                                    value={selectedDepartmentId}
                                    onChange={(e) => setSelectedDepartmentId(e.target.value)}
                                    disabled={isLoading || loadingDepartments} // Updated loading state
                                    className="col-span-3 flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <option value="">{loadingDepartments ? "Loading..." : "College-Level (optional)"}</option>
                                    {departments.map((dept) => (
                                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Capacity Input */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <label htmlFor="capacity" className="text-right text-sm font-medium">
                                Capacity
                            </label>
                            <input
                                id="capacity"
                                type="number"
                                placeholder="Optional"
                                value={capacity}
                                onChange={(e) => setCapacity(e.target.value)}
                                className="col-span-3 flex h-10 w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                                disabled={isLoading}
                                min="0"
                            />
                        </div>

                        {error && (
                            <p className="col-span-4 text-center text-sm text-red-600">{error}</p>
                        )}
                    </div>

                    {/* Footer Section */}
                    <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
                        <button type="button" onClick={onClose} disabled={isLoading} className="mt-2 inline-flex h-10 items-center justify-center whitespace-nowrap rounded-md border border-gray-300 bg-transparent px-4 py-2 text-sm font-medium transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:pointer-events-none disabled:opacity-50 sm:mt-0">
                            Cancel
                        </button>
                        <button type="submit" disabled={isLoading || !selectedCollegeId} className="inline-flex h-10 items-center justify-center whitespace-nowrap rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:pointer-events-none disabled:bg-blue-400">
                            {isLoading ? "Assigning..." : "Assign Course"}
                        </button>
                    </div>
                </form>

                <button onClick={onClose} className="absolute top-4 right-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <XIcon className="h-4 w-4" />
                    <span className="sr-only">Close</span>
                </button>
            </div>
        </div>
    );
}