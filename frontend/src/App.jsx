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

import TeacherLearningPathsPage from './pages/TeacherLearningPathsPage';
import ManageLearningPathPage from './pages/ManageLearningPathPage';
import TeacherAssignmentsListPage from './pages/TeacherAssignmentsListPage';
import TeacherAssignmentSubmissionsPage from './pages/TeacherAssignmentSubmissionsPage';

import StudentLearningPathsPage from './pages/StudentLearningPathsPage';
import StudentViewLearningPathPage from './pages/StudentViewLearningPathPage';
import StudentTakeActivityPage from './pages/StudentTakeActivityPage';
import StudentProgressPage from './pages/StudentProgressPage'; 

import { getTheme } from './theme';

// Componentes placeholder para los dashboards
const DashboardDocente = () => <div>Contenido del Dashboard del Docente</div>;
const DashboardEstudiante = () => <div>Contenido del Dashboard del Estudiante</div>;
const DashboardAdmin = () => <div>Contenido del Dashboard del Administrador</div>;


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
                  // Elimina el margen izquierdo porque el drawer ya está ocupando ese espacio físicamente
                  ml: 0,
                  // Ajusta el ancho para ocupar solo el espacio disponible
                  width: shouldShowSidebar && sidebarOpen ? `calc(100% - ${drawerWidth}px)` : '100%',
                  transition: 'width 0.3s ease',
                  overflowX: 'hidden',
                  overflowY: location.pathname === '/' ? 'hidden' : 'auto',
                  px: 2, // Puedes mantener o ajustar el padding según necesites
                  py: 2,
                  boxSizing: 'border-box',
              }}
          >
               <Routes>
                  <Route path="/" element={<HomePage />} />

                  {/* Rutas Protegidas */}
                  <Route
                    path="/dashboard-docente"
                    element={<ProtectedRoute element={<DashboardDocente />} allowedRoles={['Docente', 'Administrador']} />}
                  />
                  <Route
                    path="/dashboard-estudiante"
                    element={<ProtectedRoute element={<DashboardEstudiante />} allowedRoles={['Estudiante', 'Administrador']} />}
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
                    path="/my-teacher-groups"
                    element={<ProtectedRoute element={<TeacherGroupsPage />} allowedRoles={['Docente', 'Administrador']} />}
                  />
                  <Route
                    path="/my-student-groups"
                    element={<ProtectedRoute element={<StudentGroupsPage />} allowedRoles={['Estudiante', 'Administrador']} />} 
                  />
                  <Route
                    path="/my-teacher-groups/:groupId/manage"
                    element={<ProtectedRoute element={<TeacherManageGroupPage />} allowedRoles={['Docente', 'Administrador']} />}
                  />
                  <Route
                    path="/admin/user-management"
                    element={<ProtectedRoute element={<AdminUserManagementPage />} allowedRoles={['Administrador']} />}
                  />
                  <Route
                    path="/my-content-bank"
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
                    path="/student/my-learning-paths" 
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