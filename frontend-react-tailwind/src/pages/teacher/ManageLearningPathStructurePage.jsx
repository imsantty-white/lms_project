import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import learningPathService from '../../services/learningPathService';
import { useAuth } from '../../contexts/AuthContext';
import ModuleFormModal from '../../components/teacher/ModuleFormModal';
import TopicFormModal from '../../components/teacher/TopicFormModal';
import ContentAssignmentFormModal from '../../components/teacher/ContentAssignmentFormModal'; // Import ContentAssignmentFormModal

// Placeholder for icons
// import { FiPlus, FiEdit3, FiTrash2, FiBookOpen, FiLoader, FiPaperclip } from 'react-icons/fi';

const ManageLearningPathStructurePage = () => {
  const { learningPathId } = useParams();
  const [learningPath, setLearningPath] = useState(null);
  const [loading, setLoading] = useState(true); // For initial page load
  const [operationLoading, setOperationLoading] = useState(false); // For CRUD operations
  const [error, setError] = useState(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  // Module Modal states
  const [isModuleModalOpen, setIsModuleModalOpen] = useState(false);
  const [currentModuleForForm, setCurrentModuleForForm] = useState(null);

  // Topic Modal states
  const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);
  const [currentTopicForForm, setCurrentTopicForForm] = useState(null);
  const [selectedModuleIdForTopic, setSelectedModuleIdForTopic] = useState(null);

  // Content Assignment Modal states
  const [isContentModalOpen, setIsContentModalOpen] = useState(false);
  const [currentAssignmentForForm, setCurrentAssignmentForForm] = useState(null);
  const [selectedTopicIdForContent, setSelectedTopicIdForContent] = useState(null);


  const fetchLearningPathStructure = useCallback(async (showLoadingSpinner = true) => {
    if (!learningPathId) return;
    if (showLoadingSpinner) setLoading(true);
    setError(null);
    try {
      const structure = await learningPathService.getLearningPathStructure(learningPathId);
      setLearningPath(structure);
    } catch (err) {
      setError(err.message || 'Failed to fetch learning path structure.');
      console.error(err);
      if (!learningPath) setLearningPath(null);
    } finally {
      if (showLoadingSpinner) setLoading(false);
    }
  }, [learningPathId]); // Removed learningPath from deps

  useEffect(() => {
    if (user?.role === 'Teacher') {
      fetchLearningPathStructure();
    } else {
      setError("You are not authorized to view this page.");
      setLoading(false);
    }
  }, [user, learningPathId, fetchLearningPathStructure]);

  // Module Handlers
  const openAddModuleModal = () => {
    setCurrentModuleForForm(null);
    setIsModuleModalOpen(true);
  };
  const openEditModuleModal = (module) => {
    setCurrentModuleForForm(module);
    setIsModuleModalOpen(true);
  };
  const handleModuleFormSubmit = async (data, moduleIdToUpdate) => {
    setOperationLoading(true); setError(null);
    try {
      if (moduleIdToUpdate) await learningPathService.updateModule(moduleIdToUpdate, data);
      else await learningPathService.createModule(learningPathId, data);
      setIsModuleModalOpen(false); setCurrentModuleForForm(null);
      await fetchLearningPathStructure(false);
    } catch (err) { setError(err.message || `Failed to ${moduleIdToUpdate ? 'update' : 'add'} module.`); console.error(err); }
    finally { setOperationLoading(false); }
  };
  const handleDeleteModule = async (moduleId) => {
    if (window.confirm('Delete this module? This action cannot be undone.')) {
      setOperationLoading(true); setError(null);
      try {
        await learningPathService.deleteModule(moduleId);
        await fetchLearningPathStructure(false);
      } catch (err) { setError(err.message || 'Failed to delete module.'); console.error(err); }
      finally { setOperationLoading(false); }
    }
  };

  // Topic Handlers
  const openAddTopicModal = (moduleId) => {
    setSelectedModuleIdForTopic(moduleId); setCurrentTopicForForm(null);
    setIsTopicModalOpen(true);
  };
  const openEditTopicModal = (topic, moduleId) => {
    setSelectedModuleIdForTopic(moduleId); setCurrentTopicForForm(topic);
    setIsTopicModalOpen(true);
  };
  const handleTopicFormSubmit = async (data, topicIdToUpdate) => { // Renamed second param for clarity
    setOperationLoading(true); setError(null);
    try {
      if (currentTopicForForm?._id) { // Edit mode
        await learningPathService.updateTopic(currentTopicForForm._id, data);
      } else { // Add mode - topicIdToUpdate is actually selectedModuleIdForTopic
        await learningPathService.createTopic(selectedModuleIdForTopic, data);
      }
      setIsTopicModalOpen(false); setCurrentTopicForForm(null); setSelectedModuleIdForTopic(null);
      await fetchLearningPathStructure(false);
    } catch (err) { setError(err.message || `Failed to ${currentTopicForForm?._id ? 'update' : 'add'} topic.`); console.error(err); }
    finally { setOperationLoading(false); }
  };
  const handleDeleteTopic = async (topicId) => {
    if (window.confirm('Delete this topic? This action cannot be undone.')) {
      setOperationLoading(true); setError(null);
      try {
        await learningPathService.deleteTopic(topicId);
        await fetchLearningPathStructure(false);
      } catch (err) { setError(err.message || 'Failed to delete topic.'); console.error(err); }
      finally { setOperationLoading(false); }
    }
  };

  // Content Assignment Handlers
  const openAddContentModal = (topicId) => {
    setSelectedTopicIdForContent(topicId); setCurrentAssignmentForForm(null);
    setIsContentModalOpen(true);
  };
  const openEditContentModal = (assignment, topicId) => {
    setSelectedTopicIdForContent(topicId); setCurrentAssignmentForForm(assignment);
    setIsContentModalOpen(true);
  };
  const handleContentFormSubmit = async (data, assignmentIdToUpdateOrTopicId) => {
    setOperationLoading(true); setError(null);
    try {
      if (currentAssignmentForForm?._id) { // Edit mode
        await learningPathService.updateContentAssignment(currentAssignmentForForm._id, data);
      } else { // Add mode - assignmentIdToUpdateOrTopicId is selectedTopicIdForContent
        await learningPathService.assignContentToTopic(selectedTopicIdForContent, data);
      }
      setIsContentModalOpen(false); setCurrentAssignmentForForm(null); setSelectedTopicIdForContent(null);
      await fetchLearningPathStructure(false);
    } catch (err) { setError(err.message || `Failed to ${currentAssignmentForForm?._id ? 'update' : 'assign'} content.`); console.error(err); }
    finally { setOperationLoading(false); }
  };
  const handleDeleteContentAssignment = async (assignmentId) => {
    if (window.confirm('Delete this content assignment? This action cannot be undone.')) {
      setOperationLoading(true); setError(null);
      try {
        await learningPathService.deleteContentAssignment(assignmentId);
        await fetchLearningPathStructure(false);
      } catch (err) { setError(err.message || 'Failed to delete content assignment.'); console.error(err); }
      finally { setOperationLoading(false); }
    }
  };

  if (loading) return <div className="p-6 text-center text-lg">Loading learning path structure...</div>;
  if (error && !learningPath) return <div className="p-6 text-center"><p className="text-red-500 text-lg mb-4">Error: {error}</p><Link to="/teacher/learning-paths" className="text-indigo-600 hover:text-indigo-800">Back</Link></div>;
  if (!learningPath) return <div className="p-6 text-center"><p className="text-gray-700 text-lg mb-4">Path data unavailable.</p><Link to="/teacher/learning-paths" className="text-indigo-600 hover:text-indigo-800">Back</Link></div>;

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <h1 className="text-4xl font-bold text-gray-800">{learningPath.name}</h1>
          <Link to={`/teacher/learning-paths/${learningPathId}/edit`} className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md">Edit Path Details</Link>
        </div>
        <p className="text-gray-600 mt-2 text-lg">{learningPath.description}</p>
        <p className="text-sm text-gray-500 mt-1">Group: {learningPath.group?.name || 'N/A'}</p>
      </div>

      {error && <div className="my-4 p-3 text-red-600 bg-red-100 rounded-md text-center">{error}</div>}
      {operationLoading && <div className="my-4 p-3 text-blue-600 bg-blue-100 rounded-md text-center">Processing...</div>}

      <div className="mb-8">
        <button onClick={openAddModuleModal} className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-5 rounded-lg shadow-md" disabled={operationLoading}>Add New Module</button>
      </div>

      {learningPath.modules && learningPath.modules.length > 0 ? (
        <div className="space-y-8">
          {learningPath.modules.map((module) => (
            <div key={module._id} className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-2xl font-semibold text-purple-700">{module.name}</h2>
                <div className="space-x-2 flex-shrink-0">
                  <button onClick={() => openEditModuleModal(module)} className="text-sm text-yellow-600 hover:text-yellow-800 p-1" disabled={operationLoading}>Edit</button>
                  <button onClick={() => handleDeleteModule(module._id)} className="text-sm text-red-600 hover:text-red-800 p-1" disabled={operationLoading}>Delete</button>
                </div>
              </div>
              <p className="text-gray-600 mb-4">{module.description || 'No module description.'}</p>
              
              <div className="ml-4 border-l-2 border-purple-200 pl-4 space-y-4">
                {module.themes && module.themes.length > 0 ? (
                  module.themes.map((topic) => (
                    <div key={topic._id} className="bg-purple-50 p-4 rounded-lg shadow-sm">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="text-xl font-medium text-purple-600">{topic.name}</h3>
                        <div className="space-x-2 flex-shrink-0">
                          <button onClick={() => openEditTopicModal(topic, module._id)} className="text-xs text-yellow-500 hover:text-yellow-700 p-1" disabled={operationLoading}>Edit</button>
                          <button onClick={() => handleDeleteTopic(topic._id)} className="text-xs text-red-500 hover:text-red-700 p-1" disabled={operationLoading}>Delete</button>
                        </div>
                      </div>
                      <p className="text-gray-500 text-sm mb-3">{topic.description || 'No topic description.'}</p>
                      
                      {/* Display Content Assignments for this Topic */}
                      <div className="mt-3 space-y-2">
                        <h4 className="text-md font-semibold text-gray-700">Assigned Content:</h4>
                        {topic.contentAssignments && topic.contentAssignments.length > 0 ? (
                          topic.contentAssignments.map((assignment) => (
                            <div key={assignment._id} className="bg-white p-3 rounded-md shadow-sm border border-gray-200">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="font-medium text-teal-700">{assignment.title}</p>
                                  <p className="text-xs text-gray-500">Type: {assignment.contentType} | Status: {assignment.availabilityStatus}</p>
                                  {assignment.description && <p className="text-xs text-gray-600 mt-1">{assignment.description}</p>}
                                </div>
                                <div className="space-x-1 flex-shrink-0 mt-1">
                                  <button onClick={() => openEditContentModal(assignment, topic._id)} className="text-xs text-blue-500 hover:text-blue-700 p-1" disabled={operationLoading}>Edit</button>
                                  <button onClick={() => handleDeleteContentAssignment(assignment._id)} className="text-xs text-red-500 hover:text-red-700 p-1" disabled={operationLoading}>Del</button>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-gray-500 italic">No content assigned to this topic yet.</p>
                        )}
                      </div>
                      <button onClick={() => openAddContentModal(topic._id)} className="mt-3 text-xs bg-teal-500 hover:bg-teal-600 text-white py-1 px-3 rounded-md" disabled={operationLoading}>Assign Content</button>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 italic">This module has no topics yet.</p>
                )}
                <button onClick={() => openAddTopicModal(module._id)} className="mt-4 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold py-2 px-4 rounded-md" disabled={operationLoading}>Add Topic to Module</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-10 bg-white rounded-lg shadow-md"><h3 className="mt-2 text-sm font-medium text-gray-900">No modules yet.</h3><p className="mt-1 text-sm text-gray-500">Add a module to get started.</p></div>
      )}

      <ModuleFormModal isOpen={isModuleModalOpen} onClose={() => { setIsModuleModalOpen(false); setCurrentModuleForForm(null); setError(null); }} onSubmit={handleModuleFormSubmit} learningPathId={learningPathId} module={currentModuleForForm} />
      <TopicFormModal isOpen={isTopicModalOpen} onClose={() => { setIsTopicModalOpen(false); setCurrentTopicForForm(null); setSelectedModuleIdForTopic(null); setError(null); }} onSubmit={handleTopicFormSubmit} moduleId={selectedModuleIdForTopic} topic={currentTopicForForm} />
      <ContentAssignmentFormModal isOpen={isContentModalOpen} onClose={() => { setIsContentModalOpen(false); setCurrentAssignmentForForm(null); setSelectedTopicIdForContent(null); setError(null); }} onSubmit={handleContentFormSubmit} topicId={selectedTopicIdForContent} assignment={currentAssignmentForForm} />
    </div>
  );
};

export default ManageLearningPathStructurePage;
