import express from 'express';
import { gradeInternship, bulkGradeInternships } from '../controllers/gradingController.js';
import { authenticateToken, requireRole } from '../middlewares/auth.js';

const router = express.Router();

// Grade a single internship
router.post('/grade-internship', authenticateToken, requireRole(['Commission Chair', 'Commission Member']), gradeInternship);

// Bulk grade multiple internships
router.post('/grade-internships-bulk', authenticateToken, requireRole(['Commission Chair', 'Commission Member']), bulkGradeInternships);

export default router;
