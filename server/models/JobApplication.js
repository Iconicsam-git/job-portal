import mongoose from "mongoose";

const JobApplicationSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
    status: {
        type: String,
        enum: ['Pending', 'Under Review', 'Shortlisted for Interview', 'Rejected', 'Hired', 'Accepted'],
        default: 'Pending'
    },
    suitabilityScore: { type: Number, default: 0 },
    recommendation: { type: String, default: 'Pending' },
    matchDetails: {
        skillsScore: { type: Number, default: 0 },
        experienceScore: { type: Number, default: 0 },
        educationScore: { type: Number, default: 0 },
        relevanceScore: { type: Number, default: 0 },
        matchedSkills: [{ type: String }],
        missingSkills: [{ type: String }],
        detectedEducation: [{ type: String }],
        detectedExperienceYears: { type: Number, default: 0 },
        summary: { type: String, default: '' }
    },
    interviewDetails: {
        interviewDate: { type: String, default: '' },
        interviewTime: { type: String, default: '' },
        interviewFormat: { type: String, default: '' },
        interviewLocation: { type: String, default: '' },
        interviewNotes: { type: String, default: '' },
        scheduledAt: { type: Date }
    },
    notificationStatus: {
        type: String,
        enum: ['None', 'Pending', 'Sent', 'Failed'],
        default: 'None'
    },
    notificationSentAt: { type: Date },
    notificationError: { type: String, default: '' },
    notificationHistory: [{
        action: { type: String },
        recipientEmail: { type: String },
        subject: { type: String },
        sentAt: { type: Date, default: Date.now },
        status: { type: String, enum: ['Sent', 'Failed'] },
        errorMessage: { type: String, default: '' }
    }],
    date: { type: Number, required: true }
})

const JobApplication = mongoose.model('JobApplication', JobApplicationSchema)

export default JobApplication