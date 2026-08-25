import { useEffect, useState } from "react";
import { Lock, MapPin, Plus, Trash2, Crosshair, Building2 } from "lucide-react";
import Loading from "../components/Loading";
import ProfileForm from "../components/ProfileForm";
import ChangePasswordModal from "../components/ChangePasswordModal";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import api from "../api/axios";

const DEFAULT_OFFICES = [
  {
    id: "1",
    name: "Headquarters (HQ)",
    address: "Nagavarapalya, Bengaluru",
    latitude: 12.9866,
    longitude: 77.6663,
    radiusKm: 2.0,
  },
];

const Settings = () => {
  const { user } = useAuth();

  const isAdmin =
    user?.role === "ADMIN" ||
    user?.role === "admin" ||
    user?.user?.role === "ADMIN";

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // Admin Office Locations State
  const [offices, setOffices] = useState(() => {
    try {
      const saved = localStorage.getItem("OFFICE_LOCATIONS");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_OFFICES;
  });

  const [showAddOffice, setShowAddOffice] = useState(false);
  const [newOffice, setNewOffice] = useState({
    name: "",
    address: "",
    latitude: "",
    longitude: "",
    radiusKm: 2.0,
  });
  const [gettingLocation, setGettingLocation] = useState(false);

  const fetchProfile = async () => {
    try {
      const res = await api.get("/profile");
      const profile = res.data;
      if (profile) setProfile(profile);
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [user]);

  // Save Offices to LocalStorage
  const saveOffices = (updatedOffices) => {
    setOffices(updatedOffices);
    localStorage.setItem("OFFICE_LOCATIONS", JSON.stringify(updatedOffices));
  };

  const handleAddOffice = (e) => {
    e.preventDefault();

    if (!newOffice.name || !newOffice.latitude || !newOffice.longitude) {
      toast.error("Please provide Name, Latitude, and Longitude");
      return;
    }

    const officeObj = {
      id: String(Date.now()),
      name: newOffice.name,
      address: newOffice.address || "Office location",
      latitude: Number(newOffice.latitude),
      longitude: Number(newOffice.longitude),
      radiusKm: Number(newOffice.radiusKm || 2.0),
    };

    const updated = [...offices, officeObj];
    saveOffices(updated);
    toast.success("Office location added successfully");

    setNewOffice({ name: "", address: "", latitude: "", longitude: "", radiusKm: 2.0 });
    setShowAddOffice(false);
  };

  const handleDeleteOffice = (id) => {
    if (offices.length <= 1) {
      toast.error("At least one office location must remain active");
      return;
    }

    const updated = offices.filter((o) => o.id !== id);
    saveOffices(updated);
    toast.success("Office location removed");
  };

  const handleDetectCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setNewOffice((prev) => ({
          ...prev,
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6),
        }));
        toast.success("Current GPS coordinates detected!");
        setGettingLocation(false);
      },
      (err) => {
        console.error(err);
        toast.error("Failed to detect location. Ensure GPS is enabled.");
        setGettingLocation(false);
      },
      { enableHighAccuracy: true }
    );
  };

  if (loading) return <Loading />;

  return (
    <div className="animate-fade-in-up space-y-8">
      {/* Header with Left-to-Right Title Slide Animation */}
      <div className="page-header">
        <h1 className="page-title animate-title-slide">Settings</h1>
        <p className="page-subtitle">Manage your account and preferences</p>
      </div>

      {profile && <ProfileForm initialData={profile} onSuccess={fetchProfile} />}

      {/* ADMIN: OFFICE LOCATIONS & GEOFENCING SECTION */}
      {isAdmin && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-indigo-100 p-2.5 text-indigo-600">
                <Building2 size={22} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Office Locations & Geofencing
                </h2>
                <p className="text-xs text-slate-500">
                  Employees must be within the set radius (default 2 km) of an office to Clock In.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowAddOffice(!showAddOffice)}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 cursor-pointer"
            >
              <Plus size={18} />
              Add Office Location
            </button>
          </div>

          {/* Add Office Form */}
          {showAddOffice && (
            <form onSubmit={handleAddOffice} className="mb-6 rounded-xl bg-slate-50 p-5 border border-slate-200 space-y-4">
              <h3 className="text-sm font-bold text-slate-800">New Office Details</h3>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Office Name *
                  </label>
                  <input
                    value={newOffice.name}
                    onChange={(e) => setNewOffice({ ...newOffice, name: e.target.value })}
                    placeholder="e.g. Headquarters / Branch Office"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Address
                  </label>
                  <input
                    value={newOffice.address}
                    onChange={(e) => setNewOffice({ ...newOffice, address: e.target.value })}
                    placeholder="City / Street address"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Latitude *
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={newOffice.latitude}
                    onChange={(e) => setNewOffice({ ...newOffice, latitude: e.target.value })}
                    placeholder="e.g. 12.9866"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Longitude *
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={newOffice.longitude}
                    onChange={(e) => setNewOffice({ ...newOffice, longitude: e.target.value })}
                    placeholder="e.g. 77.6663"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Allowed Radius (km)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={newOffice.radiusKm}
                    onChange={(e) => setNewOffice({ ...newOffice, radiusKm: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={handleDetectCurrentLocation}
                    disabled={gettingLocation}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-60 cursor-pointer"
                  >
                    <Crosshair size={15} />
                    {gettingLocation ? "Detecting GPS..." : "Use My Current GPS"}
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddOffice(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white hover:bg-indigo-700 cursor-pointer"
                >
                  Save Office Location
                </button>
              </div>
            </form>
          )}

          {/* List of Configured Office Locations */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {offices.map((off) => (
              <div
                key={off.id}
                className="flex items-start justify-between rounded-xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <MapPin size={16} className="text-indigo-600" />
                    <h4 className="font-semibold text-slate-900 text-sm">{off.name}</h4>
                  </div>
                  <p className="text-xs text-slate-500">{off.address}</p>
                  <p className="text-[11px] font-mono text-slate-600">
                    GPS: {off.latitude}, {off.longitude}
                  </p>
                  <span className="inline-block mt-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                    Radius: {off.radiusKm || 2.0} km
                  </span>
                </div>

                <button
                  onClick={() => handleDeleteOffice(off.id)}
                  className="text-slate-400 hover:text-rose-600 transition cursor-pointer"
                  title="Remove office"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Change Password Trigger */}
      <div className="card max-w-md p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <Lock className="w-5 h-5 text-slate-600" />
          </div>

          <div>
            <p className="font-medium text-slate-900">Password</p>
            <p className="text-sm text-slate-500">Update your account password</p>
          </div>
        </div>

        <button
          onClick={() => setShowPasswordModal(true)}
          className="btn-secondary text-sm cursor-pointer"
        >
          Change
        </button>
      </div>

      <ChangePasswordModal open={showPasswordModal} onClose={() => setShowPasswordModal(false)} />
    </div>
  );
};

export default Settings;