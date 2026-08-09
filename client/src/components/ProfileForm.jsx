import React, { useState, useRef } from "react";
import { Loader2, User, Save, Upload, FileText, X, Plus } from "lucide-react";
import api from "../api/axios";

const ProfileForm = ({ initialData, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    const [photoPreview, setPhotoPreview] = useState(initialData.image || null);
    const [photoFile, setPhotoFile] = useState(null);
    const photoInputRef = useRef(null);

    const [cvFile, setCvFile] = useState(null);
    const [cvFileName, setCvFileName] = useState(initialData.cvFileName || "");
    const cvInputRef = useRef(null);

    const [skills, setSkills] = useState(initialData.skills || []);
    const [skillInput, setSkillInput] = useState("");

    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setPhotoFile(file);
        setPhotoPreview(URL.createObjectURL(file));
    };

    const handleCvChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setCvFile(file);
        setCvFileName(file.name);
    };

    const handleSkillKeyDown = (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            const value = skillInput.trim();
            if (value && !skills.includes(value)) {
                setSkills([...skills, value]);
            }
            setSkillInput("");
        }
    };

    const removeSkill = (skillToRemove) => {
        setSkills(skills.filter((s) => s !== skillToRemove));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        setMessage("");

        const formData = new FormData(e.currentTarget);

        if (photoFile) formData.append("photo", photoFile);
        if (cvFile) formData.append("cv", cvFile);
        formData.append("skills", JSON.stringify(skills));

        try {
            await api.post("/profile", formData);
            setMessage("Profile updated successfully");
            onSuccess?.();
        } catch (err) {
            setError(err.response?.data?.error || err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="card p-5 sm:p-6 mb-6">
            <h2 className="text-base font-medium text-slate-900 mb-6 pb-4 border-b border-slate-100 flex items-center gap-2">
                <User className="w-5 h-5 text-slate-400" />
                Public Profile
            </h2>

            {error && (
                <div className='bg-rose-50 text-rose-700 p-4 rounded-xl text-sm border border-rose-200 mb-6 flex items-start gap-3'>
                    <div className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                    {error}
                </div>
            )}

            {message && (
                <div className='bg-emerald-50 text-emerald-700 p-4 rounded-xl text-sm border border-emerald-200 mb-6 flex items-start gap-3'>
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                    {message}
                </div>
            )}

            <div className='space-y-6'>

                {/* Profile Photo */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Profile Photo</label>
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center overflow-hidden shrink-0">
                            {photoPreview ? (
                                <img src={photoPreview} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-indigo-600 font-medium text-lg">
                                    {initialData.firstName?.[0]?.toUpperCase() || "U"}
                                </span>
                            )}
                        </div>
                        <div>
                            <input
                                ref={photoInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handlePhotoChange}
                            />
                            <button
                                type="button"
                                onClick={() => photoInputRef.current?.click()}
                                className="btn-secondary text-sm flex items-center gap-2"
                            >
                                <Upload className="w-4 h-4" />
                                Upload Photo
                            </button>
                            <p className="text-xs text-slate-400 mt-1.5">JPG or PNG, up to 2MB</p>
                        </div>
                    </div>
                </div>

                <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Name</label>
                        <input disabled value={`${initialData.firstName} ${initialData.lastName}`} className='bg-slate-50 text-slate-400 cursor-not-allowed' />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                        <input disabled value={initialData.email} className='bg-slate-50 text-slate-400 cursor-not-allowed' />
                    </div>
                    <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-2">Designation</label>
                        <input disabled value={initialData.position} className='bg-slate-50 text-slate-400 cursor-not-allowed' />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Bio</label>
                    <textarea disabled={initialData.isDeleted} name="bio"
                        defaultValue={initialData.bio || ""}
                        placeholder='Write a brief bio...'
                        className={`resize-none ${initialData.isDeleted ?
                            "bg-slate-50 text-slate-400 cursor-not-allowed" : ""}`} />
                    <p className='text-xs text-slate-400 mt-1.5'>This will be displayed on your profile.</p>
                </div>

                {/* CV Upload */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">CV / Resume</label>
                    <input
                        ref={cvInputRef}
                        type="file"
                        accept=".pdf,.doc,.docx"
                        className="hidden"
                        onChange={handleCvChange}
                    />
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => cvInputRef.current?.click()}
                            className="btn-secondary text-sm flex items-center gap-2"
                        >
                            <FileText className="w-4 h-4" />
                            {cvFileName ? "Replace CV" : "Upload CV"}
                        </button>
                        {cvFileName && (
                            <span className="text-sm text-slate-500 truncate max-w-[200px]">{cvFileName}</span>
                        )}
                    </div>
                    <p className="text-xs text-slate-400 mt-1.5">PDF or Word document, up to 5MB</p>
                </div>

                {/* Skills */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Skills</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                        {skills.map((skill) => (
                            <span
                                key={skill}
                                className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 text-sm px-3 py-1 rounded-full"
                            >
                                {skill}
                                <button
                                    type="button"
                                    onClick={() => removeSkill(skill)}
                                    className="hover:text-indigo-900"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </span>
                        ))}
                    </div>
                    <div className="relative">
                        <input
                            type="text"
                            value={skillInput}
                            onChange={(e) => setSkillInput(e.target.value)}
                            onKeyDown={handleSkillKeyDown}
                            placeholder="Type a skill and press Enter"
                            className="pr-10"
                        />
                        <Plus className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                    </div>
                    <p className="text-xs text-slate-400 mt-1.5">Press Enter to add a skill</p>
                </div>

                {initialData.isDeleted ? (
                    <div className='pt-2'>
                        <div className='p-4 bg-rose-50 border border-rose-200 rounded-xl text-center'>
                            <p className='text-rose-600 font-medium tracking-tight'>Account Deactivated</p>
                            <p className='text-sm text-rose-500 mt-0.5'>You can no longer update your profile.</p>
                        </div>
                    </div>
                ) : (
                    <div className="flex justify-end pt-2">
                        <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2 justify-center w-full sm:w-auto">
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Save Changes
                        </button>
                    </div>
                )}
            </div>
        </form>
    );
};

export default ProfileForm;