import {
    Loader2Icon,
    LogInIcon,
    LogOutIcon,
    MapPinIcon,
    RefreshCwIcon,
    AlertTriangleIcon,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import api from "../../api/axios";
import toast from "react-hot-toast";

// Haversine formula to calculate distance in kilometers
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in KM
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

// Default fallback office if none configured by Admin
const DEFAULT_OFFICES = [];

const getOfficeLocations = () => {
    try {
        const saved =
            localStorage.getItem(
                "OFFICE_LOCATIONS"
            );

        if (saved !== null) {
            const parsed =
                JSON.parse(saved);

            if (
                Array.isArray(parsed)
            ) {
                return parsed;
            }
        }
    } catch (error) {
        console.error(
            "Error reading office locations:",
            error
        );
    }

    return [];
};

const CheckInButton = ({ todayRecord, onAction }) => {
    const [loading, setLoading] = useState(false);
    const [locating, setLocating] = useState(true);
    const [locationError, setLocationError] = useState(null);
    const [nearestOffice, setNearestOffice] = useState(null);

    const [
        geofenceDisabled,
        setGeofenceDisabled,
    ] = useState(false);

    const [showWeekendModal, setShowWeekendModal] = useState(false);

    const isCheckedIn = !!todayRecord?.checkIn;

    // Check Employee's GPS location against all office locations
    const checkLocation = useCallback(() => {
        const offices =
            getOfficeLocations();

        // =========================================================
        // NO OFFICE CONFIGURED
        // Geofencing is disabled.
        // Employee can mark attendance from anywhere.
        // =========================================================

        if (
            offices.length === 0
        ) {
            setGeofenceDisabled(
                true
            );

            setNearestOffice(
                null
            );

            setLocationError(
                null
            );

            setLocating(
                false
            );

            return;
        }

        // =========================================================
        // OFFICE EXISTS
        // Normal geofencing continues.
        // =========================================================

        setGeofenceDisabled(
            false
        );

        if (
            !navigator.geolocation
        ) {
            setLocationError(
                "Geolocation is not supported by your browser"
            );

            setLocating(
                false
            );

            return;
        }

        setLocating(
            true
        );

        setLocationError(
            null
        );

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const userLat =
                    position.coords.latitude;

                const userLng =
                    position.coords.longitude;

                let closest =
                    null;

                let minDistance =
                    Infinity;

                offices.forEach(
                    (office) => {
                        const dist =
                            calculateDistance(
                                userLat,
                                userLng,
                                Number(
                                    office.latitude
                                ),
                                Number(
                                    office.longitude
                                )
                            );

                        if (
                            dist <
                            minDistance
                        ) {
                            minDistance =
                                dist;

                            closest =
                                office;
                        }
                    }
                );

                if (closest) {
                    const allowedRadius =
                        Number(
                            closest.radiusKm ||
                            2.0
                        );

                    setNearestOffice({
                        office:
                            closest,

                        distanceKm:
                            minDistance,

                        isWithinRadius:
                            minDistance <=
                            allowedRadius,
                    });
                }

                setLocating(
                    false
                );
            },

            (error) => {
                console.error(
                    "Geolocation Error:",
                    error
                );

                setLocating(
                    false
                );

                if (
                    error.code ===
                    error.PERMISSION_DENIED
                ) {
                    setLocationError(
                        "Location permission denied. Please allow location access in your browser."
                    );
                } else {
                    setLocationError(
                        "Unable to fetch your location. Make sure GPS is enabled."
                    );
                }
            },

            {
                enableHighAccuracy:
                    true,

                timeout:
                    10000,

                maximumAge:
                    0,
            }
        );
    }, []);

    useEffect(() => {
        checkLocation();
    }, [checkLocation]);

    const canClock =
        geofenceDisabled ||
        (
            !locating &&
            !locationError &&
            nearestOffice?.isWithinRadius
        );

    const executeAttendance = async () => {
        setLoading(true);
        try {
            await api.post("/attendance");
            toast.success(
                isCheckedIn
                    ? "Clocked out successfully"
                    : "Clocked in successfully"
            );
            onAction();
        } catch (error) {
            toast.error(error?.response?.data?.error || error?.message);
        } finally {
            setLoading(false);
            setShowWeekendModal(false);
        }
    };

    const handleAttendanceClick = () => {
        // =========================================================
        // ONLY CHECK LOCATION WHEN ADMIN HAS CONFIGURED OFFICES
        // =========================================================

        if (!geofenceDisabled) {
            if (locating) {
                toast.error(
                    "Checking your location, please wait..."
                );

                return;
            }

            if (locationError) {
                toast.error(
                    locationError
                );

                return;
            }

            if (
                !nearestOffice
                    ?.isWithinRadius
            ) {
                toast.error(
                    `You are ${nearestOffice?.distanceKm?.toFixed(
                        1
                    )} km away. You must be within ${nearestOffice?.office?.radiusKm ||
                    2.0
                    } km of an office to ${isCheckedIn
                        ? "clock out"
                        : "clock in"
                    }.`
                );

                return;
            }
        }

        // Existing weekend functionality remains unchanged.
        const todayDay =
            new Date().getDay();

        const isWeekend =
            todayDay === 0 ||
            todayDay === 6;

        if (
            !isCheckedIn &&
            isWeekend
        ) {
            setShowWeekendModal(
                true
            );

            return;
        }

        executeAttendance();
    };

    if (todayRecord?.checkOut) {
        return (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center shadow-sm">
                <h3 className="text-lg font-bold text-slate-900">
                    Work Day Completed
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                    Great job! See you tomorrow
                </p>
            </div>
        );
    }

    return (
        <>
            <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2">
                {/* Geofence Status Badge */}
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-xs font-medium shadow-md backdrop-blur">
                    {geofenceDisabled ? (
                        <div className="flex items-center gap-2 text-emerald-700">
                            <MapPinIcon className="h-3.5 w-3.5" />
                            <span>No office location restriction</span>
                        </div>
                    ) : locating ? (
                        <div className="flex items-center gap-2 text-slate-500">
                            <Loader2Icon className="h-3.5 w-3.5 animate-spin text-indigo-600" />
                            <span>Verifying office distance...</span>
                        </div>
                    ) : locationError ? (
                        <div className="flex items-center gap-2 text-rose-600">
                            <AlertTriangleIcon className="h-3.5 w-3.5" />
                            <span>{locationError}</span>
                            <button
                                onClick={checkLocation}
                                className="ml-1 rounded p-1 text-slate-500 hover:bg-slate-100"
                                title="Retry location"
                            >
                                <RefreshCwIcon className="h-3 w-3" />
                            </button>
                        </div>
                    ) : nearestOffice ? (
                        <div className="flex items-center gap-2">
                            <MapPinIcon
                                className={`h-3.5 w-3.5 ${nearestOffice.isWithinRadius
                                    ? "text-emerald-600"
                                    : "text-amber-600"
                                    }`}
                            />
                            {nearestOffice.isWithinRadius ? (
                                <span className="text-emerald-700">
                                    Within range of <strong>{nearestOffice.office.name}</strong> (
                                    {nearestOffice.distanceKm < 1
                                        ? `${Math.round(nearestOffice.distanceKm * 1000)} m`
                                        : `${nearestOffice.distanceKm.toFixed(2)} km`} away)
                                </span>
                            ) : (
                                <span className="text-amber-700">
                                    <strong>{nearestOffice.distanceKm.toFixed(1)} km</strong> from nearest office (Limit: {nearestOffice.office.radiusKm || 2.0} km)
                                </span>
                            )}

                            <button
                                onClick={checkLocation}
                                className="ml-1 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                                title="Refresh location"
                            >
                                <RefreshCwIcon className="h-3 w-3" />
                            </button>
                        </div>
                    ) : null}
                </div>

                {/* Clock In / Clock Out Button */}
                <button
                    type="button"
                    onClick={handleAttendanceClick}
                    disabled={loading || !canClock}
                    className={`flex items-center justify-center gap-3 rounded-xl px-5 py-3 text-white shadow-md transition-all ${!canClock
                        ? "cursor-not-allowed bg-slate-400 opacity-65 shadow-none"
                        : isCheckedIn
                            ? "bg-slate-900 hover:bg-black"
                            : "bg-indigo-600 hover:bg-indigo-700"
                        }`}
                >
                    {loading ? (
                        <Loader2Icon className="h-5 w-5 animate-spin shrink-0" />
                    ) : isCheckedIn ? (
                        <LogOutIcon className="h-5 w-5 shrink-0" />
                    ) : (
                        <LogInIcon className="h-5 w-5 shrink-0" />
                    )}

                    <div className="flex flex-col text-left">
                        <h2 className="text-sm font-semibold leading-tight">
                            {loading
                                ? "Processing..."
                                : isCheckedIn
                                    ? "Clock Out"
                                    : "Clock In"}
                        </h2>
                        <p className="text-[11px] opacity-80 leading-tight mt-0.5">
                            {geofenceDisabled
                                ? isCheckedIn
                                    ? "Click to end shift"
                                    : "Attendance available from anywhere"
                                : canClock
                                    ? isCheckedIn
                                        ? "Click to end shift"
                                        : "Start your work day"
                                    : "Must be within office radius"}
                        </p>
                    </div>
                </button>
            </div>

            {/* Weekend / Holiday Confirmation Pop-up Modal */}
            {showWeekendModal && createPortal(
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
                    onClick={() => setShowWeekendModal(false)}
                >
                    <div
                        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-fade-in"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-start gap-3.5 mb-4">
                            <div className="p-2.5 rounded-full bg-amber-50 shrink-0">
                                <AlertTriangleIcon className="w-6 h-6 text-amber-600" />
                            </div>

                            <div>
                                <h3 className="text-base font-bold text-slate-900">
                                    Weekend / Holiday Attendance
                                </h3>
                                <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                                    Are you sure you want to mark attendance? Today is a <strong>weekend / holiday</strong> for all.
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4 border-t border-slate-100">
                            <button
                                onClick={() => setShowWeekendModal(false)}
                                type="button"
                                className="btn-secondary flex-1"
                            >
                                Cancel
                            </button>

                            <button
                                onClick={executeAttendance}
                                disabled={loading}
                                type="button"
                                className="btn-primary flex-1 flex items-center justify-center gap-2"
                            >
                                {loading && <Loader2Icon className="w-4 h-4 animate-spin" />}
                                {loading ? "Processing..." : "Proceed & Clock In"}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
};

export default CheckInButton;