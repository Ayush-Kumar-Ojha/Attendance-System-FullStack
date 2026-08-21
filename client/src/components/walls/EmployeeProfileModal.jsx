import { useState, useEffect } from "react";
import { X } from "lucide-react";
import api from "../../api/axios";
import Loading from "../Loading";

const EmployeeProfileModal = ({ employeeId, onClose }) => {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!employeeId) return;
        setLoading(true);
        api.get(`/employees/${employeeId}/profile`)
            .then((res) => setProfile(res.data))
            .catch(() => setProfile(null))
            .finally(() => setLoading(false));
    }, [employeeId]);

    if (!employeeId) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm animate-fade-in" onClick={(e) => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-3 right-3 p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 z-10">
                    <X className="w-5 h-5" />
                </button>

                {loading ? (
                    <div className="p-12"><Loading /></div>
                ) : !profile ? (
                    <p className="p-8 text-center text-slate-400">Profile not found</p>
                ) : (
                    <div className="p-6 pt-10 text-center">
                        <div className="w-20 h-20 rounded-full bg-indigo-100 flex items-center justify-center overflow-hidden mx-auto mb-4">
                            {profile.image ? (
                                <img src={profile.image} alt={profile.firstName} className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-indigo-600 font-medium text-2xl">{profile.firstName?.[0]?.toUpperCase()}</span>
                            )}
                        </div>
                        <h2 className="text-lg font-bold text-slate-900">{profile.firstName} {profile.lastName}</h2>
                        <p className="text-sm text-slate-500 mb-4">{profile.position} · {profile.department}</p>

                        {profile.bio && (
                            <p className="text-sm text-slate-600 bg-slate-50 rounded-xl p-3 mb-4">{profile.bio}</p>
                        )}

                        {profile.skills?.length > 0 && (
                            <div className="flex flex-wrap gap-2 justify-center">
                                {profile.skills.map((skill) => (
                                    <span key={skill} className="text-xs bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full">
                                        {skill}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default EmployeeProfileModal;