import React, { useEffect, useState } from 'react';
import { Container, Typography, Grid, Paper, CircularProgress, Alert, Box, Card, CardContent, List, ListItem, ListItemText, Button } from '@mui/material';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Link as RouterLink } from 'react-router-dom';
import { useAuth, axiosInstance } from '../contexts/AuthContext';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF']; // Added more colors for roles/types

function AdminDashboardPage() {
  const { user, isAuthenticated, isAuthInitialized } = useAuth();
  const [adminStats, setAdminStats] = useState(null);
  const [popularContent, setPopularContent] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingPopularContent, setLoadingPopularContent] = useState(true);
  const [errorStats, setErrorStats] = useState(null);
  const [errorPopularContent, setErrorPopularContent] = useState(null);

  useEffect(() => {
    const fetchAdminStats = async () => {
      if (!isAuthenticated) return;
      try {
        setLoadingStats(true);
        setErrorStats(null);
        const response = await axiosInstance.get('/api/dashboard/admin/stats');
        setAdminStats(response.data.data);
      } catch (err) {
        console.error("Error fetching admin stats:", err);
        setErrorStats(err.response?.data?.message || "Failed to load admin statistics.");
      } finally {
        setLoadingStats(false);
      }
    };

    const fetchAdminPopularContent = async () => {
      if (!isAuthenticated) return;
      try {
        setLoadingPopularContent(true);
        setErrorPopularContent(null);
        const response = await axiosInstance.get('/api/dashboard/admin/popular-content');
        setPopularContent(response.data.data);
      } catch (err) {
        console.error("Error fetching admin popular content:", err);
        setErrorPopularContent(err.response?.data?.message || "Failed to load admin popular content data.");
      } finally {
        setLoadingPopularContent(false);
      }
    };

    if (isAuthInitialized && isAuthenticated) {
      fetchAdminStats();
      fetchAdminPopularContent();
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

  const combinedError = [errorStats, errorPopularContent].filter(Boolean).join(' ');
  if (combinedError && (!adminStats || !popularContent)) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">{`Error loading dashboard: ${combinedError}`}</Alert>
      </Container>
    );
  }

  // Prepare data for User Role Distribution Pie Chart
  const userRoleData = adminStats?.totalUsersByRole 
    ? Object.entries(adminStats.totalUsersByRole).map(([key, value]) => ({ name: key, value }))
    : [];
  
  const totalUserCount = userRoleData.reduce((sum, entry) => sum + entry.value, 0);

  // Prepare data for Most Utilized Content Types Bar Chart
  const utilizedContentTypesData = popularContent?.mostUtilizedContentTypes || [];


  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 3, textAlign: 'center' }}>
        Admin Dashboard
      </Typography>

      {/* Overall Platform Statistics */}
      <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>Overall Platform Statistics</Typography>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Total Users</Typography>
              {loadingStats ? <CircularProgress size={24}/> : 
                <>
                  <Typography variant="h4">{totalUserCount}</Typography>
                  {userRoleData.map(role => (
                    <Typography key={role.name} variant="body2" color="text.secondary">
                      {role.name}s: {role.value}
                    </Typography>
                  ))}
                </>
              }
              {errorStats && <Alert severity="warning" sx={{fontSize: '0.75rem', mt:1}}>{errorStats}</Alert>}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Total Learning Paths</Typography>
              {loadingStats ? <CircularProgress size={24}/> : 
                <Typography variant="h4">{adminStats?.totalLearningPaths ?? 'N/A'}</Typography>
              }
              {errorStats && <Alert severity="warning" sx={{fontSize: '0.75rem', mt:1}}>{errorStats}</Alert>}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Total Groups</Typography>
              {loadingStats ? <CircularProgress size={24}/> : 
                <Typography variant="h4">{adminStats?.totalGroups ?? 'N/A'}</Typography>
              }
              {errorStats && <Alert severity="warning" sx={{fontSize: '0.75rem', mt:1}}>{errorStats}</Alert>}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', height: 250 }}>
            <Typography variant="h6" gutterBottom align="center">User Role Distribution</Typography>
            {loadingStats ? <CircularProgress sx={{alignSelf: 'center'}}/> : 
             errorStats ? <Alert severity="warning">{errorStats}</Alert> :
             userRoleData.length > 0 ? (
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={userRoleData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {userRoleData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (<Typography variant="body2" color="text.secondary" align="center">No user data available.</Typography>)
           }
          </Paper>
        </Grid>
      </Grid>

      {/* Student Engagement & Progress */}
      <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>Platform Engagement</Typography>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Active Users (Last 7 Days)</Typography>
              {loadingStats ? <CircularProgress size={24}/> : 
                <Typography variant="h4">{adminStats?.activeUsersLast7Days ?? 'N/A'}</Typography>
              }
              <Typography variant="body2" color="text.secondary">*Simplified: New users registered in last 7 days.</Typography>
              {errorStats && <Alert severity="warning" sx={{fontSize: '0.75rem', mt:1}}>{errorStats}</Alert>}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Platform-Wide Average Learning Path Completion Rate</Typography>
              {loadingStats ? <CircularProgress size={24}/> : 
                <Typography variant="h4">{adminStats?.platformWideAverageCompletionRate ?? 0}%</Typography>
              }
               {errorStats && <Alert severity="warning" sx={{fontSize: '0.75rem', mt:1}}>{errorStats}</Alert>}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Content Overview */}
      <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>Content Overview</Typography>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, minHeight: 300 }}>
            <Typography variant="h6" gutterBottom>Most Popular Learning Paths (Top 5 by Enrollment)</Typography>
            {loadingPopularContent ? <CircularProgress sx={{display: 'block', margin: 'auto'}}/> :
             errorPopularContent ? <Alert severity="warning">{errorPopularContent}</Alert> :
             popularContent?.mostPopularLearningPaths?.length > 0 ? (
              <List dense>
                {popularContent.mostPopularLearningPaths.map((path, index) => (
                  <ListItem key={index} disableGutters>
                    <ListItemText 
                      primary={path.name} 
                      secondary={`Enrolled: ${path.enrolled ?? 0}`} 
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="text.secondary">No learning path data available.</Typography>
            )}
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', height: 300 }}>
            <Typography variant="h6" gutterBottom>Most Utilized Content Types</Typography>
            {loadingPopularContent ? <CircularProgress sx={{alignSelf: 'center'}}/> :
             errorPopularContent ? <Alert severity="warning">{errorPopularContent}</Alert> :
             utilizedContentTypesData.length > 0 ? (
              <ResponsiveContainer>
                <BarChart data={utilizedContentTypesData} layout="vertical" margin={{ top: 5, right: 20, left: 120, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={110} interval={0} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="#82ca9d" name="Usage Count">
                    {utilizedContentTypesData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Typography variant="body2" color="text.secondary" align="center">No content type data available.</Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
      
      {/* User Management Quick Link */}
      <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>User Management</Typography>
      <Paper sx={{ p: 2, mb: 4, textAlign: 'center' }}>
        <Typography variant="body1" sx={{ mb: 2 }}>
          Manage users, roles, and permissions.
        </Typography>
        <Button
          variant="contained"
          color="primary"
          component={RouterLink}
          to="/admin/user-management"
        >
          Go to User Management
        </Button>
      </Paper>
      
      {(!adminStats && !loadingStats && !errorStats) &&
        <Alert severity="info" sx={{ mt: 2 }}>No general statistics found for the platform.</Alert>
      }
      {(!popularContent && !loadingPopularContent && !errorPopularContent) &&
        <Alert severity="info" sx={{ mt: 2 }}>No popular content data found for the platform.</Alert>
      }

      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Typography variant="caption" color="text.secondary">
          This dashboard provides a platform-wide overview. For detailed management, please visit respective sections.
        </Typography>
      </Box>
    </Container>
  );
}

export default AdminDashboardPage;
