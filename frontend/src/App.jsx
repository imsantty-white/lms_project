import React, { useState, useMemo, lazy, Suspense } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { Box, CssBaseline, ThemeProvider, Typography, CircularProgress } from '@mui/material'; // Añadido CircularProgress
import { useAuth } from './contexts/AuthContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import { getTheme } from './theme';

// Constantes
const HEADER_HEIGHT = 64; // px
const DRAWER_WIDTH = 240; // px

// Componente de carga para Suspense
const PageLoader = () => (
  <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: `calc(100vh - ${HEADER_HEIGHT}px)`, width: '100%', p: 3 }}>
    <CircularProgress sx={{ mb: 2 }} />
    <Typography variant="body1">Cargando página...</Typography>
  </Box>
);

// Lazy load de páginas
const HomePage = lazy(() => import('./pages/HomePage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

const JoinGroupPage = lazy(() => import('./pages/student/JoinGroupPage'));
const TeacherGroupsPage = lazy(() => import('./pages/teacher/TeacherGroupsPage'));
const StudentGroupsPage = lazy(() => import('./pages/student/StudentGroupsPage'));
const TeacherManageGroupPage = lazy(() => import('./pages/teacher/TeacherManageGroupPage'));
const TeacherContentBankPage = lazy(() => import('./pages/teacher/TeacherContentBankPage'));

const AdminUserManagementPage = lazy(() => import('./pages/administrator/AdminUserManagementPage'));
const AdminGroupManagementPage = lazy(() => import('./pages/administrator/AdminGroupManagementPage'));
const AdminDashboardPage = lazy(() => import('./pages/administrator/AdminDashboardPage'));
const AdminContactMessagesPage = lazy(() => import('./pages/administrator/AdminContactMessagesPage'));
const ReportManagementPage = lazy(() => import('./pages/administrator/ReportManagementPage'));
const SystemNotificationPage = lazy(() => import('./pages/administrator/SystemNotificationPage'));
const AdminAnnouncementsPage = lazy(() => import('./pages/administrator/AdminAnnouncementsPage'));

const TeacherLearningPathsPage = lazy(() => import('./pages/teacher/TeacherLearningPathsPage'));
const ManageLearningPathPage = lazy(() => import('./pages/teacher/ManageLearningPathPage'));
const TeacherAssignmentsListPage = lazy(() => import('./pages/teacher/TeacherAssignmentsListPage'));
const TeacherAssignmentSubmissionsPage = lazy(() => import('./pages/teacher/TeacherAssignmentSubmissionsPage'));

const StudentLearningPathsPage = lazy(() => import('./pages/student/StudentLearningPathsPage'));
const StudentViewLearningPathPage = lazy(() => import('./pages/student/StudentViewLearningPathPage'));
const StudentTakeActivityPage = lazy(() => import('./pages/student/StudentTakeActivityPage'));
const StudentProgressPage = lazy(() => import('./pages/student/StudentProgressPage')); 
const UserProfilePage = lazy(() => import('./pages/UserProfilePage'));
const StudentPanel = lazy(() => import('./pages/student/StudentPanel'));
const TeacherPanel = lazy(() => import('./pages/teacher/TeacherPanel'));

const ConfiguracionAdmin = lazy(() => import('./pages/administrator/ConfiguracionAdminPlaceholder'));

function App() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mode, setMode] = useState(() => localStorage.getItem('themeMode') || 'light');
  
  const theme = useMemo(() => getTheme(mode), [mode]);

  const handleToggleSidebar = () => setSidebarOpen((prev) => !prev);

  const handleToggleMode = () => {
    setMode(prev => {
      const newMode = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('themeMode', newMode);
      return newMode;
    });
  };

  const isHomePage = location.pathname === '/';
  const showSidebar = isAuthenticated; // Renombrado para claridad

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
          pt: isHomePage ? 0 : `${HEADER_HEIGHT}px`,
        }}>
          {showSidebar && sidebarOpen && (
            <Sidebar
              width={DRAWER_WIDTH}
              open={sidebarOpen}
              onClose={() => setSidebarOpen(false)} // Asumiendo que Sidebar puede necesitar esto
            />
          )}
          <Box
            component="main"
            sx={{
              flexGrow: 1,
              // ml: showSidebar && sidebarOpen ? `${DRAWER_WIDTH}px` : 0, // Si el Sidebar no es un Drawer flotante
              width: showSidebar && sidebarOpen ? `calc(100% - ${DRAWER_WIDTH}px)` : '100%',
              transition: theme.transitions.create(['width', 'margin'], { // Usar transiciones del tema
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
              }),
              overflowY: 'auto', // Permitir scroll siempre
              overflowX: 'hidden',
              ...(isHomePage ? {
                p: 0, // sin padding en HomePage
                background: 'none',
              } : {
                p: { xs: 2, sm: 3 }, // Padding responsivo para otras páginas
                background: theme.palette.background.default,
              }),
            }}
          >
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<HomePage />} />
                {/* Paneles Principales */}
                <Route path="/teacher/panel" element={<ProtectedRoute element={<TeacherPanel />} allowedRoles={['Docente', 'Administrador']} />} />
                <Route path="/student/panel" element={<ProtectedRoute element={<StudentPanel />} allowedRoles={['Estudiante', 'Administrador']} />} />
                <Route path="/admin/dashboard" element={<ProtectedRoute element={<AdminDashboardPage />} allowedRoles={['Administrador']} />} />
                
                {/* Rutas Estudiante */}
                <Route path="/join-group" element={<ProtectedRoute element={<JoinGroupPage />} allowedRoles={['Estudiante']} />} />
                <Route path="/student/groups" element={<ProtectedRoute element={<StudentGroupsPage />} allowedRoles={['Estudiante', 'Administrador']} />} />
                <Route path="/student/learning-paths" element={<ProtectedRoute element={<StudentLearningPathsPage />} allowedRoles={['Estudiante', 'Administrador']} />} />
                <Route path="/student/learning-paths/:pathId/view" element={<ProtectedRoute element={<StudentViewLearningPathPage />} allowedRoles={['Estudiante', 'Administrador']} />} />
                <Route path="/student/assignments/:assignmentId/take-activity" element={<ProtectedRoute element={<StudentTakeActivityPage />} allowedRoles={['Estudiante', 'Administrador']} />} />
                <Route path="/student/progress" element={<ProtectedRoute element={<StudentProgressPage />} allowedRoles={['Estudiante', 'Administrador']} />} />

                {/* Rutas Docente */}
                <Route path="/teacher/groups" element={<ProtectedRoute element={<TeacherGroupsPage />} allowedRoles={['Docente', 'Administrador']} />} />
                <Route path="/teacher/groups/:groupId/manage" element={<ProtectedRoute element={<TeacherManageGroupPage />} allowedRoles={['Docente', 'Administrador']} />} />
                <Route path="/content-bank" element={<ProtectedRoute element={<TeacherContentBankPage />} allowedRoles={['Docente', 'Administrador']} />} />
                <Route path="/teacher/learning-paths" element={<ProtectedRoute element={<TeacherLearningPathsPage />} allowedRoles={['Docente', 'Administrador']} />} />
                <Route path="/teacher/learning-paths/:pathId/manage" element={<ProtectedRoute element={<ManageLearningPathPage />} allowedRoles={['Docente', 'Administrador']} />} />
                <Route path="/teacher/assignments" element={<ProtectedRoute element={<TeacherAssignmentsListPage />} allowedRoles={['Docente', 'Administrador']} />} />
                <Route path="/teacher/assignments/:assignmentId/submissions" element={<ProtectedRoute element={<TeacherAssignmentSubmissionsPage />} allowedRoles={['Docente', 'Administrador']} />} />
                
                {/* Rutas Administrador */}
                <Route path="/admin/user-management" element={<ProtectedRoute element={<AdminUserManagementPage />} allowedRoles={['Administrador']} />} />
                <Route path="/admin/groups" element={<ProtectedRoute element={<AdminGroupManagementPage />} allowedRoles={['Administrador']} />} />
                <Route path="/admin/config" element={<ProtectedRoute element={<ConfiguracionAdmin />} allowedRoles={['Administrador']} />} />
                <Route path="/admin/contact-messages" element={<ProtectedRoute element={<AdminContactMessagesPage />} allowedRoles={['Administrador']} />} />
                <Route path="/admin/report-management" element={<ProtectedRoute element={<ReportManagementPage />} allowedRoles={['Administrador']} />} />
                <Route path="/admin/system-notifications" element={<ProtectedRoute element={<SystemNotificationPage />} allowedRoles={['Administrador']} />} />
                <Route path="/admin/announcements" element={<ProtectedRoute element={<AdminAnnouncementsPage />} allowedRoles={['Administrador']} />} />
                

                {/* Rutas Comunes */}
                <Route path="/profile" element={<ProtectedRoute element={<UserProfilePage />} allowedRoles={['Estudiante', 'Docente', 'Administrador']} />} />
                <Route path="/profile/:userId" element={<ProtectedRoute element={<UserProfilePage />} allowedRoles={['Docente', 'Administrador']} />} />
                
                <Route path="*" element={<NotFoundPage />} /> 
              </Routes>
            </Suspense>
          </Box>
        </Box>
        <ToastContainer 
          position="bottom-right" 
          autoClose={5000} 
          hideProgressBar={false} 
          newestOnTop={false} 
          closeOnClick 
          rtl={false} 
          pauseOnFocusLoss 
          draggable 
          pauseOnHover 
          theme={mode} // Sincroniza el tema del toast
        />
      </Box>
    </ThemeProvider>
  );
}

export default App;