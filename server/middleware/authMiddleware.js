import jwt from 'jsonwebtoken'
import Company from '../models/Company.js'
import User from '../models/User.js'

// Middleware ( Protect Company Routes )
export const protectCompany = async (req,res,next) => {

    // Getting Token Froms Headers
    const token = req.headers.token


    if (!token) {
        return res.json({ success:false, message:'Not authorized, Login Again'})
    }

    try {

        const decoded = jwt.verify(token, process.env.JWT_SECRET)

        req.company = await Company.findById(decoded.id).select('-password')

        next()

    } catch (error) {
        res.json({success:false, message: error.message})
    }

}

// Middleware ( Protect User Routes )
export const protectUser = async (req, res, next) => {

    // Getting Token From Authorization Header
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.json({ success: false, message: 'Not authorized, Login Again' })
    }

    const token = authHeader.split(' ')[1]

    try {

        const decoded = jwt.verify(token, process.env.JWT_SECRET)

        req.user = await User.findById(decoded.id).select('-password')

        if (!req.user) {
            return res.json({ success: false, message: 'Not authorized, Login Again' })
        }

        next()

    } catch (error) {
        res.json({ success: false, message: error.message })
    }

}