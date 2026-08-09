import { useState, useEffect, useCallback } from "react";
import { Gift, Heart, PartyPopper, Save, Loader2, X, Briefcase } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";
import toast from "react-hot-toast";
import { format, differenceInYears } from "date-fns";
import Loading from "../components/Loading";

const SpecialDates = () => {
    const { user } = useAuth();
    const isAdmin = user?.role === "ADMIN";

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Employee state
    const [dateOfBirth, setDateOfBirth] = useState("");
    const [anniversaryDate, setAnniversaryDate] = useState("");
    const [joinDate, setJoinDate] = useState(null);
    const [celebration, setCelebration] = useState(null); // { type: "birthday" | "anniversary" | "workAnniversary", years }

    // Admin state
    const [todaysCelebrations, setTodaysCelebrations] = useState([]);
    const [allDates, setAllDates] = useState([]);

    const checkCelebration = (data) => {
        if (!data) return;
        const today = new Date();
        const todayMonthDay = `${today.getMonth()}-${today.getDate()}`;

        if (data.dateOfBirth) {
            const dob = new Date(data.dateOfBirth);
            if (`${dob.getMonth()}-${dob.getDate()}` === todayMonthDay) {
                setCelebration({ type: "birthday" });
                return;
            }
        }
        if (data.anniversaryDate) {
            const anniv = new Date(data.anniversaryDate);
            if (`${anniv.getMonth()}-${anniv.getDate()}` === todayMonthDay) {
                setCelebration({ type: "anniversary" });
                return;
            }
        }
        if (data.joinDate) {
            const join = new Date(data.joinDate);
            if (`${join.getMonth()}-${join.getDate()}` === todayMonthDay) {
                const years = differenceInYears(today, join);
                if (years > 0) {
                    setCelebration({ type: "workAnniversary", years });
                }
            }
        }
    };

    const fetchData = useCallback(async () => {
        try {
            const res = await api.get("/special-dates");
            if (isAdmin) {
                setTodaysCelebrations(res.data.today || []);
                setAllDates(res.data.all || []);
            } else {
                const data = res.data.data;
                if (data?.dateOfBirth) setDateOfBirth(data.dateOfBirth.split("T")[0]);
                if (data?.anniversaryDate) setAnniversaryDate(data.anniversaryDate.split("T")[0]);
                if (data?.joinDate) setJoinDate(data.joinDate);
                checkCelebration(data);
            }
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message);
        } finally {
            setLoading(false);
        }
    }, [isAdmin]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.post("/special-dates", { dateOfBirth, anniversaryDate });
            toast.success("Special dates saved");
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message);
        } finally {
            setSaving(false);
        }
    };

    const celebrationIcons = {
        birthday: <Gift className="w-8 h-8 text-amber-500 shrink-0" />,
        anniversary: <Heart className="w-8 h-8 text-rose-500 shrink-0" />,
        workAnniversary: <Briefcase className="w-8 h-8 text-indigo-500 shrink-0" />,
    };

    const celebrationLabels = {
        birthday: "🎂 Birthday today!",
        anniversary: "💍 Anniversary today!",
        workAnniversary: (years) => `🎉 Completed ${years} year${years > 1 ? "s" : ""} today!`,
    };

    if (loading) return <Loading />;

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <h1 className="page-title">Special Dates</h1>
                <p className="page-subtitle">
                    {isAdmin
                        ? "Celebrate your team's milestones"
                        : "Let us celebrate your special days with you"}
                </p>
            </div>

            {isAdmin ? (
                <>
                    {/* Today's Celebrations */}
                    <div className="mb-8">
                        <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                            <PartyPopper className="w-4 h-4 text-indigo-600" />
                            Today's Celebrations
                        </h2>

                        {todaysCelebrations.length === 0 ? (
                            <div className="card p-6 text-center text-slate-400 text-sm">
                                No celebrations today
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {todaysCelebrations.map((c) => (
                                    <div key={c.employeeId + c.type} className="card p-5 flex items-center gap-3 border-l-4 border-amber-400">
                                        {celebrationIcons[c.type]}
                                        <div>
                                            <p className="font-semibold text-slate-900">{c.name}</p>
                                            <p className="text-xs text-slate-500">
                                                {c.type === "workAnniversary"
                                                    ? celebrationLabels.workAnniversary(c.years)
                                                    : celebrationLabels[c.type]}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* All Employees' Special Dates */}
                    <div className="card overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="table-modern">
                                <thead>
                                    <tr>
                                        <th>Employee</th>
                                        <th>Department</th>
                                        <th>Birthday</th>
                                        <th>Anniversary</th>
                                        <th>Joining Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {allDates.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="text-center py-12 text-slate-400">
                                                No data found
                                            </td>
                                        </tr>
                                    ) : (
                                        allDates.map((emp) => (
                                            <tr key={emp.employeeId}>
                                                <td className="text-slate-900">{emp.name}</td>
                                                <td className="text-slate-500">{emp.department || "-"}</td>
                                                <td className="text-slate-500">
                                                    {emp.dateOfBirth ? format(new Date(emp.dateOfBirth), "MMM dd") : "-"}
                                                </td>
                                                <td className="text-slate-500">
                                                    {emp.anniversaryDate ? format(new Date(emp.anniversaryDate), "MMM dd") : "-"}
                                                </td>
                                                <td className="text-slate-500">
                                                    {emp.joinDate ? format(new Date(emp.joinDate), "MMM dd, yyyy") : "-"}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            ) : (
                <form onSubmit={handleSave} className="card p-5 sm:p-6 max-w-lg">
                    <h2 className="text-base font-medium text-slate-900 mb-6 pb-4 border-b border-slate-100 flex items-center gap-2">
                        <Gift className="w-5 h-5 text-slate-400" />
                        Your Special Dates
                    </h2>

                    <div className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Date of Birth
                            </label>
                            <input
                                type="date"
                                value={dateOfBirth}
                                onChange={(e) => setDateOfBirth(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Anniversary Date
                            </label>
                            <input
                                type="date"
                                value={anniversaryDate}
                                onChange={(e) => setAnniversaryDate(e.target.value)}
                            />
                            <p className="text-xs text-slate-400 mt-1.5">Optional — leave blank if not applicable</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Joining Date
                            </label>
                            <input
                                disabled
                                value={joinDate ? format(new Date(joinDate), "MMMM dd, yyyy") : "Not available"}
                                className="bg-slate-50 text-slate-400 cursor-not-allowed"
                            />
                            <p className="text-xs text-slate-400 mt-1.5">Set by your organization — we'll celebrate your work anniversary automatically</p>
                        </div>

                        <div className="flex justify-end pt-2">
                            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2 justify-center w-full sm:w-auto">
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Save Changes
                            </button>
                        </div>
                    </div>
                </form>
            )}

            {/* Celebration Popup */}
            {celebration && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                    onClick={() => setCelebration(null)}
                >
                    <div
                        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center animate-fade-in"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setCelebration(null)}
                            className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        <div className="text-5xl mb-4">
                            {celebration.type === "birthday" && "🎉"}
                            {celebration.type === "anniversary" && "💐"}
                            {celebration.type === "workAnniversary" && "🏆"}
                        </div>
                        <h2 className="text-xl font-bold text-slate-900 mb-2">
                            {celebration.type === "birthday" && "Happy Birthday!"}
                            {celebration.type === "anniversary" && "Happy Anniversary!"}
                            {celebration.type === "workAnniversary" && `${celebration.years} Year${celebration.years > 1 ? "s" : ""} With Us!`}
                        </h2>
                        <p className="text-sm text-slate-500">
                            {celebration.type === "birthday" && "Wishing you a fantastic year ahead! 🎂"}
                            {celebration.type === "anniversary" && "Wishing you many more wonderful years! 💍"}
                            {celebration.type === "workAnniversary" && "Thank you for being part of the team! 🎉"}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SpecialDates;