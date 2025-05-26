import React, { useState, useMemo } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { Box, CssBaseline, ThemeProvider } from '@mui/material';
import { useAuth } from './contexts/AuthContext';
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
import AdminGroupManagementPage from './pages/AdminGroupManagementPage'; // Import the new page

import TeacherLearningPathsPage from './pages/TeacherLearningPathsPage';
import ManageLearningPathPage from './pages/ManageLearningPathPage';
import TeacherAssignmentsListPage from './pages/TeacherAssignmentsListPage';
import TeacherAssignmentSubmissionsPage from './pages/TeacherAssignmentSubmissionsPage';

import StudentLearningPathsPage from './pages/StudentLearningPathsPage';
import StudentViewLearningPathPage from './pages/StudentViewLearningPathPage';
import StudentTakeActivityPage from './pages/StudentTakeActivityPage';
import StudentProgressPage from './pages/StudentProgressPage';
import UserProfilePage from './pages/UserProfilePage';
import StudentPanel from './pages/StudentPanel';
import TeacherPanel from './pages/TeacherPanel';
import TeacherGroupProgressPage from './pages/TeacherGroupProgressPage'; // Import for new page

import { getTheme } from './theme';

// Componentes placeholder para dashboard administrador (sin funcionalidad específica aún)
const DashboardAdmin = () => <div>Aqui se deberia mostrar todas las Stats, diagramas del sistema </div>;
const ConfiguracionAdmin = () => <div>Aqui se deberia mostrar la configuracion del sistema, 
                                       <div> como las limitaciones para los planes y suscripciones</div>
                                        de los usuarios, etc. (modelo de negocio sin funcionalidad) </div>;
                                    

// Define el ancho del sidebar
const drawerWidth = 240;


function App() {
    const { isAuthenticated } = useAuth();
    const location = useLocation();

    const shouldShowSidebar = isAuthenticated;

    // Nuevo estado para mostrar/ocultar el sidebar
    const [sidebarOpen, setSidebarOpen] = useState(true);

    // Función para alternar el sidebar
    const handleToggleSidebar = () => setSidebarOpen((prev) => !prev);

    const [mode, setMode] = useState(() => localStorage.getItem('themeMode') || 'light');
    const theme = useMemo(() => getTheme(mode), [mode]);

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

        <Box sx={{ 
          display: 'flex', 
          flexGrow: 1, 
          pt: location.pathname === '/' ? 0 : '64px' // <-- Cambia aquí
        }}>

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
              overflowY: location.pathname === '/' ? 'hidden' : 'auto',
              // SOLO SIN PADDING NI FONDO EN LA HOME
              ...(location.pathname === '/' ? {
                px: 0,
                py: 0,
                background: 'none',
                boxShadow: 'none',
              } : {
                px: 2,
                py: 2,
                background: (theme) => theme.palette.background.default,
              }),
              boxSizing: 'border-box',
            }}
          >
               <Routes>
                  <Route path="/" element={<HomePage />} />

                  {/* Rutas Protegidas */}
                  <Route
                    path="/teacher/panel"
                    element={<ProtectedRoute element={<TeacherPanel />} allowedRoles={['Docente', 'Administrador']} />}
                  />
                  <Route
                    path="/student/panel"
                    element={<ProtectedRoute element={<StudentPanel />} allowedRoles={['Estudiante', 'Administrador']} />}
                  />
                   <Route
                    path="/dashboard-admin"
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
                    path="/admin/groups" // Add new route for Admin Group Management
                    element={<ProtectedRoute element={<AdminGroupManagementPage />} allowedRoles={['Administrador']} />}
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
                    path="/teacher/progress-monitoring"
                    element={<ProtectedRoute element={<TeacherGroupProgressPage />} allowedRoles={['Docente', 'Administrador']} />}
                  />
                  <Route
                    path="/profile"
                    element={<ProtectedRoute element={<UserProfilePage />} allowedRoles={['Estudiante', 'Docente', 'Administrador']} />}
                  />
                  <Route
                    path="/profile/:userId"
                    element={<ProtectedRoute element={<UserProfilePage />} allowedRoles={['Estudiante', 'Docente', 'Administrador']} />}
                  />
                  <Route
                    path="/admin/config"
                    element={<ProtectedRoute element={<ConfiguracionAdmin />} allowedRoles={['Administrador']} />}
                  />
                  {/* Rutas de ejemplo para el futuro */}
                  {/* <Route path="*" element={<div>404 Not Found</div>} /> */}
                </Routes>

          </Box>

        </Box>

        {/* Solo muestra ToastContainer si NO estás en la HomePage */}
          {location.pathname !== '/' && (
            <ToastContainer 
              position="bottom-right" 
              autoClose={2000} hideProgressBar={true} 
              newestOnTop={false} closeOnClick rtl={false} 
              pauseOnFocusLoss draggable pauseOnHover 
            />
          )}

      </Box>
    </ThemeProvider>
  );
}

export default App;