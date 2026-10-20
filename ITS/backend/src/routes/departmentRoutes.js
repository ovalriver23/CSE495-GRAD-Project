import express from 'express';
import {
    getAllDepartments,
    getDepartmentChair,
    createCommissionChair,
    removeCommissionChair,
    getCommissionChairs,
    assignCommissionChair,
    getCommissionStatus,
    getDepartmentMembers,
    createCommissionMember,
    removeCommissionMember
} from '../controllers/departmentController.js';

const router = express.Router();

// Department routes
router.get('/departments', getAllDepartments);

// Commission Chair routes
router.get('/department-chair/:departmentId', getDepartmentChair);
router.post('/create-commission-chair', createCommissionChair);
router.delete('/remove-commission-chair/:userId', removeCommissionChair);
router.get('/commission-chairs', getCommissionChairs);
router.post('/assign-commission-chair', assignCommissionChair);

// Commission Member routes
router.get('/department-members/:departmentId', getDepartmentMembers);
router.post('/create-commission-member', createCommissionMember);
router.delete('/remove-commission-member/:userId', removeCommissionMember);

// Commission Status
router.get('/commission-status', getCommissionStatus);

export default router;
