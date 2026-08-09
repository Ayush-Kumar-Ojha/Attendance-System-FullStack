import User from "../models/User.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import sendEmail from "../config/nodemailer.js";

// Login for employee and admin
// POST /api/auth/login
export const login = async (req, res) => {
    try {
        const { email, password, role_type } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: "Email and password are required" });
        }
        const user = await User.findOne({ email })
        if (!user) {
            return res.status(401).json({ error: "Invalid credentials" });
        }
        if (role_type === "admin" && user.role !== "ADMIN") {
            return res.status(401).json({ error: "Not authorized as admin" });
        }
        if (role_type === "employee" && user.role !== "EMPLOYEE") {
            return res.status(401).json({ error: "Not authorized as employee" });
        }
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            return res.status(401).json({ error: "Invalid credentials" });
        }
        const payload = {
            userId: user._id.toString(),
            role: user.role,
            email: user.email,
        }
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "7d" });
        return res.json({ user: payload, token });
    } catch (error) {
        console.error("Login error:", error)
        return res.status(500).json({ error: "Login failed" });
    }
}

// Get session for employee and admin
// GET /api/auth/session
export const session = (req, res) => {
    const session = req.session;
    return res.json({ user: session })
}

// Change password for employee and admin 
// POST /api/auth/change-password
export const changePassword = async (req, res) => {
    try {
        const session = req.session;
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: "Both passwords are required" });
        }
        const user = await User.findById(session.userId)
        if (!user) return res.status(404).json({ error: "User not found" });
        const isValid = await bcrypt.compare(currentPassword, user.password);
        if (!isValid) return res.status(400).json({error:"Current password is incorrect"});
        const hashed=await bcrypt.hash(newPassword,10)
        await User.findByIdAndUpdate(session.userId,{password:hashed})
        return res.json({success:true});
    }catch(error){
        return res.status(500).json({error:"Failed to change password"});
    }    
}

// Request a password reset link
// POST /api/auth/forgot-password
export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ error: "Email is required" });
        }

        const user = await User.findOne({ email });

        // Always respond success even if user not found, to avoid leaking which emails are registered
        if (!user) {
            return res.json({ success: true, message: "If that email exists, a reset link has been sent" });
        }

        // Generate a raw token to send in the email, and a hashed version to store in DB
        const rawToken = crypto.randomBytes(32).toString("hex");
        const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

        user.resetPasswordToken = hashedToken;
        user.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour
        await user.save();

        const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${rawToken}`;

        const body = `
            <p>You requested a password reset.</p>
            <p>Click the link below to set a new password. This link expires in 1 hour.</p>
            <p><a href="${resetUrl}">${resetUrl}</a></p>
            <p>If you didn't request this, you can safely ignore this email.</p>
        `;

        await sendEmail({
            to: user.email,
            subject: "Reset your password",
            body,
        });

        return res.json({ success: true, message: "If that email exists, a reset link has been sent" });
    } catch (error) {
        console.error("Forgot password error:", error);
        return res.status(500).json({ error: "Failed to process request" });
    }
};

// Reset password using token from email
// POST /api/auth/reset-password/:token
export const resetPassword = async (req, res) => {
    try {
        const { token } = req.params;
        const { password } = req.body;

        if (!password) {
            return res.status(400).json({ error: "New password is required" });
        }

        const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpires: { $gt: Date.now() },
        });

        if (!user) {
            return res.status(400).json({ error: "Reset link is invalid or has expired" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        user.password = hashedPassword;
        user.resetPasswordToken = null;
        user.resetPasswordExpires = null;
        await user.save();

        return res.json({ success: true, message: "Password has been reset" });
    } catch (error) {
        console.error("Reset password error:", error);
        return res.status(500).json({ error: "Failed to reset password" });
    }
};