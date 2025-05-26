import React, { useState, useEffect, useMemo } from 'react';
import {
  Container, Typography, Box, Paper, CircularProgress, Alert, Select, MenuItem, FormControl, InputLabel, Grid,
  LinearProgress, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip
} from '@mui/material';
import { useAuth, axiosInstance } from '../contexts/AuthContext';
import { format } from 'date-fns';

function TeacherGroupProgressPage() {
  const { user, isAuthenticated, isAuthInitialized } = useAuth();
  
  const [teacherGroups, setTeacherGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [loadingGroups, setLoadingGroups] = useState(false);
  
  const [groupLearningPaths, setGroupLearningPaths] = useState([]);
  const [selectedLearningPathId, setSelectedLearningPathId] = useState('');
  const [loadingLearningPaths, setLoadingLearningPaths] = useState(false);
  
  const [error, setError] = useState(null); // General error for the page

  // New state variables for report data
  const [pathStructure, setPathStructure] = useState(null);
  const [groupProgressData, setGroupProgressData] = useState([]);
  const [loadingReportData, setLoadingReportData] = useState(false);

  // Effect to fetch teacher's groups
  useEffect(() => {
    if (isAuthInitialized && isAuthenticated && (user?.userType === 'Docente' || user?.userType === 'Administrador')) {
      setLoadingGroups(true);
      setError(null);
      axiosInstance.get('/api/groups/teaching') // Assuming this endpoint returns groups for the teacher
        .then(response => {
          setTeacherGroups(response.data.data || response.data || []); // Adjust based on actual API response structure
        })
        .catch(err => {
          console.error("Error fetching teacher groups:", err);
          setError(err.response?.data?.message || "Error al cargar los grupos del docente.");
          setTeacherGroups([]);
        })
        .finally(() => {
          setLoadingGroups(false);
        });
    } else if (isAuthInitialized && !isAuthenticated) {
        setError("Debes iniciar sesión para ver esta página.");
    } else if (isAuthInitialized && user?.userType !== 'Docente' && user?.userType !== 'Administrador') {
        setError("No tienes permiso para ver esta página.");
    }
  }, [isAuthInitialized, isAuthenticated, user]);

  // Effect to fetch learning paths for the selected group
  useEffect(() => {
    if (selectedGroupId) {
      setLoadingLearningPaths(true);
      setError(null); // Clear previous errors
      setGroupLearningPaths([]); // Clear previous paths
      setSelectedLearningPathId(''); // Reset selected path

      axiosInstance.get(`/api/learning-paths/group/${selectedGroupId}`)
        .then(response => {
          // Assuming the response contains an array of learning paths directly or in a 'data' field
          setGroupLearningPaths(response.data.data || response.data || []);
        })
        .catch(err => {
          console.error("Error fetching learning paths for group:", err);
          setError(err.response?.data?.message || `Error al cargar las rutas de aprendizaje para el grupo ${selectedGroupId}.`);
          setGroupLearningPaths([]);
        })
        .finally(() => {
          setLoadingLearningPaths(false);
        });
    } else {
      // Clear learning paths if no group is selected
      setGroupLearningPaths([]);
      setSelectedLearningPathId('');
      // Also clear report data if group is deselected
      setPathStructure(null);
      setGroupProgressData([]);
    }
  }, [selectedGroupId]);

  // Effect to fetch path structure and group progress data
  useEffect(() => {
    if (selectedLearningPathId && selectedGroupId) {
      setPathStructure(null);
      setGroupProgressData([]);
      setLoadingReportData(true);
      setError(null); // Clear previous report-specific errors

      Promise.all([
        axiosInstance.get(`/api/learning-paths/${selectedLearningPathId}/structure`),
        axiosInstance.get(`/api/progress/group/${selectedGroupId}/path/${selectedLearningPathId}/docente`)
      ])
      .then(([structureResponse, progressResponse]) => {
        setPathStructure(structureResponse.data);
        // Ensure progressResponse.data is an array, default to empty array if not
        setGroupProgressData(Array.isArray(progressResponse.data) ? progressResponse.data : []);
        setError(null); 
      })
      .catch(err => {
        console.error('Error fetching report data:', err);
        const errorMessage = err.response?.data?.message || err.message || 'Error al cargar los datos del informe.';
        setError(errorMessage);
        setPathStructure(null);
        setGroupProgressData([]);
      })
      .finally(() => {
        setLoadingReportData(false);
      });
    } else {
      // Clear report data if no learning path is selected
      setPathStructure(null);
      setGroupProgressData([]);
      setLoadingReportData(false); // Ensure loading is false
    }
  }, [selectedLearningPathId, selectedGroupId]);

  // Placeholder for page content

  // Memoized Overall Path Statistics
  const overallStats = useMemo(() => {
    if (!groupProgressData || groupProgressData.length === 0) {
      return { totalStudents: 0, studentsCompletedPath: 0, pathCompletionPercentage: 0 };
    }
    const totalStudents = groupProgressData.length;
    const studentsCompletedPath = groupProgressData.filter(
      (studentData) => studentData.progress?.path_status === 'Completado'
    ).length;
    const pathCompletionPercentage = totalStudents > 0 ? (studentsCompletedPath / totalStudents) * 100 : 0;
    
    return { totalStudents, studentsCompletedPath, pathCompletionPercentage };
  }, [groupProgressData]);

  // Memoized Aggregated Module Statistics
  const aggregatedModuleStats = useMemo(() => {
    if (!pathStructure || !pathStructure.modules || !groupProgressData || groupProgressData.length === 0) {
      return [];
    }
    const totalStudentsInGroup = groupProgressData.length;

    const stats = pathStructure.modules.map(module => {
      let completedCount = 0;
      let inProgressCount = 0;

      groupProgressData.forEach(studentData => {
        const studentProgress = studentData.progress;
        if (studentProgress) {
          const completedModule = studentProgress.completed_modules?.find(
            cm => cm.module_id === module._id && cm.status === 'Completado'
          );
          if (completedModule) {
            completedCount++;
          } else {
            // Check if any theme in this module has been started/completed by the student
            const moduleThemeIds = module.themes?.map(t => t._id) || [];
            const hasRelevantThemeProgress = studentProgress.completed_themes?.some(
              ct => moduleThemeIds.includes(ct.theme_id) // ct.status could be 'Visto' or 'Completado'
            );
            if (hasRelevantThemeProgress) {
              inProgressCount++;
            }
          }
        }
      });
      
      const notStartedCount = totalStudentsInGroup - completedCount - inProgressCount;
      return {
        moduleId: module._id,
        moduleName: module.nombre,
        moduleOrder: module.orden,
        completedPercentage: totalStudentsInGroup > 0 ? (completedCount / totalStudentsInGroup) * 100 : 0,
        inProgressPercentage: totalStudentsInGroup > 0 ? (inProgressCount / totalStudentsInGroup) * 100 : 0,
        notStartedPercentage: totalStudentsInGroup > 0 ? (notStartedCount / totalStudentsInGroup) * 100 : 0,
        completedCount,
        inProgressCount,
        notStartedCount,
      };
    });

    return stats.sort((a, b) => a.moduleOrder - b.moduleOrder);
  }, [pathStructure, groupProgressData]);

  // Memoized Processed Student Data for Table
  const processedStudentData = useMemo(() => {
    if (!pathStructure || !pathStructure.modules || !groupProgressData || groupProgressData.length === 0) {
      return [];
    }

    return groupProgressData.map(studentData => {
      const studentModulesStatus = {};
      pathStructure.modules.forEach(module => {
        let status = 'No Iniciado'; // Default status
        const studentProgress = studentData.progress;

        if (studentProgress) {
          const completedModule = studentProgress.completed_modules?.find(
            cm => cm.module_id === module._id && cm.status === 'Completado'
          );
          if (completedModule) {
            status = 'Completado';
          } else {
            const moduleThemeIds = module.themes?.map(t => t._id) || [];
            const hasRelevantThemeProgress = studentProgress.completed_themes?.some(
              ct => moduleThemeIds.includes(ct.theme_id)
            );
            if (hasRelevantThemeProgress) {
              status = 'En Progreso';
            }
          }
        }
        studentModulesStatus[module._id] = status;
      });

      return {
        studentId: studentData.student._id,
        studentName: `${studentData.student.nombre} ${studentData.student.apellidos}`,
        overallPathStatus: studentData.progress?.path_status || 'No Iniciado',
        pathCompletionDate: studentData.progress?.path_completion_date || null,
        moduleStatus: studentModulesStatus, // Object with moduleId as key and status as value
      };
    });
  }, [pathStructure, groupProgressData]);
  
  // Temporary logging for verification
  // useEffect(() => {
  //   if (selectedLearningPathId && pathStructure && groupProgressData.length > 0) {
  //       console.log("Overall Stats:", overallStats);
  //       console.log("Aggregated Module Stats:", aggregatedModuleStats);
  //       console.log("Processed Student Data:", processedStudentData);
  //   }
  // }, [overallStats, aggregatedModuleStats, processedStudentData, selectedLearningPathId, pathStructure, groupProgressData]);

  const getStatusChip = (status) => {
    let color = 'default';
    let label = status;

    // Normalize status for consistent translation if needed
    const normalizedStatus = status ? status.charAt(0).toUpperCase() + status.slice(1).toLowerCase() : 'No Iniciado';
    
    // STATUS_TRANSLATIONS could be defined here or imported if used widely
    const STATUS_TRANSLATIONS = {
        'Completado': 'Completado',
        'En progreso': 'En Progreso', // Handle "En Progreso" or "En progreso"
        'En Progreso': 'En Progreso',
        'No iniciado': 'No Iniciado',
        'No Iniciado': 'No Iniciado',
        'Visto': 'Visto', // If 'Visto' is a possible status from backend
      };

    label = STATUS_TRANSLATIONS[normalizedStatus] || normalizedStatus;

    if (normalizedStatus === 'Completado') {
      color = 'success';
    } else if (normalizedStatus === 'En Progreso' || normalizedStatus === 'En progreso') {
      color = 'info';
    } else if (normalizedStatus === 'No Iniciado' || normalizedStatus === 'No iniciado') {
      color = 'default';
    } else if (normalizedStatus === 'Visto') {
        color = 'secondary'; // Example for 'Visto'
    }
    
    return <Chip label={label} color={color} size="small" />;
  };


  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom component="h1">
        Monitor de Progreso de Grupos
      </Typography>
      
      {/* General error for selectors, shown if no specific report error context exists */}
      {error && !selectedLearningPathId && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper sx={{ p: 2, mt: error && !selectedLearningPathId ? 0 : 2  /* Adjust Paper margin if general error is shown */}}>
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth disabled={loadingGroups || !isAuthInitialized || !isAuthenticated}>
              <InputLabel id="group-select-label">Grupo</InputLabel>
              <Select
                labelId="group-select-label"
                value={selectedGroupId}
                label="Grupo"
                onChange={(e) => setSelectedGroupId(e.target.value)}
              >
                <MenuItem value="">
                  <em>Selecciona un grupo</em>
                </MenuItem>
                {teacherGroups.map((group) => (
                  <MenuItem key={group._id} value={group._id}>
                    {group.nombre}
                  </MenuItem>
                ))}
              </Select>
              {loadingGroups && <CircularProgress size={20} sx={{ position: 'absolute', right: 30, top: '50%', marginTop: '-10px' }} />}
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth disabled={!selectedGroupId || loadingLearningPaths || loadingGroups}>
              <InputLabel id="lp-select-label">Ruta de Aprendizaje</InputLabel>
              <Select
                labelId="lp-select-label"
                value={selectedLearningPathId}
                label="Ruta de Aprendizaje"
                onChange={(e) => setSelectedLearningPathId(e.target.value)}
              >
                <MenuItem value="">
                  <em>Selecciona una ruta</em>
                </MenuItem>
                {groupLearningPaths.map((path) => (
                  <MenuItem key={path._id} value={path._id}>
                    {path.nombre}
                  </MenuItem>
                ))}
              </Select>
              {loadingLearningPaths && <CircularProgress size={20} sx={{ position: 'absolute', right: 30, top: '50%', marginTop: '-10px' }} />}
            </FormControl>
          </Grid>
        </Grid>
        
        {/* Loading/Empty states for selectors */}
        {(!isAuthInitialized || !isAuthenticated) && !error && (
            <Typography sx={{textAlign: 'center', my: 2}}>Cargando información de autenticación...</Typography>
        )}
        {isAuthInitialized && isAuthenticated && !loadingGroups && teacherGroups.length === 0 && !error && (
            <Alert severity="info" sx={{ my: 2 }}>No enseñas en ningún grupo actualmente o no se encontraron grupos.</Alert>
        )}
        {selectedGroupId && !loadingLearningPaths && groupLearningPaths.length === 0 && !error && !loadingGroups && (
             <Alert severity="info" sx={{ my: 2 }}>Este grupo no tiene rutas de aprendizaje asignadas.</Alert>
        )}

        {/* Report Data Section */}
        {loadingReportData && (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
            <CircularProgress />
            <Typography sx={{ ml: 2 }}>Cargando datos del informe...</Typography>
          </Box>
        )}

        {/* Report-specific error, shown only if a path was selected and an error occurred fetching its data */}
        {!loadingReportData && error && selectedLearningPathId && pathStructure === null && ( 
            <Alert severity="error" sx={{ my: 2 }}>{`Error al cargar datos del informe: ${error}`}</Alert>
        )}
        
        {/* Conditional rendering for when no path is selected or data is being fetched */}
        {!selectedLearningPathId && !loadingReportData && !error && (
             <Typography sx={{textAlign: 'center', my: 2, color: 'text.secondary'}}>
                Selecciona un grupo y una ruta de aprendizaje para ver el informe de progreso.
             </Typography>
        )}

        {/* Display content only if data is loaded, no error for report, and a path is selected */}
        {!loadingReportData && !error && selectedLearningPathId && pathStructure && (
          <>
            {/* Overall Path Summary */}
            <Box sx={{ my: 3 }}>
              <Typography variant="h5" gutterBottom>
                Resumen General de la Ruta: {pathStructure.nombre}
              </Typography>
              {groupProgressData.length === 0 ? (
                <Alert severity="info">No hay datos de progreso de estudiantes para esta ruta en este grupo.</Alert>
              ) : (
                <>
                  <Typography variant="body1">
                    Total de Estudiantes en el Grupo para esta Ruta: {overallStats.totalStudents}
                  </Typography>
                  <Typography variant="body1">
                    Estudiantes que Completaron la Ruta: {overallStats.studentsCompletedPath} ({overallStats.pathCompletionPercentage.toFixed(1)}%)
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={overallStats.pathCompletionPercentage} 
                    sx={{ mt: 1, height: 10, borderRadius: 5 }} 
                  />
                </>
              )}
            </Box>

            {/* Module Progress Breakdown */}
            {aggregatedModuleStats.length > 0 && (
              <Box sx={{ my: 3 }}>
                <Typography variant="h5" gutterBottom>Progreso Detallado por Módulo</Typography>
                <Grid container spacing={2}>
                  {aggregatedModuleStats.map((moduleStat) => (
                    <Grid item xs={12} sm={6} md={4} key={moduleStat.moduleId}>
                      <Paper elevation={2} sx={{ p: 2 }}>
                        <Typography variant="h6" component="h3" gutterBottom>
                          Módulo {moduleStat.moduleOrder}: {moduleStat.moduleName}
                        </Typography>
                        <Box sx={{ mb: 1 }}>
                          <Typography variant="body2">Completado: {moduleStat.completedCount} ({moduleStat.completedPercentage.toFixed(1)}%)</Typography>
                          <LinearProgress variant="determinate" value={moduleStat.completedPercentage} color="success" sx={{ height: 8, borderRadius: 5 }} />
                        </Box>
                        <Box sx={{ mb: 1 }}>
                          <Typography variant="body2">En Progreso: {moduleStat.inProgressCount} ({moduleStat.inProgressPercentage.toFixed(1)}%)</Typography>
                          <LinearProgress variant="determinate" value={moduleStat.inProgressPercentage} color="info" sx={{ height: 8, borderRadius: 5 }}/>
                        </Box>
                        <Box>
                          <Typography variant="body2">No Iniciado: {moduleStat.notStartedCount} ({moduleStat.notStartedPercentage.toFixed(1)}%)</Typography>
                          <LinearProgress variant="determinate" value={moduleStat.notStartedPercentage} color="inherit" sx={{backgroundColor: '#e0e0e0', height: 8, borderRadius: 5 }}/>
                        </Box>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}
            {pathStructure.modules?.length === 0 && groupProgressData.length > 0 && (
                 <Alert severity="info" sx={{ my: 2 }}>Esta ruta de aprendizaje no tiene módulos definidos.</Alert>
            )}


            {/* Student Progress Table */}
            {processedStudentData.length > 0 && pathStructure.modules && (
              <Box sx={{ my: 3 }}>
                <Typography variant="h5" gutterBottom>Progreso Individual por Estudiante</Typography>
                <TableContainer component={Paper}>
                  <Table aria-label="student progress table">
                    <TableHead>
                      <TableRow>
                        <TableCell>Estudiante</TableCell>
                        <TableCell>Estado General</TableCell>
                        {pathStructure.modules.map((module) => (
                          <TableCell 
                            key={module._id} 
                            align="center" 
                            sx={{
                              fontSize: '0.8rem', 
                              p:0.5,
                              minWidth: '100px', // Min width for module name column
                              maxWidth: '150px', // Max width for module name column
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap' // Keep header on one line
                            }}
                          >
                            {module.nombre}
                          </TableCell>
                        ))}
                        <TableCell align="right">Fecha Finalización</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {processedStudentData.map((studentRow) => (
                        <TableRow key={studentRow.studentId}>
                          <TableCell component="th" scope="row">
                            {studentRow.studentName}
                          </TableCell>
                          <TableCell>{getStatusChip(studentRow.overallPathStatus)}</TableCell>
                          {pathStructure.modules.map((module) => (
                            <TableCell key={module._id} align="center">
                              {getStatusChip(studentRow.moduleStatus[module._id] || 'No Iniciado')}
                            </TableCell>
                          ))}
                          <TableCell align="right">
                            {studentRow.pathCompletionDate ? format(new Date(studentRow.pathCompletionDate), 'dd/MM/yyyy') : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
            {/* This specific alert for empty groupProgressData is handled within the Overall Path Summary and also implicitly by processedStudentData.length > 0 check */}
          </>
        )}
      </Paper>
    </Container>
  );
}

export default TeacherGroupProgressPage;
