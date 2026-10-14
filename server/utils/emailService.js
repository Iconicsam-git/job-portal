import transporter, { isSmtpConfigured } from '../config/nodemailer.js';

// Internal mock transporter registry for testing purposes
let mockTransporter = null;

/**
 * Allows injecting a mock transporter for automated test suites
 */
export const setMockTransporter = (mock) => {
    mockTransporter = mock;
};

/**
 * Returns the effective sender address configured in environment variables.
 */
export const getSenderEmail = () => {
    return process.env.EMAIL_FROM || process.env.SENDER_EMAIL || process.env.SMTP_USER || 'no-reply@jobportal.com';
};

export const getSenderName = () => {
    return process.env.SENDER_NAME || 'Job Portal Recruitment System';
};

/**
 * Helper to escape HTML characters safely
 */
const escapeHtml = (str) => {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
};

/**
 * Internal mail dispatcher with error-safe logging and status reporting
 */
const sendMailSafely = async ({ to, subject, text, html }) => {
    if (!to || !to.includes('@')) {
        return {
            success: false,
            error: 'Invalid or missing recipient email address',
            subject
        };
    }

    const fromAddress = `"${getSenderName()}" <${getSenderEmail()}>`;

    const mailOptions = {
        from: fromAddress,
        to,
        subject,
        text,
        html
    };

    // If mock transporter is provided (e.g. during test runner), use it
    if (mockTransporter && typeof mockTransporter.sendMail === 'function') {
        try {
            const mockResult = await mockTransporter.sendMail(mailOptions);
            return {
                success: true,
                messageId: mockResult?.messageId || 'mock-message-id',
                subject
            };
        } catch (err) {
            return {
                success: false,
                error: err.message,
                subject
            };
        }
    }

    // Verify SMTP is configured before attempting transmission
    if (!isSmtpConfigured()) {
        const errorMsg = 'SMTP credentials not configured (set SMTP_USER/SMTP_PASS in server/.env)';
        console.warn(`[EMAIL NOTICE] Cannot send email to ${to}: ${errorMsg}`);
        return {
            success: false,
            error: errorMsg,
            subject
        };
    }

    try {
        const info = await transporter.sendMail(mailOptions);
        return {
            success: true,
            messageId: info.messageId,
            subject
        };
    } catch (error) {
        // Safe logging without credentials or sensitive stack data
        console.error(`[SMTP ERROR] Delivery failed to ${to}:`, error.message);
        return {
            success: false,
            error: error.message || 'SMTP delivery failed',
            subject
        };
    }
};

/**
 * 1. Shortlisting & Interview Invitation Email
 * Strictly adheres to the required template format and handles optional fields gracefully.
 */
export const sendShortlistingEmail = async ({
    candidateName,
    candidateEmail,
    jobTitle,
    companyName,
    companyEmail,
    interviewDetails = {}
}) => {
    const candidate = candidateName || 'Candidate';
    const job = jobTitle || 'Position';
    const company = companyName || 'Our Company';
    const contactEmail = companyEmail || getSenderEmail();

    const interviewDate = interviewDetails.interviewDate || 'To be confirmed';
    const interviewTime = interviewDetails.interviewTime || 'To be confirmed';
    const interviewFormat = interviewDetails.interviewFormat || 'To be confirmed';
    const interviewLocationOrLink = interviewDetails.interviewLocation || 'Will be shared by the recruitment team';
    const interviewNotes = (interviewDetails.interviewNotes && interviewDetails.interviewNotes.trim())
        ? interviewDetails.interviewNotes.trim()
        : 'Please be available 5-10 minutes prior to the scheduled start time.';

    const subject = `Congratulations! You've Been Shortlisted for an Interview – ${job}`;

    // Plain text version matching requested template
    const text = `Dear ${candidate},

Congratulations!

We are pleased to inform you that your application for the position of ${job} at ${company} has been reviewed, and you have been shortlisted to proceed to the interview stage.

Your qualifications and experience have been considered relevant to the requirements of this position.

Interview Details:
- Date: ${interviewDate}
- Time: ${interviewTime}
- Format: ${interviewFormat}
- Location or Meeting Link: ${interviewLocationOrLink}

Additional Instructions: ${interviewNotes}

Please make the necessary arrangements to attend the interview. If you have any questions or require clarification, please contact the recruitment team.

Thank you for your interest in ${company}. We look forward to meeting you.

Best regards,

${company} Recruitment Team
${contactEmail}`;

    // Responsive, styled HTML version
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.6; margin: 0; padding: 0; background-color: #f8fafc; }
            .container { max-width: 600px; margin: 20px auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
            .header { background: linear-gradient(135deg, #2563eb, #1d4ed8); color: #ffffff; padding: 28px 24px; text-align: center; }
            .header h1 { margin: 0; font-size: 22px; font-weight: 700; }
            .header p { margin: 6px 0 0; font-size: 14px; opacity: 0.9; }
            .body { padding: 28px 24px; }
            .card { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 18px; margin: 20px 0; }
            .card h3 { margin-top: 0; margin-bottom: 12px; color: #166534; font-size: 16px; border-bottom: 1px solid #dcfce7; padding-bottom: 8px; }
            .detail-row { display: flex; margin-bottom: 8px; font-size: 14px; }
            .detail-label { font-weight: 600; width: 180px; color: #374151; }
            .detail-value { color: #111827; flex: 1; word-break: break-word; }
            .instructions { background: #eff6ff; border-left: 4px solid #3b82f6; padding: 14px; margin: 18px 0; border-radius: 4px; font-size: 14px; color: #1e40af; }
            .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 24px; font-size: 13px; color: #64748b; }
            .btn { display: inline-block; background: #2563eb; color: #ffffff !important; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 600; margin-top: 12px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Interview Invitation</h1>
                <p>${escapeHtml(company)} &bull; ${escapeHtml(job)}</p>
            </div>
            <div class="body">
                <p>Dear <strong>${escapeHtml(candidate)}</strong>,</p>
                <p style="color: #16a34a; font-weight: 600; font-size: 16px;">Congratulations!</p>
                <p>We are pleased to inform you that your application for the position of <strong>${escapeHtml(job)}</strong> at <strong>${escapeHtml(company)}</strong> has been reviewed, and you have been shortlisted to proceed to the interview stage.</p>
                <p>Your qualifications and experience have been considered relevant to the requirements of this position.</p>

                <div class="card">
                    <h3>📅 Interview Details</h3>
                    <div class="detail-row">
                        <span class="detail-label">Date:</span>
                        <span class="detail-value"><strong>${escapeHtml(interviewDate)}</strong></span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Time:</span>
                        <span class="detail-value"><strong>${escapeHtml(interviewTime)}</strong></span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Format:</span>
                        <span class="detail-value">${escapeHtml(interviewFormat)}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Location / Meeting Link:</span>
                        <span class="detail-value">
                            ${interviewLocationOrLink.startsWith('http')
                                ? `<a href="${escapeHtml(interviewLocationOrLink)}" target="_blank" style="color: #2563eb; text-decoration: underline; font-weight: 600;">${escapeHtml(interviewLocationOrLink)}</a>`
                                : `<strong>${escapeHtml(interviewLocationOrLink)}</strong>`
                            }
                        </span>
                    </div>
                </div>

                <div class="instructions">
                    <strong>Additional Instructions:</strong><br/>
                    ${escapeHtml(interviewNotes)}
                </div>

                <p>Please make the necessary arrangements to attend the interview. If you have any questions or require clarification, please contact the recruitment team.</p>
                <p>Thank you for your interest in <strong>${escapeHtml(company)}</strong>. We look forward to meeting you.</p>

                <p style="margin-top: 24px;">
                    Best regards,<br/>
                    <strong>${escapeHtml(company)} Recruitment Team</strong><br/>
                    <a href="mailto:${escapeHtml(contactEmail)}" style="color: #2563eb;">${escapeHtml(contactEmail)}</a>
                </p>
            </div>
            <div class="footer">
                This is an automated notification from the recruitment management system for ${escapeHtml(company)}.
            </div>
        </div>
    </body>
    </html>
    `;

    return sendMailSafely({
        to: candidateEmail,
        subject,
        text,
        html
    });
};

/**
 * 2. Rejection Email
 * Polite, professional, encouraging, does not disclose internal private notes.
 */
export const sendRejectionEmail = async ({
    candidateName,
    candidateEmail,
    jobTitle,
    companyName,
    companyEmail
}) => {
    const candidate = candidateName || 'Candidate';
    const job = jobTitle || 'Position';
    const company = companyName || 'Our Company';
    const contactEmail = companyEmail || getSenderEmail();

    const subject = `Update Regarding Your Application for ${job} – ${company}`;

    const text = `Dear ${candidate},

Thank you for your interest in the ${job} position at ${company} and for taking the time to share your background with us.

After careful review and consideration, we regret to inform you that we will not be moving forward with your application for this position at this time. We had a high volume of qualified applicants, and our selection decision was a difficult one.

We sincerely appreciate your effort and interest in joining ${company}. We encourage you to apply for future opportunities that match your skills and experience.

We wish you all the best in your job search and future professional endeavors.

Best regards,

${company} Recruitment Team
${contactEmail}`;

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.6; margin: 0; padding: 0; background-color: #f8fafc; }
            .container { max-width: 600px; margin: 20px auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
            .header { background: #475569; color: #ffffff; padding: 24px; text-align: center; }
            .header h1 { margin: 0; font-size: 20px; font-weight: 700; }
            .body { padding: 28px 24px; }
            .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 24px; font-size: 13px; color: #64748b; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Application Update</h1>
                <p style="margin: 4px 0 0; font-size: 13px; opacity: 0.9;">${escapeHtml(company)} &bull; ${escapeHtml(job)}</p>
            </div>
            <div class="body">
                <p>Dear <strong>${escapeHtml(candidate)}</strong>,</p>
                <p>Thank you for taking the time to apply for the <strong>${escapeHtml(job)}</strong> position at <strong>${escapeHtml(company)}</strong>.</p>
                <p>After careful review and consideration, we regret to inform you that we will not be moving forward with your application for this role at this time. We received applications from many talented individuals, making our selection decision very competitive.</p>
                <p>We sincerely appreciate the time and effort you invested in your application. Your qualifications have been noted, and we encourage you to keep an eye on our careers portal and apply for future opportunities that align with your background and goals.</p>
                <p>We wish you every success in your ongoing job search and career endeavors.</p>
                <p style="margin-top: 24px;">
                    Best regards,<br/>
                    <strong>${escapeHtml(company)} Recruitment Team</strong><br/>
                    <a href="mailto:${escapeHtml(contactEmail)}" style="color: #475569;">${escapeHtml(contactEmail)}</a>
                </p>
            </div>
            <div class="footer">
                Thank you for your interest in career opportunities with ${escapeHtml(company)}.
            </div>
        </div>
    </body>
    </html>
    `;

    return sendMailSafely({
        to: candidateEmail,
        subject,
        text,
        html
    });
};

/**
 * 3. Hiring Confirmation Email
 * Professional, congratulatory, confirms selection without inventing terms.
 */
export const sendHiredEmail = async ({
    candidateName,
    candidateEmail,
    jobTitle,
    companyName,
    companyEmail
}) => {
    const candidate = candidateName || 'Candidate';
    const job = jobTitle || 'Position';
    const company = companyName || 'Our Company';
    const contactEmail = companyEmail || getSenderEmail();

    const subject = `Congratulations! Job Offer for ${job} at ${company}`;

    const text = `Dear ${candidate},

Congratulations!

We are thrilled to inform you that you have been selected for the position of ${job} at ${company}!

Our team was thoroughly impressed by your qualifications, experience, and interactions throughout the recruitment process. We believe your contributions will make a valuable impact on our team.

A member of our recruitment or human resources team will contact you shortly with the formal employment documentation, offer letter, and onboarding details.

If you have any questions in the meantime, please feel free to contact us.

Once again, congratulations and welcome to ${company}!

Best regards,

${company} Recruitment Team
${contactEmail}`;

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.6; margin: 0; padding: 0; background-color: #f8fafc; }
            .container { max-width: 600px; margin: 20px auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
            .header { background: linear-gradient(135deg, #16a34a, #15803d); color: #ffffff; padding: 28px 24px; text-align: center; }
            .header h1 { margin: 0; font-size: 22px; font-weight: 700; }
            .body { padding: 28px 24px; }
            .offer-card { background: #f0fdf4; border: 2px dashed #86efac; border-radius: 8px; padding: 18px; margin: 20px 0; text-align: center; }
            .offer-card h2 { color: #166534; margin: 0; font-size: 20px; }
            .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 24px; font-size: 13px; color: #64748b; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Congratulations! 🎉</h1>
                <p style="margin: 6px 0 0; font-size: 14px; opacity: 0.95;">Job Offer Confirmation &bull; ${escapeHtml(company)}</p>
            </div>
            <div class="body">
                <p>Dear <strong>${escapeHtml(candidate)}</strong>,</p>

                <div class="offer-card">
                    <h2>You've Been Selected!</h2>
                    <p style="margin: 6px 0 0; color: #15803d; font-size: 15px;"><strong>${escapeHtml(job)}</strong> at <strong>${escapeHtml(company)}</strong></p>
                </div>

                <p>We are delighted to confirm that you have been selected for the position of <strong>${escapeHtml(job)}</strong> with <strong>${escapeHtml(company)}</strong>!</p>
                <p>Our interviewers and team were thoroughly impressed with your background and demonstrated expertise. We believe you will be a fantastic addition to our organization.</p>
                <p>A member of our recruitment/HR team will be in touch shortly with your formal offer details, documentation, and orientation schedule.</p>
                <p>Should you have any immediate questions, please do not hesitate to reply to this message.</p>

                <p style="margin-top: 24px;">
                    Best regards,<br/>
                    <strong>${escapeHtml(company)} Recruitment Team</strong><br/>
                    <a href="mailto:${escapeHtml(contactEmail)}" style="color: #16a34a;">${escapeHtml(contactEmail)}</a>
                </p>
            </div>
            <div class="footer">
                Congratulations from the recruitment team at ${escapeHtml(company)}.
            </div>
        </div>
    </body>
    </html>
    `;

    return sendMailSafely({
        to: candidateEmail,
        subject,
        text,
        html
    });
};

/**
 * 4. Status Update (Under Review) Acknowledgment Email
 */
export const sendUnderReviewEmail = async ({
    candidateName,
    candidateEmail,
    jobTitle,
    companyName,
    companyEmail
}) => {
    const candidate = candidateName || 'Candidate';
    const job = jobTitle || 'Position';
    const company = companyName || 'Our Company';
    const contactEmail = companyEmail || getSenderEmail();

    const subject = `Application Status Update: ${job} at ${company}`;

    const text = `Dear ${candidate},

Thank you for submitting your application for the ${job} position at ${company}.

We are pleased to inform you that your application is now Under Review by our hiring team. We are carefully evaluating candidate qualifications against our role requirements.

We will keep you updated on subsequent recruitment steps as our review progresses.

Thank you for your interest in joining ${company}.

Best regards,

${company} Recruitment Team
${contactEmail}`;

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.6; margin: 0; padding: 0; background-color: #f8fafc; }
            .container { max-width: 600px; margin: 20px auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
            .header { background: #3b82f6; color: #ffffff; padding: 24px; text-align: center; }
            .header h1 { margin: 0; font-size: 20px; font-weight: 700; }
            .body { padding: 28px 24px; }
            .status-badge { display: inline-block; background: #dbeafe; color: #1e40af; padding: 6px 14px; border-radius: 20px; font-weight: 600; font-size: 13px; margin: 12px 0; }
            .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 24px; font-size: 13px; color: #64748b; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Application Status Update</h1>
                <p style="margin: 4px 0 0; font-size: 13px; opacity: 0.9;">${escapeHtml(company)} &bull; ${escapeHtml(job)}</p>
            </div>
            <div class="body">
                <p>Dear <strong>${escapeHtml(candidate)}</strong>,</p>
                <p>We are writing to let you know that your application for the position of <strong>${escapeHtml(job)}</strong> at <strong>${escapeHtml(company)}</strong> has moved to the next step:</p>
                
                <div>
                    <span class="status-badge">Current Status: Under Review 🔍</span>
                </div>

                <p>Our hiring team is currently reviewing your resume, experience, and profile against the specifications for this position.</p>
                <p>We will contact you directly if your credentials are selected for the next phase of our interview process.</p>
                <p>Thank you for your patience and interest in ${escapeHtml(company)}.</p>

                <p style="margin-top: 24px;">
                    Best regards,<br/>
                    <strong>${escapeHtml(company)} Recruitment Team</strong><br/>
                    <a href="mailto:${escapeHtml(contactEmail)}" style="color: #3b82f6;">${escapeHtml(contactEmail)}</a>
                </p>
            </div>
            <div class="footer">
                Online Recruitment System &bull; ${escapeHtml(company)}
            </div>
        </div>
    </body>
    </html>
    `;

    return sendMailSafely({
        to: candidateEmail,
        subject,
        text,
        html
    });
};

/**
 * Master dispatcher for application notifications based on the target status
 */
export const dispatchApplicationEmail = async ({
    status,
    candidateName,
    candidateEmail,
    jobTitle,
    companyName,
    companyEmail,
    interviewDetails = {}
}) => {
    switch (status) {
        case 'Shortlisted for Interview':
        case 'Accepted':
            return await sendShortlistingEmail({
                candidateName,
                candidateEmail,
                jobTitle,
                companyName,
                companyEmail,
                interviewDetails
            });

        case 'Rejected':
            return await sendRejectionEmail({
                candidateName,
                candidateEmail,
                jobTitle,
                companyName,
                companyEmail
            });

        case 'Hired':
            return await sendHiredEmail({
                candidateName,
                candidateEmail,
                jobTitle,
                companyName,
                companyEmail
            });

        case 'Under Review':
            return await sendUnderReviewEmail({
                candidateName,
                candidateEmail,
                jobTitle,
                companyName,
                companyEmail
            });

        default:
            return {
                success: true,
                notApplicable: true,
                message: `No email notification required for status "${status}"`
            };
    }
};

export default {
    isSmtpConfigured,
    setMockTransporter,
    sendShortlistingEmail,
    sendRejectionEmail,
    sendHiredEmail,
    sendUnderReviewEmail,
    dispatchApplicationEmail
};
