import nodemailer from 'nodemailer'

/**
 * Creates and configures the Nodemailer transporter using environment variables.
 * Supports SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and backward-compatible SENDER_EMAIL/SENDER_PASSWORD.
 */
export const isSmtpConfigured = () => {
    const user = process.env.SMTP_USER || process.env.SENDER_EMAIL
    const pass = process.env.SMTP_PASS || process.env.SENDER_PASSWORD
    return Boolean(user && pass)
}

const createTransporter = () => {
    const host = process.env.SMTP_HOST || 'smtp.gmail.com'
    const port = Number(process.env.SMTP_PORT) || 587
    const user = process.env.SMTP_USER || process.env.SENDER_EMAIL
    const pass = process.env.SMTP_PASS || process.env.SENDER_PASSWORD
    const isSecure = port === 465

    const options = {
        host,
        port,
        secure: isSecure,
        tls: {
            rejectUnauthorized: false
        }
    }

    if (user && pass) {
        options.auth = { user, pass }
    }

    return nodemailer.createTransport(options)
}

const transporter = createTransporter()

export default transporter

