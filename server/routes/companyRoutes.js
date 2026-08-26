import express from 'express'
import { ChangeJobApplicationsStatus, changeVisiblity, getCompanyData, getCompanyJobApplicants, getCompanyPostedJobs, googleLoginCompany, loginCompany, postJob, registerCompany, resetCompanyPasswordWithOtp, sendCompanyResetOtp } from '../controllers/companyController.js'
import upload from '../config/multer.js'
import { protectCompany } from '../middleware/authMiddleware.js'

const router = express.Router()

// Register a company
router.post('/register', upload.single('image'), registerCompany)

// Company login
router.post('/login', loginCompany)

// Company login / signup with Google
router.post('/google', googleLoginCompany)

// Send Company Reset Password OTP
router.post('/send-reset-otp', sendCompanyResetOtp)

// Reset Company Password With OTP
router.post('/reset-password-otp', resetCompanyPasswordWithOtp)

// Get company data
router.get('/company', protectCompany, getCompanyData)

// Post a job
router.post('/post-job', protectCompany, postJob)

// Get Applicants Data of Company
router.get('/applicants', protectCompany, getCompanyJobApplicants)

// Get  Company Job List
router.get('/list-jobs', protectCompany, getCompanyPostedJobs)

// Change Applcations Status 
router.post('/change-status', protectCompany, ChangeJobApplicationsStatus)

// Change Applcations Visiblity 
router.post('/change-visiblity', protectCompany, changeVisiblity)

export default router