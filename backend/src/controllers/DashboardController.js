// Placeholder for DashboardController.js content
// Will be populated with endpoint logic
const asyncHandler = require('../middleware/asyncHandler');
const ErrorResponse = require('../utils/ErrorResponse');

const User = require('../models/User');
const Group = require('../models/Group');
const LearningPath = require('../models/LearningPath');
const Module = require('../models/Module');
const Theme = require('../models/Theme');
const ContentAssignment = require('../models/ContentAssignment');
const Progress = require('../models/Progress');
const Submission = require('../models/Submission');
const Resource = require('../models/Resource');
const Activity = require('../models/Activity');

// @desc    Get Teacher's Aggregated Statistics
// @route   GET /api/dashboard/teacher/stats
// @access  Private/Teacher
exports.getTeacherStats = asyncHandler(async (req, res, next) => {
    const docenteId = req.user._id;

    // 1. Find groups managed by this teacher
    const teacherGroups = await Group.find({ docente_id: docenteId });
    if (!teacherGroups.length) {
        return res.status(200).json({
            success: true,
            data: {
                totalStudentsInMyGroups: 0,
                activeStudentsLast7Days: 0,
                averageLearningPathCompletionRate: 0,
                learningPathsManaged: 0,
            }
        });
    }
    const groupIds = teacherGroups.map(group => group._id);

    // 2. Find learning paths associated with these groups
    const learningPaths = await LearningPath.find({ group_id: { $in: groupIds } });
    const learningPathIds = learningPaths.map(lp => lp._id);

    // 3. Calculate totalStudentsInMyGroups
    // Counts unique students with 'Aprobado' membership in the teacher's groups
    const studentEnrollments = await Group.aggregate([
        { $match: { _id: { $in: groupIds } } },
        { $unwind: '$miembros' },
        { $match: { 'miembros.estado_inscripcion': 'Aprobado' } },
        { $group: { _id: '$miembros.estudiante_id' } },
        { $count: 'totalStudents' }
    ]);
    const totalStudentsInMyGroups = studentEnrollments.length > 0 ? studentEnrollments[0].totalStudents : 0;

    // 4. Calculate activeStudentsLast7Days (Simplified: students with any submission in the last 7 days)
    // This is a simplified version. A more complex one would check ProgressModel updates too.
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const activeStudents = await Submission.distinct('estudiante_id', {
        // Assuming Submission has a relation to LearningPath or Group to filter by teacher
        // For now, this counts any active student who made a submission.
        // This needs refinement to only count students in the teacher's groups/paths.
        // We'll filter by learningPathIds which are derived from teacher's groups
        learning_path_id: { $in: learningPathIds }, 
        fecha_envio: { $gte: sevenDaysAgo }
    });
    const activeStudentsLast7Days = activeStudents.length;
    
    // 5. Calculate averageLearningPathCompletionRate
    let totalCompletionRate = 0;
    let pathsWithProgress = 0;
    for (const lp of learningPaths) {
        const progressRecords = await Progress.find({ learning_path_id: lp._id });
        const enrolledStudentsCount = await Group.findOne({ _id: lp.group_id }).then(g => g ? g.miembros.filter(m => m.estado_inscripcion === 'Aprobado').length : 0);

        if (enrolledStudentsCount > 0) {
            const completedCount = progressRecords.filter(p => p.path_status === 'Completado').length;
            totalCompletionRate += (completedCount / enrolledStudentsCount) * 100;
            pathsWithProgress++;
        }
    }
    const averageLearningPathCompletionRate = pathsWithProgress > 0 ? totalCompletionRate / pathsWithProgress : 0;

    // 6. learningPathsManaged
    const learningPathsManaged = learningPaths.length;

    res.status(200).json({
        success: true,
        data: {
            totalStudentsInMyGroups,
            activeStudentsLast7Days,
            averageLearningPathCompletionRate: parseFloat(averageLearningPathCompletionRate.toFixed(2)),
            learningPathsManaged,
        }
    });
});

// @desc    Get Teacher's Popular Content
// @route   GET /api/dashboard/teacher/popular-content
// @access  Private/Teacher
exports.getTeacherPopularContent = asyncHandler(async (req, res, next) => {
    const docenteId = req.user._id;

    const teacherGroups = await Group.find({ docente_id: docenteId }).select('_id');
    const groupIds = teacherGroups.map(g => g._id);
    const learningPaths = await LearningPath.find({ group_id: { $in: groupIds } }).select('_id');
    const learningPathIds = learningPaths.map(lp => lp._id);

    // Most Assigned Content (Simplified Alternative for Most Accessed)
    // Counts how many times each Resource or Activity is assigned in the teacher's LPs
    const contentAssignments = await ContentAssignment.find({ learning_path_id: { $in: learningPathIds } })
        .populate('content_id'); // Populate to get name/title

    const contentCounts = {};
    contentAssignments.forEach(assignment => {
        if (assignment.content_id) { // Ensure content exists
            const contentName = assignment.content_id.title || assignment.content_id.nombre; // Activity.title or Resource.nombre
            contentCounts[contentName] = (contentCounts[contentName] || 0) + 1;
        }
    });
    
    const mostAssignedContent = Object.entries(contentCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

    // Most Completed Activities (Top 5)
    // Counts submissions with 'Calificado' or 'Completado' for activities in teacher's paths
    const completedActivitiesAgg = await Submission.aggregate([
        { $match: { learning_path_id: { $in: learningPathIds }, estado_envio: { $in: ['Calificado', 'Completado'] } } },
        { $group: { _id: '$activity_id', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
        {
            $lookup: {
                from: 'activities', // Collection name for Activity model
                localField: '_id',
                foreignField: '_id',
                as: 'activityDetails'
            }
        },
        { $unwind: '$activityDetails' },
        { $project: { name: '$activityDetails.title', count: 1, _id:0 } }
    ]);
    
    res.status(200).json({
        success: true,
        data: {
            mostAccessedContent: mostAssignedContent, // Simplified to most assigned
            mostCompletedActivities: completedActivitiesAgg
        }
    });
});


// @desc    Get Admin's Platform-Wide Statistics
// @route   GET /api/dashboard/admin/stats
// @access  Private/Admin
exports.getAdminStats = asyncHandler(async (req, res, next) => {
    // 1. totalUsersByRole
    const usersByRole = await User.aggregate([
        { $group: { _id: '$tipo_usuario', count: { $sum: 1 } } },
        { $project: { role: '$_id', count: 1, _id: 0 } }
    ]);
    const totalUsersByRole = usersByRole.reduce((acc, curr) => {
        acc[curr.role] = curr.count;
        return acc;
    }, {});

    // 2. totalLearningPaths
    const totalLearningPaths = await LearningPath.countDocuments();

    // 3. totalGroups
    const totalGroups = await Group.countDocuments();

    // 4. platformWideAverageCompletionRate
    const allLearningPaths = await LearningPath.find().select('_id group_id');
    let totalRateSum = 0;
    let countablePaths = 0;

    for (const lp of allLearningPaths) {
        const progressRecords = await Progress.find({ learning_path_id: lp._id });
        // Need group_id to find enrolled students. If lp.group_id is not populated, this might fail.
        // Assuming lp.group_id exists from the select query.
        const group = await Group.findById(lp.group_id).select('miembros');
        const enrolledStudentsCount = group ? group.miembros.filter(m => m.estado_inscripcion === 'Aprobado').length : 0;

        if (enrolledStudentsCount > 0) {
            const completedCount = progressRecords.filter(p => p.path_status === 'Completado').length;
            totalRateSum += (completedCount / enrolledStudentsCount) * 100;
            countablePaths++;
        }
    }
    const platformWideAverageCompletionRate = countablePaths > 0 ? totalRateSum / countablePaths : 0;

    // 5. activeUsersLast7Days (Simplified: Users who logged in or created content/submission)
    // This is very simplified. True activity tracking is complex.
    // For simplicity, we'll count users created in the last 7 days as a proxy for "active".
    // A better approach would involve tracking last login dates or specific activity records.
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const activeUsersLast7Days = await User.countDocuments({ createdAt: { $gte: sevenDaysAgo } });


    res.status(200).json({
        success: true,
        data: {
            totalUsersByRole,
            totalLearningPaths,
            totalGroups,
            platformWideAverageCompletionRate: parseFloat(platformWideAverageCompletionRate.toFixed(2)),
            activeUsersLast7Days // Simplified
        }
    });
});


// @desc    Get Admin's Platform-Wide Popular Content
// @route   GET /api/dashboard/admin/popular-content
// @access  Private/Admin
exports.getAdminPopularContent = asyncHandler(async (req, res, next) => {
    // 1. mostPopularLearningPaths (Top 5 by enrollment)
    const popularLearningPathsAgg = await LearningPath.aggregate([
        {
            $lookup: { // Join with Groups to count members
                from: 'groups', // The collection name for Group model
                localField: 'group_id',
                foreignField: '_id',
                as: 'groupDetails'
            }
        },
        { $unwind: '$groupDetails' },
        {
            $project: {
                name: '$nombre',
                enrolled: { $size: { $filter: { input: '$groupDetails.miembros', as: 'miembro', cond: { $eq: ['$$miembro.estado_inscripcion', 'Aprobado'] } } } }
            }
        },
        { $sort: { enrolled: -1 } },
        { $limit: 5 }
    ]);

    // 2. mostUtilizedContentTypes (Top 5)
    // Counts ContentAssignment entries grouped by content type (Resource or Activity)
    const utilizedContentTypesAgg = await ContentAssignment.aggregate([
        {
            $lookup: { // Attempt to join with Resources
                from: 'resources', // Collection name for Resource
                localField: 'content_id',
                foreignField: '_id',
                as: 'resourceContent'
            }
        },
        {
            $lookup: { // Attempt to join with Activities
                from: 'activities', // Collection name for Activity
                localField: 'content_id',
                foreignField: '_id',
                as: 'activityContent'
            }
        },
        {
            $project: {
                contentType: {
                    $cond: {
                        if: { $gt: [{ $size: '$resourceContent' }, 0] },
                        then: { $arrayElemAt: ['$resourceContent.tipo_recurso', 0] }, // Get type from Resource
                        else: { $arrayElemAt: ['$activityContent.tipo_actividad', 0] } // Get type from Activity
                    }
                }
            }
        },
        { $match: { contentType: { $ne: null } } }, // Filter out if no type found
        { $group: { _id: '$contentType', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
        { $project: { name: '$_id', count: 1, _id: 0 } }
    ]);
    
    res.status(200).json({
        success: true,
        data: {
            mostPopularLearningPaths: popularLearningPathsAgg,
            mostUtilizedContentTypes: utilizedContentTypesAgg
        }
    });
});
