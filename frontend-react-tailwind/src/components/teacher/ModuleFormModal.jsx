import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';

const ModuleFormModal = ({ isOpen, onClose, onSubmit, learningPathId, module: currentModule }) => {
  const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm();
  const isEditMode = Boolean(currentModule);

  useEffect(() => {
    if (isOpen) {
      if (isEditMode && currentModule) {
        setValue('name', currentModule.name);
        setValue('description', currentModule.description);
      } else {
        reset({ name: '', description: '' });
      }
    }
  }, [isOpen, isEditMode, currentModule, setValue, reset]);

  const handleFormSubmit = (data) => {
    onSubmit(data, currentModule?._id); // Pass moduleId if editing
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex justify-center items-center">
      <div className="relative mx-auto p-8 border w-full max-w-lg shadow-xl rounded-md bg-white">
        <h3 className="text-2xl font-semibold text-gray-900 mb-6">
          {isEditMode ? 'Edit Module' : 'Add New Module'}
        </h3>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Module Name
            </label>
            <input
              id="name"
              type="text"
              {...register('name', { required: 'Module name is required' })}
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
              className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors"
            >
              {isEditMode ? 'Update Module' : 'Add Module'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModuleFormModal;
