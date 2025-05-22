// backend/src/utils/permissionUtils.js
const mongoose = require('mongoose');
const Membership = require('../models/MembershipModel');
const Group = require('../models/GroupModel');
const Submission = require('../models/SubmissionModel');
const ContentAssignment = require('../models/ContentAssignmentModel');

/**
 * Checks if a user is an approved member of a group.
 * @param {mongoose.Types.ObjectId|string} userId - The ID of the user.
 * @param {mongoose.Types.ObjectId|string} groupId - The ID of the group.
 * @returns {Promise<boolean>} True if the user is an approved member, false otherwise.
 */
const isApprovedGroupMember = async (userId, groupId) => {
    if (!userId || !groupId) return false;
    try {
        const membership = await Membership.findOne({
            usuario_id: userId,
            grupo_id: groupId,
            estado_solicitud: 'Aprobado'
        }).lean(); // Use .lean() for faster, non-Mongoose-doc query
        return !!membership;
    } catch (error) {
        console.error('Error in isApprovedGroupMember:', error);
        return false; // Or throw error if you want controllers to handle it
    }
};

/**
 * Checks if a user is the teacher of a specific group.
 * @param {mongoose.Types.ObjectId|string} userId - The ID of the user (teacher).
 * @param {mongoose.Types.ObjectId|string} groupId - The ID of the group.
 * @returns {Promise<boolean>} True if the user is the teacher of the group, false otherwise.
 */
const isTeacherOfGroup = async (userId, groupId) => {
    if (!userId || !groupId) return false;
    try {
        const group = await Group.findOne({
            _id: groupId,
            docente_id: userId
        }).lean();
        return !!group;
    } catch (error) {
        console.error('Error in isTeacherOfGroup:', error);
        return false;
    }
};

/**
 * Checks if a user is the teacher associated with a specific submission.
 * Assumes SubmissionModel has a direct docente_id field.
 * @param {mongoose.Types.ObjectId|string} teacherId - The ID of the teacher.
 * @param {mongoose.Types.ObjectId|string} submissionId - The ID of the submission.
 * @returns {Promise<boolean>} True if the user is the teacher of the submission, false otherwise.
 */
const isTeacherOfSubmission = async (teacherId, submissionId) => {
    if (!teacherId || !submissionId) return false;
    try {
        const submission = await Submission.findById(submissionId).select('docente_id').lean();
        if (!submission) return false;
        return submission.docente_id && submission.docente_id.equals(teacherId);
    } catch (error) {
        console.error('Error in isTeacherOfSubmission:', error);
        // Handle CastError specifically if submissionId is invalid
        if (error.name === 'CastError') {
            console.error('Invalid submissionId format:', submissionId);
            return false;
        }
        return false;
    }
};

/**
 * Checks if a user is the teacher associated with a specific content assignment.
 * Assumes ContentAssignmentModel has a direct docente_id field.
 * @param {mongoose.Types.ObjectId|string} teacherId - The ID of the teacher.
 * @param {mongoose.Types.ObjectId|string} assignmentId - The ID of the content assignment.
 * @returns {Promise<boolean>} True if the user is the teacher of the assignment, false otherwise.
 */
const isTeacherOfContentAssignment = async (teacherId, assignmentId) => {
    if (!teacherId || !assignmentId) return false;
    try {
        const assignment = await ContentAssignment.findById(assignmentId).select('docente_id').lean();
        if (!assignment) return false;
        // Ensure docente_id exists and then compare. Using .equals() is good for ObjectIds.
        return assignment.docente_id && assignment.docente_id.equals(teacherId);
    } catch (error) {
        console.error('Error in isTeacherOfContentAssignment:', error);
        if (error.name === 'CastError') {
            console.error('Invalid assignmentId format:', assignmentId);
            return false;
        }
        return false;
    }
};

module.exports = {
    isApprovedGroupMember,
    isTeacherOfGroup,
    isTeacherOfSubmission,
    isTeacherOfContentAssignment,
};
