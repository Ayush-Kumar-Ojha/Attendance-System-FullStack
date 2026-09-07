import { useState, useEffect, useCallback } from "react";
import { X, Ban, CheckCircle2, Loader2, Search } from "lucide-react";
import api from "../../api/axios";
import toast from "react-hot-toast";

const RestrictedPostersModal = ({ open, onClose, onUpdate }) => {
    const [restrictedList, setRestrictedList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [removingId, setRemovingId] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");

    const fetchRestrictedUsers = useCallback(async () => {
        setLoading(true);
        try {
            const response = await api.get("/posts/restricted-users");
            setRestrictedList(response.data.data || []);
        } catch (error) {
            console.error("Fetch Restricted Users Error:", error);
            toast.error("Failed to fetch restricted posters");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (open) {
            fetchRestrictedUsers();
        }
    }, [open, fetchRestrictedUsers]);

    const handleRemoveRestriction = async (userId, name) => {
        setRemovingId(userId);
        try {
            await api.post(`/posts/restrict-user/${userId}`, {
                blockType: "NONE",
            });

            toast.success(`Posting restriction removed for ${name}`);
            await fetchRestrictedUsers();
            if (onUpdate) onUpdate();
        } catch (error) {
            toast.error(error?.response?.data?.error || "Failed to remove restriction");
        } finally {
            setRemovingId(null);
        }
    };

    if (!open) return null;

    const filtered = restrictedList.filter(
        (u) =>
            u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-100 flex flex-col max-h-[85vh]">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-amber-50/50">
                    <div className="flex items-center gap-2 text-amber-900 font-semibold text-base">
                        <Ban className="w-5 h-5 text-amber-600" />
                        <span>Posting Restrictions ({restrictedList.length})</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-amber-100 text-slate-400 hover:text-slate-600 transition"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="p-4 border-b border-slate-100">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search restricted employees..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 text-xs !py-2"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-3">
                    {loading ? (
                        <div className="flex items-center justify-center py-10 text-slate-400 gap-2">
                            <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                            <span className="text-xs">Loading restricted posters...</span>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center py-10 text-slate-400">
                            <Ban className="w-10 h-10 mx-auto mb-2 text-slate-200" />
                            <p className="text-sm font-medium text-slate-600">No posting restrictions</p>
                            <p className="text-xs mt-1">All employees are allowed to post.</p>
                        </div>
                    ) : (
                        filtered.map((user) => (
                            <div
                                key={user.userId}
                                className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 bg-white hover:bg-slate-50 transition"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 font-bold flex items-center justify-center text-sm shrink-0 overflow-hidden">
                                        {user.image ? (
                                            <img src={user.image} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            user.name?.[0]?.toUpperCase() || "E"
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="text-xs font-semibold text-slate-900 truncate">{user.name}</p>
                                            <span
                                                className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                                    user.postingBlockType === "PERMANENT"
                                                        ? "bg-rose-100 text-rose-700"
                                                        : "bg-amber-100 text-amber-800"
                                                }`}
                                            >
                                                {user.postingBlockType}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                                            {user.postingBlockType === "TEMPORARY" && user.postingBlockedUntil
                                                ? `Until: ${new Date(user.postingBlockedUntil).toLocaleDateString("en-IN")}`
                                                : `Permanent restriction`}
                                        </p>
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleRemoveRestriction(user.userId, user.name)}
                                    disabled={removingId === user.userId}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold hover:bg-emerald-100 disabled:opacity-50 transition shrink-0 cursor-pointer"
                                >
                                    {removingId === user.userId ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                        <>
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                            Remove Restriction
                                        </>
                                    )}
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default RestrictedPostersModal;