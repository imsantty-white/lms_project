import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Layout = () => {
  const { isAuthenticated, logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login'); // Redirect to login after logout
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-gradient-to-b from-indigo-600 to-purple-600 text-white p-5 shadow-lg">
        <h2 className="text-2xl font-semibold mb-6 border-b border-indigo-400 pb-3">Navigation</h2>
        <nav className="space-y-3">
          <Link
            to="/"
            className="block py-2.5 px-4 rounded transition duration-200 hover:bg-indigo-500 hover:text-white"
          >
            Home
          </Link>
          {isAuthenticated && (
            <Link
              to="/dashboard"
              className="block py-2.5 px-4 rounded transition duration-200 hover:bg-indigo-500 hover:text-white"
            >
              Dashboard
            </Link>
          )}
          {isAuthenticated && user?.role === 'Teacher' && (
            <>
              <Link
                to="/teacher/groups"
                className="block py-2.5 px-4 rounded transition duration-200 hover:bg-indigo-500 hover:text-white"
              >
                My Groups
              </Link>
              <Link
                to="/teacher/join-requests"
                className="block py-2.5 px-4 rounded transition duration-200 hover:bg-indigo-500 hover:text-white"
              >
                Join Requests
              </Link>
              <Link
                to="/teacher/learning-paths" // Link to teacher's learning paths
                className="block py-2.5 px-4 rounded transition duration-200 hover:bg-indigo-500 hover:text-white"
              >
                Learning Paths
              </Link>
            </>
          )}
          {/* Add more sidebar links here as needed */}
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-md p-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-800">My Application</h1>
            <div className="flex items-center space-x-4">
              {isAuthenticated ? (
                <>
                  <span className="text-gray-700">Welcome, {user?.name || user?.email}! (Role: {user?.role})</span>
                  <button
                    onClick={handleLogout}
                    className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition duration-200"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="px-4 py-2 text-gray-700 hover:text-indigo-600 transition duration-200"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition duration-200"
                  >
                    Register
                  </Link>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 overflow-auto">
          <Outlet /> {/* This will render the child routes */}
        </main>
      </div>
    </div>
  );
};

export default Layout;
