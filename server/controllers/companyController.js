import Company from "../models/Company.js";
import bcrypt from 'bcrypt'
import { v2 as cloudinary } from 'cloudinary'
import generateToken from "../utils/generateToken.js";
import Job from "../models/Job.js";
import JobApplication from "../models/JobApplication.js";
import { OAuth2Client } from 'google-auth-library';
import transporter from "../config/nodemailer.js";

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
            .populate('userId', 'name image resume')
            .populate('jobId', 'title location category level salary')
            .exec()

        return res.json({ success: true, applications })

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

// Change Job Application Status
export const ChangeJobApplicationsStatus = async (req, res) => {

    try {

        const { id, status } = req.body

        // Find Job application and update status
        await JobApplication.findOneAndUpdate({ _id: id }, { status })

        res.json({ success: true, message: 'Status Changed' })

    } catch (error) {

        res.json({ success: false, message: error.message })

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