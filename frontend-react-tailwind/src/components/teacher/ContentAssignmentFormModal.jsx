import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';

const ContentAssignmentFormModal = ({ isOpen, onClose, onSubmit, topicId, assignment: currentAssignment }) => {
  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm();
  const isEditMode = Boolean(currentAssignment?._id);
  const contentType = watch('contentType'); // To conditionally show resourceId or activityId

  useEffect(() => {
    if (isOpen) {
      if (isEditMode && currentAssignment) {
        setValue('title', currentAssignment.title);
        setValue('description', currentAssignment.description || '');
        setValue('contentType', currentAssignment.contentType);
        setValue('availabilityStatus', currentAssignment.availabilityStatus || 'Disponible');
        if (currentAssignment.contentType === 'Resource' && currentAssignment.resource) {
          setValue('resourceOrActivityId', currentAssignment.resource._id || currentAssignment.resource);
        } else if (currentAssignment.contentType === 'Activity' && currentAssignment.activity) {
          setValue('resourceOrActivityId', currentAssignment.activity._id || currentAssignment.activity);
        } else {
            setValue('resourceOrActivityId', ''); // Clear if no specific ID found
        }
      } else {
        reset({ 
          title: '', 
          description: '', 
          contentType: 'Resource', // Default
          resourceOrActivityId: '',
          availabilityStatus: 'Disponible' // Default
        });
      }
    }
  }, [isOpen, isEditMode, currentAssignment, setValue, reset]);

  const handleFormSubmit = (data) => {
    const payload = {
      title: data.title,
      description: data.description,
      contentType: data.contentType,
      availabilityStatus: data.availabilityStatus,
    };
    if (data.contentType === 'Resource') {
      payload.resourceId = data.resourceOrActivityId;
    } else if (data.contentType === 'Activity') {
      payload.activityId = data.resourceOrActivityId;
    }
    
    onSubmit(payload, isEditMode ? currentAssignment._id : topicId);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full z-50 flex justify-center items-center">
      <div className="relative mx-auto p-8 border w-full max-w-xl shadow-2xl rounded-lg bg-white">
        <h3 className="text-2xl font-semibold text-gray-900 mb-6">
          {isEditMode ? 'Edit Content Assignment' : 'Assign New Content'}
        </h3>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5">
          <div>
            <label htmlFor="assignmentTitle" className="block text-sm font-medium text-gray-700 mb-1">
              Assignment Title
            </label>
            <input
              id="assignmentTitle"
              type="text"
              {...register('title', { required: 'Title is required' })}
              className={`mt-1 block w-full px-4 py-2 border ${
                errors.title ? 'border-red-500' : 'border-gray-300'
              } rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm`}
            />
            {errors.title && (
              <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="assignmentDescription" className="block text-sm font-medium text-gray-700 mb-1">
              Description (Optional)
            </label>
            <textarea
              id="assignmentDescription"
              rows="3"
              {...register('description')}
              className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="contentType" className="block text-sm font-medium text-gray-700 mb-1">
                Content Type
              </label>
              <select
                id="contentType"
                {...register('contentType', { required: 'Content type is required' })}
                className="mt-1 block w-full px-4 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
              >
                <option value="Resource">Resource</option>
                <option value="Activity">Activity</option>
              </select>
              {errors.contentType && (
                <p className="mt-1 text-xs text-red-600">{errors.contentType.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="resourceOrActivityId" className="block text-sm font-medium text-gray-700 mb-1">
                {contentType === 'Resource' ? 'Resource ID' : 'Activity ID'} (Placeholder)
              </label>
              <input
                id="resourceOrActivityId"
                type="text"
                {...register('resourceOrActivityId', { required: 'Resource/Activity ID is required' })}
                placeholder={`Enter ID for ${contentType}`}
                className={`mt-1 block w-full px-4 py-2 border ${
                  errors.resourceOrActivityId ? 'border-red-500' : 'border-gray-300'
                } rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm`}
              />
              {errors.resourceOrActivityId && (
                <p className="mt-1 text-xs text-red-600">{errors.resourceOrActivityId.message}</p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="availabilityStatus" className="block text-sm font-medium text-gray-700 mb-1">
              Availability Status
            </label>
            <select
              id="availabilityStatus"
              {...register('availabilityStatus', { required: 'Status is required' })}
              className="mt-1 block w-full px-4 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
            >
              <option value="Disponible">Disponible</option>
              <option value="No Disponible">No Disponible</option>
              <option value="Programado">Programado</option> 
              {/* Add other statuses if supported by backend */}
            </select>
            {errors.availabilityStatus && (
              <p className="mt-1 text-xs text-red-600">{errors.availabilityStatus.message}</p>
            )}
          </div>

          <div className="flex items-center justify-end space-x-4 pt-5 border-t border-gray-200 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-colors"
            >
              {isEditMode ? 'Update Assignment' : 'Assign Content'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ContentAssignmentFormModal;
