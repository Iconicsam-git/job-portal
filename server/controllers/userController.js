import Job from "../models/Job.js"
import JobApplication from "../models/JobApplication.js"
import User from "../models/User.js"
import { v2 as cloudinary } from "cloudinary"
import bcrypt from 'bcrypt'
import { OAuth2Client } from 'google-auth-library'
import generateToken from "../utils/generateToken.js"
import transporter from "../config/nodemailer.js"

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)

// Register a new user
export const registerUser = async (req, res) => {

    const { name, email, password } = req.body

    if (!name || !email || !password) {
        return res.json({ success: false, message: "Missing Details" })
    }

    try {

        const userExists = await User.findOne({ email })

        if (userExists) {
            return res.json({ success: false, message: 'User already registered' })
        }

        const salt = await bcrypt.genSalt(10)
        const hashPassword = await bcrypt.hash(password, salt)

        const user = await User.create({
            name,
            email,
            password: hashPassword
        })

        res.json({
            success: true,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                image: user.image,
                resume: user.resume
            },
            token: generateToken(user._id)
        })

    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}

// Login User
export const loginUser = async (req, res) => {

    const { email, password } = req.body

    try {

        const user = await User.findOne({ email })

        if (!user) {
            return res.json({ success: false, message: 'Invalid email or password' })
        }

        if (!user.password) {
            return res.json({ success: false, message: 'This account uses Google Sign-In. Continue with Google instead.' })
        }

        if (await bcrypt.compare(password, user.password)) {

            res.json({
                success: true,
                user: {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    image: user.image,
                    resume: user.resume
                },
                token: generateToken(user._id)
            })

        } else {
            res.json({ success: false, message: 'Invalid email or password' })
        }

    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}

// Login / Register User with Google
export const googleLogin = async (req, res) => {

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

        let user = await User.findOne({ email: payload.email })

        if (!user) {
            user = await User.create({
                name: payload.name,
                email: payload.email,
                image: payload.picture || ''
            })
        }

        res.json({
            success: true,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                image: user.image,
                resume: user.resume
            },
            token: generateToken(user._id)
        })

    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}

// Get User Data
export const getUserData = async (req, res) => {

    try {

        res.json({ success: true, user: req.user })

    } catch (error) {
        res.json({ success: false, message: error.message })
    }

}


// Apply For Job
export const applyForJob = async (req, res) => {

    const { jobId } = req.body

    const userId = req.user._id

    try {

        const isAlreadyApplied = await JobApplication.find({ jobId, userId })

        if (isAlreadyApplied.length > 0) {
            return res.json({ success: false, message: 'Already Applied' })
        }

        const jobData = await Job.findById(jobId)

        if (!jobData) {
            return res.json({ success: false, message: 'Job Not Found' })
        }

        await JobApplication.create({
            companyId: jobData.companyId,
            userId,
            jobId,
            date: Date.now()
        })

        res.json({ success: true, message: 'Applied Successfully' })

    } catch (error) {
        res.json({ success: false, message: error.message })
    }

}

// Get User Applied Applications Data
export const getUserJobApplications = async (req, res) => {

    try {

        const userId = req.user._id

        const applications = await JobApplication.find({ userId })
            .populate('companyId', 'name email image')
            .populate('jobId', 'title description location category level salary')
            .exec()

        if (!applications) {
            return res.json({ success: false, message: 'No job applications found for this user.' })
        }

        return res.json({ success: true, applications })

    } catch (error) {
        res.json({ success: false, message: error.message })
    }

}

// Update User Resume
export const updateUserResume = async (req, res) => {
    try {

        const userId = req.user._id

        const resumeFile = req.file

        const userData = await User.findById(userId)

        if (resumeFile) {
            const resumeUpload = await cloudinary.uploader.upload(resumeFile.path)
            userData.resume = resumeUpload.secure_url
        }

        await userData.save()

        return res.json({ success: true, message: 'Resume Updated' })

    } catch (error) {

        res.json({ success: false, message: error.message })

    }
}

// Send Password Reset OTP
export const sendUserResetOtp = async (req, res) => {
    const { email } = req.body

    if (!email) {
        return res.json({ success: false, message: "Email is required" })
    }

    try {
        const user = await User.findOne({ email })

        if (!user) {
            return res.json({ success: false, message: "No account found with this email" })
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString()

        user.resetOtp = otp
        user.resetOtpExpire = Date.now() + 15 * 60 * 1000
        await user.save()

        console.log(`[USER PASSWORD RESET OTP] Email: ${email} | OTP: ${otp}`)

        // Send email via Nodemailer if SMTP is configured
        if (process.env.SMTP_USER || process.env.SENDER_EMAIL) {
            try {
                const mailOptions = {
                    from: `"${process.env.SENDER_NAME || 'Job Portal'}" <${process.env.SENDER_EMAIL || process.env.SMTP_USER}>`,
                    to: email,
                    subject: 'Password Reset Verification Code - Job Portal',
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
                            <h2 style="color: #2563eb; text-align: center;">Job Portal Password Reset</h2>
                            <p>Hello <strong>${user.name || 'User'}</strong>,</p>
                            <p>You requested a password reset. Use the 6-digit verification code below to complete the process:</p>
                            <div style="background-color: #f1f5f9; text-align: center; padding: 15px; border-radius: 8px; margin: 20px 0;">
                                <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1e293b;">${otp}</span>
                            </div>
                            <p style="color: #64748b; font-size: 13px;">This verification code is valid for 15 minutes. If you did not request this reset, please ignore this email.</p>
                        </div>
                    `
                }
                await transporter.sendMail(mailOptions)
            } catch (mailErr) {
                console.error("Nodemailer error sending email:", mailErr.message)
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

// Reset User Password With OTP Verification
export const resetUserPasswordWithOtp = async (req, res) => {
    const { email, otp, newPassword } = req.body

    if (!email || !otp || !newPassword) {
        return res.json({ success: false, message: "Email, OTP code, and new password are required" })
    }

    try {
        const user = await User.findOne({ email })

        if (!user) {
            return res.json({ success: false, message: "User account not found" })
        }

        if (!user.resetOtp || user.resetOtp !== otp) {
            return res.json({ success: false, message: "Invalid verification code" })
        }

        if (user.resetOtpExpire < Date.now()) {
            return res.json({ success: false, message: "Verification code has expired. Please request a new code." })
        }

        const salt = await bcrypt.genSalt(10)
        const hashPassword = await bcrypt.hash(newPassword, salt)

        user.password = hashPassword
        user.resetOtp = ''
        user.resetOtpExpire = 0
        await user.save()

        res.json({ success: true, message: "Password reset successfully! Please login with your new password." })
    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}