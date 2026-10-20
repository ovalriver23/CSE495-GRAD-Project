import express from 'express';
import { login, forgotPassword, verifyResetCode, resetPasswordWithCode, changePassword } from '../controllers/authController.js';

const router = express.Router();

router.post('/login', login);
router.post('/forgot-password', forgotPassword);        // Step 1: Send Code
router.post('/verify-reset-code', verifyResetCode);     // Step 2: Verify Code
router.post('/reset-password-secure', resetPasswordWithCode); // Step 3: Set New Password
router.post('/change-password', changePassword);

export default router;
