import express from 'express'
import { applyForJob, getUserData, getUserJobApplications, googleLogin, loginUser, registerUser, resetUserPasswordWithOtp, sendUserResetOtp, updateUserResume } from '../controllers/userController.js'
import upload from '../config/multer.js'
import { protectUser } from '../middleware/authMiddleware.js'


const router = express.Router()

// Register a user
router.post('/register', registerUser)

// User login
router.post('/login', loginUser)

// Send User Reset Password OTP
router.post('/send-reset-otp', sendUserResetOtp)

// Reset User Password With OTP
router.post('/reset-password-otp', resetUserPasswordWithOtp)

// User login / signup with Google
router.post('/google', googleLogin)

// Get user Data
router.get('/user', protectUser, getUserData)

// Apply for a job
router.post('/apply', protectUser, applyForJob)

// Get applied jobs data
router.get('/applications', protectUser, getUserJobApplications)

// Update user profile (resume)
router.post('/update-resume', protectUser, upload.single('resume'), updateUserResume)

export default router;