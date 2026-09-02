import { useState, useEffect } from "react";
import Loading from "../components/Loading";
import EmployeeDashboard from "../components/EmployeeDashboard";
import AdminDashboard from "../components/AdminDashboard";
import api from "../api/axios";
import toast from "react-hot-toast";
import { Gift, X, Sparkles, Send, CheckCircle2, Edit3 } from "lucide-react";

const Dashboard = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    // Special dates state for Admin banner
    const [specialDatesToday, setSpecialDatesToday] = useState([]);
    const [showAdminPopup, setShowAdminPopup] = useState(false);
    const [wishInputs, setWishInputs] = useState({});
    const [editingWish, setEditingWish] = useState({});
    const [sendingWish, setSendingWish] = useState(false);

    // Employee wish state for top-right 24h card
    const [employeeWish, setEmployeeWish] = useState("");
    const [showEmployeeWish, setShowEmployeeWish] = useState(true);

    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                const res = await api.get("/dashboard");
                setData(res.data);

                if (res.data?.role === "ADMIN") {
                    const specialRes = await api.get("/special-dates");
                    const todayList = specialRes.data?.today || [];
                    setSpecialDatesToday(todayList);

                    // Pre-fill existing messages into wishInputs
                    const initialInputs = {};
                    todayList.forEach((person) => {
                        if (person.message) {
                            initialInputs[person.employeeId] = person.message;
                        }
                    });
                    setWishInputs(initialInputs);

                    // ALWAYS pop up on page load/refresh if there are celebrations today!
                    if (todayList.length > 0) {
                        setShowAdminPopup(true);
                    }
                } else {
                    const specialRes = await api.get("/special-dates");
                    if (specialRes.data?.data?.hrMessage) {
                        setEmployeeWish(specialRes.data.data.hrMessage);
                    }
                }
            } catch (err) {
                toast.error(
                    err.response?.data?.error ||
                    err.message ||
                    "Failed to load dashboard"
                );
            } finally {
                setLoading(false);
            }
        };

        fetchDashboard();
    }, []);

    const dismissAdminPopup = () => {
        setShowAdminPopup(false);
    };

    const handleSendWish = async (employeeId) => {
        const wishMsg = wishInputs[employeeId]?.trim();
        if (!wishMsg) {
            toast.error("Please write a message before sending");
            return;
        }

        try {
            setSendingWish(true);
            await api.post(`/special-dates/${employeeId}/message`, { message: wishMsg });
            toast.success("Wish message sent successfully!");
            
            setSpecialDatesToday((prev) =>
                prev.map((item) =>
                    item.employeeId === employeeId ? { ...item, message: wishMsg } : item
                )
            );
            setEditingWish((prev) => ({ ...prev, [employeeId]: false }));
        } catch (error) {
            console.error("Send Wish Error:", error);
            toast.error("Failed to send wish message");
        } finally {
            setSendingWish(false);
        }
    };

    const handleEditWish = (employeeId, currentMsg) => {
        setWishInputs((prev) => ({ ...prev, [employeeId]: currentMsg || "" }));
        setEditingWish((prev) => ({ ...prev, [employeeId]: true }));
    };

    if (loading) return <Loading />;

    if (!data) {
        return (
            <p className="text-center text-slate-500 py-12">
                Failed to load dashboard
            </p>
        );
    }

    return (
        <div className="relative space-y-6">

            {/* =========================================================
                ADMIN DASHBOARD SPECIAL DATES POP-UP / ALERT BANNER
            ========================================================= */}
            {data.role === "ADMIN" && showAdminPopup && specialDatesToday.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="rounded-xl bg-amber-50 p-2.5 text-amber-600">
                                <Sparkles className="h-5 w-5" />
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-slate-900">
                                    Today's Special Celebrations 🎉
                                </h2>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Send a wish to celebrate your team members today.
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={dismissAdminPopup}
                            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    <div className="mt-4 divide-y divide-slate-100 max-h-80 overflow-y-auto overflow-x-hidden">
                        {specialDatesToday.map((person) => {
                            const isSent = !!person.message && !editingWish[person.employeeId];

                            return (
                                <div
                                    key={person.employeeId}
                                    className="py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3.5 text-sm"
                                >
                                    {/* Aligned Left Column */}
                                    <div className="md:w-56 shrink-0">
                                        <p className="font-semibold text-slate-900 text-sm">
                                            {person.name}
                                        </p>
                                        <p className="text-xs text-indigo-600 font-medium mt-0.5">
                                            {person.type === "birthday" && "🎂 Birthday Today!"}
                                            {person.type === "anniversary" && "💍 Marriage Anniversary!"}
                                            {person.type === "workAnniversary" && `🌟 ${person.years} Year Work Anniversary!`}
                                        </p>
                                    </div>

                                    {/* Right Column — Pushed to the right edge of the card */}
                                    <div className="flex-1 flex items-center justify-end min-w-0">
                                        {isSent ? (
                                            <div className="inline-flex items-center gap-3 bg-emerald-50/90 border border-emerald-200 rounded-xl px-4 py-2 text-emerald-950 max-w-full sm:max-w-2xl w-fit">
                                                <div className="flex items-start gap-2.5 min-w-0">
                                                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                                                    <p className="font-medium text-sm text-emerald-950 break-words leading-relaxed">
                                                        "{person.message}"
                                                    </p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => handleEditWish(person.employeeId, person.message)}
                                                    className="shrink-0 text-indigo-600 hover:text-indigo-800 font-semibold text-xs inline-flex items-center gap-1 bg-white hover:bg-slate-50 border border-indigo-200 rounded-lg px-3 py-1.5 transition shadow-xs"
                                                >
                                                    <Edit3 size={13} />
                                                    Edit
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2.5 max-w-full sm:max-w-2xl w-fit">
                                                <input
                                                    type="text"
                                                    placeholder="Type a wish..."
                                                    value={wishInputs[person.employeeId] || ""}
                                                    onChange={(e) =>
                                                        setWishInputs({
                                                            ...wishInputs,
                                                            [person.employeeId]: e.target.value,
                                                        })
                                                    }
                                                    className="w-64 sm:w-80 max-w-full rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-indigo-500 shadow-xs"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => handleSendWish(person.employeeId)}
                                                    disabled={sendingWish}
                                                    className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 whitespace-nowrap shadow-xs shrink-0"
                                                >
                                                    <Send size={14} />
                                                    {editingWish[person.employeeId] ? "Resend" : "Send"}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* =========================================================
                ELEGANT EMPLOYEE DASHBOARD SPECIAL WISH BANNER
            ========================================================= */}
            {data.role !== "ADMIN" && employeeWish && showEmployeeWish && (
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/80 p-4 text-indigo-950 shadow-sm flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                        <div className="rounded-lg bg-indigo-600/10 p-2 text-indigo-600 shrink-0">
                            <Gift className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">
                                Management Special Wish 🎉
                            </p>
                            <p className="mt-0.5 text-sm font-semibold text-slate-800 break-words leading-relaxed">
                                "{employeeWish}"
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowEmployeeWish(false)}
                        className="rounded-lg p-1 text-slate-400 hover:bg-indigo-100 hover:text-slate-600 shrink-0"
                    >
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* Main Dashboards */}
            {data.role === "ADMIN" ? (
                <AdminDashboard data={data} />
            ) : (
                <EmployeeDashboard data={data} />
            )}
        </div>
    );
};

export default Dashboard;