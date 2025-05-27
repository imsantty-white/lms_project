// Use Vite's environment variable for the API base URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const getToken = () => localStorage.getItem('token');

const groupService = {
  createGroup: async (groupData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/groups/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`,
        },
        body: JSON.stringify(groupData),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create group');
      }
      return await response.json();
    } catch (error) {
      console.error('Create group error in groupService:', error);
      throw error;
    }
  },

  getMyOwnedGroups: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/groups/docente/me`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`,
        },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch owned groups');
      }
      return await response.json();
    } catch (error) {
      console.error('Get my owned groups error in groupService:', error);
      throw error;
    }
  },

  getGroupById: async (groupId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/groups/${groupId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`,
        },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch group');
      }
      return await response.json();
    } catch (error) {
      console.error('Get group by ID error in groupService:', error);
      throw error;
    }
  },

  updateGroup: async (groupId, groupData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/groups/${groupId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`,
        },
        body: JSON.stringify(groupData),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update group');
      }
      return await response.json();
    } catch (error) {
      console.error('Update group error in groupService:', error);
      throw error;
    }
  },

  deleteGroup: async (groupId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/groups/${groupId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`,
        },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete group');
      }
      return await response.json(); // Or handle no content response if API returns 204
    } catch (error) {
      console.error('Delete group error in groupService:', error);
      throw error;
    }
  },

  getGroupStudents: async (groupId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/groups/${groupId}/students`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`,
        },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch group students');
      }
      return await response.json();
    } catch (error) {
      console.error('Get group students error in groupService:', error);
      throw error;
    }
  },
  
  // Based on backend: router.get('/join-requests/docente', authMiddleware, groupController.getMyJoinRequests);
  // This seems to get all join requests for a teacher's groups, not for a specific group.
  // If a specific group's join requests are needed, backend might need adjustment.
  // For now, using the existing endpoint:
  getTeacherJoinRequests: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/groups/join-requests/docente`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`,
        },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch join requests for teacher');
      }
      return await response.json();
    } catch (error) {
      console.error('Get teacher join requests error in groupService:', error);
      throw error;
    }
  },

  respondToJoinRequest: async (membershipId, status) => {
    try {
      const response = await fetch(`${API_BASE_URL}/groups/join-request/${membershipId}/respond`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ status }), // Expected body: { status: 'Aceptado' | 'Rechazado' }
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to respond to join request');
      }
      return await response.json();
    } catch (error) {
      console.error('Respond to join request error in groupService:', error);
      throw error;
    }
  },
};

export default groupService;
