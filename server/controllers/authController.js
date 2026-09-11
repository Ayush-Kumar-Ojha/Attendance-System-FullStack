import User from "../models/User.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import sendEmail from "../config/nodemailer.js";

// ============================================================
// HELPER - NORMALIZE EMAIL
// ============================================================

const normalizeEmail = (value) =>
    String(value || "")
        .trim()
        .toLowerCase();

// ============================================================
// LOGIN FOR EMPLOYEE AND ADMIN
// POST /api/auth/login
// ============================================================

export const login = async (req, res) => {
    try {
        const {
            email,
            password,
            role_type,
        } = req.body;

        const normalizedEmail =
            normalizeEmail(email);

        if (
            !normalizedEmail ||
            !password
        ) {
            return res.status(400).json({
                error:
                    "Email and password are required",
            });
        }

        // ====================================================
        // FIND USER
        // ====================================================
        //
        // Email is normalized so:
        //
        // Ayush@Email.com
        // ayush@email.com
        // " ayush@email.com "
        //
        // all resolve to the same login account.
        // ====================================================

        const user =
            await User.findOne({
                email:
                    normalizedEmail,
            });

        if (!user) {
            return res.status(401).json({
                error:
                    "Invalid credentials",
            });
        }

        // ====================================================
        // ROLE VALIDATION
        // ====================================================

        if (
            role_type === "admin" &&
            user.role !== "ADMIN"
        ) {
            return res.status(401).json({
                error:
                    "Not authorized as admin",
            });
        }

        if (
            role_type === "employee" &&
            user.role !== "EMPLOYEE"
        ) {
            return res.status(401).json({
                error:
                    "Not authorized as employee",
            });
        }

        // ====================================================
        // PASSWORD VALIDATION
        //
        // IMPORTANT:
        //
        // ONLY the CURRENT password stored in User.password
        // is valid for login.
        //
        // When an employee is first created:
        //
        // generated temporary password
        //          ↓
        // bcrypt hash
        //          ↓
        // User.password
        //
        // If the Employee later changes/resets password:
        //
        // User.password is replaced with the NEW hash.
        //
        // Employee.temporaryPassword remains only as the
        // ORIGINAL temporary password for Admin reference.
        //
        // It is NEVER used here for authentication.
        //
        // Therefore:
        //
        // delete Employee
        // restore Employee
        // Generate Existing Employee Card
        //
        // DO NOT affect the employee's current login password.
        // ====================================================

        const isValid =
            await bcrypt.compare(
                password,
                user.password
            );

        if (!isValid) {
            return res.status(401).json({
                error:
                    "Invalid credentials",
            });
        }

        // ====================================================
        // CREATE JWT
        // ====================================================

        const payload = {
            userId:
                user._id.toString(),

            role:
                user.role,

            email:
                user.email,
        };

        const token = jwt.sign(
            payload,
            process.env.JWT_SECRET,
            {
                expiresIn: "7d",
            }
        );

        return res.json({
            user:
                payload,

            token,
        });
    } catch (error) {
        console.error(
            "Login error:",
            error
        );

        return res.status(500).json({
            error:
                "Login failed",
        });
    }
};

// ============================================================
// GET SESSION FOR EMPLOYEE AND ADMIN
// GET /api/auth/session
// ============================================================

export const session = (
    req,
    res
) => {
    const session =
        req.session;

    return res.json({
        user:
            session,
    });
};

// ============================================================
// CHANGE PASSWORD
// POST /api/auth/change-password
// ============================================================

export const changePassword = async (
    req,
    res
) => {
    try {
        const session =
            req.session;

        const {
            currentPassword,
            newPassword,
        } = req.body;

        if (
            !currentPassword ||
            !newPassword
        ) {
            return res.status(400).json({
                error:
                    "Both passwords are required",
            });
        }

        // ====================================================
        // SESSION VALIDATION
        // ====================================================

        if (
            !session ||
            !session.userId
        ) {
            return res.status(401).json({
                error:
                    "Not authenticated",
            });
        }

        const user =
            await User.findById(
                session.userId
            );

        if (!user) {
            return res.status(404).json({
                error:
                    "User not found",
            });
        }

        // ====================================================
        // VERIFY CURRENT PASSWORD
        // ====================================================

        const isValid =
            await bcrypt.compare(
                currentPassword,
                user.password
            );

        if (!isValid) {
            return res.status(400).json({
                error:
                    "Current password is incorrect",
            });
        }

        // ====================================================
        // HASH AND REPLACE PASSWORD
        //
        // IMPORTANT:
        //
        // This changes ONLY User.password.
        //
        // Employee.temporaryPassword is intentionally NOT
        // modified.
        //
        // Once User.password changes:
        //
        // - previous current password stops working
        // - original temporary password stops working
        //
        // Authentication always uses this latest User.password.
        // ====================================================

        const hashedPassword =
            await bcrypt.hash(
                newPassword,
                10
            );

        user.password =
            hashedPassword;

        await user.save();

        return res.json({
            success:
                true,

            message:
                "Password changed successfully",
        });
    } catch (error) {
        console.error(
            "Change password error:",
            error
        );

        return res.status(500).json({
            error:
                "Failed to change password",
        });
    }
};

// ============================================================
// FORGOT PASSWORD
// POST /api/auth/forgot-password
// ============================================================

export const forgotPassword = async (
    req,
    res
) => {
    try {
        const { email } =
            req.body;

        const normalizedEmail =
            normalizeEmail(email);

        if (!normalizedEmail) {
            return res.status(400).json({
                error:
                    "Email is required",
            });
        }

        const user =
            await User.findOne({
                email:
                    normalizedEmail,
            });

        // ====================================================
        // SECURITY
        // ====================================================
        //
        // Always return the same success response even when
        // the email does not exist.
        //
        // This avoids exposing which email addresses are
        // registered in the system.
        // ====================================================

        if (!user) {
            return res.json({
                success:
                    true,

                message:
                    "If that email exists, a reset link has been sent",
            });
        }

        // ====================================================
        // GENERATE PASSWORD RESET TOKEN
        // ====================================================

        const rawToken =
            crypto
                .randomBytes(32)
                .toString("hex");

        const hashedToken =
            crypto
                .createHash(
                    "sha256"
                )
                .update(
                    rawToken
                )
                .digest(
                    "hex"
                );

        user.resetPasswordToken =
            hashedToken;

        // Reset link expires after 1 hour

        user.resetPasswordExpires =
            Date.now() +
            60 *
                60 *
                1000;

        await user.save();

        // ====================================================
        // RESET URL
        // ====================================================

        const resetUrl =
            `${process.env.FRONTEND_URL}/reset-password/${rawToken}`;

        const body = `
            <p>You requested a password reset.</p>

            <p>
                Click the link below to set a new password.
                This link expires in 1 hour.
            </p>

            <p>
                <a href="${resetUrl}">
                    ${resetUrl}
                </a>
            </p>

            <p>
                If you didn't request this,
                you can safely ignore this email.
            </p>
        `;

        await sendEmail({
            to:
                user.email,

            subject:
                "Reset your password",

            body,
        });

        return res.json({
            success:
                true,

            message:
                "If that email exists, a reset link has been sent",
        });
    } catch (error) {
        console.error(
            "Forgot password error:",
            error
        );

        return res.status(500).json({
            error:
                "Failed to process request",
        });
    }
};

// ============================================================
// RESET PASSWORD USING EMAIL TOKEN
// POST /api/auth/reset-password/:token
// ============================================================

export const resetPassword = async (
    req,
    res
) => {
    try {
        const { token } =
            req.params;

        const { password } =
            req.body;

        if (!password) {
            return res.status(400).json({
                error:
                    "New password is required",
            });
        }

        if (!token) {
            return res.status(400).json({
                error:
                    "Reset token is required",
            });
        }

        // ====================================================
        // HASH TOKEN RECEIVED FROM URL
        // ====================================================

        const hashedToken =
            crypto
                .createHash(
                    "sha256"
                )
                .update(
                    token
                )
                .digest(
                    "hex"
                );

        const user =
            await User.findOne({
                resetPasswordToken:
                    hashedToken,

                resetPasswordExpires: {
                    $gt:
                        Date.now(),
                },
            });

        if (!user) {
            return res.status(400).json({
                error:
                    "Reset link is invalid or has expired",
            });
        }

        // ====================================================
        // HASH NEW PASSWORD
        //
        // IMPORTANT:
        //
        // This completely replaces User.password.
        //
        // Employee.temporaryPassword is NOT changed.
        //
        // The original temporary password therefore no longer
        // works for authentication after this reset.
        //
        // If this Employee is later deleted/restored:
        //
        // the SAME new User.password remains untouched.
        // ====================================================

        const hashedPassword =
            await bcrypt.hash(
                password,
                10
            );

        user.password =
            hashedPassword;

        // ====================================================
        // RESET TOKEN CANNOT BE REUSED
        // ====================================================

        user.resetPasswordToken =
            null;

        user.resetPasswordExpires =
            null;

        await user.save();

        return res.json({
            success:
                true,

            message:
                "Password has been reset",
        });
    } catch (error) {
        console.error(
            "Reset password error:",
            error
        );

        return res.status(500).json({
            error:
                "Failed to reset password",
        });
    }
};