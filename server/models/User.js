import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    // =====================================================
    // LOGIN EMAIL
    // =====================================================
    //
    // IMPORTANT:
    //
    // Email is normalized so:
    //
    // Ayush@Email.com
    // ayush@email.com
    // " ayush@email.com "
    //
    // are treated consistently.
    //
    // This User record is NOT deleted when an Employee
    // is archived/deleted.
    //
    // Generate Existing Employee Card / Restore Employee
    // must reuse this SAME User record.
    // =====================================================

    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },

    // =====================================================
    // CURRENT LOGIN PASSWORD
    // =====================================================
    //
    // IMPORTANT:
    //
    // This is the CURRENT hashed password used for login.
    //
    // When the Employee is first created:
    // temporary password -> bcrypt hash -> User.password
    //
    // If the Employee later changes/resets their password:
    // ONLY this field changes.
    //
    // Employee.temporaryPassword remains the original
    // temporary password for Admin reference.
    //
    // When Employee is:
    // - deleted
    // - restored
    // - permanently hidden
    // - generated again using Existing Employee Card
    //
    // this password MUST NOT be reset or regenerated.
    // =====================================================

    password: {
      type: String,
      required: true,
    },

    // =====================================================
    // ROLE
    // =====================================================

    role: {
      type: String,
      enum: ["ADMIN", "EMPLOYEE"],
      default: "EMPLOYEE",
    },

    // =====================================================
    // PASSWORD RESET
    // =====================================================

    resetPasswordToken: {
      type: String,
      default: null,
    },

    resetPasswordExpires: {
      type: Date,
      default: null,
    },

    // =====================================================
    // PROFILE
    // =====================================================

    bio: {
      type: String,
      default: "",
    },

    image: {
      type: String,
      default: null,
    },

    cvUrl: {
      type: String,
      default: null,
    },

    cvFileName: {
      type: String,
      default: null,
    },

    skills: {
      type: [String],
      default: [],
    },

    phone: {
      type: String,
      default: "",
    },

    // =====================================================
    // CHAT & POSTING RESTRICTIONS
    // =====================================================

    isChatBlocked: {
      type: Boolean,
      default: false,
    },

    postingBlockType: {
      type: String,
      enum: [
        "NONE",
        "TEMPORARY",
        "PERMANENT",
      ],
      default: "NONE",
    },

    postingBlockedUntil: {
      type: Date,
      default: null,
    },

    postingBlockReason: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

const User =
  mongoose.models.User ||
  mongoose.model(
    "User",
    userSchema
  );

export default User;