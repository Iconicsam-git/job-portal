import Company from "../models/Company.js";
import bcrypt from 'bcrypt'
import { v2 as cloudinary } from 'cloudinary'
import generateToken from "../utils/generateToken.js";
import Job from "../models/Job.js";
import JobApplication from "../models/JobApplication.js";
import User from "../models/User.js";
import { OAuth2Client } from 'google-auth-library';
import transporter from "../config/nodemailer.js";
import { extractTextFromPDF, evaluateResumeAgainstJob } from "../utils/resumeScreening.js";
import { dispatchApplicationEmail } from "../utils/emailService.js";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)

// Register a new company
export const registerCompany = async (req, res) => {

    const { name, email, password } = req.body

    const imageFile = req.file;

    if (!name || !email || !password || !imageFile) {
        return res.json({ success: false, message: "Missing Details" })
    }

    try {

        const companyExists = await Company.findOne({ email })

        if (companyExists) {
            return res.json({ success: false, message: 'Company already registered' })
        }

        const salt = await bcrypt.genSalt(10)
        const hashPassword = await bcrypt.hash(password, salt)

        const imageUpload = await cloudinary.uploader.upload(imageFile.path)

        const company = await Company.create({
            name,
            email,
            password: hashPassword,
            image: imageUpload.secure_url
        })

        res.json({
            success: true,
            company: {
                _id: company._id,
                name: company.name,
                email: company.email,
                image: company.image
            },
            token: generateToken(company._id)
        })

    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}

// Login Company
export const loginCompany = async (req, res) => {

    const { email, password } = req.body

    try {

        const company = await Company.findOne({ email })

        if (!company) {
            return res.json({ success: false, message: 'Invalid email or password' })
        }

        if (!company.password) {
            return res.json({ success: false, message: 'This account uses Google Sign-In. Continue with Google instead.' })
        }

        if (await bcrypt.compare(password, company.password)) {

            res.json({
                success: true,
                company: {
                    _id: company._id,
                    name: company.name,
                    email: company.email,
                    image: company.image
                },
                token: generateToken(company._id)
            })

        }
        else {
            res.json({ success: false, message: 'Invalid email or password' })
        }

    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}

// Login / Register Company with Google
export const googleLoginCompany = async (req, res) => {

    const { credential } = req.body

    if (!credential) {
        return res.json({ success: false, message: 'Missing Google credential' })
    }

    try {

        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID
        })

        const payload = ticket.getPayload()

        let company = await Company.findOne({ email: payload.email })

        if (!company) {
            company = await Company.create({
                name: payload.name,
                email: payload.email,
                image: payload.picture || ''
            })
        }

        res.json({
            success: true,
            company: {
                _id: company._id,
                name: company.name,
                email: company.email,
                image: company.image
            },
            token: generateToken(company._id)
        })

    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}

// Get Company Data
export const getCompanyData = async (req, res) => {

    try {

        const company = req.company

        res.json({ success: true, company })

    } catch (error) {
        res.json({
            success: false, message: error.message
        })
    }

}

// Post New Job
export const postJob = async (req, res) => {

    const { title, description, location, salary, level, category } = req.body

    const companyId = req.company._id

    try {

        const newJob = new Job({
            title,
            description,
            location,
            salary,
            companyId,
            date: Date.now(),
            level,
            category
        })

        await newJob.save()

        res.json({ success: true, newJob })

    } catch (error) {

        res.json({ success: false, message: error.message })

    }


}

// Get Company Job Applicants
export const getCompanyJobApplicants = async (req, res) => {
    try {

        const companyId = req.company._id

        // Find job applications for the user and populate related data
        const applications = await JobApplication.find({ companyId })
            .populate('userId', 'name email image resume resumeText')
            .populate('jobId', 'title description location category level salary')
            .exec()

        // Ensure legacy or missing scores are calculated automatically
        for (let i = 0; i < applications.length; i++) {
            const app = applications[i]
            if ((!app.suitabilityScore || app.suitabilityScore === 0) && app.userId && app.jobId) {
                try {
                    let resumeText = app.userId.resumeText || ''
                    if (!resumeText && app.userId.resume) {
                        resumeText = await extractTextFromPDF({ url: app.userId.resume })
                        if (resumeText) {
                            await User.findByIdAndUpdate(app.userId._id, { resumeText })
                        }
                    }
                    if (resumeText) {
                        const screening = evaluateResumeAgainstJob(resumeText, app.jobId)
                        app.suitabilityScore = screening.suitabilityScore
                        app.recommendation = screening.recommendation
                        app.matchDetails = screening.matchDetails
                        await JobApplication.findByIdAndUpdate(app._id, {
                            suitabilityScore: screening.suitabilityScore,
                            recommendation: screening.recommendation,
                            matchDetails: screening.matchDetails
                        })
                    }
                } catch (calcErr) {
                    console.error("Auto-screening fallback error:", calcErr.message)
                }
            }
        }

        return res.json({ success: true, applications })

    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}

// Re-screen an applicant against job description
export const rescreenApplicant = async (req, res) => {
    try {
        const { applicationId } = req.body
        const companyId = req.company._id

        const application = await JobApplication.findOne({ _id: applicationId, companyId })
            .populate('userId', 'name email image resume resumeText')
            .populate('jobId', 'title description location category level salary')

        if (!application || !application.userId || !application.jobId) {
            return res.json({ success: false, message: 'Application or associated records not found' })
        }

        let resumeText = application.userId.resumeText || ''
        if (!resumeText && application.userId.resume) {
            resumeText = await extractTextFromPDF({ url: application.userId.resume })
            if (resumeText) {
                await User.findByIdAndUpdate(application.userId._id, { resumeText })
            }
        }

        const screeningResult = evaluateResumeAgainstJob(resumeText, application.jobId)

        application.suitabilityScore = screeningResult.suitabilityScore
        application.recommendation = screeningResult.recommendation
        application.matchDetails = screeningResult.matchDetails
        await application.save()

        res.json({
            success: true,
            message: 'Applicant re-screened successfully',
            suitabilityScore: application.suitabilityScore,
            recommendation: application.recommendation,
            matchDetails: application.matchDetails
        })
    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}

// Get Company Posted Jobs
export const getCompanyPostedJobs = async (req, res) => {
    try {

        const companyId = req.company._id

        const jobs = await Job.find({ companyId })

        // Adding No. of applicants info in data
        const jobsData = await Promise.all(jobs.map(async (job) => {
            const applicants = await JobApplication.find({ jobId: job._id });
            return { ...job.toObject(), applicants: applicants.length }
        }))

        res.json({ success: true, jobsData })

    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}

// Change Job Application Status with Automated Candidate Notifications
export const ChangeJobApplicationsStatus = async (req, res) => {
    try {
        const { id, status, interviewDetails } = req.body
        const companyId = req.company?._id

        if (!id || !status) {
            return res.status(400).json({ success: false, message: 'Application ID and Status are required' })
        }

        const validStatuses = ['Pending', 'Under Review', 'Shortlisted for Interview', 'Rejected', 'Hired', 'Accepted']
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Invalid application status: ${status}. Permitted statuses: Pending, Under Review, Shortlisted for Interview, Rejected, Hired.`
            })
        }

        // Find Job application and verify ownership
        const application = await JobApplication.findById(id)
            .populate('userId', 'name email image resume')
            .populate('jobId', 'title description location category level salary companyId')
            .populate('companyId', 'name email')

        if (!application) {
            return res.status(404).json({ success: false, message: 'Job application not found' })
        }

        const appCompanyId = application.companyId?._id
            ? application.companyId._id.toString()
            : application.companyId?.toString()

        if (appCompanyId !== companyId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized: You are not authorized to manage applications for this job.'
            })
        }

        // Validate interview details if shortlisting
        if (status === 'Shortlisted for Interview') {
            const date = interviewDetails?.interviewDate?.trim()
            const time = interviewDetails?.interviewTime?.trim()
            const format = interviewDetails?.interviewFormat?.trim()
            const location = interviewDetails?.interviewLocation?.trim()
            const notes = interviewDetails?.interviewNotes?.trim() || ''

            if (!date || !time || !format) {
                return res.status(400).json({
                    success: false,
                    message: 'Interview Date, Time, and Format (Online or In-person) are mandatory when shortlisting.'
                })
            }

            if (format === 'Online' && !location) {
                return res.status(400).json({
                    success: false,
                    message: 'A valid online meeting link is required for online interviews.'
                })
            }

            if (format === 'In-person' && !location) {
                return res.status(400).json({
                    success: false,
                    message: 'A physical interview location is required for in-person interviews.'
                })
            }

            application.interviewDetails = {
                interviewDate: date,
                interviewTime: time,
                interviewFormat: format,
                interviewLocation: location,
                interviewNotes: notes,
                scheduledAt: new Date()
            }
        }

        const previousStatus = application.status
        const isSameStatus = previousStatus === status

        // If status is identical and not re-scheduling an interview, avoid duplicate processing
        if (isSameStatus && status !== 'Shortlisted for Interview') {
            return res.json({
                success: true,
                message: `Application is already marked as "${status}".`,
                application,
                notification: {
                    status: application.notificationStatus,
                    error: application.notificationError
                },
                unchanged: true
            })
        }

        // Update application status in MongoDB first
        application.status = status
        await application.save()

        // Logically separated email notification dispatch
        let emailResult = { success: false, notApplicable: true }
        const candidateEmail = application.userId?.email
        const candidateName = application.userId?.name || 'Candidate'
        const jobTitle = application.jobId?.title || 'Position'
        const companyName = application.companyId?.name || req.company?.name || 'Company'
        const companyEmail = application.companyId?.email || req.company?.email || process.env.EMAIL_FROM || process.env.SENDER_EMAIL || ''

        if (candidateEmail) {
            emailResult = await dispatchApplicationEmail({
                status,
                candidateName,
                candidateEmail,
                jobTitle,
                companyName,
                companyEmail,
                interviewDetails: application.interviewDetails
            })

            const historyEntry = {
                action: status,
                recipientEmail: candidateEmail,
                subject: emailResult.subject || `${status} Notification`,
                sentAt: new Date(),
                status: emailResult.success ? 'Sent' : 'Failed',
                errorMessage: emailResult.success ? '' : (emailResult.error || 'Failed to dispatch email')
            }

            if (!application.notificationHistory) {
                application.notificationHistory = []
            }
            application.notificationHistory.push(historyEntry)

            if (emailResult.success) {
                application.notificationStatus = 'Sent'
                application.notificationSentAt = new Date()
                application.notificationError = ''
            } else {
                application.notificationStatus = 'Failed'
                application.notificationError = emailResult.error || 'Email delivery failed'
            }

            await application.save()
        } else {
            console.warn(`[NOTIFICATION SKIPPED] Candidate ${application.userId?._id} has no registered email.`)
            application.notificationStatus = 'Failed'
            application.notificationError = 'Candidate has no registered email address'
            await application.save()
        }

        return res.json({
            success: true,
            message: `Application status updated to "${status}" successfully.`,
            application,
            notification: {
                status: application.notificationStatus,
                error: application.notificationError,
                details: emailResult.success
                    ? 'Candidate interview email delivered successfully.'
                    : (emailResult.error || 'Notification skipped or failed')
            }
        })

    } catch (error) {
        console.error("ChangeJobApplicationsStatus error:", error)
        res.status(500).json({ success: false, message: error.message })
    }
}

// Retry Application Email Notification
export const retryApplicationNotification = async (req, res) => {
    try {
        const { id } = req.body
        const companyId = req.company?._id

        if (!id) {
            return res.status(400).json({ success: false, message: 'Application ID is required' })
        }

        const application = await JobApplication.findById(id)
            .populate('userId', 'name email image resume')
            .populate('jobId', 'title description location category level salary companyId')
            .populate('companyId', 'name email')

        if (!application) {
            return res.status(404).json({ success: false, message: 'Job application not found' })
        }

        const appCompanyId = application.companyId?._id
            ? application.companyId._id.toString()
            : application.companyId?.toString()

        if (appCompanyId !== companyId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized: You are not authorized to manage applications for this job.'
            })
        }

        const candidateEmail = application.userId?.email
        if (!candidateEmail) {
            return res.status(400).json({
                success: false,
                message: 'Candidate does not have a registered email address on file.'
            })
        }

        const candidateName = application.userId?.name || 'Candidate'
        const jobTitle = application.jobId?.title || 'Position'
        const companyName = application.companyId?.name || req.company?.name || 'Company'
        const companyEmail = application.companyId?.email || req.company?.email || process.env.EMAIL_FROM || process.env.SENDER_EMAIL || ''

        const emailResult = await dispatchApplicationEmail({
            status: application.status,
            candidateName,
            candidateEmail,
            jobTitle,
            companyName,
            companyEmail,
            interviewDetails: application.interviewDetails
        })

        const historyEntry = {
            action: `Retry: ${application.status}`,
            recipientEmail: candidateEmail,
            subject: emailResult.subject || `${application.status} Retry Notification`,
            sentAt: new Date(),
            status: emailResult.success ? 'Sent' : 'Failed',
            errorMessage: emailResult.success ? '' : (emailResult.error || 'Retry email failed')
        }

        if (!application.notificationHistory) {
            application.notificationHistory = []
        }
        application.notificationHistory.push(historyEntry)

        if (emailResult.success) {
            application.notificationStatus = 'Sent'
            application.notificationSentAt = new Date()
            application.notificationError = ''
        } else {
            application.notificationStatus = 'Failed'
            application.notificationError = emailResult.error || 'Email retry delivery failed'
        }

        await application.save()

        if (emailResult.success) {
            return res.json({
                success: true,
                message: 'Email notification resent successfully!',
                application,
                notification: { status: 'Sent', error: '' }
            })
        } else {
            return res.json({
                success: false,
                message: `Failed to deliver email: ${emailResult.error}`,
                application,
                notification: { status: 'Failed', error: emailResult.error }
            })
        }

    } catch (error) {
        console.error("retryApplicationNotification error:", error)
        res.status(500).json({ success: false, message: error.message })
    }
}

// Change Job Visiblity
export const changeVisiblity = async (req, res) => {
    try {

        const { id } = req.body

        const companyId = req.company._id

        const job = await Job.findById(id)

        if (companyId.toString() === job.companyId.toString()) {
            job.visible = !job.visible
        }

        await job.save()

        res.json({ success: true, message: 'Job Visibility Changed', job })

    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}

// Send Company Password Reset OTP
export const sendCompanyResetOtp = async (req, res) => {
    const { email } = req.body

    if (!email) {
        return res.json({ success: false, message: "Email is required" })
    }

    try {
        const company = await Company.findOne({ email })

        if (!company) {
            return res.json({ success: false, message: "No company account found with this email" })
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString()

        company.resetOtp = otp
        company.resetOtpExpire = Date.now() + 15 * 60 * 1000
        await company.save()

        console.log(`[COMPANY PASSWORD RESET OTP] Email: ${email} | OTP: ${otp}`)

        // Send email via Nodemailer if SMTP is configured
        if (process.env.SMTP_USER || process.env.SENDER_EMAIL) {
            try {
                const mailOptions = {
                    from: `"${process.env.SENDER_NAME || 'Job Portal'}" <${process.env.SENDER_EMAIL || process.env.SMTP_USER}>`,
                    to: email,
                    subject: 'Recruiter Password Reset Code - Job Portal',
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
                            <h2 style="color: #2563eb; text-align: center;">Company Account Password Reset</h2>
                            <p>Hello <strong>${company.name || 'Company Recruiter'}</strong>,</p>
                            <p>You requested a password reset for your company recruiter account. Use the 6-digit verification code below to reset your password:</p>
                            <div style="background-color: #f1f5f9; text-align: center; padding: 15px; border-radius: 8px; margin: 20px 0;">
                                <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1e293b;">${otp}</span>
                            </div>
                            <p style="color: #64748b; font-size: 13px;">This code is valid for 15 minutes. If you did not request this reset, please ignore this email.</p>
                        </div>
                    `
                }
                await transporter.sendMail(mailOptions)
            } catch (mailErr) {
                console.error("Nodemailer error sending company email:", mailErr.message)
            }
        }

        res.json({
            success: true,
            message: `Verification code sent to your email! ${!process.env.SMTP_USER && !process.env.SENDER_EMAIL ? `(Dev Code: ${otp})` : ''}`,
            otp: (!process.env.SMTP_USER && !process.env.SENDER_EMAIL) ? otp : undefined
        })
    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}

// Reset Company Password With OTP Verification
export const resetCompanyPasswordWithOtp = async (req, res) => {
    const { email, otp, newPassword } = req.body

    if (!email || !otp || !newPassword) {
        return res.json({ success: false, message: "Email, OTP code, and new password are required" })
    }

    try {
        const company = await Company.findOne({ email })

        if (!company) {
            return res.json({ success: false, message: "Company account not found" })
        }

        if (!company.resetOtp || company.resetOtp !== otp) {
            return res.json({ success: false, message: "Invalid verification code" })
        }

        if (company.resetOtpExpire < Date.now()) {
            return res.json({ success: false, message: "Verification code has expired. Please request a new code." })
        }

        const salt = await bcrypt.genSalt(10)
        const hashPassword = await bcrypt.hash(newPassword, salt)

        company.password = hashPassword
        company.resetOtp = ''
        company.resetOtpExpire = 0
        await company.save()

        res.json({ success: true, message: "Password reset successfully! Please login with your new password." })
    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}