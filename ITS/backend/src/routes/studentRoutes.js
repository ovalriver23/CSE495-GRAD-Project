import express from 'express';
import {
    getAllTerms,
    getStudentsByDepartmentAndTerm,
    getStudentDetails,
    upsertStudent
} from '../controllers/studentController.js';

const router = express.Router();

// Term routes
router.get('/terms', getAllTerms);

// Student routes
router.get('/students/:departmentId/:termId', getStudentsByDepartmentAndTerm);
router.get('/student/:studentId', getStudentDetails);
router.post('/student', upsertStudent);

export default router;
