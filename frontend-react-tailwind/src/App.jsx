import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';

// Teacher specific imports
import TeacherGroupsPage from './pages/teacher/TeacherGroupsPage';
import GroupFormPage from './pages/teacher/GroupFormPage';
import ManageJoinRequestsPage from './pages/teacher/ManageJoinRequestsPage';
import TeacherLearningPathsPage from './pages/teacher/TeacherLearningPathsPage';
import LearningPathFormPage from './pages/teacher/LearningPathFormPage';
import ManageLearningPathStructurePage from './pages/teacher/ManageLearningPathStructurePage'; // Import ManageLearningPathStructurePage

function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Routes within Layout */}
      <Route path="/" element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route
          path="dashboard"
          element={
            <ProtectedRoute 
              element={<DashboardPage />} 
              allowedRoles={['Student', 'Teacher', 'Administrator']}
            />
          }
        />
        
        {/* Teacher Group Routes */}
        <Route
          path="teacher/groups"
          element={
            <ProtectedRoute 
              element={<TeacherGroupsPage />} 
              allowedRoles={['Teacher']}
            />
          }
        />
        <Route
          path="teacher/groups/new"
          element={
            <ProtectedRoute 
              element={<GroupFormPage />} 
              allowedRoles={['Teacher']}
            />
          }
        />
        <Route
          path="teacher/groups/:groupId/edit"
          element={
            <ProtectedRoute 
              element={<GroupFormPage />} 
              allowedRoles={['Teacher']}
            />
          }
        />
        <Route
          path="teacher/join-requests"
          element={
            <ProtectedRoute 
              element={<ManageJoinRequestsPage />} 
              allowedRoles={['Teacher']}
            />
          }
        />

        {/* Teacher Learning Path Routes */}
        <Route
          path="teacher/learning-paths"
          element={
            <ProtectedRoute 
              element={<TeacherLearningPathsPage />} 
              allowedRoles={['Teacher']}
            />
          }
        />
        <Route
          path="teacher/learning-paths/new"
          element={
            <ProtectedRoute 
              element={<LearningPathFormPage />} 
              allowedRoles={['Teacher']}
            />
          }
        />
        <Route
          path="teacher/learning-paths/:learningPathId/edit"
          element={
            <ProtectedRoute 
              element={<LearningPathFormPage />} 
              allowedRoles={['Teacher']}
            />
          }
        />
        <Route
          path="teacher/learning-paths/:learningPathId/structure" // Route for managing LP structure
          element={
            <ProtectedRoute 
              element={<ManageLearningPathStructurePage />} 
              allowedRoles={['Teacher']}
            />
          }
        />

      </Route>
      
      {/* Catch-all for undefined routes or a specific 404 component */}
      {/* <Route path="*" element={<NotFoundPage />} /> */}
    </Routes>
  );
}

export default App;
