import React, { useState, useMemo, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { Box, CssBaseline, ThemeProvider } from '@mui/material';
import { useAuth, axiosInstance } from './contexts/AuthContext'; // Import axiosInstance
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import HomePage from './pages/HomePage';

import JoinGroupPage from './pages/JoinGroupPage';
import TeacherGroupsPage from './pages/TeacherGroupsPage';
import StudentGroupsPage from './pages/StudentGroupsPage';
import TeacherManageGroupPage from './pages/TeacherManageGroupPage';
import TeacherContentBankPage from './pages/TeacherContentBankPage';

import AdminUserManagementPage from './pages/AdminUserManagementPage';

import TeacherLearningPathsPage from './pages/TeacherLearningPathsPage';
import ManageLearningPathPage from './pages/ManageLearningPathPage';
import TeacherAssignmentsListPage from './pages/TeacherAssignmentsListPage';
import TeacherAssignmentSubmissionsPage from './pages/TeacherAssignmentSubmissionsPage';

import StudentLearningPathsPage from './pages/StudentLearningPathsPage';
import StudentViewLearningPathPage from './pages/StudentViewLearningPathPage';
import StudentTakeActivityPage from './pages/StudentTakeActivityPage';
import StudentProgressPage from './pages/StudentProgressPage';
import UserProfilePage from './pages/UserProfilePage';
import TeacherDashboardPage from './pages/TeacherDashboardPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import ProfileCompletionBanner from './components/ProfileCompletionBanner'; // Import the banner

import { getTheme } from './theme';

// Componentes placeholder para los dashboards
const DashboardDocente = () => <div>Contenido del Dashboard del Docente</div>;
const DashboardEstudiante = () => <div>Contenido del Dashboard del Estudiante</div>;
const DashboardAdmin = () => <div>Contenido del Dashboard del Administrador</div>;


// Define el ancho del sidebar
const drawerWidth = 240;


function App() {
    const { isAuthenticated, user, isAuthInitialized } = useAuth(); // Added user and isAuthInitialized
    const location = useLocation();
    const [isProfileIncomplete, setIsProfileIncomplete] = useState(false);
    const [bannerDismissed, setBannerDismissed] = useState(sessionStorage.getItem('profileBannerDismissed') === 'true');

    const shouldShowSidebar = isAuthenticated;

    // Nuevo estado para mostrar/ocultar el sidebar
    const [sidebarOpen, setSidebarOpen] = useState(true);

    // Función para alternar el sidebar
    const handleToggleSidebar = () => setSidebarOpen((prev) => !prev);

    const [mode, setMode] = useState(() => localStorage.getItem('themeMode') || 'light');
    const theme = useMemo(() => getTheme(mode), [mode]);

    useEffect(() => {
        const checkProfileCompletion = async () => {
            if (isAuthenticated && user && user._id) { // Ensure user object and _id is available
                // Only check if banner hasn't been dismissed in this session
                if (sessionStorage.getItem('profileBannerDismissed') === 'true') {
                    setIsProfileIncomplete(false); // Keep it false if dismissed
                    return;
                }
                try {
                    // Use user._id from AuthContext for the API call
                    const response = await axiosInstance.get(`/api/profile/my-profile`); 
                    const profileData = response.data.user;
                    
                    // Define what fields make a profile "complete"
                    // Example: nombre, apellidos, and biografia must exist. Add profileImage if needed.
                    const isIncomplete = !profileData.nombre || !profileData.apellidos || !profileData.biografia;
                    setIsProfileIncomplete(isIncomplete);
                    if (isIncomplete) {
                        // console.log("Profile is incomplete. Data:", profileData);
                    } else {
                        // console.log("Profile is complete.");
                    }

                } catch (error) {
                    console.error('Error fetching user profile for completion check:', error);
                    // Optionally, decide if an error means we show the banner or not
                    // For now, let's assume an error means we don't show it to avoid bothering users
                    setIsProfileIncomplete(false);
                }
            } else {
                setIsProfileIncomplete(false); // Not authenticated, so no banner
            }
        };

        if (isAuthInitialized) { // Only run after auth state is confirmed
            checkProfileCompletion();
        }
    }, [isAuthenticated, user, isAuthInitialized, bannerDismissed]); // Re-check if auth state changes or banner is dismissed

    const handleDismissBanner = () => {
        sessionStorage.setItem('profileBannerDismissed', 'true');
        setBannerDismissed(true);
        setIsProfileIncomplete(false); // Ensure banner doesn't re-appear after dismissal logic
    };

    // Cuando cambias el modo:
    const handleToggleMode = () => {
      setMode(prev => {
        const newMode = prev === 'light' ? 'dark' : 'light';
        localStorage.setItem('themeMode', newMode);
        return newMode;
      });
    };


  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

        <Header
          onToggleSidebar={handleToggleSidebar}
          sidebarOpen={sidebarOpen}
          mode={mode}
          onToggleMode={handleToggleMode}
        />

        <Box sx={{ display: 'flex', flexGrow: 1, pt: '64px' }}>

          {shouldShowSidebar && sidebarOpen && (
            <Sidebar
              width={drawerWidth}
              open={sidebarOpen}
              onClose={() => setSidebarOpen(false)}
            />
          )}

          <Box
              component="main"
              sx={{
                  flexGrow: 1,
                  ml: 0,
                  width: shouldShowSidebar && sidebarOpen ? `calc(100% - ${drawerWidth}px)` : '100%',
                  transition: 'width 0.3s ease',
                  overflowX: 'hidden',
                  // Adjust py to make space for banner if it's shown globally here
                  // However, it's better to render the banner inside this Box but before Routes
                  // So the banner is part of the scrollable content area.
                  boxSizing: 'border-box',
              }}
          >
            {/* Conditionally render the banner here */}
            {isProfileIncomplete && !bannerDismissed && location.pathname !== '/profile' && (
                 <ProfileCompletionBanner onDismiss={handleDismissBanner} />
            )}
            <Box sx={{ 
                px: 2, 
                py: isProfileIncomplete && !bannerDismissed && location.pathname !== '/profile' ? 1 : 2, // Reduce top padding if banner is shown
                height: '100%', // Ensure this box can scroll if content overflows
                overflowY: location.pathname === '/' ? 'hidden' : 'auto',
              }}
            >
               <Routes>
                  <Route path="/" element={<HomePage />} />

                  {/* Rutas Protegidas */}
                  <Route
                    path="/teacher/dashboard" // New route for Teacher Dashboard
                    element={<ProtectedRoute element={<TeacherDashboardPage />} allowedRoles={['Docente', 'Administrador']} />}
                  />
                  <Route
                    path="/dashboard-docente"
                    element={<ProtectedRoute element={<DashboardDocente />} allowedRoles={['Docente', 'Administrador']} />}
                  />
                  <Route
                    path="/dashboard-estudiante"
                    element={<ProtectedRoute element={<DashboardEstudiante />} allowedRoles={['Estudiante', 'Administrador']} />}
                  />
                   <Route
                    path="/admin/dashboard" // New route for Admin Dashboard
                    element={<ProtectedRoute element={<AdminDashboardPage />} allowedRoles={['Administrador']} />}
                  />
                   <Route
                    path="/dashboard-admin" // This is a placeholder, will be replaced or removed
                    element={<ProtectedRoute element={<DashboardAdmin />} allowedRoles={['Administrador']} />}
                  />
                  <Route
                    path="/join-group"
                    element={<ProtectedRoute element={<JoinGroupPage />} allowedRoles={['Estudiante']} />}
                  />
                  <Route
                    path="/teacher/groups/"
                    element={<ProtectedRoute element={<TeacherGroupsPage />} allowedRoles={['Docente', 'Administrador']} />}
                  />
                  <Route
                    path="/student/groups"
                    element={<ProtectedRoute element={<StudentGroupsPage />} allowedRoles={['Estudiante', 'Administrador']} />} 
                  />
                  <Route
                    path="/teacher/groups/:groupId/manage"
                    element={<ProtectedRoute element={<TeacherManageGroupPage />} allowedRoles={['Docente', 'Administrador']} />}
                  />
                  <Route
                    path="/admin/user-management"
                    element={<ProtectedRoute element={<AdminUserManagementPage />} allowedRoles={['Administrador']} />}
                  />
                  <Route
                    path="/content-bank"
                    element={<ProtectedRoute element={<TeacherContentBankPage />} allowedRoles={['Docente', 'Administrador']} />}
                  />
                  <Route
                    path="/teacher/learning-paths"
                    element={<ProtectedRoute element={<TeacherLearningPathsPage />} allowedRoles={['Docente', 'Administrador']} />}
                  />
                  <Route
                    path="/teacher/learning-paths/:pathId/manage"
                    element={<ProtectedRoute element={<ManageLearningPathPage />} allowedRoles={['Docente', 'Administrador']} />}
                  />
                  <Route 
                    path="/student/learning-paths" 
                    element={<ProtectedRoute element={<StudentLearningPathsPage />} allowedRoles={['Estudiante', 'Administrador']} />}
                  />
                  <Route 
                    path="/student/learning-paths/:pathId/view" 
                    element={<ProtectedRoute element={<StudentViewLearningPathPage />} allowedRoles={['Estudiante', 'Administrador']} />}
                  />
                  <Route 
                    path="/student/assignments/:assignmentId/take-activity" 
                    element={<ProtectedRoute element={<StudentTakeActivityPage />} allowedRoles={['Estudiante', 'Administrador']} />}
                  />
                  <Route 
                    path="/teacher/assignments" 
                    element={<ProtectedRoute element={<TeacherAssignmentsListPage />} allowedRoles={['Docente', 'Administrador']} />}
                  />
                  <Route 
                    path="/teacher/assignments/:assignmentId/submissions" 
                    element={<ProtectedRoute element={<TeacherAssignmentSubmissionsPage />} allowedRoles={['Docente', 'Administrador']} />}
                  />
                  <Route
                    path="/student/progress"
                    element={<ProtectedRoute element={<StudentProgressPage />} allowedRoles={['Estudiante', 'Administrador']} />}
                  />
                  <Route
                    path="/profile"
                    element={<ProtectedRoute element={<UserProfilePage />} allowedRoles={['Estudiante', 'Docente', 'Administrador']} />}
                  />
                  <Route
                    path="/profile/:userId"
                    element={<ProtectedRoute element={<UserProfilePage />} allowedRoles={['Estudiante', 'Docente', 'Administrador']} />}
                  />

                  {/* Puedes añadir una ruta para manejar 404 - Página no encontrada */}
                  {/* <Route path="*" element={<div>404 Not Found</div>} /> */}
                </Routes>

          </Box>

        </Box>

        <ToastContainer 
        position="bottom-right" 
        autoClose={2000} hideProgressBar={true} 
        newestOnTop={false} closeOnClick rtl={false} 
        pauseOnFocusLoss draggable pauseOnHover 
        />

      </Box>
    </ThemeProvider>
  );
}

export default App;