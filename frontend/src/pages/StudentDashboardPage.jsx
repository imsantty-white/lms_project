import React, { useEffect, useState } from 'react';
import { Container, Typography, Grid, Paper, CircularProgress, Alert, LinearProgress, Box, Button } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useAuth, axiosInstance } from '../contexts/AuthContext'; // Assuming AuthContext provides axiosInstance

function StudentDashboardPage() {
  const { user, isAuthenticated, isAuthInitialized } = useAuth();
  const [learningPaths, setLearningPaths] = useState([]);
  const [pathsProgress, setPathsProgress] = useState({});
  const [loadingPaths, setLoadingPaths] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(false); // True when fetching progress for the top paths
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLearningPaths = async () => {
      if (!isAuthenticated) {
        setLoadingPaths(false);
        return;
      }
      try {
        setError(null);
        setLoadingPaths(true);
        const response = await axiosInstance.get('/api/learning-paths/my-assigned');
        setLearningPaths(response.data.data || []);
      } catch (err) {
        console.error("Error fetching learning paths:", err);
        setError(err.response?.data?.message || "Failed to load learning paths.");
        setLearningPaths([]); // Ensure it's an array on error
      } finally {
        setLoadingPaths(false);
      }
    };

    if (isAuthInitialized && isAuthenticated) {
      fetchLearningPaths();
    } else if (isAuthInitialized && !isAuthenticated) {
      setLoadingPaths(false);
      setError("User not authenticated. Please log in.");
    }
  }, [isAuthenticated, isAuthInitialized]);

  useEffect(() => {
    const fetchProgressForPaths = async (pathsToFetch) => {
      if (!pathsToFetch.length) {
        setLoadingProgress(false);
        return;
      }
      setLoadingProgress(true);
      try {
        const progressPromises = pathsToFetch.map(path =>
          axiosInstance.get(`/api/progress/my/${path._id}`)
            .then(res => ({ pathId: path._id, progress: res.data.progress }))
            .catch(err => {
              console.warn(`Failed to fetch progress for path ${path._id}:`, err);
              return { pathId: path._id, progress: null }; // Return null progress on error
            })
        );
        const results = await Promise.all(progressPromises);
        const newProgress = {};
        results.forEach(result => {
          newProgress[result.pathId] = result.progress;
        });
        setPathsProgress(prev => ({ ...prev, ...newProgress }));
      } catch (err) {
        // This catch might be redundant if individual errors are handled above,
        // but good for a general fetch error.
        console.error("Error fetching progress for multiple paths:", err);
        // Individual errors are logged, main error state might not be needed here unless all fail
      } finally {
        setLoadingProgress(false);
      }
    };

    if (learningPaths.length > 0) {
      const pathsToFetchDetailsFor = learningPaths.slice(0, 3);
      fetchProgressForPaths(pathsToFetchDetailsFor);
    }
  }, [learningPaths]);


  if (!isAuthInitialized) {
    return (
      <Container sx={{display: 'flex', justifyContent: 'center', mt:5}}>
        <CircularProgress />
      </Container>
    )
  }
  
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Student Dashboard
      </Typography>
      <Grid container spacing={3}>
        {/* Welcome & Guidance Section */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2, backgroundColor: 'primary.light', color: 'primary.contrastText' }}>
            <Typography variant="h6" gutterBottom>
              Welcome to Your Dashboard!
            </Typography>
            <Typography variant="body2" paragraph>
              Hello {user?.nombre || 'Student'}! This is your personal space to track your learning journey, manage your courses, and stay updated.
              We're excited to have you here!
            </Typography>
            <Typography variant="body2" paragraph>
              <strong>Quick Tip:</strong> Make sure your profile is complete to get personalized recommendations and make it easier for instructors to connect with you.
            </Typography>
            <Typography variant="body2">
              Explore your learning paths below and don't hesitate to reach out if you have any questions. Happy learning!
            </Typography>
          </Paper>
        </Grid>

        {/* My Learning Paths Card */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', minHeight: 280 }}>
            <Typography variant="h6" gutterBottom sx={{ mb: 1 }}>
              My Learning Paths
            </Typography>
            {loadingPaths ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <CircularProgress />
              </Box>
            ) : error ? (
              <Alert severity="error">{error}</Alert>
            ) : learningPaths.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 2 }}>
                No learning paths assigned yet. Explore available paths or contact your instructor.
              </Typography>
            ) : (
              <>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  You have {learningPaths.length} active learning path{learningPaths.length === 1 ? '' : 's'}.
                  Here's a quick look at your top {Math.min(3, learningPaths.length)}:
                </Typography>
                <Box sx={{ flexGrow: 1 }}>
                  {learningPaths.slice(0, 3).map((path) => {
                    const progress = pathsProgress[path._id];
                    let progressValue = 0;
                    if (progress && progress.total_themes > 0) {
                      progressValue = (progress.completed_themes.length / progress.total_themes) * 100;
                    } else if (progress && progress.path_status === "Completado") { // Handle case where total_themes might be 0 but path is complete
                        progressValue = 100;
                    }

                    return (
                      <Box key={path._id} sx={{ mb: 2.5 }}>
                        <Typography variant="subtitle1" component="div" sx={{ fontWeight: 'medium' }}>
                          {path.nombre}
                        </Typography>
                        {loadingProgress && pathsProgress[path._id] === undefined ? (
                           <Box sx={{ display: 'flex', alignItems: 'center', my: 0.5 }}>
                             <CircularProgress size={16} sx={{mr:1}} /> <Typography variant="caption">Loading progress...</Typography>
                           </Box>
                        ) : (
                          <LinearProgress variant="determinate" value={progressValue} sx={{ height: 8, borderRadius: 5, my: 0.5 }} />
                        )}
                        <Button
                          component={RouterLink}
                          to={`/student/progress?pathId=${path._id}`}
                          size="small"
                          sx={{ mt: 0.5, textTransform: 'none', p:0 }}
                        >
                          View Details
                        </Button>
                      </Box>
                    );
                  })}
                </Box>
                {learningPaths.length > 3 && (
                  <Button
                    component={RouterLink}
                    to="/student/learning-paths" // Or /student/progress if that's the main listing page
                    variant="outlined"
                    size="small"
                    sx={{ mt: 'auto', alignSelf: 'flex-start' }}
                  >
                    View All My Learning Paths ({learningPaths.length})
                  </Button>
                )}
                 {learningPaths.length > 0 && learningPaths.length <=3 && (
                     <Button
                        component={RouterLink}
                        to="/student/learning-paths" 
                        variant="outlined"
                        size="small"
                        sx={{ mt: 'auto', alignSelf: 'flex-start' }}
                    >
                        Go to My Learning Paths
                    </Button>
                 )}
              </>
            )}
          </Paper>
        </Grid>
        {/* Placeholder for recent activity/progress */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', minHeight: 280 }}> {/* Adjusted minHeight to match My Learning Paths */}
            <Typography variant="h6" gutterBottom>
              Recent Progress
            </Typography>
            <Typography variant="body2" color="text.secondary">
              (Summary of recent progress will go here)
            </Typography>
          </Paper>
        </Grid>

        {/* Tutorials & Help Card */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', minHeight: 280 }}>
            <Typography variant="h6" gutterBottom>
              Tutorials & Help
            </Typography>
            <Typography variant="body2" paragraph>
              Need help getting started or want to learn more about platform features? Check out these resources:
            </Typography>
            <Box component="ul" sx={{ pl: 2, mb: 2 }}>
              <Typography component="li" variant="body2">How to navigate your dashboard (Coming Soon)</Typography>
              <Typography component="li" variant="body2">Understanding your progress metrics (Coming Soon)</Typography>
              <Typography component="li" variant="body2">How to submit an activity and view feedback (Coming Soon)</Typography>
              <Typography component="li" variant="body2">Joining and participating in groups (Coming Soon)</Typography>
            </Box>
            <Button 
              variant="outlined" 
              size="small" 
              sx={{ mt: 'auto', alignSelf: 'flex-start' }}
              // onClick={() => { /* Future: Navigate to a dedicated help page or open a modal */ }}
            >
              Visit Full Help Center (Coming Soon)
            </Button>
          </Paper>
        </Grid>

        {/* Placeholder for upcoming assignments/deadlines */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', minHeight: 180 }}> {/* Ensure consistent minHeight */}
            <Typography variant="h6" gutterBottom>
              Upcoming Deadlines
            </Typography>
            <Typography variant="body2" color="text.secondary">
              (List of deadlines)
            </Typography>
          </Paper>
        </Grid>
        {/* Placeholder for achievements/badges */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', minHeight: 180 }}> {/* Ensure consistent minHeight */}
            <Typography variant="h6" gutterBottom>
              My Achievements
            </Typography>
            <Typography variant="body2" color="text.secondary">
              (Achievements/badges display)
            </Typography>
          </Paper>
        </Grid>
        {/* Placeholder for quick links - this can be the md={4} spot if Tutorials & Help is md={6} */}
        <Grid item xs={12} md={4}> 
          <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', minHeight: 180 }}> {/* Ensure consistent minHeight */}
            <Typography variant="h6" gutterBottom>
              Quick Links
            </Typography>
            <Typography variant="body2" color="text.secondary">
              (Links to join groups, browse courses, etc.)
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}

export default StudentDashboardPage;
