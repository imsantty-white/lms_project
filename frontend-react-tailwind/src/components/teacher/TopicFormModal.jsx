import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';

const TopicFormModal = ({ isOpen, onClose, onSubmit, moduleId, topic: currentTopic }) => {
  const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm();
  const isEditMode = Boolean(currentTopic);

  useEffect(() => {
    if (isOpen) {
      if (isEditMode && currentTopic) {
        setValue('name', currentTopic.name);
        setValue('description', currentTopic.description);
      } else {
        reset({ name: '', description: '' });
      }
    }
  }, [isOpen, isEditMode, currentTopic, setValue, reset]);

  const handleFormSubmit = (data) => {
    // If in add mode, moduleId is passed directly.
    // If in edit mode, topicId is currentTopic._id.
    onSubmit(data, isEditMode ? currentTopic._id : moduleId);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex justify-center items-center">
      <div className="relative mx-auto p-8 border w-full max-w-lg shadow-xl rounded-md bg-white">
        <h3 className="text-2xl font-semibold text-gray-900 mb-6">
          {isEditMode ? 'Edit Topic' : 'Add New Topic'}
        </h3>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          <div>
            <label htmlFor="topicName" className="block text-sm font-medium text-gray-700 mb-1">
              Topic Name
            </label>
            <input
              id="topicName" // Changed id to avoid conflict with module form if both were ever on same page (unlikely but good practice)
              type="text"
              {...register('name', { required: 'Topic name is required' })}
              className={`mt-1 block w-full px-4 py-2 border ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              } rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
            />
            {errors.name && (
              <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="topicDescription" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="topicDescription" // Changed id
              rows="4"
              {...register('description', { required: 'Description is required' })}
              className={`mt-1 block w-full px-4 py-2 border ${
                errors.description ? 'border-red-500' : 'border-gray-300'
              } rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
            />
            {errors.description && (
              <p className="mt-1 text-xs text-red-600">{errors.description.message}</p>
            )}
          </div>

          <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-200 mt-8">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
            >
              {isEditMode ? 'Update Topic' : 'Add Topic'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TopicFormModal;
