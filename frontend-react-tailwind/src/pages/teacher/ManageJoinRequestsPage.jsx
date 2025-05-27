import React, { useEffect, useState } from 'react';
import groupService from '../../services/groupService';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom'; // For linking to group or user if needed

const ManageJoinRequestsPage = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth(); // Ensure user is a teacher

  const fetchJoinRequests = async () => {
    setLoading(true);
    try {
      // Assuming getTeacherJoinRequests fetches all pending requests for the logged-in teacher's groups
      const fetchedRequests = await groupService.getTeacherJoinRequests();
      // Filter for pending requests if the backend doesn't do it.
      // Based on backend, 'Pendiente' is the status for pending requests.
      setRequests(fetchedRequests.filter(req => req.status === 'Pendiente'));
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to fetch join requests.');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'Teacher') {
      fetchJoinRequests();
    } else {
      setLoading(false);
      setError("You are not authorized to view this page.");
    }
  }, [user]);

  const handleResponse = async (membershipId, status) => {
    try {
      // The service expects just the status string e.g. 'Aprobado' or 'Rechazado'
      // The service wraps it in { status: status_string }
      await groupService.respondToJoinRequest(membershipId, status);
      // Refresh list or remove locally
      setRequests(prevRequests => prevRequests.filter(req => req._id !== membershipId));
      setError(null); // Clear any previous errors
    } catch (err) {
      setError(err.message || `Failed to ${status === 'Aprobado' ? 'approve' : 'reject'} request.`);
    }
  };

  if (loading) {
    return <div className="p-4 text-center">Loading join requests...</div>;
  }

  if (error && requests.length === 0) { // Only show full page error if no requests can be shown
    return <div className="p-4 text-red-500 text-center">Error: {error}</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Manage Join Requests</h1>

      {error && <div className="mb-4 p-3 text-red-600 bg-red-100 rounded-md text-center">{error}</div>}

      {requests.length === 0 ? (
        <div className="text-center py-10">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No pending join requests</h3>
          <p className="mt-1 text-sm text-gray-500">There are currently no students requesting to join your groups.</p>
        </div>
      ) : (
        <div className="bg-white shadow-xl rounded-lg overflow-hidden">
          <ul className="divide-y divide-gray-200">
            {requests.map((request) => (
              <li key={request._id} className="p-6 hover:bg-gray-50 transition-colors duration-150">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                  <div className="mb-4 sm:mb-0">
                    <p className="text-lg font-semibold text-indigo-700">
                      {request.student?.name || request.student?.email || `Student ID: ${request.student?._id}`}
                    </p>
                    <p className="text-sm text-gray-600">
                      Wants to join: <span className="font-medium">{request.group?.name || `Group ID: ${request.group?._id}`}</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Requested on: {new Date(request.requestedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex-shrink-0 flex space-x-3">
                    <button
                      onClick={() => handleResponse(request._id, 'Aprobado')}
                      className="px-4 py-2 text-sm font-medium text-white bg-green-500 rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-transform transform hover:scale-105"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleResponse(request._id, 'Rechazado')}
                      className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-transform transform hover:scale-105"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ManageJoinRequestsPage;
