import { useState, useEffect } from "react";
import { adminScopedAPI } from "../services/api";
import { useParams } from "react-router-dom";

const DepartmentAnalyticsDashboard = () => {
  const { departmentId } = useParams();
  const [department, setDepartment] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load the department analytics (all data comes from your backend in one call)
  useEffect(() => {
    async function loadInitialData() {
      setLoading(true);
      try {
        const deptRes = await adminScopedAPI.getDepartmentAnalytics(departmentId);
        console.log("Loaded department analytics:", deptRes);
        setDepartment(deptRes?.data ?? null);

      } catch (e) {
        setDepartment(null);
      }
      setLoading(false);
    }
    loadInitialData();
  }, [departmentId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading department analytics...</div>
      </div>
    );
  }

  if (!department) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-500">No department selected</div>
      </div>
    );
  }


  // Use counts directly instead of relying on arrays
  const instructorCount = department.instructorCount || 0;
  const studentCount = department.studentCount || 0;
  const courseCount = department.courseCount || 0;
  const courses = department.courses || department.CoursesAssigned || [];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">{department.name}</h1>
            <p className="text-gray-600 mb-4">
              {department.description || "Department Analytics Dashboard"}
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
            <Stat title="Instructors" value={instructorCount} color="blue" />
            <Stat title="Students" value={studentCount} color="green" />
            <Stat title="Courses" value={courseCount} color="purple" />
          </div>
        </div>
      </div>

      {/* Statistics Grid - simplified without filtering arrays */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard
          title="Total Instructors"
          value={instructorCount}
          total={instructorCount}
          icon="👨‍🏫"
        />
        <StatCard
          title="Total Students"
          value={studentCount}
          total={studentCount}
          icon="👨‍🎓"
        />
        <StatCard
          title="Total Courses"
          value={courseCount}
          total={courseCount}
          icon="📚"
        />
      </div>

      {/* Courses List */}
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <h2 className="text-2xl font-semibold mb-6">
          Courses in {department.name}
        </h2>
        {courses.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No courses found for this department.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map(course => (
              <div key={course.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-lg">{course.course?.title || "Untitled Course"}</h3>
                  <span className={`text-xs px-2 py-1 rounded ${course.course.status === "published"
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-700"
                    }`}>
                    {course.course.status || "draft"}
                  </span>
                </div>
                {course.course?.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{course.course.description}</p>
                )}
              </div>
            ))}

          </div>
        )}
      </div>
    </div>
  );

};

const Stat = ({ title, value, color = "blue" }) => {
  const colorClasses = {
    blue: "text-blue-600",
    green: "text-green-600",
    purple: "text-purple-600",
  };

  return (
    <div className="text-center">
      <div className={`text-3xl font-bold ${colorClasses[color]}`}>{value}</div>
      <div className="text-gray-600 text-sm mt-1">{title}</div>
    </div>
  );
};

const StatCard = ({ title, value, total, icon }) => (
  <div className="bg-white rounded-xl shadow-md p-6">
    <div className="flex items-center justify-between mb-2">
      <span className="text-3xl">{icon}</span>
      <div className="text-right">
        <div className="text-2xl font-bold text-gray-800">{value}</div>
        <div className="text-sm text-gray-500">of {total}</div>
      </div>
    </div>
    <div className="text-sm font-medium text-gray-600 mt-2">{title}</div>
    <div className="mt-2 bg-gray-200 rounded-full h-2">
      <div
        className="bg-blue-500 h-2 rounded-full transition-all"
        style={{ width: `${total > 0 ? (value / total) * 100 : 0}%` }}
      />
    </div>
  </div>
);

export default DepartmentAnalyticsDashboard;
