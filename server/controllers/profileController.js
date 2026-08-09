import Employee from "../models/Employee.js"

// Get profile
// GET /api/profile
export const getPorfile = async (req, res) => {
    try {
        const session = req.session;
        const employee = await Employee.findOne({ userId: session.userId })

        if (!employee) {
            // Authenticated user is not an employee - return admin profile
            return res.json({
                firstName: "Admin",
                lastName: "",
                email: session.email,
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

        if (!employee)
        return res.status(400).json({error:"Employee not found"});
        if(employee.isDeleted){
            return res.status(403).json({error:"Your account is deactived. You cannot update your profile.",})
        }

        const updateData = {
            bio: req.body.bio ?? employee.bio,
        };

        if (req.body.skills) {
            try {
                updateData.skills = JSON.parse(req.body.skills);
            } catch (e) {
                // if it's not valid JSON, ignore silently
            }
        }

        if (req.files?.photo?.[0]) {
            // Cloudinary returns the full hosted URL directly on the file object
            updateData.image = req.files.photo[0].path;
        }

        if (req.files?.cv?.[0]) {
            updateData.cvUrl = req.files.cv[0].path;
            updateData.cvFileName = req.files.cv[0].originalname;
        }

        await Employee.findByIdAndUpdate(employee._id, updateData)
        return res.json({success:true});

    }catch(error){
        console.error("Update Profile Error:", error);
        return res.status(500).json({error:"Failed to update profile"});
    }
}