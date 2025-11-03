import React, { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  Search,
  Grid as Grid3X3,
  List,
  SlidersHorizontal,
  X,
  Star,
  Clock,
  Users,
  Play,
  Share2,
  Heart,
} from "lucide-react";
import { useRef } from "react";
import Button from "../components/ui/Button";
import useAuthStore from "../store/useAuthStore";
import {
  coursesAPI,
  enrollmentsAPI,
  collegesAPI,
  FALLBACK_THUMB,
} from "../services/api";

const CourseCatalogPage = () => {
  const { user, isAuthenticated, hasHydrated } = useAuthStore();
  const navigate = useNavigate();
  const errorShownRef = useRef(false);
  const [courses, setCourses] = useState([]);
  const [colleges, setColleges] = useState([]);
  const [selectedCollege, setSelectedCollege] = useState("all");
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedLevel, setSelectedLevel] = useState("all");
  const [priceRange, setPriceRange] = useState([0, 500]);
  const [sortBy, setSortBy] = useState("popular");
  const [viewMode, setViewMode] = useState("grid");
  const [showFilters, setShowFilters] = useState(false);
  const [pendingRequests, setPendingRequests] = useState(new Set());
  const [favorites, setFavorites] = useState([]);
  const [isMobileScreen, setIsMobileScreen] = useState(false);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const levels = ["Beginner", "Intermediate", "Advanced"];
  const roleLower = String(user?.role || user?.userRole || "").toLowerCase();

  const isInstructor = roleLower === "instructor";
  const isAdmin = roleLower === "admin";




const roleStr = useMemo(
  () => String(user?.role || user?.userRole || "").toLowerCase(),
  [user]
);
const isSuperAdmin = roleStr === "superadmin";
const isStudent    = roleStr === "student";

const resolvedCollegeId = useMemo(
  () => user?.collegeId ?? user?.college?.id ?? null,
  [user]
);

// SUPERADMIN: optional filter by selectedCollege
// OTHERS: use resolved college
const effectiveCollegeId = useMemo(
  () =>
    isSuperAdmin
      ? (selectedCollege !== "all" ? selectedCollege : undefined)
      : (resolvedCollegeId ?? undefined),
  [isSuperAdmin, selectedCollege, resolvedCollegeId]
);

  useEffect(() => {
    const handler = () => setIsMobileScreen(window.innerWidth < 1024);
    handler();
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

useEffect(() => {
  if (!hasHydrated || !isAuthenticated || !isSuperAdmin) return;
  (async () => {
    try {
      const res = await collegesAPI.list();
      const arr = Array.isArray(res?.data?.data?.items)
        ? res.data.data.items
        : Array.isArray(res?.data?.data)
        ? res.data.data
        : res?.data || [];
      setColleges(arr);
    } catch {
      // non-blocking
    }
  })();
}, [hasHydrated, isAuthenticated, isSuperAdmin]);

const fetchCourses = async () => {
  setLoading(true);
  try {
    if (!hasHydrated || !isAuthenticated) {
      setCourses([]);
      return;
    }

    // 2) Use the hoisted values here (do NOT redeclare them)
    if (!isSuperAdmin && !effectiveCollegeId && !isStudent) {
      setCourses([]);
      if (!errorShownRef.current) {
        errorShownRef.current = true;
        toast.error("Your account has no college assigned. Please contact admin.");
      }
      return;
    }

    const buildParams = (view) => ({
      view,
      collegeId: effectiveCollegeId || undefined,
      search: searchTerm || undefined,
      category: selectedCategory !== "all" ? selectedCategory : undefined,
      page: 1,
      pageSize: 100,
    });

    const tryRequest = async (params) => coursesAPI.getCourseCatalog(params);

    let res;
    try {
      res = await tryRequest(buildParams("catalog"));
    } catch (err) {
      const status = err?.response?.status;
      const serverMsg = err?.response?.data?.error || err?.response?.data?.message || "";
      const isUnknownView = status === 400 && /unknown view/i.test(serverMsg);

      if (isUnknownView) {
        const fallbackView = isSuperAdmin ? "all" : (isStudent ? "enrolled" : "assigned");
        res = await tryRequest(buildParams(fallbackView));
      } else if (status === 401) {
        if (!errorShownRef.current) {
          errorShownRef.current = true;
          toast.error("Session expired. Please log in again.");
        }
        navigate("/login");
        return;
      } else if (status === 403) {
        if (!errorShownRef.current) {
          errorShownRef.current = true;
          toast.error("You don’t have permission to view these courses.");
        }
        return;
      } else {
        if (!errorShownRef.current) {
          errorShownRef.current = true;
          toast.error(serverMsg || "Failed to fetch courses.");
        }
        console.error("Courses fetch failed:", status, err?.response?.data);
        return;
      }
    }

    const payload = res?.data || res || {};
    const list = Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload?.items)
      ? payload.items
      : Array.isArray(payload)            // allow bare array
      ? payload
      : [];

    const normalized = list.map((c) => ({
      id: c.id,
      title: c.title || "Untitled Course",
      description: c.description || "",
      thumbnail: c.thumbnail || FALLBACK_THUMB,
      category: c.category || "general",
      level: c.level || "Beginner",
      price: c.price ?? 0,
      rating: c.rating ?? 0,
      reviewCount: c.reviewCount ?? 0,
      duration: c.estimatedDuration || "—",
      enrolledStudents: c.enrolledStudents ?? 0,
      instructor: c.instructor || null,
      collegeId: c.collegeId || undefined,
      progress: c.progress,
      createdAt: c.createdAt || null,
      estimatedDuration: c.estimatedDuration || null,
    }));

    setCourses(normalized);
  } catch (error) {
    const msg = error?.response?.data?.error || error?.response?.data?.message || "Failed to fetch courses.";
    if (!errorShownRef.current) {
      errorShownRef.current = true;
      toast.error(msg);
    }
    console.error("Courses fetch fatal:", error?.response?.status, error?.response?.data);
  } finally {
    setLoading(false);
  }
};


useEffect(() => {
  if (!hasHydrated) return;
  fetchCourses();
}, [
  hasHydrated,
  isAuthenticated,
  isSuperAdmin,        
  effectiveCollegeId,  
  searchTerm,
  selectedCategory,
  selectedLevel,
  sortBy,
]);

 useEffect(() => {
    if (!hasHydrated || !isAuthenticated || !isStudent) {
      setPendingRequests(new Set());
      return;
    }
    (async () => {
      try {
        const res = await enrollmentsAPI.listSelfEnrollmentRequests();
        const requests = Array.isArray(res?.data) ? res.data : res || [];
        const pending = new Set(
          requests
            .filter((r) => String(r.status || "").toUpperCase() === "PENDING")
            .map((r) => r.courseId)
            .filter(Boolean)
        );
        setPendingRequests(pending);
      } catch {
        // ignore non-blocking
      }
    })();
  }, [hasHydrated, isAuthenticated, isStudent]);

  const getCategoryColor = (category) => {
    const colors = {
      programming: "bg-blue-100 text-blue-800",
      design: "bg-purple-100 text-purple-800",
      business: "bg-green-100 text-green-800",
      marketing: "bg-yellow-100 text-yellow-800",
      "data-science": "bg-red-100 text-red-800",
      language: "bg-indigo-100 text-indigo-800",
      music: "bg-pink-100 text-pink-800",
      photography: "bg-orange-100 text-orange-800",
      general: "bg-gray-100 text-gray-800",
    };
    return (
      colors[(category || "general").toLowerCase()] ||
      "bg-gray-100 text-gray-800"
    );
  };

  const getLevelColor = (level) => {
    const colors = {
      beginner: "bg-green-100 text-green-800",
      intermediate: "bg-yellow-100 text-yellow-800",
      advanced: "bg-red-100 text-red-800",
    };
    return (
      colors[(level || "beginner").toLowerCase()] || "bg-gray-100 text-gray-800"
    );
  };

  const categories = useMemo(
    () => [
      { id: "all", name: "All Categories", count: 0 },
      { id: "programming", name: "Programming", count: 0 },
      { id: "design", name: "Design", count: 0 },
      { id: "business", name: "Business", count: 0 },
      { id: "marketing", name: "Marketing", count: 0 },
      { id: "data-science", name: "Data Science", count: 0 },
      { id: "language", name: "Language Learning", count: 0 },
      { id: "music", name: "Music", count: 0 },
      { id: "photography", name: "Photography", count: 0 },
    ],
    []
  );

  useEffect(() => {
    let filtered = [...courses];

    if (selectedLevel !== "all") {
      filtered = filtered.filter(
        (c) => (c.level || "").toLowerCase() === selectedLevel.toLowerCase()
      );
    }

    filtered = filtered.filter((c) => {
      const price = Number(c.price || 0);
      return price >= priceRange[0] && price <= priceRange[1];
    });

    switch (sortBy) {
      case "newest":
        filtered.sort(
          (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
        );
        break;
      case "rating":
        filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case "price-low":
        filtered.sort((a, b) => (a.price || 0) - (b.price || 0));
        break;
      case "price-high":
        filtered.sort((a, b) => (b.price || 0) - (a.price || 0));
        break;
      case "duration": {
        const toNum = (val) => {
          const n = parseInt(val, 10);
          return Number.isNaN(n) ? 0 : n;
        };
        filtered.sort(
          (a, b) => toNum(a.estimatedDuration) - toNum(b.estimatedDuration)
        );
        break;
      }
      default:
        filtered.sort(
          (a, b) => (b.enrolledStudents || 0) - (a.enrolledStudents || 0)
        );
    }

    setFilteredCourses(filtered);
  }, [courses, selectedLevel, priceRange, sortBy]);

  const toggleFavorite = (courseId) => {
    setFavorites((prev) =>
      prev.includes(courseId)
        ? prev.filter((id) => id !== courseId)
        : [...prev, courseId]
    );
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedCategory("all");
    setSelectedLevel("all");
    setPriceRange([0, 500]);
    setSortBy("popular");
  };

  const handleEnrollRequest = async (course) => {
    if (!isAuthenticated) {
      navigate("/login", { state: { next: `/courses/${course.id}` } });
      return;
    }
    const role = user?.role || user?.userRole;
    if (role && String(role).toLowerCase() !== "student") {
      toast.error("Only students can request enrollment.");
      return;
    }
    if (pendingRequests.has(course.id)) {
      toast("Enrollment already requested. Awaiting instructor approval.");
      return;
    }

    try {
      await enrollmentsAPI.requestEnrollment(course.id);
      setPendingRequests((prev) => new Set(prev).add(course.id));
      toast.success(
        "Request sent to the instructor. You’ll be notified on approval."
      );
    } catch (e) {
      const msg =
        e?.response?.data?.error ||
        e?.response?.data?.message ||
        "Could not send request.";
      toast.error(msg);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-gradient-to-r from-primary-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4">
              Discover Your Next Learning Adventure
            </h1>
            <p className="text-sm sm:text-base text-primary-100 max-w-2xl mx-auto mb-6 sm:mb-8 px-4">
              Explore courses from expert instructors. Transform your skills and
              advance your career.
            </p>
            <div className="max-w-2xl mx-auto px-4">
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  size={18}
                />
                <input
                  type="text"
                  placeholder="Search for courses, instructors, or topics..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-11 pr-4 py-2 sm:py-3 text-gray-900 bg-white rounded-xl shadow-lg focus:ring-4 focus:ring-white/20 focus:outline-none text-sm sm:text-base"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      // update server-side search as well
                      fetchCourses();
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar & Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-center gap-3 w-full md:w-auto">
              <Button
                variant={showFilters ? "primary" : "outline"}
                className="w-full md:w-auto"
                onClick={() => setShowFilters(!showFilters)}
              >
                <SlidersHorizontal size={16} className="mr-2" />
                Filters
              </Button>

              <div className="flex items-center justify-between sm:justify-start space-x-2 ml-auto md:ml-0">
                <span className="text-sm text-gray-600 hidden sm:inline">
                  View:
                </span>
                <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`p-2 ${
                      viewMode === "grid"
                        ? "bg-primary-600 text-white"
                        : "bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                    aria-label="Grid view"
                  >
                    <Grid3X3 size={16} />
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={`p-2 ${
                      viewMode === "list"
                        ? "bg-primary-600 text-white"
                        : "bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                    aria-label="List view"
                  >
                    <List size={16} />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-3 md:mt-0">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600 hidden sm:inline">
                  Sort by:
                </span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-2 sm:px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="popular">Most Popular</option>
                  <option value="newest">Newest First</option>
                  <option value="rating">Highest Rated</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="duration">Duration</option>
                </select>
              </div>

              <div className="text-xs sm:text-sm text-gray-600 text-center sm:text-left">
                Showing {filteredCourses.length} of {courses.length} courses
              </div>
            </div>
          </div>

          {/* Inline filters panel (no external Card dependency) */}
          {showFilters && (
            <div className="p-4 sm:p-6 mb-4 sm:mb-6 mt-4 bg-white rounded-xl border border-gray-200">
              <FilterForm
                categories={categories}
                levels={levels}
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                selectedLevel={selectedLevel}
                setSelectedLevel={setSelectedLevel}
                clearFilters={clearFilters}
                colleges={colleges}
                selectedCollege={
                  isStudent ? user?.collegeId || "all" : selectedCollege
                }
                setSelectedCollege={isStudent ? () => {} : setSelectedCollege}
                isStudent={isStudent}
              />
            </div>
          )}
        </div>

        {/* Results */}
        {filteredCourses.length === 0 ? (
          <div className="text-center py-16">
            <h3 className="text-xl font-medium text-gray-900 mb-2">
              No courses found
            </h3>
            <p className="text-gray-600 mb-4">
              Try adjusting your search terms or filters.
            </p>
            <Button onClick={clearFilters}>Clear Filters</Button>
          </div>
        ) : (
          <div
            className={
              viewMode === "grid"
                ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6"
                : "space-y-4 sm:space-y-6"
            }
          >
            {filteredCourses.map((course) =>
              viewMode === "grid" ? (
                <CourseCard
                  key={course.id}
                  course={course}
                  isFavorite={favorites.includes(course.id)}
                  onToggleFavorite={() => toggleFavorite(course.id)}
                  onEnroll={() => handleEnrollRequest(course)}
                  isPending={pendingRequests.has(course.id)}
                  getCategoryColor={getCategoryColor}
                  getLevelColor={getLevelColor}
                />
              ) : (
                <CourseListItem
                  key={course.id}
                  course={course}
                  isFavorite={favorites.includes(course.id)}
                  onToggleFavorite={() => toggleFavorite(course.id)}
                  onEnroll={() => handleEnrollRequest(course)}
                  isPending={pendingRequests.has(course.id)}
                  getCategoryColor={getCategoryColor}
                  getLevelColor={getLevelColor}
                />
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const FilterForm = ({
  categories,
  levels,
  selectedCategory,
  setSelectedCategory,
  selectedLevel,
  setSelectedLevel,
  selectedCollege,
  setSelectedCollege,
  colleges,
  clearFilters,
  isStudent,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Category
        </label>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="w-full px-2 sm:px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
        >
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Level
        </label>
        <select
          value={selectedLevel}
          onChange={(e) => setSelectedLevel(e.target.value)}
          className="w-full px-2 sm:px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
        >
          {levels.map((level) => (
            <option key={level} value={level}>
              {level}
            </option>
          ))}
        </select>
      </div>

      {/* Institution filter disabled for students (always their college) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Institution
        </label>
        <select
          value={selectedCollege}
          onChange={(e) => setSelectedCollege(e.target.value)}
          disabled={isStudent}
          className="w-full px-2 sm:px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100"
        >
          <option value="all">All Institutions</option>
          {colleges.map((college) => (
            <option key={college.id} value={college.id}>
              {college.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-end">
        <Button
          type="button"
          variant="outline"
          onClick={clearFilters}
          className="w-full"
        >
          Clear
        </Button>
      </div>
    </div>
  );
};

const CourseCard = ({
  course,
  isFavorite,
  onToggleFavorite,
  onEnroll,
  isPending,
  getCategoryColor,
  getLevelColor,
}) => {
  return (
    <div className="overflow-hidden rounded-xl bg-white border border-gray-200 hover:shadow-lg transition-all duration-300 group">
      <div className="relative bg-gradient-to-br from-primary-100 to-primary-200 h-40 sm:aspect-video overflow-hidden">
        <img
          src={course.thumbnail}
          alt={course.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => (e.currentTarget.src = FALLBACK_THUMB)}
        />
        <div className="absolute top-3 right-3 flex space-x-2">
          <button
            onClick={onToggleFavorite}
            className={`p-2 rounded-full transition-colors ${
              isFavorite
                ? "bg-red-500 text-white"
                : "bg-white/80 text-gray-600 hover:bg-white"
            }`}
            aria-label="Toggle favorite"
          >
            <Heart size={16} className={isFavorite ? "fill-current" : ""} />
          </button>
          <button className="p-2 rounded-full bg-white/80 text-gray-600 hover:bg-white transition-colors">
            <Share2 size={16} />
          </button>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2 flex-wrap">
            <span
              className={`text-xs px-2 py-1 rounded ${getCategoryColor(
                course.category
              )}`}
            >
              {course.category}
            </span>
            <span
              className={`text-xs px-2 py-1 rounded ${getLevelColor(
                course.level
              )}`}
            >
              {course.level}
            </span>
          </div>
          <div className="flex items-center space-x-1 text-sm">
            <Star size={14} className="text-yellow-400 fill-current" />
            <span className="font-medium text-gray-700">
              {course.rating ?? 0}
            </span>
            <span className="text-gray-500">({course.reviewCount ?? 0})</span>
          </div>
        </div>

        <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-primary-600 transition-colors">
          {course.title}
        </h3>

        {course.description && (
          <p className="text-gray-600 text-sm mb-4 line-clamp-2">
            {course.description}
          </p>
        )}

        <div className="flex items-center justify-between text-sm text-gray-500 mb-4 flex-wrap">
          <div className="flex items-center space-x-1">
            <Clock size={14} />
            <span>{course.duration}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Users size={14} />
            <span>{course.enrolledStudents} students</span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="text-xl font-bold text-gray-900">
            {course.price === 0 ? (
              <span className="text-green-600">Free</span>
            ) : (
              <span>₹{course.price}</span>
            )}
          </div>

          <div>
            {course.progress !== undefined ? (
              <Link to={`/courses/${course.id}`}>
                <Button size="sm">
                  <Play size={16} className="mr-1" />
                  Continue
                </Button>
              </Link>
            ) : isPending ? (
              <Button size="sm" variant="outline" disabled>
                Requested
              </Button>
            ) : (
              <Button size="sm" onClick={onEnroll}>
                Enroll
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const CourseListItem = ({
  course,
  isFavorite,
  onToggleFavorite,
  onEnroll,
  isPending,
  getCategoryColor,
  getLevelColor,
}) => {
  return (
    <div className="overflow-hidden rounded-xl bg-white border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex flex-col sm:flex-row">
        <div className="w-full sm:w-48 h-48 sm:h-32 bg-gradient-to-br from-primary-100 to-primary-200 flex-shrink-0 overflow-hidden">
          <img
            src={course.thumbnail}
            alt={course.title}
            className="w-full h-full object-cover"
            onError={(e) => (e.currentTarget.src = FALLBACK_THUMB)}
          />
        </div>

        <div className="flex-1 p-4 sm:p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-2 flex-wrap">
                <span
                  className={`text-xs px-2 py-1 rounded ${getCategoryColor(
                    course.category
                  )}`}
                >
                  {course.category}
                </span>
                <span
                  className={`text-xs px-2 py-1 rounded ${getLevelColor(
                    course.level
                  )}`}
                >
                  {course.level}
                </span>
                <div className="flex items-center space-x-1 text-sm">
                  <Star size={14} className="text-yellow-400 fill-current" />
                  <span className="font-medium text-gray-700">
                    {course.rating ?? 0}
                  </span>
                  <span className="text-gray-500">
                    ({course.reviewCount ?? 0})
                  </span>
                </div>
              </div>

              <h3 className="text-lg font-semibold text-gray-900 mb-2 hover:text-primary-600 transition-colors line-clamp-2">
                {course.title}
              </h3>

              {course.description && (
                <p className="text-gray-600 mb-3 line-clamp-2">
                  {course.description}
                </p>
              )}

              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <div className="flex items-center space-x-1">
                  <Clock size={14} />
                  <span>{course.duration}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Users size={14} />
                  <span>{course.enrolledStudents} students</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-end space-y-3 mt-4 sm:mt-0">
              <div className="flex space-x-2">
                <button
                  onClick={onToggleFavorite}
                  className={`p-2 rounded-full transition-colors ${
                    isFavorite
                      ? "bg-red-100 text-red-600"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  <Heart
                    size={16}
                    className={isFavorite ? "fill-current" : ""}
                  />
                </button>
                <button className="p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">
                  <Share2 size={16} />
                </button>
              </div>

              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {course.price === 0 ? (
                    <span className="text-green-600">Free</span>
                  ) : (
                    <span>₹{course.price}</span>
                  )}
                </div>

                <div>
                  {course.progress !== undefined ? (
                    <Link to={`/courses/${course.id}`}>
                      <Button size="sm">
                        <Play size={16} className="mr-1" />
                        Continue
                      </Button>
                    </Link>
                  ) : isPending ? (
                    <Button size="sm" variant="outline" disabled>
                      Requested
                    </Button>
                  ) : (
                    <Button size="sm" onClick={onEnroll}>
                      Enroll
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseCatalogPage;
