import dns from "node:dns";
import mongoose from "mongoose";

// Only override DNS servers for local development if needed, avoid overriding in Vercel / serverless
if (!process.env.VERCEL) {
    try {
        dns.setServers([
            "8.8.8.8",
            "8.8.4.4"
        ]);
    } catch (e) {
        // ignore
    }
}

let isConnected = false;

const connectDB = async () => {
    if (isConnected || mongoose.connection.readyState === 1) {
        return;
    }

    if (!process.env.MONGODB_URI) {
        console.error("CRITICAL: MONGODB_URI environment variable is not defined!");
        return;
    }

    try {
        mongoose.connection.on("connected", () => {
            console.log("MongoDB Connected");
        });

        await mongoose.connect(`${process.env.MONGODB_URI}/job-portal`, {
            serverSelectionTimeoutMS: 10000
        });

        isConnected = true;
        console.log("Database connection established successfully");
    } catch (error) {
        console.error("MongoDB connection failed:", error.message);
        if (!process.env.VERCEL) {
            process.exit(1);
        }
    }
};

export default connectDB;