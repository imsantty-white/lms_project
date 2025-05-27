// Use Vite's environment variable for the API base URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const getToken = () => localStorage.getItem('token');

const learningPathService = {
  createLearningPath: async (lpData) => {
    // lpData should include { name, description, groupId }
    try {
      const response = await fetch(`${API_BASE_URL}/learning-paths`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`,
        },
        body: JSON.stringify(lpData),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create learning path');
      }
      return await response.json();
    } catch (error) {
      console.error('Create learning path error in learningPathService:', error);
      throw error;
    }
  },

  getMyCreatedLearningPaths: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/learning-paths/my-creations`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`,
        },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch created learning paths');
      }
      return await response.json();
    } catch (error) {
      console.error('Get my created learning paths error in learningPathService:', error);
      throw error;
    }
  },

  // This function fetches the detailed structure including modules and content.
  // For just LP details (name, description), getMyCreatedLearningPaths or getGroupLearningPaths might be sufficient.
  // If a simpler getLearningPathById is needed, the backend might require a new endpoint.
  // For now, this serves as a "get by ID" for the full structure.
  getLearningPathStructure: async (learningPathId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/learning-paths/${learningPathId}/structure`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`,
        },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch learning path structure');
      }
      return await response.json();
    } catch (error) {
      console.error('Get learning path structure error in learningPathService:', error);
      throw error;
    }
  },
  
  // This would be for fetching basic LP details, if such an endpoint exists.
  // For now, we'll rely on getMyCreatedLearningPaths or getGroupLearningPaths for lists,
  // and getLearningPathStructure for detailed view of a single LP.
  // If an endpoint like GET /api/learning-paths/:learningPathId (for basic details) exists, implement here.
  // getLearningPathById: async (learningPathId) => { ... }

  updateLearningPath: async (learningPathId, lpData) => {
    // lpData could be { name, description }
    try {
      const response = await fetch(`${API_BASE_URL}/learning-paths/${learningPathId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`,
        },
        body: JSON.stringify(lpData),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update learning path');
      }
      return await response.json();
    } catch (error) {
      console.error('Update learning path error in learningPathService:', error);
      throw error;
    }
  },

  deleteLearningPath: async (learningPathId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/learning-paths/${learningPathId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`,
        },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete learning path');
      }
      // DELETE might return 204 No Content or a confirmation message
      if (response.status === 204) return { message: 'Learning path deleted successfully' };
      return await response.json();
    } catch (error) {
      console.error('Delete learning path error in learningPathService:', error);
      throw error;
    }
  },

  getGroupLearningPaths: async (groupId) => {
    // Fetches learning paths for a specific group, intended for teachers
    try {
      const response = await fetch(`${API_BASE_URL}/learning-paths/groups/${groupId}/docente`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`,
        },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch group learning paths');
      }
      return await response.json();
    } catch (error) {
      console.error('Get group learning paths error in learningPathService:', error);
      throw error;
    }
  },

  // Module CRUD operations
  createModule: async (learningPathId, moduleData) => {
    // moduleData should include { name, description }
    try {
      const response = await fetch(`${API_BASE_URL}/learning-paths/${learningPathId}/modules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`,
        },
        body: JSON.stringify(moduleData),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create module');
      }
      return await response.json();
    } catch (error) {
      console.error('Create module error in learningPathService:', error);
      throw error;
    }
  },

  updateModule: async (moduleId, moduleData) => {
    // moduleData could be { name, description }
    try {
      const response = await fetch(`${API_BASE_URL}/learning-paths/modules/${moduleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`,
        },
        body: JSON.stringify(moduleData),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update module');
      }
      return await response.json();
    } catch (error) {
      console.error('Update module error in learningPathService:', error);
      throw error;
    }
  },

  deleteModule: async (moduleId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/learning-paths/modules/${moduleId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`,
        },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete module');
      }
      if (response.status === 204) return { message: 'Module deleted successfully' };
      return await response.json();
    } catch (error) {
      console.error('Delete module error in learningPathService:', error);
      throw error;
    }
  },

  // Topic (Theme) CRUD operations
  createTopic: async (moduleId, topicData) => {
    // topicData should include { name, description }
    try {
      const response = await fetch(`${API_BASE_URL}/learning-paths/modules/${moduleId}/themes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`,
        },
        body: JSON.stringify(topicData),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create topic');
      }
      return await response.json();
    } catch (error) {
      console.error('Create topic error in learningPathService:', error);
      throw error;
    }
  },

  updateTopic: async (topicId, topicData) => {
    // topicData could be { name, description }
    try {
      const response = await fetch(`${API_BASE_URL}/learning-paths/themes/${topicId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`,
        },
        body: JSON.stringify(topicData),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update topic');
      }
      return await response.json();
    } catch (error) {
      console.error('Update topic error in learningPathService:', error);
      throw error;
    }
  },

  deleteTopic: async (topicId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/learning-paths/themes/${topicId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`,
        },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete topic');
      }
      if (response.status === 204) return { message: 'Topic deleted successfully' };
      return await response.json();
    } catch (error) {
      console.error('Delete topic error in learningPathService:', error);
      throw error;
    }
  },

  // Content Assignment CRUD operations
  assignContentToTopic: async (topicId, contentData) => {
    // contentData: { resourceId?, activityId?, contentType, title, description?, availabilityStatus? }
    try {
      const response = await fetch(`${API_BASE_URL}/learning-paths/themes/${topicId}/assign-content`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`,
        },
        body: JSON.stringify(contentData),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to assign content');
      }
      return await response.json();
    } catch (error) {
      console.error('Assign content error in learningPathService:', error);
      throw error;
    }
  },

  updateContentAssignment: async (assignmentId, assignmentData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/learning-paths/assignments/${assignmentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`,
        },
        body: JSON.stringify(assignmentData),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update content assignment');
      }
      return await response.json();
    } catch (error) {
      console.error('Update content assignment error in learningPathService:', error);
      throw error;
    }
  },

  deleteContentAssignment: async (assignmentId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/learning-paths/assignments/${assignmentId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`,
        },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete content assignment');
      }
      if (response.status === 204) return { message: 'Content assignment deleted successfully' };
      return await response.json();
    } catch (error) {
      console.error('Delete content assignment error in learningPathService:', error);
      throw error;
    }
  },

  getContentAssignmentById: async (assignmentId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/learning-paths/assignments/${assignmentId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`,
        },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch content assignment');
      }
      return await response.json();
    } catch (error) {
      console.error('Get content assignment by ID error in learningPathService:', error);
      throw error;
    }
  },
};

export default learningPathService;
