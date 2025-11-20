// DepartmentAnalyticsDashboard.jsx
import React, { useState, useEffect } from "react";
import {
  Users,
  BookOpen,
  TrendingUp,
  Award,
  Target,
  Calendar,
  ChevronDown,
  Download,
  Filter,
  RefreshCw,
  BarChart3,
  PieChart,
  Activity,
  CheckCircle,
  Clock,
  AlertCircle,
} from "lucide-react";
import { toast } from "react-hot-toast";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import { departmentAPI } from "../services/api";

const DepartmentAnalyticsDashboard = () => {
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState("monthly"); // daily, weekly, monthly, yearly
  const [activeTab, setActiveTab] = useState("overview"); // overview, students, courses, instructors

  // Analytics data states
  const [overviewStats, setOverviewStats] = useState(null);
  const [studentAnalytics, setStudentAnalytics] = useState(null);
  const [courseAnalytics, setCourseAnalytics] = useState(null);
  const [performanceTrends, setPerformanceTrends] = useState([]);
  const [enrollmentTrends, setEnrollmentTrends] = useState([]);
  const [instructorAnalytics, setInstructorAnalytics] = useState(null);
  const [completionRates, setCompletionRates] = useState(null);
  const [departmentComparison, setDepartmentComparison] = useState([]);

  // Load departments on mount
  useEffect(() => {
    loadDepartments();
  }, []);

  // Load analytics when department changes
  useEffect(() => {
    if (selectedDepartment) {
      loadAllAnalytics();
    }
  }, [selectedDepartment, timeframe]);

  const loadDepartments = async () => {
    try {
      const response = await departmentAPI.getDepartments();
      const depts = Array.isArray(response) ? response : response?.data || [];
      setDepartments(depts);
      if (depts.length > 0) {
        setSelectedDepartment(depts[0]);
      }
    } catch (error) {
      console.error("Failed to load departments:", error);
      toast.error("Failed to load departments");
    }
  };

  const loadAllAnalytics = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadOverviewStats(),
        loadStudentAnalytics(),
        loadCourseAnalytics(),
        loadPerformanceTrends(),
        loadEnrollmentTrends(),
        loadInstructorAnalytics(),
        loadCompletionRates(),
        loadDepartmentComparison(),
      ]);
    } catch (error) {
      console.error("Failed to load analytics:", error);
      toast.error("Failed to load some analytics data");
    } finally {
      setLoading(false);
    }
  };

  const loadOverviewStats = async () => {
    try {
      const data = await departmentAPI.getOverviewStats(selectedDepartment.id);
      setOverviewStats(data);
    } catch (error) {
      console.error("Failed to load overview stats:", error);
      // Use mock data for demo
      setOverviewStats({
        totalStudents: 1245,
        activeCourses: 45,
        totalInstructors: 23,
        completionRate: 78.5,
        avgCourseRating: 4.3,
        enrollmentGrowth: 12.5,
        studentGrowth: 8.3,
        courseGrowth: 5.2,
      });
    }
  };

  const loadStudentAnalytics = async () => {
    try {
      const data = await departmentAnalyticsAPI.getStudentAnalytics(selectedDepartment.id);
      setStudentAnalytics(data);
    } catch (error) {
      console.error("Failed to load student analytics:", error);
      // Mock data
      setStudentAnalytics({
        totalEnrolled: 1245,
        activeStudents: 987,
        completedCourses: 3456,
        averageProgress: 65.4,
        byYear: [
          { year: "1st Year", count: 345 },
          { year: "2nd Year", count: 312 },
          { year: "3rd Year", count: 298 },
          { year: "4th Year", count: 290 },
        ],
        topPerformers: [
          { name: "John Doe", courses: 12, avgScore: 94.5 },
          { name: "Jane Smith", courses: 11, avgScore: 93.2 },
          { name: "Mike Johnson", courses: 10, avgScore: 91.8 },
        ],
      });
    }
  };

  const loadCourseAnalytics = async () => {
    try {
      const data = await departmentAnalyticsAPI.getCourseAnalytics(selectedDepartment.id);
      setCourseAnalytics(data);
    } catch (error) {
      console.error("Failed to load course analytics:", error);
      // Mock data
      setCourseAnalytics({
        totalCourses: 45,
        activeCourses: 38,
        avgEnrollment: 28.5,
        topCourses: [
          { name: "Data Structures", enrolled: 156, rating: 4.8 },
          { name: "Web Development", enrolled: 142, rating: 4.6 },
          { name: "Machine Learning", enrolled: 128, rating: 4.7 },
        ],
        byDifficulty: [
          { level: "Beginner", count: 18 },
          { level: "Intermediate", count: 20 },
          { level: "Advanced", count: 7 },
        ],
      });
    }
  };

  const loadPerformanceTrends = async () => {
    try {
      const data = await departmentAnalyticsAPI.getPerformanceTrends(
        selectedDepartment.id,
        timeframe
      );
      setPerformanceTrends(data);
    } catch (error) {
      console.error("Failed to load performance trends:", error);
      // Mock data
      setPerformanceTrends([
        { month: "Jan", avgScore: 72, completionRate: 65 },
        { month: "Feb", avgScore: 75, completionRate: 68 },
        { month: "Mar", avgScore: 78, completionRate: 72 },
        { month: "Apr", avgScore: 76, completionRate: 70 },
        { month: "May", avgScore: 80, completionRate: 75 },
        { month: "Jun", avgScore: 82, completionRate: 78 },
      ]);
    }
  };

  const loadEnrollmentTrends = async () => {
    try {
      const data = await departmentAnalyticsAPI.getEnrollmentTrends(
        selectedDepartment.id,
        timeframe
      );
      setEnrollmentTrends(data);
    } catch (error) {
      console.error("Failed to load enrollment trends:", error);
      // Mock data
      setEnrollmentTrends([
        { month: "Jan", enrollments: 145 },
        { month: "Feb", enrollments: 162 },
        { month: "Mar", enrollments: 178 },
        { month: "Apr", enrollments: 156 },
        { month: "May", enrollments: 189 },
        { month: "Jun", enrollments: 203 },
      ]);
    }
  };

  const loadInstructorAnalytics = async () => {
    try {
      const data = await departmentAnalyticsAPI.getInstructorAnalytics(
        selectedDepartment.id
      );
      setInstructorAnalytics(data);
    } catch (error) {
      console.error("Failed to load instructor analytics:", error);
      // Mock data
      setInstructorAnalytics({
        totalInstructors: 23,
        avgRating: 4.3,
        topInstructors: [
          { name: "Dr. Smith", courses: 5, rating: 4.9, students: 234 },
          { name: "Prof. Johnson", courses: 4, rating: 4.8, students: 198 },
          { name: "Dr. Williams", courses: 6, rating: 4.7, students: 267 },
        ],
      });
    }
  };

  const loadCompletionRates = async () => {
    try {
      const data = await departmentAnalyticsAPI.getCompletionRates(
        selectedDepartment.id
      );
      setCompletionRates(data);
    } catch (error) {
      console.error("Failed to load completion rates:", error);
      // Mock data
      setCompletionRates({
        overall: 78.5,
        byCourse: [
          { name: "Data Structures", rate: 85 },
          { name: "Web Development", rate: 82 },
          { name: "Machine Learning", rate: 75 },
          { name: "Database Systems", rate: 80 },
        ],
      });
    }
  };

  const loadDepartmentComparison = async () => {
    try {
      const data = await departmentAnalyticsAPI.getDepartmentComparison();
      setDepartmentComparison(data);
    } catch (error) {
      console.error("Failed to load department comparison:", error);
      // Mock data
      setDepartmentComparison([
        { department: "Computer Science", students: 1245, courses: 45, rating: 4.3 },
        { department: "Mathematics", students: 890, courses: 32, rating: 4.1 },
        { department: "Physics", students: 756, courses: 28, rating: 4.2 },
        { department: "Chemistry", students: 678, courses: 25, rating: 4.0 },
      ]);
    }
  };

  const handleExportData = () => {
    toast.success("Exporting analytics data...");
    // Implement export functionality
  };

  const handleRefresh = () => {
    loadAllAnalytics();
    toast.success("Analytics data refreshed");
  };

  const COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981"];

  if (loading && !overviewStats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-200 border-t-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-700 font-medium">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Department Analytics
              </h1>
              <p className="text-gray-600">
                Comprehensive insights and performance metrics
              </p>
            </div>

            <div className="flex items-center space-x-3">
              {/* Department Selector */}
              <div className="relative">
                <select
                  value={selectedDepartment?.id || ""}
                  onChange={(e) => {
                    const dept = departments.find(
                      (d) => d.id === e.target.value
                    );
                    setSelectedDepartment(dept);
                  }}
                  className="appearance-none bg-white border-2 border-gray-300 rounded-xl px-4 py-3 pr-10 text-sm font-medium text-gray-700 hover:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                >
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none"
                  size={18}
                />
              </div>

              {/* Timeframe Selector */}
              <div className="relative">
                <select
                  value={timeframe}
                  onChange={(e) => setTimeframe(e.target.value)}
                  className="appearance-none bg-white border-2 border-gray-300 rounded-xl px-4 py-3 pr-10 text-sm font-medium text-gray-700 hover:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
                <Calendar
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none"
                  size={18}
                />
              </div>

              {/* Action Buttons */}
              <button
                onClick={handleRefresh}
                className="p-3 bg-white border-2 border-gray-300 rounded-xl hover:bg-gray-50 hover:border-indigo-400 transition-all"
                title="Refresh data"
              >
                <RefreshCw size={18} className="text-gray-700" />
              </button>

              <button
                onClick={handleExportData}
                className="flex items-center space-x-2 px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-medium"
              >
                <Download size={18} />
                <span>Export</span>
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        {overviewStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatsCard
              icon={Users}
              title="Total Students"
              value={overviewStats.totalStudents.toLocaleString()}
              change={`+${overviewStats.studentGrowth}%`}
              positive={true}
              color="indigo"
            />
            <StatsCard
              icon={BookOpen}
              title="Active Courses"
              value={overviewStats.activeCourses}
              change={`+${overviewStats.courseGrowth}%`}
              positive={true}
              color="purple"
            />
            <StatsCard
              icon={Award}
              title="Completion Rate"
              value={`${overviewStats.completionRate}%`}
              change="+3.2%"
              positive={true}
              color="green"
            />
            <StatsCard
              icon={TrendingUp}
              title="Avg Course Rating"
              value={overviewStats.avgCourseRating}
              change="+0.3"
              positive={true}
              color="amber"
            />
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 mb-8">
          <div className="border-b border-gray-200">
            <div className="flex space-x-1 p-2">
              {[
                { id: "overview", label: "Overview", icon: BarChart3 },
                { id: "students", label: "Students", icon: Users },
                { id: "courses", label: "Courses", icon: BookOpen },
                { id: "instructors", label: "Instructors", icon: Award },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-medium transition-all ${
                    activeTab === tab.id
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <tab.icon size={18} />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="p-6">
            {activeTab === "overview" && (
              <OverviewTab
                performanceTrends={performanceTrends}
                enrollmentTrends={enrollmentTrends}
                completionRates={completionRates}
                departmentComparison={departmentComparison}
              />
            )}
            {activeTab === "students" && (
              <StudentsTab studentAnalytics={studentAnalytics} />
            )}
            {activeTab === "courses" && (
              <CoursesTab courseAnalytics={courseAnalytics} />
            )}
            {activeTab === "instructors" && (
              <InstructorsTab instructorAnalytics={instructorAnalytics} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Stats Card Component
const StatsCard = ({ icon: Icon, title, value, change, positive, color }) => {
  const colorClasses = {
    indigo: "from-indigo-500 to-purple-600",
    purple: "from-purple-500 to-pink-600",
    green: "from-green-500 to-emerald-600",
    amber: "from-amber-500 to-orange-600",
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-all">
      <div className="flex items-start justify-between mb-4">
        <div
          className={`p-3 rounded-xl bg-gradient-to-br ${colorClasses[color]} shadow-lg`}
        >
          <Icon size={24} className="text-white" />
        </div>
        <span
          className={`text-sm font-semibold px-2 py-1 rounded-full ${
            positive
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {change}
        </span>
      </div>
      <h3 className="text-gray-600 text-sm font-medium mb-1">{title}</h3>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
    </div>
  );
};

// Overview Tab Component
const OverviewTab = ({
  performanceTrends,
  enrollmentTrends,
  completionRates,
  departmentComparison,
}) => {
  return (
    <div className="space-y-8">
      {/* Performance Trends */}
      <div className="bg-gradient-to-br from-white to-indigo-50 rounded-2xl p-6 border border-indigo-100">
        <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center space-x-2">
          <Activity size={24} className="text-indigo-600" />
          <span>Performance Trends</span>
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={performanceTrends}>
            <defs>
              <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorCompletion" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="month" stroke="#6b7280" />
            <YAxis stroke="#6b7280" />
            <Tooltip
              contentStyle={{
                backgroundColor: "white",
                border: "2px solid #e5e7eb",
                borderRadius: "12px",
              }}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="avgScore"
              stroke="#6366f1"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorScore)"
              name="Avg Score"
            />
            <Area
              type="monotone"
              dataKey="completionRate"
              stroke="#10b981"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorCompletion)"
              name="Completion Rate"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Enrollment Trends */}
        <div className="bg-white rounded-2xl p-6 border-2 border-gray-200">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center space-x-2">
            <TrendingUp size={24} className="text-purple-600" />
            <span>Enrollment Trends</span>
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={enrollmentTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "white",
                  border: "2px solid #e5e7eb",
                  borderRadius: "12px",
                }}
              />
              <Bar dataKey="enrollments" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Completion Rates by Course */}
        <div className="bg-white rounded-2xl p-6 border-2 border-gray-200">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center space-x-2">
            <CheckCircle size={24} className="text-green-600" />
            <span>Completion Rates by Course</span>
          </h3>
          <div className="space-y-4">
            {completionRates?.byCourse.map((course, index) => (
              <div key={index}>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    {course.name}
                  </span>
                  <span className="text-sm font-bold text-indigo-600">
                    {course.rate}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-indigo-500 to-purple-600 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${course.rate}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Department Comparison */}
      <div className="bg-white rounded-2xl p-6 border-2 border-gray-200">
        <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center space-x-2">
          <BarChart3 size={24} className="text-amber-600" />
          <span>Department Comparison</span>
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-4 px-4 font-semibold text-gray-700">
                  Department
                </th>
                <th className="text-center py-4 px-4 font-semibold text-gray-700">
                  Students
                </th>
                <th className="text-center py-4 px-4 font-semibold text-gray-700">
                  Courses
                </th>
                <th className="text-center py-4 px-4 font-semibold text-gray-700">
                  Avg Rating
                </th>
              </tr>
            </thead>
            <tbody>
              {departmentComparison.map((dept, index) => (
                <tr
                  key={index}
                  className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <td className="py-4 px-4 font-medium text-gray-900">
                    {dept.department}
                  </td>
                  <td className="text-center py-4 px-4 text-gray-700">
                    {dept.students.toLocaleString()}
                  </td>
                  <td className="text-center py-4 px-4 text-gray-700">
                    {dept.courses}
                  </td>
                  <td className="text-center py-4 px-4">
                    <span className="inline-flex items-center space-x-1 px-3 py-1 bg-amber-100 text-amber-700 rounded-full font-semibold">
                      <Award size={14} />
                      <span>{dept.rating}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Students Tab Component
const StudentsTab = ({ studentAnalytics }) => {
  if (!studentAnalytics) return null;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Students by Year */}
        <div className="bg-gradient-to-br from-white to-purple-50 rounded-2xl p-6 border border-purple-100">
          <h3 className="text-xl font-bold text-gray-900 mb-6">
            Students by Year
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <RechartsPieChart>
              <Pie
                data={studentAnalytics.byYear}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => `${entry.year}: ${entry.count}`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="count"
              >
                {studentAnalytics.byYear.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
            </RechartsPieChart>
          </ResponsiveContainer>
        </div>

        {/* Student Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl p-6 border-2 border-indigo-200 shadow-md">
            <div className="flex items-center space-x-3 mb-3">
              <div className="p-3 bg-indigo-100 rounded-xl">
                <Users size={24} className="text-indigo-600" />
              </div>
            </div>
            <p className="text-gray-600 text-sm font-medium mb-1">
              Total Enrolled
            </p>
            <p className="text-3xl font-bold text-gray-900">
              {studentAnalytics.totalEnrolled.toLocaleString()}
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 border-2 border-green-200 shadow-md">
            <div className="flex items-center space-x-3 mb-3">
              <div className="p-3 bg-green-100 rounded-xl">
                <Activity size={24} className="text-green-600" />
              </div>
            </div>
            <p className="text-gray-600 text-sm font-medium mb-1">
              Active Students
            </p>
            <p className="text-3xl font-bold text-gray-900">
              {studentAnalytics.activeStudents.toLocaleString()}
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 border-2 border-purple-200 shadow-md">
            <div className="flex items-center space-x-3 mb-3">
              <div className="p-3 bg-purple-100 rounded-xl">
                <CheckCircle size={24} className="text-purple-600" />
              </div>
            </div>
            <p className="text-gray-600 text-sm font-medium mb-1">
              Completed Courses
            </p>
            <p className="text-3xl font-bold text-gray-900">
              {studentAnalytics.completedCourses.toLocaleString()}
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 border-2 border-amber-200 shadow-md">
            <div className="flex items-center space-x-3 mb-3">
              <div className="p-3 bg-amber-100 rounded-xl">
                <Target size={24} className="text-amber-600" />
              </div>
            </div>
            <p className="text-gray-600 text-sm font-medium mb-1">
              Avg Progress
            </p>
            <p className="text-3xl font-bold text-gray-900">
              {studentAnalytics.averageProgress}%
            </p>
          </div>
        </div>
      </div>

      {/* Top Performers */}
      <div className="bg-white rounded-2xl p-6 border-2 border-gray-200">
        <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center space-x-2">
          <Award size={24} className="text-amber-600" />
          <span>Top Performing Students</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {studentAnalytics.topPerformers.map((student, index) => (
            <div
              key={index}
              className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6 border-2 border-indigo-200"
            >
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  #{index + 1}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900">{student.name}</p>
                  <p className="text-sm text-gray-600">
                    {student.courses} courses
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Avg Score:</span>
                <span className="text-2xl font-bold text-indigo-600">
                  {student.avgScore}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Courses Tab Component
const CoursesTab = ({ courseAnalytics }) => {
  if (!courseAnalytics) return null;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Courses by Difficulty */}
        <div className="bg-white rounded-2xl p-6 border-2 border-gray-200">
          <h3 className="text-xl font-bold text-gray-900 mb-6">
            Courses by Difficulty Level
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={courseAnalytics.byDifficulty} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" stroke="#6b7280" />
              <YAxis dataKey="level" type="category" stroke="#6b7280" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "white",
                  border: "2px solid #e5e7eb",
                  borderRadius: "12px",
                }}
              />
              <Bar dataKey="count" fill="#6366f1" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Course Stats */}
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 border-2 border-indigo-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 font-medium mb-1">Total Courses</p>
                <p className="text-4xl font-bold text-gray-900">
                  {courseAnalytics.totalCourses}
                </p>
              </div>
              <div className="p-4 bg-indigo-100 rounded-2xl">
                <BookOpen size={32} className="text-indigo-600" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border-2 border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 font-medium mb-1">
                  Active Courses
                </p>
                <p className="text-4xl font-bold text-gray-900">
                  {courseAnalytics.activeCourses}
                </p>
              </div>
              <div className="p-4 bg-green-100 rounded-2xl">
                <Activity size={32} className="text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 border-2 border-amber-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 font-medium mb-1">
                  Avg Enrollment
                </p>
                <p className="text-4xl font-bold text-gray-900">
                  {courseAnalytics.avgEnrollment}
                </p>
              </div>
              <div className="p-4 bg-amber-100 rounded-2xl">
                <Users size={32} className="text-amber-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Courses */}
      <div className="bg-white rounded-2xl p-6 border-2 border-gray-200">
        <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center space-x-2">
          <TrendingUp size={24} className="text-indigo-600" />
          <span>Most Popular Courses</span>
        </h3>
        <div className="space-y-4">
          {courseAnalytics.topCourses.map((course, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-indigo-50 rounded-xl border border-gray-200 hover:shadow-md transition-all"
            >
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                  {index + 1}
                </div>
                <div>
                  <p className="font-bold text-gray-900">{course.name}</p>
                  <p className="text-sm text-gray-600">
                    {course.enrolled} students enrolled
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Award className="text-amber-500" size={20} />
                <span className="font-bold text-amber-600 text-lg">
                  {course.rating}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Instructors Tab Component
const InstructorsTab = ({ instructorAnalytics }) => {
  if (!instructorAnalytics) return null;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-8 border-2 border-indigo-200">
          <div className="flex items-center space-x-4 mb-4">
            <div className="p-4 bg-indigo-100 rounded-2xl">
              <Award size={32} className="text-indigo-600" />
            </div>
            <div>
              <p className="text-gray-600 font-medium">Total Instructors</p>
              <p className="text-4xl font-bold text-gray-900">
                {instructorAnalytics.totalInstructors}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-8 border-2 border-amber-200">
          <div className="flex items-center space-x-4 mb-4">
            <div className="p-4 bg-amber-100 rounded-2xl">
              <TrendingUp size={32} className="text-amber-600" />
            </div>
            <div>
              <p className="text-gray-600 font-medium">Average Rating</p>
              <p className="text-4xl font-bold text-gray-900">
                {instructorAnalytics.avgRating}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Top Instructors */}
      <div className="bg-white rounded-2xl p-6 border-2 border-gray-200">
        <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center space-x-2">
          <Award size={24} className="text-purple-600" />
          <span>Top Performing Instructors</span>
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {instructorAnalytics.topInstructors.map((instructor, index) => (
            <div
              key={index}
              className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border-2 border-purple-200 hover:shadow-lg transition-all"
            >
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-white font-bold text-2xl">
                  {instructor.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900 text-lg">
                    {instructor.name}
                  </p>
                  <div className="flex items-center space-x-1 text-amber-600">
                    <Award size={16} />
                    <span className="font-semibold">{instructor.rating}</span>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Courses:</span>
                  <span className="font-semibold text-gray-900">
                    {instructor.courses}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Students:</span>
                  <span className="font-semibold text-gray-900">
                    {instructor.students}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DepartmentAnalyticsDashboard;
