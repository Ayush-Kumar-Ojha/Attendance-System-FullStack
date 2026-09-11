import mongoose from "mongoose";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import User from "./models/User.js";

dotenv.config();

const updateAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);

        console.log("MongoDB connected");

        // CHANGE THESE TWO VALUES
        const newAdminEmail = "hr@weharksolutions.com";
        const newAdminPassword = "Wehark@123";

        const admin = await User.findOne({
            role: "ADMIN",
        });

        if (!admin) {
            console.log("Admin user not found");
            process.exit(1);
        }

        const hashedPassword = await bcrypt.hash(
            newAdminPassword,
            10
        );

        admin.email = newAdminEmail
            .trim()
            .toLowerCase();

        admin.password = hashedPassword;

        await admin.save();

        console.log("Admin credentials updated successfully");
        console.log("New Admin Email:", newAdminEmail);

        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error(
            "Failed to update admin:",
            error
        );

        process.exit(1);
    }
};

updateAdmin();