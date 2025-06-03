// src/pages/TeacherManageGroupPage.jsx

import React, { useEffect, useState, useRef, useCallback } from 'react'; // Importa useEffect, useState, useRef, useCallback
import { useParams, Link as RouterLink } from 'react-router-dom'; // <-- Importa useParams y Link
import { Container, Typography, Box, CircularProgress, Alert, Paper, Divider, Chip, Stack, Button, Link, // Import Link from MUI for styling if needed
            Table, TableBody, TableCell, TableContainer, TableHead, TableRow, } from '@mui/material'; // Importa componentes de Material UI (Chip para estados, Stack para botones)
import { useAuth, axiosInstance  } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
// Importa el modal de confirmación por si necesitas confirmar acciones (ej: aprobar/rechazar)
import ConfirmationModal from '../../components/ConfirmationModal';
import InfoIcon from '@mui/icons-material/Info';



function TeacherManageGroupPage() {
  // Obtiene el parámetro groupId de la URL
  const { groupId } = useParams(); // <-- Obtiene el ID del grupo de la URL

  const { user, isAuthenticated, isAuthInitialized } = useAuth(); // Obtiene el usuario y si está autenticado

  const [group, setGroup] = useState(null);
  const [studentMemberships, setStudentMemberships] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [canAddMoreStudents, setCanAddMoreStudents] = useState(true);
  const [studentLimitMessage, setStudentLimitMessage] = useState('');
  const [actionLoading, setActionLoading] = useState({});

  // Estados para el Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [modalAction, setModalAction] = useState(null);
  const [selectedMembershipId, setSelectedMembershipId] = useState(null);
  const [selectedMembershipStatus, setSelectedMembershipStatus] = useState(null);
  const [showInputInModal, setShowInputInModal] = useState(false);
  const [inputLabelInModal, setInputLabelInModal] = useState('');
  const [typedConfirmationName, setTypedConfirmationName] = useState('');
  const [expectedConfirmationName, setExpectedConfirmationName] = useState('');

  // Referencia para controlar el toast
  const hasShownSuccessToast = useRef(false);

  // Función para verificar límites
  const checkStudentLimits = useCallback((memberships, userPlan) => {
    if (user?.userType === 'Docente' && userPlan?.limits) {
      const maxStudentsPerGroup = userPlan.limits.maxStudentsPerGroup;
      const approvedCount = memberships.filter(m => m.estado_solicitud === 'Aprobado').length;

      if (approvedCount >= maxStudentsPerGroup) {
        setCanAddMoreStudents(false);
        setStudentLimitMessage(`Has alcanzado el límite de estudiantes permitidos (${maxStudentsPerGroup})`);
      } else {
        setCanAddMoreStudents(true);
        setStudentLimitMessage('');
      }
    } else if (user?.userType === 'Administrador') {
      setCanAddMoreStudents(true);
      setStudentLimitMessage('');
    }
  }, [user]);

  // useEffect unificado para cargar datos del grupo y membresías
  useEffect(() => {
    const fetchData = async () => {
      if (!isAuthInitialized || !isAuthenticated || !groupId || 
          (user?.userType !== 'Docente' && user?.userType !== 'Administrador')) {
        setIsLoading(false);
        if (!isAuthenticated && isAuthInitialized) {
          setError('No estás autenticado para ver esta página.');
        }
        return;
      }

      setIsLoading(true);
      setError(null);
      hasShownSuccessToast.current = false;

      try {
        // Cargar datos del grupo y membresías en paralelo
        const [groupResponse, membershipsResponse] = await Promise.all([
          axiosInstance.get(`/api/groups/${groupId}`),
          axiosInstance.get(`/api/groups/${groupId}/memberships`)
        ]);

        setGroup(groupResponse.data);
        setStudentMemberships(membershipsResponse.data);
        
        // Verificar límites solo una vez con los datos cargados
        if (user?.userType === 'Docente') {
          checkStudentLimits(membershipsResponse.data, user.plan);
        }

        // Solo mostrar el toast si no se ha mostrado antes
        if (!hasShownSuccessToast.current) {
          toast.success('Datos del grupo cargados correctamente');
          hasShownSuccessToast.current = true;
        }
      } catch (err) {
        console.error('Error al cargar datos del grupo:', err);
        const errorMessage = err.response?.data?.message || 'Error al cargar los datos del grupo';
        setError(errorMessage);
        if (!hasShownSuccessToast.current) {
          toast.error(errorMessage);
          hasShownSuccessToast.current = true;
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    // Cleanup function para resetear el estado del toast cuando el componente se desmonte
    return () => {
      hasShownSuccessToast.current = false;
    };
  }, [groupId, isAuthenticated, isAuthInitialized, user, checkStudentLimits]);

  // Función para actualizar límites después de cambios
  const updateLimits = useCallback(async () => {
    try {
      const updatedUser = await fetchAndUpdateUser();
      checkStudentLimits(studentMemberships, updatedUser?.plan);
    } catch (error) {
      console.error('Error al actualizar límites:', error);
    }
  }, [studentMemberships, checkStudentLimits]);

  // Función de ayuda para obtener el texto y color del estado de la membresía del estudiante
  const getMembershipStatusDisplay = (status) => {
      switch (status) {
        case 'Pendiente': // Coincide con el backend (español)
          return { text: 'Pendiente', color: 'warning.main' };
        case 'Aprobado': // Coincide con el backend (español)
          return { text: 'Aprobado', color: 'success.main' };
        case 'Rechazado': // Coincide con el backend (español)
          return { text: 'Rechazado', color: 'error.main' };
        default:
          console.warn(`Estado de membresía de estudiante desconocido recibido del backend: ${status}`);
          return { text: 'Desconocido', color: 'text.secondary' };
      }
  };

  // --- NUEVA Función: Manejar la respuesta a una solicitud de unión (Aprobar/Rechazar) ---
  // Esta función AHORA abre el modal de confirmación
  const handleRespondRequest = (membershipId, status) => {
      // Verifica que el usuario sea docente/admin
      if (!isAuthenticated || (user?.userType !== 'Docente' && user?.userType !== 'Administrador')) {
          toast.error('No tienes permiso para realizar esta acción.');
          return;
      }

      // Verifica que el estado solicitado sea válido
      if (status !== 'Aprobado' && status !== 'Rechazado') {
          toast.error('Estado de respuesta no válido.');
          return;
      }
      
      // Guarda el ID y el estado de la membresía para usar en `executeRespondRequest`
      setSelectedMembershipId(membershipId);
      setSelectedMembershipStatus(status); // Específico para aprobar/rechazar

      // Configura el mensaje y la acción para el modal (sin input)
      const actionText = status === 'Aprobado' ? 'aprobar' : 'rechazar';
      setModalMessage(`¿Estás seguro de que quieres ${actionText} esta solicitud?`);
      setModalAction(() => () => executeRespondRequest(membershipId, status));
      
      // Asegura que el input no se muestre para acciones de aprobar/rechazar
      setShowInputInModal(false);
      setTypedConfirmationName('');
      setExpectedConfirmationName('');
      
      setIsModalOpen(true); // Abre el modal
  };


  // --- Función: Ejecuta la lógica de la API para aprobar/rechazar después de la confirmación ---
  const executeRespondRequest = async (membershipId, status) => {
      setIsModalOpen(false); 
      setActionLoading(prev => ({ ...prev, [membershipId]: true }));

      try {
          const response = await axiosInstance.put(`/api/groups/join-request/${membershipId}/respond`, { responseStatus: status });
          const { message, membership: updatedMembershipFromBackend } = response.data;

          setStudentMemberships(prevMemberships =>
              prevMemberships.map(mem => mem._id === updatedMembershipFromBackend._id ? updatedMembershipFromBackend : mem)
          );

          // Actualizar límites después de aprobar un estudiante
          if (status === 'Aprobado') {
            await updateLimits();
          }

          toast.success(message || `Solicitud ${status === 'Aprobado' ? 'aprobada' : 'rechazada'} con éxito.`);
      } catch (err) {
          console.error(`Error al responder solicitud ${membershipId}:`, err.response ? err.response.data : err.message);
          const errorMsg = err.response?.data?.message || `Error al ${status === 'Aprobado' ? 'aprobar' : 'rechazar'} la solicitud.`;
          toast.error(errorMsg);
      } finally {
          setActionLoading(prev => ({ ...prev, [membershipId]: false }));
          // Resetear estados comunes del modal (no los de input, se resetean en su propio flujo o al cerrar)
          setSelectedMembershipId(null);
          setSelectedMembershipStatus(null);
      }
  };

  // --- NUEVA Función: Manejar la apertura del modal para REMOVER un estudiante ---
  const handleRemoveStudent = (membershipId, studentFullName) => {
      if (!isAuthenticated || (user?.userType !== 'Docente' && user?.userType !== 'Administrador')) {
          toast.error('No tienes permiso para realizar esta acción.');
          return;
      }
      setSelectedMembershipId(membershipId);
      setExpectedConfirmationName(studentFullName); // Puedes dejarlo para mostrar en el modal si quieres
      setModalMessage(`Para remover a ${studentFullName}, por favor escribe su nombre completo ("${studentFullName}") abajo para confirmar.`);
      setInputLabelInModal('Nombre completo del estudiante');
      setShowInputInModal(true);
      setTypedConfirmationName('');
      // CAPTURA el valor correcto aquí:
      setModalAction(() => (typedNameFromModal) => executeRemoveStudent(typedNameFromModal, studentFullName, membershipId));
      setIsModalOpen(true);
  };

  // --- NUEVA Función: Ejecuta la lógica de la API para REMOVER un estudiante después de la confirmación ---
  const normalizeString = (str) =>
    (str || '')
      .normalize('NFD') // Quita tildes
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ') // Reemplaza múltiples espacios por uno solo
      .trim()
      .toLowerCase();

  const executeRemoveStudent = async (typedNameFromModal, expectedName, membershipId) => {
    // LOG para depuración
    console.log('typed:', typedNameFromModal, '| expected:', expectedName);

    if (typedNameFromModal !== expectedName) {
      toast.error('El nombre ingresado no coincide exactamente. No se ha removido al estudiante.');
      return;
    }

    setIsModalOpen(false);
    setActionLoading(prev => ({ ...prev, [membershipId]: true }));

    try {
      await axiosInstance.delete(`/api/groups/${groupId}/memberships/${membershipId}`);
      setStudentMemberships(prevMemberships =>
        prevMemberships.filter(membership => membership._id !== membershipId)
      );
      toast.success(`${expectedName} ha sido removido del grupo.`);
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Error al remover al estudiante.';
      toast.error(errorMsg);
    } finally {
      setActionLoading(prev => ({ ...prev, [membershipId]: false }));
      setSelectedMembershipId(null);
      setExpectedConfirmationName('');
      setTypedConfirmationName('');
      setShowInputInModal(false);
      setInputLabelInModal('');
      setModalMessage('');
      setModalAction(null);
    }
  };

  // Calcular el conteo de estudiantes aprobados
  const approvedStudentsCount = studentMemberships.filter(m => m.estado_solicitud === 'Aprobado').length;
  const maxStudents = user?.plan?.limits?.maxStudentsPerGroup || '∞';

  // Renderizar si el grupo está cargando o hay un error al obtener detalles del grupo
  if (isLoading || error) {
    return (
        <Container>
            <Box sx={{ mt: 4, textAlign: 'center' }}>
                {isLoading && <CircularProgress />}
                {error && <Alert severity="error">{error}</Alert>}
                {!isLoading && !error && <Typography>Cargando detalles del grupo...</Typography>} {/* Fallback message */}
            </Box>
        </Container>
    );
  }

  // Renderizar si no se encontró el grupo después de cargar
  if (!group && !isLoading && !error) {
      return (
        <Container>
            <Box sx={{ mt: 4, textAlign: 'center' }}>
                 <Alert severity="warning">Grupo no encontrado.</Alert>
            </Box>
        </Container>
      );
  }


  // Si los detalles del grupo se cargaron correctamente (group es un objeto)
    return (
      <Container>
        <Box sx={{ mt: 4 }}>
          {/* Título y Descripción del Grupo */}
          <Typography variant="h4" gutterBottom>
            Gestión del Grupo: {group.nombre}
          </Typography>
          
          {group.descripcion && (
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2, fontStyle: 'italic' }}>
              {group.descripcion}
            </Typography>
          )}

          <Divider sx={{ mb: 2 }} />

          {/* Código de Acceso y Contador */}
          <Typography variant="body1" color="text.secondary">
            Código de Acceso: {group.codigo_acceso}
          </Typography>

          {user?.userType === 'Docente' && (
            <Box sx={{ 
              mt: 1,
              mb: 2,
              display: 'flex', 
              alignItems: 'center',
              gap: 1,
              color: 'text.secondary'
            }}>
              <InfoIcon fontSize="small" />
              <Typography variant="body2">
                Estudiantes: {approvedStudentsCount}/{maxStudents}
              </Typography>
            </Box>
          )}

          <Divider sx={{ mb: 3 }} />

          {/* Mostrar advertencia solo cuando se alcanza el límite */}
          {user?.userType === 'Docente' && studentLimitMessage && (
            <Box sx={{ 
              p: 1, 
              display: 'flex', 
              justifyContent: 'flex-end', 
              alignItems: 'center', 
              gap: 2,
              mb: 2,
              color: 'warning.main'
            }}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 0.5,
              }}>
                <InfoIcon fontSize="small" />
                <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                  {studentLimitMessage}
                </Typography>
              </Box>
            </Box>
          )}

          {/* Lista de Estudiantes */}
          <Typography variant="h5" gutterBottom>
            Lista de Estudiantes
          </Typography>

          {/* ... JSX de carga y error para estudiantes ... */}
           {/* Estado de carga */}
           {isLoading && (
           <Typography variant="body1">Cargando estudiantes...</Typography>
           )}

           {/* Estado de error */}
           {error && !isLoading && (
           <Typography variant="body1" color="error">
               Error al cargar los estudiantes. Intenta nuevamente.
           </Typography>
           )}

           {/* Estado sin estudiantes */}
           {!isLoading && !error && studentMemberships?.length === 0 && (
           <Typography variant="body1" color="text.secondary">
               No hay estudiantes en este grupo.
           </Typography>
           )}


           {/* *** Muestra la TABLA de estudiantes si no está cargando, no hay error y hay membresías *** */}
         {!isLoading && !error && studentMemberships.length > 0 && (
           <TableContainer component={Paper} sx={{ mt: 3 }}>
             <Table sx={{ minWidth: 650 }} aria-label="student memberships table">
               <TableHead>
                 <TableRow>
                   <TableCell>Nombre Completo</TableCell>
                   <TableCell align="right">Correo</TableCell> {/* Alineación a la derecha para números o emails */}
                   <TableCell align="center">Estado</TableCell> {/* Centrado para Chip de estado */}
                   <TableCell align="center">Acciones</TableCell> {/* Centrado para botones de acción */}
                 </TableRow>
               </TableHead>
               <TableBody>
                 {studentMemberships.map((membership) => {
                    const student = membership.usuario_id;
                    const statusInfo = getMembershipStatusDisplay(membership.estado_solicitud);

                    // Verificar que la información del estudiante está populada y es un objeto válido
                    if (!student || typeof student !== 'object') {
                        console.warn(`Información de estudiante no válida o no poblada para membresía ${membership._id}:`, student);
                        // Renderizar una fila de error en la tabla si la data del estudiante no está disponible
                        return (
                           <TableRow key={membership._id}>
                               <TableCell component="th" scope="row" colSpan={4}> {/* Ocupa todas las columnas */}
                                   <Alert severity="error">Error: Información de estudiante no disponible para Membresía ID: {membership._id}</Alert>
                               </TableCell>
                           </TableRow>
                        );
                    }

                   return (
                     <TableRow
                        key={membership._id}
                        sx={{ '&:last-child td, &:last-child th': { border: 0 } }} // Remover borde en la última fila
                     >
                       <TableCell component="th" scope="row"> {/* Columna Nombre */}
                         <Link component={RouterLink} to={`/profile/${student._id}`} underline="hover" color="inherit">
                           <Typography variant="body1">{`${student.nombre} ${student.apellidos}`.trim()}</Typography>
                         </Link>
                       </TableCell>
                       <TableCell align="right"> {/* Columna Email */}
                         <Typography variant="body2" color="text.secondary">{student.email}</Typography>
                       </TableCell>
                       <TableCell align="center"> {/* Columna Estado */}
                         <Chip label={statusInfo.text} size="small" sx={{ bgcolor: statusInfo.color, color: 'white' }} /> {/* Usamos Chip con color del estado */}
                       </TableCell>
                       <TableCell align="center"> {/* Columna Acciones */}
                         {/* Botones de acción condicionales (tu lógica existente, adaptada a Stack en TableCell) */}
                          {membership.estado_solicitud === 'Pendiente' && (
                              <Stack direction="row" spacing={1} justifyContent="center"> {/* Centra los botones */}
                                  <Button
                                      variant="outlined"
                                      size="small"
                                      color="success"
                                      onClick={() => handleRespondRequest(membership._id, 'Aprobado')}
                                      disabled={actionLoading[membership._id]}
                                      startIcon={actionLoading[membership._id] ? <CircularProgress size={16} color="inherit" /> : null}
                                     >
                                        {actionLoading[membership._id] ? 'Aprobando...' : 'Aprobar'}
                                     </Button>
                                     <Button
                                          variant="outlined"
                                          size="small"
                                          color="error"
                                          onClick={() => handleRespondRequest(membership._id, 'Rechazado')}
                                          disabled={actionLoading[membership._id]}
                                           startIcon={actionLoading[membership._id] ? <CircularProgress size={16} color="inherit" /> : null}
                                          >
                                             {actionLoading[membership._id] ? 'Rechazando...' : 'Rechazar'}
                                          </Button>
                                     </Stack>
                                 )}
                                 {/* Si es Aprobado, podrías añadir botón para eliminar (ejemplo) */}
                                 {membership.estado_solicitud !== 'Pendiente' && ( // Muestra eliminar/otras acciones si no está pendiente
                                   <Stack direction="row" spacing={1} justifyContent="center">
                                       {/* Botón de Eliminar Membresía */}
                                       <Button
                                           variant="outlined"
                                           size="small"
                                           color="error"
                                           onClick={() => {
                                               const studentFullName = `${student.nombre} ${student.apellidos}`.trim();
                                               handleRemoveStudent(membership._id, studentFullName);
                                           }}
                                           disabled={actionLoading[membership._id]}
                                           startIcon={actionLoading[membership._id] ? <CircularProgress size={16} color="inherit" /> : null}
                                       >
                                           {actionLoading[membership._id] && selectedMembershipId === membership._id ? 'Removiendo...' : 'Remover'}
                                       </Button>
                                       {/* Podrías añadir otros botones aquí (ej. Ver Perfil Estudiante) */}
                                   </Stack>
                                   )}
                           </TableCell>
                     </TableRow>
                   );
                })}
              </TableBody>
              { /* Mover los spinners de carga/error aquí dentro o justo antes del TableContainer si lo prefieres */ }
              </Table>
            </TableContainer>
          )}
          {/* Fin de la Sección de Estudiantes/Membresías */}
           <Divider sx={{ mt: 3 }} /> {/* Añade un divisor después de la tabla */}
        </Box>

        {/* Modal de Confirmación */}
        <ConfirmationModal
            open={isModalOpen}
            onClose={() => {
                setIsModalOpen(false);
                setModalMessage('');
                setModalAction(null); 
                setSelectedMembershipId(null);
                setSelectedMembershipStatus(null);
                setShowInputInModal(false);
                setInputLabelInModal('');
                setTypedConfirmationName('');
                // NO limpies aquí: setExpectedConfirmationName('');
            }}
            onConfirm={modalAction} // Esto llamará a executeRemoveStudent(typedName) o executeRespondRequest()
            title="Confirmar Acción"
            message={modalMessage}
            // Props para el input condicional
            showInput={showInputInModal}
            inputLabel={inputLabelInModal}
            inputValue={typedConfirmationName}
            onInputChange={(e) => setTypedConfirmationName(e.target.value)}
            // Cambiar texto de confirmación si es para remover
            confirmText={showInputInModal ? "Confirmar Remoción" : "Sí"}
            cancelText={showInputInModal ? "Cancelar" : "No"}
        />
      </Container>
    );
  }

  export default TeacherManageGroupPage;