import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import User from '../models/User.js';
import Company from '../models/Company.js';
import Job from '../models/Job.js';
import JobApplication from '../models/JobApplication.js';
import transporter from '../config/nodemailer.js';

// Admin Login
export const adminLogin = async (req, res) => {
    try {
        const { email, password } = req.body;

        const adminEmail = process.env.ADMIN_EMAIL || 'admin@jobportal.com';
        const adminPassword = process.env.ADMIN_PASSWORD || 'admin12345';

        if (email !== adminEmail || password !== adminPassword) {
            return res.json({ success: false, message: 'Invalid Admin Credentials' });
        }

        const token = jwt.sign(
            { role: 'admin', isAdmin: true, email: adminEmail },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            token,
            admin: {
                email: adminEmail,
                role: 'Administrator'
            }
        });

    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// Get System Dashboard Statistics
export const getDashboardStats = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalCompanies = await Company.countDocuments();
        const totalJobs = await Job.countDocuments();
        const activeJobs = await Job.countDocuments({ visible: true });
        const totalApplications = await JobApplication.countDocuments();
        
        // Count pending password reset OTPs
        const userOtps = await User.countDocuments({ resetOtp: { $ne: '' } });
        const companyOtps = await Company.countDocuments({ resetOtp: { $ne: '' } });
        const pendingOtps = userOtps + companyOtps;

        res.json({
            success: true,
            stats: {
                totalUsers,
                totalCompanies,
                totalJobs,
                activeJobs,
                totalApplications,
                pendingOtps,
                systemStatus: 'Optimal',
                lastChecked: new Date()
            }
        });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// Get All Users (Candidates)
export const getUsers = async (req, res) => {
    try {
        const users = await User.find({}).select('-password').sort({ _id: -1 });
        res.json({ success: true, users });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// Delete User Account
export const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findByIdAndDelete(id);

        if (!user) {
            return res.json({ success: false, message: 'User not found' });
        }

        // Clean up candidate's applications
        await JobApplication.deleteMany({ userId: id });

        res.json({ success: true, message: 'User account and applications deleted successfully' });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// Get All Companies (Recruiters)
export const getCompanies = async (req, res) => {
    try {
        const companies = await Company.find({}).select('-password').sort({ _id: -1 });
        res.json({ success: true, companies });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// Delete Company Account
export const deleteCompany = async (req, res) => {
    try {
        const { id } = req.params;
        const company = await Company.findByIdAndDelete(id);

        if (!company) {
            return res.json({ success: false, message: 'Company not found' });
        }

        // Remove jobs and applications related to this company
        const jobs = await Job.find({ companyId: id });
        const jobIds = jobs.map(j => j._id);

        await JobApplication.deleteMany({ jobId: { $in: jobIds } });
        await Job.deleteMany({ companyId: id });

        res.json({ success: true, message: 'Company and associated job postings deleted successfully' });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// Get All Jobs
export const getJobs = async (req, res) => {
    try {
        const jobs = await Job.find({})
            .populate('companyId', 'name email image')
            .sort({ date: -1 });
        res.json({ success: true, jobs });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// Delete Job
export const deleteJob = async (req, res) => {
    try {
        const { id } = req.params;
        const job = await Job.findByIdAndDelete(id);

        if (!job) {
            return res.json({ success: false, message: 'Job not found' });
        }

        await JobApplication.deleteMany({ jobId: id });
        res.json({ success: true, message: 'Job listing deleted successfully' });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// Admin Reset Password for User or Company
export const adminResetPassword = async (req, res) => {
    try {
        const { targetType, targetId, newPassword, sendEmailNotification } = req.body;

        if (!targetType || !targetId || !newPassword) {
            return res.json({ success: false, message: 'Missing target or password information' });
        }

        if (newPassword.length < 6) {
            return res.json({ success: false, message: 'Password must be at least 6 characters long' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        let targetAccount = null;

        if (targetType === 'user') {
            targetAccount = await User.findByIdAndUpdate(
                targetId,
                { password: hashedPassword, resetOtp: '', resetOtpExpire: 0 },
                { new: true }
            );
        } else if (targetType === 'company') {
            targetAccount = await Company.findByIdAndUpdate(
                targetId,
                { password: hashedPassword, resetOtp: '', resetOtpExpire: 0 },
                { new: true }
            );
        }

        if (!targetAccount) {
            return res.json({ success: false, message: `${targetType} account not found` });
        }

        // Send email notification if requested
        if (sendEmailNotification) {
            try {
                const mailOptions = {
                    from: process.env.SENDER_EMAIL || process.env.SMTP_USER,
                    to: targetAccount.email,
                    subject: 'Security Alert: Password Reset by System Administrator',
                    html: `
                        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
                            <h2 style="color: #2563eb;">Account Password Reset</h2>
                            <p>Hello <strong>${targetAccount.name}</strong>,</p>
                            <p>Your password for the Job Portal account (<strong>${targetAccount.email}</strong>) has been reset by the System Administrator.</p>
                            <p><strong>Your temporary password:</strong> <code style="background-color: #f3f4f6; padding: 4px 8px; border-radius: 4px; font-size: 16px;">${newPassword}</code></p>
                            <p style="color: #dc2626;"><em>Please log in immediately and change your password for maximum security.</em></p>
                            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
                            <p style="font-size: 12px; color: #6b7280;">Job Portal System Administration</p>
                        </div>
                    `
                };
                await transporter.sendMail(mailOptions);
            } catch (emailError) {
                console.error("Failed to dispatch password reset notification email:", emailError);
            }
        }

        res.json({
            success: true,
            message: `Password for ${targetAccount.email} successfully reset.`
        });

    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// Send Direct Email via Nodemailer
export const sendAdminEmail = async (req, res) => {
    try {
        const { recipientEmail, subject, message } = req.body;

        if (!recipientEmail || !subject || !message) {
            return res.json({ success: false, message: 'Recipient email, subject, and message content are required' });
        }

        const mailOptions = {
            from: process.env.SENDER_EMAIL || process.env.SMTP_USER,
            to: recipientEmail,
            subject: `[Job Portal Admin Notice] ${subject}`,
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
                    <h3 style="color: #1e40af;">System Administrator Message</h3>
                    <p style="white-space: pre-wrap; font-size: 15px; color: #374151;">${message}</p>
                    <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
                    <p style="font-size: 12px; color: #9ca3af;">This is an official administrative notice sent from the Job Portal Support Team.</p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);

        res.json({ success: true, message: `Direct email dispatched to ${recipientEmail} successfully.` });
    } catch (error) {
        res.json({ success: false, message: `Email failed to send: ${error.message}` });
    }
};

// Perform Database Maintenance Actions
export const performDatabaseMaintenance = async (req, res) => {
    try {
        const { action } = req.body;
        let details = {};

        switch (action) {
            case 'purgeExpiredOtps': {
                const now = Date.now();
                const userRes = await User.updateMany(
                    { resetOtpExpire: { $gt: 0, $lt: now } },
                    { $set: { resetOtp: '', resetOtpExpire: 0 } }
                );
                const companyRes = await Company.updateMany(
                    { resetOtpExpire: { $gt: 0, $lt: now } },
                    { $set: { resetOtp: '', resetOtpExpire: 0 } }
                );
                details = {
                    purgedUserOtps: userRes.modifiedCount,
                    purgedCompanyOtps: companyRes.modifiedCount,
                    message: 'Expired password reset OTP tokens purged successfully.'
                };
                break;
            }

            case 'cleanOrphanedApplications': {
                const validUserIds = await User.find({}).distinct('_id');
                const validJobIds = await Job.find({}).distinct('_id');

                const orphanedRes = await JobApplication.deleteMany({
                    $or: [
                        { userId: { $nin: validUserIds } },
                        { jobId: { $nin: validJobIds } }
                    ]
                });
                details = {
                    removedOrphanedApplications: orphanedRes.deletedCount,
                    message: 'Orphaned job application records pruned successfully.'
                };
                break;
            }

            case 'verifyDatabaseHealth': {
                const usersCount = await User.countDocuments();
                const companiesCount = await Company.countDocuments();
                const jobsCount = await Job.countDocuments();
                const applicationsCount = await JobApplication.countDocuments();

                details = {
                    status: 'Connected & Healthy',
                    collections: {
                        users: usersCount,
                        companies: companiesCount,
                        jobs: jobsCount,
                        jobApplications: applicationsCount
                    },
                    timestamp: new Date()
                };
                break;
            }

            default:
                return res.json({ success: false, message: 'Invalid maintenance action specified.' });
        }

        res.json({ success: true, action, details });

    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};
