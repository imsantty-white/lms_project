// src/pages/TeacherManageGroupPage.jsx

import React, { useEffect, useState, useRef } from 'react'; // Importa useEffect, useState, useRef
import { useParams, Link as RouterLink } from 'react-router-dom'; // <-- Importa useParams y Link
import { Container, Typography, Box, CircularProgress, Alert, Paper, Divider, Chip, Stack, Button, Link, // Import Link from MUI for styling if needed
            Table, TableBody, TableCell, TableContainer, TableHead, TableRow, } from '@mui/material'; // Importa componentes de Material UI (Chip para estados, Stack para botones)
import { useAuth, axiosInstance  } from '../contexts/AuthContext';
//import axios from 'axios';
import { toast } from 'react-toastify';
//import { API_BASE_URL } from '../utils/constants';
// Importa el modal de confirmación por si necesitas confirmar acciones (ej: aprobar/rechazar)
import ConfirmationModal from '../components/ConfirmationModal';





function TeacherManageGroupPage() {
  // Obtiene el parámetro groupId de la URL
  const { groupId } = useParams(); // <-- Obtiene el ID del grupo de la URL

  const { user, isAuthenticated, isAuthInitialized } = useAuth(); // Obtiene el usuario y si está autenticado

  const [group, setGroup] = useState(null); // Estado para los detalles del grupo
  const [studentMemberships, setStudentMemberships] = useState([]); // Estado para la lista de membresías de estudiantes
  const [isLoadingGroup, setIsLoadingGroup] = useState(true); // Estado de carga para los detalles del grupo
  const [isLoadingStudents, setIsLoadingStudents] = useState(true); // Estado de carga para los estudiantes
  const [errorGroup, setErrorGroup] = useState(null); // Estado de error para los detalles del grupo
  const [errorStudents, setErrorStudents] = useState(null); // Estado de error para los estudiantes

  // Referencias para controlar los toasts duplicados (una para cada fetch)
  const hasShownGroupSuccessToast = useRef(false);
  const hasShownStudentsSuccessToast = useRef(false);

  // --- NUEVO ESTADO para manejar la carga de acciones individuales (aprobar/rechazar) ---
  // Guarda un objeto donde las claves son los IDs de las membresías y el valor es un booleano (true si está cargando)
  const [actionLoading, setActionLoading] = useState({});

  // --- Estados para el Modal de Confirmación ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [modalAction, setModalAction] = useState(null); // Almacenará una función a ejecutar
  const [selectedMembershipId, setSelectedMembershipId] = useState(null);
  const [selectedMembershipStatus, setSelectedMembershipStatus] = useState(null); // Para aprobar/rechazar
  
  // --- Estados específicos para el modal con input (Remover Estudiante) ---
  const [showInputInModal, setShowInputInModal] = useState(false);
  const [inputLabelInModal, setInputLabelInModal] = useState('');
  const [typedConfirmationName, setTypedConfirmationName] = useState(''); // Valor del input
  const [expectedConfirmationName, setExpectedConfirmationName] = useState(''); // Nombre esperado para confirmación


  // useEffect para obtener los DETALLES del grupo
  useEffect(() => {
    const fetchGroupDetails = async () => {
      // Verifica que el usuario sea docente/admin y que tengamos un groupId
       // La protección de ruta ya valida el rol, pero verificamos el ID del grupo
      if (!groupId) {
          setErrorGroup('ID del grupo no proporcionado en la URL.');
          setIsLoadingGroup(false);
          return;
      }

      setIsLoadingGroup(true);
      setErrorGroup(null);
      hasShownGroupSuccessToast.current = false;

      try {
        // Petición GET al backend para obtener los detalles de UN grupo específico
        // Asume un endpoint como /api/groups/:groupId que devuelve los detalles del grupo
        // Tu backend debe verificar que el docente logueado ES el dueño de este grupo
        const response = await axiosInstance.get(`/api/groups/${groupId}`); // <-- Asume este endpoint

        // Asume que el backend devuelve el objeto del grupo en response.data
        setGroup(response.data);

        if (!hasShownGroupSuccessToast.current) {
            toast.success('Detalles del grupo cargados.');
            hasShownGroupSuccessToast.current = true;
        }

      } catch (err) {
        console.error(`Error al obtener detalles del grupo ${groupId}:`, err.response ? err.response.data : err.message);
        const errorMessage = err.response && err.response.data && err.response.data.message
          ? err.response.data.message
          : 'Error al cargar los detalles del grupo.';
        setErrorGroup(errorMessage);
        toast.error('Error al cargar detalles del grupo.');
        hasShownGroupSuccessToast.current = false;
      } finally {
        setIsLoadingGroup(false);
      }
    };

    // *** CONDICIÓN CLAVE: Esperar a que la Auth esté inicializada Y autenticado ***
    if (isAuthInitialized && isAuthenticated && (user?.userType === 'Docente' || user?.userType === 'Administrador') && groupId) {
         fetchGroupDetails();
    } else if (isAuthInitialized && !isAuthenticated) {
        // Si la Auth ya terminó de inicializar pero NO estamos autenticados,
        // puedes mostrar un mensaje de error o redirigir si la ruta no es pública.
        // Para rutas protegidas por ProtectedRoute, esto no debería pasar,
        // pero es buena práctica considerarlo.
         console.log("Auth inicializada, pero usuario no autenticado. No se cargan detalles del grupo.");
         setIsLoadingGroup(false); // Desactiva spinners si estaban activos
         setErrorGroup("No estás autenticado para ver los detalles de este grupo.");
    } else if (!isAuthInitialized) {
        // Si la Auth aún no ha terminado de inicializar, no hacemos nada aún,
        // simplemente mostramos el spinner de carga inicial de la página si existe.
        console.log("Auth aún no inicializada. Esperando para cargar detalles del grupo.");
    }


    // *** Añadir isAuthInitialized a las dependencias ***
  }, [groupId, isAuthenticated, user, isAuthInitialized]); // <-- Añade isAuthInitialized



   // useEffect para obtener las MEMBRESÍAS (estudiantes con estado) del grupo
  useEffect(() => {
    const fetchStudentMemberships = async () => {
      // Verifica que el usuario sea docente/admin y que tengamos un groupId
      if (!groupId) {
           // El error para groupId faltante ya lo manejamos en el otro useEffect
          setIsLoadingStudents(false);
          return;
      }
       if (!isAuthenticated || (user?.userType !== 'Docente' && user?.userType !== 'Administrador')) {
           setIsLoadingStudents(false);
           setErrorStudents('No tienes permiso para ver esta página.');
           return;
       }


      setIsLoadingStudents(true);
      setErrorStudents(null);
      hasShownStudentsSuccessToast.current = false;

      try {
        // Petición GET al backend para obtener las membresías de estudiantes de UN grupo específico
        // Asume un endpoint como /api/groups/:groupId/memberships que devuelve la lista de membresías para este grupo
        // Tu backend debe verificar que el docente logueado ES el dueño de este grupo
        // y que la respuesta incluye student_id (poblado) y estado_solicitud.
        const response = await axiosInstance.get(`/api/groups/${groupId}/memberships`); // <-- Asume este endpoint

        // Asume que el backend devuelve un array de objetos de membresía en response.data
        // donde cada objeto tiene { _id: '...', usuario_id: { _id: '...', nombre: '...', apellidos: '...' }, grupo_id: '...', estado_solicitud: '...' }
        setStudentMemberships(response.data);

         if (!hasShownStudentsSuccessToast.current) {
            // Opcional: mensaje más específico si hay estudiantes
             if(response.data.length > 0) {
                 toast.success('Membresías de estudiantes cargadas.');
             } else {
                 toast.info('Este grupo aún no tiene estudiantes.');
             }
            hasShownStudentsSuccessToast.current = true;
         }


      } catch (err) {
        console.error(`Error al obtener membresías del grupo ${groupId}:`, err.response ? err.response.data : err.message);
        const errorMessage = err.response && err.response.data && err.response.data.message
          ? err.response.data.message
          : 'Error al cargar los estudiantes del grupo.';
        setErrorStudents(errorMessage);
        toast.error('Error al cargar estudiantes.');
        hasShownStudentsSuccessToast.current = false;
      } finally {
        setIsLoadingStudents(false);
      }
    };

    // *** CONDICIÓN CLAVE: Esperar a que la Auth esté inicializada Y autenticado ***
    if (isAuthInitialized && isAuthenticated && (user?.userType === 'Docente' || user?.userType === 'Administrador') && groupId) {
         fetchStudentMemberships();
    } else if (isAuthInitialized && !isAuthenticated) {
         console.log("Auth inicializada, pero usuario no autenticado. No se cargan membresías.");
         setIsLoadingStudents(false);
         setErrorStudents("No estás autenticado para ver las membresías de este grupo.");
    } else if (!isAuthInitialized) {
        console.log("Auth aún no inicializada. Esperando para cargar membresías.");
    }

    // *** Añadir isAuthInitialized a las dependencias ***
  }, [groupId, isAuthenticated, user, isAuthInitialized]); // <-- Añade isAuthInitialized



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
      setExpectedConfirmationName(studentFullName); // Guardar el nombre completo para la verificación
      setModalMessage(`Para remover a ${studentFullName}, por favor escribe su nombre completo ("${studentFullName}") abajo para confirmar.`);
      setInputLabelInModal('Nombre completo del estudiante');
      setShowInputInModal(true); // Mostrar el campo de texto en el modal
      setTypedConfirmationName(''); // Limpiar el campo de texto al abrir
      
      // La acción de confirmación ahora llamará a executeRemoveStudent, 
      // que recibirá el valor del input directamente desde ConfirmationModal
      setModalAction(() => (typedNameFromModal) => executeRemoveStudent(typedNameFromModal));
      
      setIsModalOpen(true);
  };

  // --- NUEVA Función: Ejecuta la lógica de la API para REMOVER un estudiante después de la confirmación ---
  const executeRemoveStudent = async (typedNameFromModal) => {
      // selectedMembershipId y expectedConfirmationName se leen desde el estado
      if (typedNameFromModal !== expectedConfirmationName) {
          toast.error('El nombre ingresado no coincide. No se ha removido al estudiante.');
          // No cerramos el modal aquí para que el usuario pueda corregir el nombre
          // o cerrar el modal manualmente.
          // Si se quisiera cerrar, se podría añadir: setIsModalOpen(false); setActionLoading({ ... }); etc.
          return; 
      }

      setIsModalOpen(false); // Cerrar el modal ANTES de la llamada a la API
      setActionLoading(prev => ({ ...prev, [selectedMembershipId]: true }));

      try {
          // El groupId se obtiene de useParams()
          await axiosInstance.delete(`/api/groups/${groupId}/memberships/${selectedMembershipId}`);
          
          // Actualizar el estado local para reflejar la eliminación
          setStudentMemberships(prevMemberships =>
              prevMemberships.filter(membership => membership._id !== selectedMembershipId)
          );
          toast.success(`${expectedConfirmationName} ha sido removido del grupo.`);

      } catch (err) {
          console.error(`Error al remover estudiante con membresía ${selectedMembershipId}:`, err.response ? err.response.data : err.message);
          const errorMsg = err.response?.data?.message || 'Error al remover al estudiante.';
          toast.error(errorMsg);
      } finally {
          setActionLoading(prev => ({ ...prev, [selectedMembershipId]: false }));
          // Resetear todos los estados del modal y de selección
          setSelectedMembershipId(null);
          setExpectedConfirmationName('');
          setTypedConfirmationName('');
          setShowInputInModal(false);
          setInputLabelInModal('');
          setModalMessage(''); // Limpiar mensaje por si acaso
          setModalAction(null); // Limpiar acción
      }
  };

  // Renderizar si el grupo está cargando o hay un error al obtener detalles del grupo
  if (isLoadingGroup || errorGroup) {
    return (
        <Container>
            <Box sx={{ mt: 4, textAlign: 'center' }}>
                {isLoadingGroup && <CircularProgress />}
                {errorGroup && <Alert severity="error">{errorGroup}</Alert>}
                {!isLoadingGroup && !errorGroup && <Typography>Cargando detalles del grupo...</Typography>} {/* Fallback message */}
            </Box>
        </Container>
    );
  }

  // Renderizar si no se encontró el grupo después de cargar
  if (!group && !isLoadingGroup && !errorGroup) {
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
          {/* Detalles del Grupo */}
          <Typography variant="h4" gutterBottom>
            Gestión del Grupo: {group.nombre}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Código de Acceso: {group.codigo_acceso}
          </Typography>
           <Divider sx={{ mb: 3 }} />
  
  
          {/* Sección de Estudiantes/Membresías */}
           <Typography variant="h5" gutterBottom>
              Lista de Estudiantes
           </Typography>
  
           {/* ... JSX de carga y error para estudiantes ... */}
            {/* Estado de carga */}
            {isLoadingStudents && (
            <Typography variant="body1">Cargando estudiantes...</Typography>
            )}

            {/* Estado de error */}
            {errorStudents && !isLoadingStudents && (
            <Typography variant="body1" color="error">
                Error al cargar los estudiantes. Intenta nuevamente.
            </Typography>
            )}

            {/* Estado sin estudiantes */}
            {!isLoadingStudents && !errorStudents && studentMemberships?.length === 0 && (
            <Typography variant="body1" color="text.secondary">
                No hay estudiantes en este grupo.
            </Typography>
            )}
  
  
            {/* *** Muestra la TABLA de estudiantes si no está cargando, no hay error y hay membresías *** */}
          {!isLoadingStudents && !errorStudents && studentMemberships.length > 0 && (
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
                // Resetear todos los estados relacionados con el modal al cerrar
                setModalMessage('');
                setModalAction(null); 
                setSelectedMembershipId(null);
                setSelectedMembershipStatus(null);
                setShowInputInModal(false);
                setInputLabelInModal('');
                setTypedConfirmationName('');
                setExpectedConfirmationName('');
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