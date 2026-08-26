import dns from "node:dns";
import mongoose from "mongoose";

dns.setServers([
    "8.8.8.8",
    "8.8.4.4"
]);

const connectDB = async () => {
    try {
        mongoose.connection.on("connected", () => {
            console.log("MongoDB Connected");
        });

        await mongoose.connect(`${process.env.MONGODB_URI}/job-portal`, {
            serverSelectionTimeoutMS: 10000
        });

        console.log("Database connection established successfully");
    } catch (error) {
        console.error("MongoDB connection failed:");
        console.error(error.message);
        process.exit(1);
    }
};

export default connectDB;