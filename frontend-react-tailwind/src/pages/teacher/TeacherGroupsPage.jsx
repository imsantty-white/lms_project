import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import groupService from '../../services/groupService';
import { useAuth } from '../../contexts/AuthContext'; // To ensure user is authenticated and potentially get user info

const TeacherGroupsPage = () => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth(); // Get user to ensure they are a teacher if needed

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        setLoading(true);
        const fetchedGroups = await groupService.getMyOwnedGroups();
        setGroups(fetchedGroups);
        setError(null);
      } catch (err) {
        setError(err.message || 'Failed to fetch groups.');
        setGroups([]); // Clear groups on error
      } finally {
        setLoading(false);
      }
    };

    if (user) {
        fetchGroups();
    } else {
        setLoading(false);
        setError("User not authenticated.");
    }
  }, [user]);

  const handleDeleteGroup = async (groupId) => {
    if (window.confirm('Are you sure you want to delete this group? This action cannot be undone.')) {
      try {
        setLoading(true); // You might want a specific loading state for delete
        await groupService.deleteGroup(groupId);
        setGroups(prevGroups => prevGroups.filter(group => group._id !== groupId));
        setError(null);
      } catch (err) {
        setError(err.message || 'Failed to delete group.');
      } finally {
        setLoading(false);
      }
    }
  };

  if (loading && groups.length === 0) { // Avoid showing loading if groups are already displayed and a delete is happening
    return <div className="p-4 text-center">Loading your groups...</div>;
  }

  if (error && groups.length === 0) { // Show error primarily if no groups are loaded
    return <div className="p-4 text-red-500 text-center">Error: {error}</div>;
  }


  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">My Created Groups</h1>
        <Link
          to="/teacher/groups/new" // Updated path for creating a new group
          className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-6 rounded-lg shadow-md hover:shadow-lg transition duration-150 ease-in-out transform hover:-translate-y-px"
        >
          Create New Group
        </Link>
      </div>
      
      {/* Display general error if any, especially for delete operations */}
      {error && <div className="mb-4 p-3 text-red-600 bg-red-100 rounded-md text-center">{error}</div>}


      {groups.length === 0 && !loading ? ( // Ensure not to show "no groups" while initial loading
        <div className="text-center py-10">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No groups</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating a new group.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-8">
          {groups.map((group) => (
            <div key={group._id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-shadow duration-300 ease-in-out">
              <div className="p-6">
                <h2 className="text-2xl font-bold text-indigo-700 mb-3 truncate">{group.name}</h2>
                <div className="mb-3">
                    <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-pink-600 bg-pink-200">
                        Group Code: {group.code}
                    </span>
                </div>
                <p className="text-gray-600 text-sm mb-5 h-16 overflow-y-auto custom-scrollbar">{group.description || 'No description provided.'}</p>
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex justify-end space-x-3">
                    <Link
                      to={`/teacher/groups/${group._id}/manage`} 
                      className="text-sm bg-sky-500 hover:bg-sky-600 text-white font-medium py-2 px-4 rounded-md shadow-sm hover:shadow-md transition duration-150"
                    >
                      Manage
                    </Link>
                    <Link
                      to={`/teacher/groups/${group._id}/edit`} // Updated path for editing a specific group
                      className="text-sm bg-amber-500 hover:bg-amber-600 text-white font-medium py-2 px-4 rounded-md shadow-sm hover:shadow-md transition duration-150"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDeleteGroup(group._id)} 
                      disabled={loading} // Disable button when an operation is in progress
                      className="text-sm bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-md shadow-sm hover:shadow-md transition duration-150 disabled:bg-red-300"
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

export default TeacherGroupsPage;
