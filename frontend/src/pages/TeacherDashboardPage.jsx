import React, { useEffect, useState } from 'react';
import { Container, Typography, Grid, Paper, CircularProgress, Alert, Box, Card, CardContent, List, ListItem, ListItemText, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useAuth, axiosInstance } from '../contexts/AuthContext';

// Mock data for Activity Completions chart if backend doesn't provide weekly breakdown
const mockActivityCompletionsChartData = [
  { week: 'Week 1', completions: 0 },
  { week: 'Week 2', completions: 0 },
  { week: 'Week 3', completions: 0 },
  { week: 'Week 4', completions: 0 },
];

function TeacherDashboardPage() {
  const { user, isAuthenticated, isAuthInitialized } = useAuth();
  const [teacherStats, setTeacherStats] = useState(null);
  const [popularContent, setPopularContent] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingPopularContent, setLoadingPopularContent] = useState(true);
  const [errorStats, setErrorStats] = useState(null);
  const [errorPopularContent, setErrorPopularContent] = useState(null);

  useEffect(() => {
    const fetchTeacherStats = async () => {
      if (!isAuthenticated) return;
      try {
        setLoadingStats(true);
        setErrorStats(null);
        const response = await axiosInstance.get('/api/dashboard/teacher/stats');
        setTeacherStats(response.data.data);
      } catch (err) {
        console.error("Error fetching teacher stats:", err);
        setErrorStats(err.response?.data?.message || "Failed to load teacher statistics.");
      } finally {
        setLoadingStats(false);
      }
    };

    const fetchPopularContent = async () => {
      if (!isAuthenticated) return;
      try {
        setLoadingPopularContent(true);
        setErrorPopularContent(null);
        const response = await axiosInstance.get('/api/dashboard/teacher/popular-content');
        setPopularContent(response.data.data);
      } catch (err) {
        console.error("Error fetching popular content:", err);
        setErrorPopularContent(err.response?.data?.message || "Failed to load popular content data.");
      } finally {
        setLoadingPopularContent(false);
      }
    };
    
    if (isAuthInitialized && isAuthenticated) {
        fetchTeacherStats();
        fetchPopularContent();
    } else if (isAuthInitialized && !isAuthenticated) {
        setLoadingStats(false);
        setLoadingPopularContent(false);
        setErrorStats("User not authenticated.");
        setErrorPopularContent("User not authenticated.");
    }

  }, [isAuthenticated, isAuthInitialized]);

  if (!isAuthInitialized || (loadingStats && loadingPopularContent)) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (!isAuthenticated) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">You must be logged in to view this page.</Alert>
      </Container>
    );
  }
  
  // Display combined error messages if any section failed
  const combinedError = [errorStats, errorPopularContent].filter(Boolean).join(' ');
  if (combinedError && (!teacherStats || !popularContent)) { // Show error if essential data is missing
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">{`Error loading dashboard: ${combinedError}`}</Alert>
      </Container>
    );
  }


  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 3, textAlign: 'center' }}>
        Teacher Dashboard
      </Typography>

      {/* Student Engagement Metrics */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Total Students</Typography>
              {loadingStats ? <CircularProgress size={24}/> : 
                <Typography variant="h4">{teacherStats?.totalStudentsInMyGroups ?? 'N/A'}</Typography>
              }
              <Typography variant="body2" color="text.secondary">In your groups</Typography>
               {errorStats && <Alert severity="warning" sx={{fontSize: '0.75rem', mt:1}}>{errorStats}</Alert>}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Active Students</Typography>
              {loadingStats ? <CircularProgress size={24}/> : 
                <Typography variant="h4">{teacherStats?.activeStudentsLast7Days ?? 'N/A'}</Typography>
              }
              <Typography variant="body2" color="text.secondary">In the last 7 days</Typography>
              {errorStats && <Alert severity="warning" sx={{fontSize: '0.75rem', mt:1}}>{errorStats}</Alert>}
            </CardContent>
          </Card>
        </Grid>
         <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Learning Paths Managed</Typography>
              {loadingStats ? <CircularProgress size={24}/> : 
                <Typography variant="h4">{teacherStats?.learningPathsManaged ?? 'N/A'}</Typography>
              }
               {errorStats && <Alert severity="warning" sx={{fontSize: '0.75rem', mt:1}}>{errorStats}</Alert>}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
           <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Avg. Path Completion</Typography>
              {loadingStats ? <CircularProgress size={24}/> : 
                <Typography variant="h4">{teacherStats?.averageLearningPathCompletionRate ?? 0}%</Typography>
              }
              {errorStats && <Alert severity="warning" sx={{fontSize: '0.75rem', mt:1}}>{errorStats}</Alert>}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      {/* Activity Completions Chart (Using Mock Data for now as backend doesn't provide weekly breakdown) */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12}>
            <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', height: 300 }}>
            <Typography variant="h6" gutterBottom>Activity Completions (Weekly Trend - Mock Data)</Typography>
            {/* This chart uses mock data as the backend does not provide specific weekly breakdown. */}
            <ResponsiveContainer>
                <BarChart data={mockActivityCompletionsChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="completions" fill="#8884d8" name="Completions" />
                </BarChart>
            </ResponsiveContainer>
            <Typography variant="caption" color="text.secondary" sx={{mt:1}}>
                * Weekly trend is mock data. For actual total completions, refer to specific activity reports.
            </Typography>
            </Paper>
        </Grid>
      </Grid>


      {/* Popular Content/Activities */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', minHeight: 250 }}>
            <Typography variant="h6" gutterBottom>Most Assigned Content (Top 5)</Typography>
            {loadingPopularContent ? <CircularProgress sx={{alignSelf: 'center'}} /> :
             errorPopularContent ? <Alert severity="warning">{errorPopularContent}</Alert> :
             popularContent?.mostAccessedContent?.length > 0 ? (
                <List dense>
                  {popularContent.mostAccessedContent.map((content, index) => (
                    <ListItem key={index} disableGutters>
                      <ListItemText primary={content.name} secondary={`Assigned ${content.count} times`} />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary">No content assignment data available.</Typography>
              )}
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', minHeight: 250 }}>
            <Typography variant="h6" gutterBottom>Most Completed Activities (Top 5)</Typography>
            {loadingPopularContent ? <CircularProgress sx={{alignSelf: 'center'}} /> :
             errorPopularContent ? <Alert severity="warning">{errorPopularContent}</Alert> :
             popularContent?.mostCompletedActivities?.length > 0 ? (
                <List dense>
                  {popularContent.mostCompletedActivities.map((activity, index) => (
                    <ListItem key={index} disableGutters>
                      <ListItemText primary={activity.name} secondary={`Completed ${activity.count} times`} />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary">No activity completion data available.</Typography>
              )}
          </Paper>
        </Grid>
      </Grid>

      {(!teacherStats && !loadingStats && !errorStats) &&
        <Alert severity="info" sx={{ mt: 2 }}>No general statistics found for your account.</Alert>
      }
      {(!popularContent && !loadingPopularContent && !errorPopularContent) &&
        <Alert severity="info" sx={{ mt: 2 }}>No popular content data found for your account.</Alert>
      }
       <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Typography variant="caption" color="text.secondary">
          Dashboard data reflects activities and content related to your managed groups and learning paths.
        </Typography>
      </Box>
    </Container>
  );
}

export default TeacherDashboardPage;
