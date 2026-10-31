
import mongoose from "mongoose";

export default async function dbConnection() {
    try {
        const mongoUri =
            process.env.MONGODB_URI ||
            "mongodb://localhost:27017/ticketingSystem";
        await mongoose.connect(mongoUri);

        console.log("MongoDB connected successfully");
    } catch (error) {
        console.error("MongoDB connection failed:", error.message);
        process.exit(1);
    }
}
