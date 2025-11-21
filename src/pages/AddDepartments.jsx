import React, { useState, useEffect } from 'react';
import { departmentAPI } from "../services/api";
import useAuthStore from "../store/useAuthStore";

const AddDepartments = () => {

  const [departments, setDepartments] = useState([]);
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const [existingDepartments, setExistingDepartments] = useState([]);
  const [newDepartmentName, setNewDepartmentName] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  const { user, college } = useAuthStore((state) => ({
    user: state.user,
    college: state.college,
  }));

  const collegeId = college?.id || user?.collegeId;
  const isSuperAdmin = useAuthStore((state) => state.isSuperAdmin?.())
    || user?.role?.toUpperCase() === 'SUPERADMIN'
    || user?.role === 'SUPERADMIN';

  const adminName = user?.name || user?.email || 'Admin';


  useEffect(() => {

    if (isSuperAdmin) {
      fetchInitialData();
    } else if (!isSuperAdmin && !collegeId) {


      setError('College ID not found. Please ensure you are logged in as an admin.');
      setLoading(false);
    } else {
      fetchInitialData();
    }
  }, [collegeId, isSuperAdmin]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      setError(null);

      const catalogResponse = await departmentAPI.getDepartments();

      if (!catalogResponse.data.success) {
        throw new Error('Failed to load departments catalog');
      }

      setDepartments(catalogResponse.data.data.items);

      // Only fetch existing departments if user is not superadmin and has collegeId
      if (!isSuperAdmin && collegeId) {
        await fetchExistingDepartments();
      }
    } catch (err) {
      setError('Error fetching departments: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchExistingDepartments = async () => {
    try {
      if (!collegeId) return;

      const response = await departmentAPI.getCollegeDepartments(collegeId);

      if (response.data.success) {
        const existingNames = response.data.data.map(dept => dept.name);
        setExistingDepartments(existingNames);
      }
    } catch (err) {
      console.error(err)
    }
  };

  const handleCheckboxChange = (departmentName) => {
    setSelectedDepartments(prev => {
      if (prev.includes(departmentName)) {
        return prev.filter(name => name !== departmentName);
      } else {
        return [...prev, departmentName];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedDepartments.length === availableDepartments.length) {
      setSelectedDepartments([]);
    } else {
      setSelectedDepartments(availableDepartments.map(dept => dept.name));
    }
  };

  const handleAddToCollege = async (e) => {
    e.preventDefault();

    if (selectedDepartments.length === 0) {
      alert('Please select at least one department');
      return;
    }

    if (!collegeId) {
      setError('College ID is required');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccessMessage('');

    try {
      const promises = selectedDepartments.map(departmentName =>
        departmentAPI.postDepartment({
          name: departmentName,
          collegeId: collegeId,
        }).catch(err => ({
          error: true,
          departmentName,
          message: err.response?.data?.message || err.message
        }))
      );

      const responses = await Promise.all(promises);

      const results = responses.map(r => {
        if (r.error) return r;
        return r.data;
      });

      const successResults = results.filter(r => r.success);
      const failureResults = results.filter(r => !r.success);

      if (successResults.length > 0) {
        setSuccessMessage(
          `Successfully added ${successResults.length} department${successResults.length > 1 ? 's' : ''} to the college!` +
          (failureResults.length > 0 ? ` (${failureResults.length} failed)` : '')
        );
        setSelectedDepartments([]);
        await fetchExistingDepartments();
        setTimeout(() => setSuccessMessage(''), 5000);
      } else {
        const errorMessage = failureResults[0]?.message || 'Failed to add departments';
        setError(`Error: ${errorMessage}`);
      }
    } catch (err) {
      setError('Error submitting departments: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ===== Superadmin Functions (Add to Catalog) =====
  const handleAddToCatalog = async (e) => {
    e.preventDefault();

    if (!newDepartmentName.trim()) {
      alert('Please enter a department name');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccessMessage('');

    try {
      const response = await departmentAPI.addDepartmentToCatalog({
        name: newDepartmentName.trim(),
      });

      if (response.data.success) {
        setSuccessMessage(`Successfully added "${newDepartmentName}" to the department catalog!`);
        setNewDepartmentName('');
        await fetchInitialData();
        setTimeout(() => setSuccessMessage(''), 5000);
      } else {
        setError(response.data.message || 'Failed to add department to catalog');
      }
    } catch (err) {
      if (err.response?.data?.message?.includes('already exists')) {
        setError(`"${newDepartmentName}" already exists in the catalog`);
      } else {
        setError('Error adding department to catalog: ' + err.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ===== Computed Values =====
  const availableDepartments = departments.filter(
    dept => !existingDepartments.includes(dept.name)
  );

  // ===== Rendering =====

  // Loading State
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-gray-600 text-lg">Loading departments...</p>
      </div>
    );
  }

  // Debug Panel - Shows what the component sees
  if (!isSuperAdmin && !collegeId) {
    return (
      <div className="max-w-2xl mx-auto my-8 p-8 bg-white rounded-lg shadow-md">
        <div className="mb-6 p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded">
          <p className="font-semibold text-yellow-900">Debug Information</p>
          <pre className="text-xs mt-2 text-yellow-800 overflow-auto">
            {`User: ${JSON.stringify(user, null, 2)}
College: ${JSON.stringify(college, null, 2)}
CollegeId: ${collegeId}
IsSuperAdmin: ${isSuperAdmin}`}
          </pre>
        </div>
        <div className="p-4 bg-red-50 text-red-700 border-l-4 border-red-500 rounded">
          <p className="font-semibold">Error</p>
          <p>{error || 'College ID not found. Please login again.'}</p>
        </div>
      </div>
    );
  }

  return (
  <div className="max-w-5xl mx-auto my-8 p-6 bg-white rounded-2xl shadow-lg">
    {/* Header */}
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800">
          {isSuperAdmin ? "Department Management" : "Add Departments"}
        </h2>
        <div className="mt-2 text-sm text-slate-500">
          {isSuperAdmin && (
            <span className="inline-flex items-center gap-2 px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-semibold">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M12 11c0 1.657-1.343 3-3 3s-3-1.343-3-3 1.343-3 3-3 3 1.343 3 3z" />
                <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M21 12v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6" />
              </svg>
              Superadmin Access
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 bg-slate-50 rounded-md px-2 py-1">
          <button
            type="button"
            onClick={() => {}}
            className="px-3 py-1 text-sm rounded-md text-slate-600 hover:bg-white"
            aria-pressed="true"
          >
            List
          </button>
          <button type="button" onClick={() => {}} className="px-3 py-1 text-sm rounded-md text-slate-600 hover:bg-white">
            Grid
          </button>
        </div>

        <button
          type="button"
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-md shadow-sm text-sm"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
          </svg>
          New
        </button>
      </div>
    </div>

    {/* Alerts */}
    <div className="space-y-3 mb-4">
      {error && <div className="p-3 rounded-md bg-red-50 text-red-700 border-l-4 border-red-400">{error}</div>}
      {successMessage && <div className="p-3 rounded-md bg-green-50 text-green-700 border-l-4 border-green-400">{successMessage}</div>}
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left column - Add / Summary */}
      <aside className="space-y-4">
        {isSuperAdmin ? (
          <form onSubmit={handleAddToCatalog} className="p-4 bg-gradient-to-b from-white to-slate-50 rounded-lg border border-slate-100">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-indigo-50">
                <svg className="w-5 h-5 text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="2" />
                </svg>
              </div>
              <div className="flex-1">
                <label htmlFor="departmentName" className="block text-sm font-medium text-slate-700">
                  Department Name
                </label>
                <input
                  id="departmentName"
                  type="text"
                  value={newDepartmentName}
                  onChange={(e) => setNewDepartmentName(e.target.value)}
                  placeholder="e.g., Computer Science"
                  maxLength={100}
                  disabled={submitting}
                  className="mt-2 w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
                <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
                  <span>{newDepartmentName.length}/100</span>
                  <button
                    type="submit"
                    disabled={submitting || !newDepartmentName.trim()}
                    className={`inline-flex items-center gap-2 px-3 py-1 rounded-md text-white text-sm ${submitting || !newDepartmentName.trim() ? 'bg-slate-300' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                  >
                    {submitting ? (
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <circle cx="12" cy="12" r="10" strokeWidth="4" className="opacity-25" />
                        <path d="M4 12a8 8 0 018-8" strokeWidth="4" className="opacity-75" />
                      </svg>
                    ) : null}
                    Add to Catalog
                  </button>
                </div>
                <p className="mt-2 text-xs text-slate-400">Added departments appear in the global catalog for all colleges.</p>
              </div>
            </div>
          </form>
        ) : (
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded bg-slate-100">
                <svg className="w-5 h-5 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M3 7h18M3 12h18M3 17h18" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-medium text-slate-700">Already Added</div>
                <div className="text-xs text-slate-400">{existingDepartments.length} departments</div>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {existingDepartments.length ? (
                existingDepartments.map((dept) => (
                  <span key={dept} className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-sm">
                    {dept}
                  </span>
                ))
              ) : (
                <div className="text-sm text-slate-500">No departments added yet.</div>
              )}
            </div>
          </div>
        )}

        <div className="p-4 rounded-lg bg-white border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-slate-700">Catalog Overview</div>
            <div className="text-xs text-slate-400">{departments.length} total</div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <div className="p-2 bg-slate-50 rounded">
              <div className="text-xs text-slate-500">Available</div>
              <div className="font-semibold">{availableDepartments.length}</div>
            </div>
            <div className="p-2 bg-slate-50 rounded">
              <div className="text-xs text-slate-500">Assigned</div>
              <div className="font-semibold">{existingDepartments.length}</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Right column - Search + List */}
      <main className="lg:col-span-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 w-full sm:w-2/3">
            <div className="flex items-center w-full bg-slate-50 border border-slate-100 rounded-md px-3 py-2">
              <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="11" cy="11" r="7" strokeWidth="2" />
                <path d="M21 21l-4.35-4.35" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <input
                aria-label="Search departments"
                placeholder="Search available departments..."
                className="ml-2 w-full bg-transparent text-sm outline-none"
                onChange={() => {}}
              />
            </div>

            <select className="ml-2 text-sm border border-slate-100 rounded-md px-2 py-1 bg-white">
              <option>Sort A → Z</option>
              <option>Sort Z → A</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={handleSelectAll} type="button" className="px-3 py-2 rounded-md border bg-white text-sm">
              {selectedDepartments.length === availableDepartments.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>
        </div>

        {/* Available Departments */}
        {availableDepartments.length === 0 ? (
          <div className="p-8 rounded-lg border-2 border-dashed border-slate-200 text-center text-slate-500">
            <svg className="mx-auto w-12 h-12 mb-2 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M9 12l2 2 4-4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="12" cy="12" r="9" strokeWidth="2" />
            </svg>
            <div className="font-medium">All departments added!</div>
            <div className="text-sm mt-1">Your college has all available departments.</div>
          </div>
        ) : (
          <form onSubmit={handleAddToCollege}>
            <div className="max-h-96 overflow-y-auto pr-2 space-y-3">
              {availableDepartments.map((department) => (
                <label
                  key={department.key}
                  className="flex items-center p-3 gap-3 bg-white rounded-lg border border-slate-100 hover:shadow-sm transition"
                >
                  <input
                    type="checkbox"
                    name="departments"
                    value={department.name}
                    checked={selectedDepartments.includes(department.name)}
                    onChange={() => handleCheckboxChange(department.name)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-200"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-800 truncate">{department.name}</div>
                    <div className="text-xs text-slate-400">Key: {department.key}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" title="Remove" onClick={() => {}} className="p-1 rounded hover:bg-slate-50">
                      <svg className="w-4 h-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M3 6h18" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M8 6v14a2 2 0 002 2h4a2 2 0 002-2V6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M10 11v6M14 11v6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>
                </label>
              ))}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-4">
              <div className="text-sm text-slate-600">
                {selectedDepartments.length} department{selectedDepartments.length !== 1 ? 's' : ''} selected
              </div>

              <button
                type="submit"
                disabled={submitting || selectedDepartments.length === 0}
                className={`px-4 py-2 rounded-md text-white font-semibold ${submitting || selectedDepartments.length === 0 ? 'bg-slate-300' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {submitting ? 'Adding...' : `Add Department${selectedDepartments.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>

    <div className="mt-6 text-xs text-slate-400">Tip: Use search to quickly find departments. Superadmins can add to the global catalog.</div>
  </div>
);

};

export default AddDepartments;
