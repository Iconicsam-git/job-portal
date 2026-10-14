import express from 'express';
import {
    adminLogin,
    getDashboardStats,
    getUsers,
    deleteUser,
    getCompanies,
    deleteCompany,
    getJobs,
    deleteJob,
    adminResetPassword,
    sendAdminEmail,
    performDatabaseMaintenance
} from '../controllers/adminController.js';
import { protectAdmin } from '../middleware/authAdmin.js';

const adminRouter = express.Router();

// Public Admin Route
adminRouter.post('/login', adminLogin);

// Protected Admin Routes
adminRouter.get('/stats', protectAdmin, getDashboardStats);

adminRouter.get('/users', protectAdmin, getUsers);
adminRouter.delete('/user/:id', protectAdmin, deleteUser);

adminRouter.get('/companies', protectAdmin, getCompanies);
adminRouter.delete('/company/:id', protectAdmin, deleteCompany);

adminRouter.get('/jobs', protectAdmin, getJobs);
adminRouter.delete('/job/:id', protectAdmin, deleteJob);

adminRouter.post('/reset-password', protectAdmin, adminResetPassword);
adminRouter.post('/send-email', protectAdmin, sendAdminEmail);
adminRouter.post('/maintenance', protectAdmin, performDatabaseMaintenance);

export default adminRouter;
