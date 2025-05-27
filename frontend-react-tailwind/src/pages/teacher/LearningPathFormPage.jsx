import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams, Link } from 'react-router-dom';
import learningPathService from '../../services/learningPathService';
import groupService from '../../services/groupService'; // To fetch groups for the dropdown
import { useAuth } from '../../contexts/AuthContext';

const LearningPathFormPage = () => {
  const { learningPathId } = useParams();
  const isEditMode = Boolean(learningPathId);
  const navigate = useNavigate();
  const { user } = useAuth(); // For role checks or user info

  const { register, handleSubmit, setValue, watch, formState: { errors }, reset } = useForm();
  const [loading, setLoading] = useState(false); // General loading state
  const [dataLoading, setDataLoading] = useState(false); // For fetching initial data (groups, LP details)
  const [formError, setFormError] = useState(null);
  const [pageTitle, setPageTitle] = useState('Create Learning Path');
  const [ownedGroups, setOwnedGroups] = useState([]);

  // Watch the groupId field to ensure it's correctly registered if needed
  const selectedGroupId = watch('groupId');

  // Fetch owned groups for the dropdown
  useEffect(() => {
    const fetchGroups = async () => {
      setDataLoading(true);
      try {
        const groups = await groupService.getMyOwnedGroups();
        setOwnedGroups(groups || []);
      } catch (err) {
        console.error("Failed to fetch groups:", err);
        setFormError("Could not load your groups. Please try again later.");
        setOwnedGroups([]); // Ensure it's an array
      }
      setDataLoading(false);
    };

    if (user?.role === 'Teacher') {
      fetchGroups();
    }
  }, [user]);

  // Fetch learning path details in edit mode
  useEffect(() => {
    if (isEditMode && learningPathId) {
      setPageTitle('Edit Learning Path');
      setDataLoading(true);
      learningPathService.getLearningPathStructure(learningPathId) // Using structure endpoint for details
        .then(lp => {
          setValue('name', lp.name);
          setValue('description', lp.description);
          setValue('groupId', lp.group?._id || lp.group); // group might be populated or just an ID
          setDataLoading(false);
        })
        .catch(err => {
          console.error("Failed to fetch learning path details:", err);
          setFormError(err.message || 'Failed to load learning path data.');
          setDataLoading(false);
        });
    } else {
      setPageTitle('Create New Learning Path');
      reset({ name: '', description: '', groupId: '' }); // Reset form for create mode
    }
  }, [learningPathId, isEditMode, setValue, reset]);

  const onSubmit = async (data) => {
    setLoading(true);
    setFormError(null);

    if (!data.groupId) {
      setFormError('Associated Group is required.');
      setLoading(false);
      return;
    }
    
    const payload = {
      name: data.name,
      description: data.description,
      groupId: data.groupId,
    };

    try {
      if (isEditMode) {
        await learningPathService.updateLearningPath(learningPathId, payload);
      } else {
        await learningPathService.createLearningPath(payload);
      }
      navigate('/teacher/learning-paths');
    } catch (err) {
      console.error("Form submission error:", err);
      setFormError(err.message || `Failed to ${isEditMode ? 'update' : 'create'} learning path.`);
    } finally {
      setLoading(false);
    }
  };

  if (dataLoading) {
    return <div className="p-6 text-center text-lg">Loading data...</div>;
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">{pageTitle}</h1>
      
      <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-8 rounded-lg shadow-xl space-y-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Learning Path Name
          </label>
          <input
            id="name"
            type="text"
            {...register('name', { required: 'Name is required' })}
            className={`mt-1 block w-full px-4 py-2 border ${
              errors.name ? 'border-red-500' : 'border-gray-300'
            } rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm`}
          />
          {errors.name && (
            <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            id="description"
            rows="4"
            {...register('description', { required: 'Description is required' })}
            className={`mt-1 block w-full px-4 py-2 border ${
              errors.description ? 'border-red-500' : 'border-gray-300'
            } rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm`}
          />
          {errors.description && (
            <p className="mt-1 text-xs text-red-600">{errors.description.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="groupId" className="block text-sm font-medium text-gray-700 mb-1">
            Associated Group
          </label>
          <select
            id="groupId"
            {...register('groupId', { required: 'Associated Group is required' })}
            className={`mt-1 block w-full px-4 py-2 border ${
              errors.groupId ? 'border-red-500' : 'border-gray-300'
            } rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm bg-white`}
            defaultValue=""
          >
            <option value="" disabled>Select a group</option>
            {ownedGroups.length > 0 ? (
              ownedGroups.map(group => (
                <option key={group._id} value={group._id}>
                  {group.name}
                </option>
              ))
            ) : (
              <option value="" disabled>No groups available or loading...</option>
            )}
          </select>
          {errors.groupId && (
            <p className="mt-1 text-xs text-red-600">{errors.groupId.message}</p>
          )}
        </div>

        {formError && (
          <p className="text-sm text-red-600 text-center bg-red-100 p-3 rounded-md border border-red-300">{formError}</p>
        )}

        <div className="flex items-center justify-end space-x-4 pt-4">
          <Link
            to="/teacher/learning-paths"
            className="px-6 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading || dataLoading}
            className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:bg-purple-300 transition-colors"
          >
            {loading ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update Path' : 'Create Path')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default LearningPathFormPage;
