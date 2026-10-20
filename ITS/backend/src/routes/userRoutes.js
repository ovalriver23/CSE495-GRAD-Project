import express from 'express';
import { createUser, getAllUsers } from '../controllers/userController.js';

const router = express.Router();

router.post('/kullanici', createUser);
router.get('/kullanicilar', getAllUsers);

export default router;
