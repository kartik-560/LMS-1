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
  const isSuperAdmin = user?.role?.toUpperCase() === 'SUPERADMIN'

    || user?.isSuperAdmin === true
    || user?.isSuperAdmin === 'true'
    || user?.is_superadmin === true
    || user?.type === 'superadmin';

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
    <div className="max-w-4xl mx-auto my-8 p-8 bg-white rounded-lg shadow-md">
      {/* Header Section */}
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-gray-800">
          {isSuperAdmin ? 'Department Management' : 'Add Departments'}
        </h2>
        <div className="text-sm text-gray-600 mt-2">
          <p>Admin: <span className="font-semibold">{adminName}</span></p>
          {collegeId && (
            <p>College ID: <span className="font-semibold">{collegeId}</span></p>
          )}
          {isSuperAdmin && (
            <p className="mt-1 inline-block px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-semibold">
              🔐 Superadmin Access
            </p>
          )}
        </div>
      </div>

      {/* Alert Messages */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 border-l-4 border-red-500 rounded">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 text-green-700 border-l-4 border-green-500 rounded">
          {successMessage}
        </div>
      )}

      {/* Conditional Rendering Based on Role */}
      {isSuperAdmin ? (
        // ===== SUPERADMIN VIEW =====
        <div>
          <div className="bg-purple-50 border-l-4 border-purple-500 p-4 mb-6 rounded">
            <p className="text-purple-900 font-medium">🔐 Superadmin Only</p>
            <p className="text-purple-800 text-sm mt-1">Add new departments to the global catalog that will be available for all colleges to add.</p>
          </div>

          <form onSubmit={handleAddToCatalog} className="bg-gray-50 p-6 rounded-lg border border-gray-200">
            <div className="mb-6">
              <label htmlFor="departmentName" className="block text-sm font-semibold text-gray-700 mb-2">
                Department Name
              </label>
              <input
                type="text"
                id="departmentName"
                value={newDepartmentName}
                onChange={(e) => setNewDepartmentName(e.target.value)}
                placeholder="e.g., Computer Science, Business Administration"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition"
                disabled={submitting}
                maxLength="100"
              />
              <p className="text-gray-500 text-xs mt-1">{newDepartmentName.length}/100 characters</p>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting || !newDepartmentName.trim()}
                className={`px-6 py-2 rounded-md font-semibold text-white transition duration-200 ${submitting || !newDepartmentName.trim()
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-purple-600 hover:bg-purple-700 active:bg-purple-800'
                  }`}
              >
                {submitting ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Adding...
                  </span>
                ) : (
                  'Add to Catalog'
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
            <p className="text-blue-900 font-medium text-sm">📝 Note</p>
            <p className="text-blue-800 text-sm mt-1">New departments added here will appear in the global catalog and become available for all colleges to add to their departments.</p>
          </div>

          {/* Show all departments in catalog */}
          <div className="mt-6">
            <h3 className="text-xl font-semibold text-gray-700 mb-4">Current Department Catalog ({departments.length})</h3>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 max-h-80 overflow-y-auto">
              {departments.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {departments.map(dept => (
                    <span key={dept.key} className="bg-blue-100 text-blue-800 px-3 py-1 rounded text-sm">
                      {dept.name}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center">No departments in catalog</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        // ===== REGULAR ADMIN VIEW =====
        <div>
          {existingDepartments.length > 0 && (
            <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
              <p className="text-blue-900 font-medium">Already Added Departments ({existingDepartments.length}):</p>
              <div className="text-blue-800 text-sm mt-2 flex flex-wrap gap-2">
                {existingDepartments.map(dept => (
                  <span key={dept} className="bg-blue-200 px-3 py-1 rounded">
                    {dept}
                  </span>
                ))}
              </div>
            </div>
          )}

          {availableDepartments.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-gray-600 text-lg font-medium mt-4">All departments added!</p>
              <p className="text-gray-500 text-sm mt-1">Your college has all available departments.</p>
            </div>
          ) : (
            <form onSubmit={handleAddToCollege}>
              <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-gray-200">
                <h3 className="text-xl font-semibold text-gray-700">
                  Available Departments ({availableDepartments.length})
                </h3>
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-md text-sm font-medium text-gray-700 transition duration-200"
                >
                  {selectedDepartments.length === availableDepartments.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              <div className="space-y-3 mb-8 max-h-96 overflow-y-auto pr-2">
                {availableDepartments.map((department) => (
                  <label
                    key={department.key}
                    className="flex items-center p-3 cursor-pointer hover:bg-gray-50 rounded-md transition duration-150"
                  >
                    <input
                      type="checkbox"
                      name="departments"
                      value={department.name}
                      checked={selectedDepartments.includes(department.name)}
                      onChange={() => handleCheckboxChange(department.name)}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="ml-3 text-gray-800 font-medium select-none">
                      {department.name}
                    </span>
                  </label>
                ))}
              </div>

              <div className="flex items-center justify-between pt-6 border-t border-gray-200">
                <div className="text-gray-600 text-sm font-medium">
                  {selectedDepartments.length} department{selectedDepartments.length !== 1 ? 's' : ''} selected
                </div>
                <button
                  type="submit"
                  disabled={submitting || selectedDepartments.length === 0}
                  className={`px-6 py-2 rounded-md font-semibold text-white transition duration-200 ${submitting || selectedDepartments.length === 0
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
                    }`}
                >
                  {submitting ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Adding...
                    </span>
                  ) : (
                    `Add Department${selectedDepartments.length !== 1 ? 's' : ''}`
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
};



export default AddDepartments;
