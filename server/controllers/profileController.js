import Employee from "../models/Employee.js"
import User from "../models/User.js"

// Get profile
// GET /api/profile
export const getPorfile = async (req, res) => {
    try {
        const session = req.session;
        const employee = await Employee.findOne({ userId: session.userId })

        if (!employee) {
            // Authenticated user is not an employee - return admin profile
            const user = await User.findById(session.userId);
            return res.json({
                firstName: "Admin",
                lastName: "",
                email: session.email,
                bio: user?.bio || "",
                image: user?.image || null,
                cvUrl: user?.cvUrl || null,
                cvFileName: user?.cvFileName || null,
                skills: user?.skills || [],
            })
        }
        return res.json(employee)
    }catch(error){
        return res.status(500).json({error:"Failed to fetch profile"});
    }
}    

// Update Profile
// POST /api/profile
export const updateProfile = async (req, res) => {
    try {
        const session = req.session;
        const employee = await Employee.findOne({ userId: session.userId })

        const updateData = {
            bio: req.body.bio ?? "",
        };

        if (req.body.skills) {
            try {
                updateData.skills = JSON.parse(req.body.skills);
            } catch (e) {
                // if it's not valid JSON, ignore silently
            }
        }

        if (req.files?.photo?.[0]) {
            updateData.image = req.files.photo[0].path;
        }

        if (req.files?.cv?.[0]) {
            updateData.cvUrl = req.files.cv[0].path;
            updateData.cvFileName = req.files.cv[0].originalname;
        }

        if (employee) {
            // Employee flow
            if (employee.isDeleted) {
                return res.status(403).json({error:"Your account is deactived. You cannot update your profile.",})
            }
            await Employee.findByIdAndUpdate(employee._id, updateData)
        } else {
            // Admin flow (no Employee record exists)
            await User.findByIdAndUpdate(session.userId, updateData)
        }

        return res.json({success:true});

    }catch(error){
        console.error("Update Profile Error:", error);
        return res.status(500).json({error:"Failed to update profile"});
    }
}