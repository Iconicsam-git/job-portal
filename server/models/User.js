import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String },
    resume: { type: String, default: '' },
    image: { type: String, default: '' },
    resetOtp: { type: String, default: '' },
    resetOtpExpire: { type: Number, default: 0 }
})

const User = mongoose.model('User', userSchema)

export default User;