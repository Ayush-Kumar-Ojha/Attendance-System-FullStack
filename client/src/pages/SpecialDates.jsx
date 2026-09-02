import React, { useEffect, useState, useMemo } from "react";
import {
    Sparkles,
    Gift,
    Edit3,
    X,
    Search,
    Cake,
    Heart,
    PartyPopper,
    Send,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../api/axios";

const SpecialDates = () => {
    const [specialDatesData, setSpecialDatesData] = useState({
        today: [],
        all: [],
    });
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    // Modal state for editing message
    const [selectedCelebration, setSelectedCelebration] = useState(null);
    const [messageInput, setMessageInput] = useState("");
    const [saving, setSaving] = useState(false);

    const fetchSpecialDates = async () => {
        try {
            setLoading(true);
            const response = await api.get("/special-dates");
            setSpecialDatesData(response.data || { today: [], all: [] });
        } catch (error) {
            console.error("Fetch Special Dates Error:", error);
            toast.error(
                error.response?.data?.error || "Failed to load special dates"
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSpecialDates();
    }, []);

    const openEditModal = (celebration) => {
        setSelectedCelebration(celebration);
        setMessageInput(celebration.message || "");
    };

    const handleSaveMessage = async () => {
        if (!selectedCelebration) return;

        try {
            setSaving(true);
            await api.post(
                `/special-dates/${selectedCelebration.employeeId}/message`,
                { message: messageInput }
            );

            toast.success("Wish message saved successfully!");
            setSelectedCelebration(null);
            setMessageInput("");
            await fetchSpecialDates();
        } catch (error) {
            console.error("Save Wish Error:", error);
            toast.error("Failed to save wish message");
        } finally {
            setSaving(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return "—";
        try {
            const date = new Date(dateString);
            if (Number.isNaN(date.getTime())) return "—";
            return date.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
            });
        } catch {
            return "—";
        }
    };

    const formatShortDate = (dateString) => {
        if (!dateString) return "—";
        try {
            const date = new Date(dateString);
            if (Number.isNaN(date.getTime())) return "—";
            return date.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
            });
        } catch {
            return "—";
        }
    };

    const filteredEmployees = useMemo(() => {
        const allList = specialDatesData.all || [];
        if (!search.trim()) return allList;

        const term = search.toLowerCase();
        return allList.filter(
            (emp) =>
                emp.name?.toLowerCase().includes(term) ||
                emp.department?.toLowerCase().includes(term)
        );
    }, [specialDatesData.all, search]);

    return (
        <div className="space-y-8 animate-fade-in pb-12">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                    Special Dates
                </h1>
                <p className="text-sm text-slate-500 mt-0.5">
                    Celebrate your team's milestones and send special wishes
                </p>
            </div>

            {/* =========================================================
                TODAY'S CELEBRATIONS SECTION
            ========================================================= */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                    <Sparkles className="h-4 w-4 text-amber-500 animate-pulse" />
                    <span>Today's Celebrations</span>
                    {specialDatesData.today?.length > 0 && (
                        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-700">
                            {specialDatesData.today.length}
                        </span>
                    )}
                </div>

                {loading ? (
                    <div className="flex items-center justify-center p-8 bg-white rounded-2xl border border-slate-100 shadow-sm">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600" />
                    </div>
                ) : specialDatesData.today?.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
                        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-500">
                            <PartyPopper size={24} />
                        </div>
                        <h3 className="text-sm font-semibold text-slate-800">
                            No celebrations today
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">
                            Check back tomorrow for upcoming team birthdays or work anniversaries!
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {specialDatesData.today.map((item, index) => {
                            const isBirthday = item.type === "birthday";
                            const isAnniversary = item.type === "anniversary";
                            const isWork = item.type === "workAnniversary";

                            return (
                                <div
                                    key={`${item.employeeId}-${index}`}
                                    className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all duration-200 hover:shadow-md hover:border-indigo-200"
                                >
                                    <div>
                                        {/* Card Top Header */}
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-base font-bold shadow-xs ${
                                                        isBirthday
                                                            ? "bg-rose-50 text-rose-600 border border-rose-100"
                                                            : isAnniversary
                                                            ? "bg-purple-50 text-purple-600 border border-purple-100"
                                                            : "bg-indigo-50 text-indigo-600 border border-indigo-100"
                                                    }`}
                                                >
                                                    {isBirthday && <Cake size={20} />}
                                                    {isAnniversary && <Heart size={20} />}
                                                    {isWork && <PartyPopper size={20} />}
                                                </div>

                                                <div>
                                                    <h3 className="font-bold text-slate-900 text-sm">
                                                        {item.name}
                                                    </h3>
                                                    <p className="text-xs font-semibold mt-0.5 flex items-center gap-1.5">
                                                        {isBirthday && (
                                                            <span className="text-rose-600">🎂 Birthday today!</span>
                                                        )}
                                                        {isAnniversary && (
                                                            <span className="text-purple-600">💍 Marriage Anniversary!</span>
                                                        )}
                                                        {isWork && (
                                                            <span className="text-indigo-600">
                                                                🌟 Completed {item.years} year{item.years > 1 ? "s" : ""} today!
                                                            </span>
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Crisp, clean, bold Wish Message Box */}
                                        <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/80 p-3.5 text-xs text-slate-800">
                                            {item.message ? (
                                                <p className="font-semibold text-sm text-slate-900 tracking-tight leading-relaxed break-words">
                                                    "{item.message}"
                                                </p>
                                            ) : (
                                                <p className="text-slate-400 font-medium">
                                                    No wish message sent yet...
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Edit Wish Action */}
                                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                                        <button
                                            type="button"
                                            onClick={() => openEditModal(item)}
                                            className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-100 bg-indigo-50/50 px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-100 transition"
                                        >
                                            <Edit3 size={13} />
                                            {item.message ? "Edit message" : "Add wish message"}
                                        </button>

                                        {item.message && (
                                            <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md">
                                                Wish Active ✓
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* =========================================================
                ALL EMPLOYEES SPECIAL DATES TABLE
            ========================================================= */}
            <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
                <div className="flex flex-col gap-3 border-b border-slate-100 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="font-bold text-slate-900 text-base">
                            Employee Special Dates Directory
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Overview of birth dates, anniversaries, and joining dates
                        </p>
                    </div>

                    <div className="relative w-full sm:w-64">
                        <Search
                            size={15}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <input
                            type="text"
                            placeholder="Search employee..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 py-1.5 pl-9 pr-3 text-xs outline-none focus:border-indigo-500"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4">Employee</th>
                                <th className="px-6 py-4">Department</th>
                                <th className="px-6 py-4">Birthday</th>
                                <th className="px-6 py-4">Anniversary</th>
                                <th className="px-6 py-4">Joining Date</th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                            {filteredEmployees.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={5}
                                        className="px-6 py-12 text-center text-slate-400"
                                    >
                                        No employee special dates found
                                    </td>
                                </tr>
                            ) : (
                                filteredEmployees.map((emp) => (
                                    <tr
                                        key={emp.employeeId}
                                        className="transition hover:bg-slate-50/60"
                                    >
                                        <td className="px-6 py-4 font-bold text-slate-900">
                                            <div className="flex items-center gap-2.5">
                                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                                                    {emp.name?.charAt(0) || "E"}
                                                </div>
                                                <span>{emp.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">
                                            {emp.department || "—"}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">
                                            {formatShortDate(emp.dateOfBirth)}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">
                                            {formatShortDate(emp.anniversaryDate)}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">
                                            {formatDate(emp.joinDate)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* =========================================================
                EDIT WISH MESSAGE MODAL
            ========================================================= */}
            {selectedCelebration && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm animate-fade-in">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-5">
                        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                            <div>
                                <h3 className="text-base font-bold text-slate-900">
                                    Message for {selectedCelebration.name}
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    This wish will pop up on their employee dashboard for 24 hours.
                                </p>
                            </div>

                            <button
                                onClick={() => setSelectedCelebration(null)}
                                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                Wish Message
                            </label>
                            <textarea
                                rows={4}
                                value={messageInput}
                                onChange={(e) => setMessageInput(e.target.value)}
                                placeholder="e.g. Wishing you a very Happy Birthday! Have a wonderful year ahead 🎉"
                                className="w-full resize-none rounded-xl border border-slate-200 p-3.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                autoFocus
                            />
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setSelectedCelebration(null)}
                                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveMessage}
                                disabled={saving}
                                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 py-2.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 shadow-sm"
                            >
                                <Send size={14} />
                                {saving ? "Saving..." : "Save Message"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SpecialDates;