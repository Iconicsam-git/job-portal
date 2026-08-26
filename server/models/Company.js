import mongoose from "mongoose";

const companySchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    image: { type: String, required: true },
    password: { type: String },
    resetOtp: { type: String, default: '' },
    resetOtpExpire: { type: Number, default: 0 }
})

const Company = mongoose.model('Company', companySchema)

export default Company