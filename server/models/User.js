import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["ADMIN", "EMPLOYEE"],
      default: "EMPLOYEE",
    },
    resetPasswordToken: {
      type: String,
      default: null,
    },
    resetPasswordExpires: {
      type: Date,
      default: null,
    },
    bio: { type: String, default: "" },
    image: { type: String, default: null },
    cvUrl: { type: String, default: null },
    cvFileName: { type: String, default: null },
    skills: { type: [String], default: [] },
  },
  {
    timestamps: true,
  }
);

const User =
  mongoose.models.User || mongoose.model("User", userSchema);

export default User;