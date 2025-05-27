import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import learningPathService from '../../services/learningPathService';
import { useAuth } from '../../contexts/AuthContext';

const TeacherLearningPathsPage = () => {
  const [learningPaths, setLearningPaths] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    const fetchLearningPaths = async () => {
      try {
        setLoading(true);
        const fetchedLPs = await learningPathService.getMyCreatedLearningPaths();
        setLearningPaths(fetchedLPs);
        setError(null);
      } catch (err) {
        setError(err.message || 'Failed to fetch learning paths.');
        setLearningPaths([]);
      } finally {
        setLoading(false);
      }
    };

    if (user?.role === 'Teacher') {
      fetchLearningPaths();
    } else {
      setLoading(false);
      setError("You are not authorized to view this page.");
    }
  }, [user]);

  const handleDeleteLearningPath = async (lpId) => {
    if (window.confirm('Are you sure you want to delete this learning path? This action cannot be undone.')) {
      try {
        setLoading(true); // Or a specific delete loading state
        await learningPathService.deleteLearningPath(lpId);
        setLearningPaths(prevLPs => prevLPs.filter(lp => lp._id !== lpId));
        setError(null);
      } catch (err) {
        setError(err.message || 'Failed to delete learning path.');
      } finally {
        setLoading(false);
      }
    }
  };

  if (loading && learningPaths.length === 0) {
    return <div className="p-4 text-center">Loading your learning paths...</div>;
  }

  if (error && learningPaths.length === 0) {
    return <div className="p-4 text-red-500 text-center">Error: {error}</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">My Learning Paths</h1>
        <Link
          to="/teacher/learning-paths/new" // Updated path
          className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-6 rounded-lg shadow-md hover:shadow-lg transition duration-150 ease-in-out transform hover:-translate-y-px"
        >
          Create New Learning Path
        </Link>
      </div>

      {error && <div className="mb-4 p-3 text-red-600 bg-red-100 rounded-md text-center">{error}</div>}

      {learningPaths.length === 0 && !loading ? (
        <div className="text-center py-10">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v11.494m0 0A7.5 7.5 0 1012 6.253v11.494z" /> {/* Simple path icon */}
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No learning paths</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating a new learning path.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-8">
          {learningPaths.map((lp) => (
            <div key={lp._id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-shadow duration-300 ease-in-out">
              <div className="p-6">
                <h2 className="text-2xl font-bold text-purple-700 mb-3 truncate">{lp.name}</h2>
                <p className="text-sm text-gray-500 mb-2">
                  Group: <span className="font-medium text-gray-700">{lp.group?.name || 'N/A'}</span>
                </p>
                <p className="text-gray-600 text-sm mb-5 h-16 overflow-y-auto custom-scrollbar">{lp.description || 'No description provided.'}</p>
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex flex-col space-y-2 sm:flex-row sm:justify-end sm:space-y-0 sm:space-x-3">
                    <Link
                      to={`/teacher/learning-paths/${lp._id}/structure`} 
                      className="w-full sm:w-auto text-center text-sm bg-teal-500 hover:bg-teal-600 text-white font-medium py-2 px-4 rounded-md shadow-sm hover:shadow-md transition duration-150"
                    >
                      Manage Structure
                    </Link>
                    <Link
                      to={`/teacher/learning-paths/${lp._id}/edit`} // Updated path
                      className="w-full sm:w-auto text-center text-sm bg-amber-500 hover:bg-amber-600 text-white font-medium py-2 px-4 rounded-md shadow-sm hover:shadow-md transition duration-150"
                    >
                      Edit Details
                    </Link>
                    <button
                      onClick={() => handleDeleteLearningPath(lp._id)}
                      disabled={loading}
                      className="w-full sm:w-auto text-sm bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-md shadow-sm hover:shadow-md transition duration-150 disabled:bg-red-300"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TeacherLearningPathsPage;
