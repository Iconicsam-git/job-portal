import Job from "../models/Job.js"
import { normalizeLocation } from "../utils/locationHelper.js"

// Get All Jobs (with optional normalized query filtering)
export const getJobs = async (req, res) => {
    try {
        const { location, category, title } = req.query
        let query = { visible: true }

        if (location) {
            const canonical = normalizeLocation(location)
            query.location = { $regex: canonical || location, $options: 'i' }
        }

        if (category) {
            query.category = { $regex: category, $options: 'i' }
        }

        if (title) {
            query.title = { $regex: title, $options: 'i' }
        }

        const jobs = await Job.find(query)
            .populate({ path: 'companyId', select: '-password' })

        res.json({ success: true, jobs })

    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}

// Get Single Job Using JobID
export const getJobById = async (req, res) => {
    try {

        const { id } = req.params

        const job = await Job.findById(id)
            .populate({
                path: 'companyId',
                select: '-password'
            })

        if (!job) {
            return res.json({
                success: false,
                message: 'Job not found'
            })
        }

        res.json({
            success: true,
            job
        })

    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}