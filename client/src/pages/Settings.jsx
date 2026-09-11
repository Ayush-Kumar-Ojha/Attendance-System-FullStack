import { useEffect, useState } from "react";
import {
  Lock,
  MapPin,
  Plus,
  Trash2,
  Crosshair,
  Building2,
  FileText,
  Upload,
  Download,
  FolderOpen,
} from "lucide-react";

import Loading from "../components/Loading";
import ProfileForm from "../components/ProfileForm";
import ChangePasswordModal from "../components/ChangePasswordModal";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import api from "../api/axios";

const DEFAULT_OFFICES = [];

const Settings = () => {
  const { user } = useAuth();

  const isAdmin =
    user?.role === "ADMIN" ||
    user?.role === "admin" ||
    user?.user?.role === "ADMIN";

  const [profile, setProfile] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [
    showPasswordModal,
    setShowPasswordModal,
  ] = useState(false);

  // ============================================================
  // ATTACHED DOCUMENTS STATE
  // Employee only
  // ============================================================

  const [docName, setDocName] =
    useState("");

  const [docFile, setDocFile] =
    useState(null);

  const [
    uploadingDoc,
    setUploadingDoc,
  ] = useState(false);

  // ============================================================
  // ADMIN EMPLOYEE DOCUMENTS EXPLORER STATE
  // ============================================================

  const [
    allEmployees,
    setAllEmployees,
  ] = useState([]);

  const [
    selectedEmpId,
    setSelectedEmpId,
  ] = useState("");

  const [
    selectedEmpDocs,
    setSelectedEmpDocs,
  ] = useState([]);

  const [
    loadingEmpDocs,
    setLoadingEmpDocs,
  ] = useState(false);

  // ============================================================
  // ADMIN OFFICE LOCATIONS STATE
  // ============================================================

  const [offices, setOffices] =
    useState(() => {
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
      } catch (e) {
        console.error(e);
      }

      return [];
    });

  const [
    showAddOffice,
    setShowAddOffice,
  ] = useState(false);

  const [
    newOffice,
    setNewOffice,
  ] = useState({
    name: "",
    address: "",
    latitude: "",
    longitude: "",
    radiusKm: 2.0,
  });

  const [
    gettingLocation,
    setGettingLocation,
  ] = useState(false);

  // ============================================================
  // FETCH PROFILE
  // ============================================================

  const fetchProfile = async () => {
    try {
      const res =
        await api.get("/profile");

      const profile =
        res.data;

      if (profile) {
        setProfile(profile);
      }
    } catch (err) {
      toast.error(
        err?.response?.data?.error ||
        err?.message
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [user]);

  // ============================================================
  // LOAD EMPLOYEE LIST FOR ADMIN DOCUMENT EXPLORER
  // ============================================================

  useEffect(() => {
    if (isAdmin) {
      api
        .get("/employees")
        .then((res) => {
          const list =
            Array.isArray(res.data)
              ? res.data
              : [];

          setAllEmployees(
            list.filter(
              (e) => !e.isDeleted
            )
          );
        })
        .catch((err) =>
          console.error(err)
        );
    }
  }, [isAdmin]);

  // ============================================================
  // ADMIN: FETCH SELECTED EMPLOYEE DOCUMENTS
  // ============================================================

  const fetchEmployeeDocs =
    async (empId) => {
      if (!empId) {
        setSelectedEmpDocs(
          []
        );

        return;
      }

      setLoadingEmpDocs(
        true
      );

      try {
        const res =
          await api.get(
            `/employees/${empId}/documents`
          );

        setSelectedEmpDocs(
          res.data?.documents ||
          []
        );
      } catch (err) {
        toast.error(
          "Failed to load documents for employee"
        );
      } finally {
        setLoadingEmpDocs(
          false
        );
      }
    };

  // ============================================================
  // EMPLOYEE: UPLOAD DOCUMENT
  // ============================================================

  const handleUploadDocument =
    async (e) => {
      e.preventDefault();

      if (
        !docName.trim() ||
        !docFile
      ) {
        toast.error(
          "Please provide a document title and file"
        );

        return;
      }

      setUploadingDoc(true);

      const formData =
        new FormData();

      formData.append(
        "documentName",
        docName.trim()
      );

      // Using "cv" matches
      // Multer's allowed upload field.
      formData.append(
        "cv",
        docFile
      );

      try {
        await api.post(
          "/profile",
          formData,
          {
            headers: {
              "Content-Type":
                "multipart/form-data",
            },
          }
        );

        toast.success(
          "Document attached successfully!"
        );

        setDocName("");
        setDocFile(null);

        fetchProfile();
      } catch (err) {
        toast.error(
          err?.response?.data
            ?.error ||
          err?.message ||
          "Failed to upload document"
        );
      } finally {
        setUploadingDoc(
          false
        );
      }
    };

  // ============================================================
  // EMPLOYEE: DELETE DOCUMENT
  // ============================================================

  const handleDeleteDocument =
    async (docId) => {
      if (!docId) {
        toast.error(
          "Invalid document"
        );

        return;
      }

      try {
        await api.delete(
          `/profile/documents/${docId}`
        );

        // Remove immediately
        // from profile state.
        setProfile((prev) => {
          if (!prev) {
            return prev;
          }

          return {
            ...prev,

            documents: (
              prev.documents ||
              []
            ).filter(
              (doc) =>
                String(
                  doc._id
                ) !==
                String(docId)
            ),
          };
        });

        toast.success(
          "Document removed successfully"
        );
      } catch (error) {
        console.error(
          "Delete document error:",
          error
        );

        toast.error(
          error.response?.data
            ?.error ||
          error.message ||
          "Failed to remove document"
        );
      }
    };

  // ============================================================
  // SAVE OFFICES
  // ============================================================

  const saveOffices = (
    updatedOffices
  ) => {
    setOffices(
      updatedOffices
    );

    localStorage.setItem(
      "OFFICE_LOCATIONS",
      JSON.stringify(
        updatedOffices
      )
    );
  };

  // ============================================================
  // ADD OFFICE
  // ============================================================

  const handleAddOffice = (
    e
  ) => {
    e.preventDefault();

    if (
      !newOffice.name ||
      !newOffice.latitude ||
      !newOffice.longitude
    ) {
      toast.error(
        "Please provide Name, Latitude, and Longitude"
      );

      return;
    }

    const officeObj = {
      id: String(
        Date.now()
      ),

      name:
        newOffice.name,

      address:
        newOffice.address ||
        "Office location",

      latitude: Number(
        newOffice.latitude
      ),

      longitude: Number(
        newOffice.longitude
      ),

      radiusKm: Number(
        newOffice.radiusKm ||
        2.0
      ),
    };

    const updated = [
      ...offices,
      officeObj,
    ];

    saveOffices(updated);

    toast.success(
      "Office location added successfully"
    );

    setNewOffice({
      name: "",
      address: "",
      latitude: "",
      longitude: "",
      radiusKm: 2.0,
    });

    setShowAddOffice(
      false
    );
  };

  // ============================================================
  // DELETE OFFICE
  // ============================================================

  const handleDeleteOffice = (
    id
  ) => {
    const updated =
      offices.filter(
        (o) => o.id !== id
      );

    saveOffices(updated);

    if (
      updated.length === 0
    ) {
      toast.success(
        "All office locations removed. Geofencing is now disabled."
      );
    } else {
      toast.success(
        "Office location removed"
      );
    }
  };

  // ============================================================
  // DETECT CURRENT LOCATION
  // ============================================================

  const handleDetectCurrentLocation =
    () => {
      if (
        !navigator.geolocation
      ) {
        toast.error(
          "Geolocation is not supported by your browser"
        );

        return;
      }

      setGettingLocation(
        true
      );

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setNewOffice(
            (prev) => ({
              ...prev,

              latitude:
                pos.coords.latitude.toFixed(
                  6
                ),

              longitude:
                pos.coords.longitude.toFixed(
                  6
                ),
            })
          );

          toast.success(
            "Current GPS coordinates detected!"
          );

          setGettingLocation(
            false
          );
        },

        (err) => {
          console.error(
            err
          );

          toast.error(
            "Failed to detect location. Ensure GPS is enabled."
          );

          setGettingLocation(
            false
          );
        },

        {
          enableHighAccuracy:
            true,
        }
      );
    };

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return <Loading />;
  }

  // ============================================================
  // UI
  // ============================================================

  return (
    <div className="animate-fade-in space-y-8 pb-12">

      {/* ========================================================
          PAGE HEADER
      ======================================================== */}

      <div className="page-header">
        <h1 className="page-title">
          Settings
        </h1>

        <p className="page-subtitle">
          Manage your account,
          documents, and
          preferences
        </p>
      </div>

      {/* ========================================================
          PROFILE
      ======================================================== */}

      {profile && (
        <ProfileForm
          initialData={
            profile
          }
          onSuccess={
            fetchProfile
          }
        />
      )}

      {/* ========================================================
          EMPLOYEE ONLY:
          MY ATTACHED DOCUMENTS

          ADMIN DOES NOT SEE THIS SECTION
      ======================================================== */}

      {!isAdmin && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

          {/* HEADER */}

          <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-4">

            <div className="rounded-xl bg-indigo-100 p-2.5 text-indigo-600">
              <FileText
                size={22}
              />
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-900">
                My Attached
                Documents
              </h2>

              <p className="text-xs text-slate-500">
                Upload multiple
                official documents
                (Aadhaar, PAN,
                Certificates,
                Resumes,
                Passports)
              </p>
            </div>
          </div>

          {/* ====================================================
              UPLOAD FORM
          ==================================================== */}

          <form
            onSubmit={
              handleUploadDocument
            }
            className="mb-6 grid grid-cols-1 items-end gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-3"
          >

            {/* DOCUMENT NAME */}

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Document Name /
                Title *
              </label>

              <input
                type="text"
                value={
                  docName
                }
                onChange={(
                  e
                ) =>
                  setDocName(
                    e.target
                      .value
                  )
                }
                placeholder="e.g. Aadhaar Card / Degree Certificate"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500"
                required
              />
            </div>

            {/* FILE */}

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Select File *
              </label>

              <input
                type="file"
                onChange={(
                  e
                ) =>
                  setDocFile(
                    e.target
                      .files[0]
                  )
                }
                className="w-full text-xs text-slate-500 file:mr-3 file:rounded-xl file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100"
                required
              />
            </div>

            {/* ATTACH */}

            <button
              type="submit"
              disabled={
                uploadingDoc
              }
              className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
            >
              <Upload
                size={16}
              />

              {uploadingDoc
                ? "Uploading..."
                : "Attach Document"}
            </button>
          </form>

          {/* ====================================================
              ATTACHED DOCUMENT LIST
          ==================================================== */}

          {!profile?.documents ||
            profile.documents
              .length === 0 ? (
            <p className="py-4 text-center text-xs text-slate-400">
              No extra documents
              attached yet.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

              {profile.documents.map(
                (doc) => (
                  <div
                    key={
                      doc._id ||
                      doc.name
                    }
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3.5"
                  >

                    {/* DOCUMENT INFO */}

                    <div className="flex min-w-0 items-center gap-3">

                      <div className="shrink-0 rounded-lg bg-indigo-50 p-2 text-indigo-600">
                        <FileText
                          size={
                            18
                          }
                        />
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-800">
                          {
                            doc.name
                          }
                        </p>

                        <p className="truncate text-[11px] text-slate-400">
                          {
                            doc.fileName
                          }
                        </p>
                      </div>
                    </div>

                    {/* ACTIONS */}

                    <div className="flex items-center gap-2">

                      <a
                        href={
                          doc.fileUrl
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg p-1.5 text-indigo-600 transition hover:bg-indigo-50"
                        title="Download document"
                      >
                        <Download
                          size={
                            16
                          }
                        />
                      </a>

                      <button
                        type="button"
                        onClick={() =>
                          handleDeleteDocument(
                            doc._id
                          )
                        }
                        className="rounded-lg p-1.5 text-slate-400 transition hover:text-rose-600"
                        title="Delete document"
                      >
                        <Trash2
                          size={
                            16
                          }
                        />
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          ADMIN: EMPLOYEE DOCUMENTS EXPLORER

          Admin can VIEW / DOWNLOAD employee documents,
          but cannot attach their own documents here.
      ======================================================== */}

      {isAdmin && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

          {/* HEADER */}

          <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-4">

            <div className="rounded-xl bg-indigo-100 p-2.5 text-indigo-600">
              <FolderOpen
                size={22}
              />
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Employee
                Documents Explorer
              </h2>

              <p className="text-xs text-slate-500">
                Select any employee
                to view and download
                all their uploaded
                documents.              </p>
            </div>
          </div>

          {/* EMPLOYEE SELECT */}

          <div className="mb-6 max-w-md">

            <label className="mb-2 block text-xs font-semibold text-slate-700">
              Select Employee
            </label>

            <select
              value={
                selectedEmpId
              }
              onChange={(
                e
              ) => {
                setSelectedEmpId(
                  e.target
                    .value
                );

                fetchEmployeeDocs(
                  e.target
                    .value
                );
              }}
              className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm outline-none focus:border-indigo-500"
            >
              <option value="">
                -- Choose an
                Employee --
              </option>

              {allEmployees.map(
                (emp) => (
                  <option
                    key={
                      emp._id ||
                      emp.id
                    }
                    value={
                      emp._id ||
                      emp.id
                    }
                  >
                    {
                      emp.firstName
                    }{" "}
                    {
                      emp.lastName
                    }{" "}
                    (
                    {
                      emp.employeeCode
                    }
                    )
                  </option>
                )
              )}
            </select>
          </div>

          {/* DOCUMENTS */}

          {selectedEmpId && (
            <div>

              {loadingEmpDocs ? (
                <p className="text-xs text-slate-400">
                  Loading
                  documents...
                </p>
              ) : selectedEmpDocs.length ===
                0 ? (
                <p className="py-4 text-xs text-slate-400">
                  No documents
                  uploaded by this
                  employee.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

                  {selectedEmpDocs.map(
                    (doc) => (
                      <div
                        key={
                          doc._id ||
                          doc.name
                        }
                        className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3.5"
                      >

                        {/* DOCUMENT */}

                        <div className="flex min-w-0 items-center gap-3">

                          <div className="shrink-0 rounded-lg bg-indigo-100 p-2 text-indigo-700">
                            <FileText
                              size={
                                18
                              }
                            />
                          </div>

                          <div className="min-w-0">

                            <p className="truncate text-sm font-semibold text-slate-800">
                              {
                                doc.name
                              }
                            </p>

                            <p className="truncate text-[11px] text-slate-400">
                              {
                                doc.fileName
                              }
                            </p>
                          </div>
                        </div>

                        {/* DOWNLOAD */}

                        <a
                          href={
                            doc.fileUrl
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-700"
                        >
                          <Download
                            size={
                              14
                            }
                          />

                          Download
                        </a>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          ADMIN:
          OFFICE LOCATIONS & GEOFENCING
      ======================================================== */}

      {isAdmin && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

          {/* HEADER */}

          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

            <div className="flex items-center gap-3">

              <div className="rounded-xl bg-indigo-100 p-2.5 text-indigo-600">
                <Building2
                  size={
                    22
                  }
                />
              </div>

              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Office Locations
                  & Geofencing
                </h2>

                <p className="text-xs text-slate-500">
                  Employees must be
                  within the set
                  radius (default 2
                  km) of an office
                  to Clock In.
                </p>
              </div>
            </div>

            <button
              onClick={() =>
                setShowAddOffice(
                  !showAddOffice
                )
              }
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
            >
              <Plus
                size={18}
              />

              Add Office Location
            </button>
          </div>

          {/* ====================================================
              ADD OFFICE FORM
          ==================================================== */}

          {showAddOffice && (
            <form
              onSubmit={
                handleAddOffice
              }
              className="mb-6 space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-5"
            >

              <h3 className="text-sm font-bold text-slate-800">
                New Office
                Details
              </h3>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                {/* OFFICE NAME */}

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Office Name *
                  </label>

                  <input
                    value={
                      newOffice.name
                    }
                    onChange={(
                      e
                    ) =>
                      setNewOffice(
                        {
                          ...newOffice,

                          name:
                            e
                              .target
                              .value,
                        }
                      )
                    }
                    placeholder="e.g. Headquarters / Branch Office"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                    required
                  />
                </div>

                {/* ADDRESS */}

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Address
                  </label>

                  <input
                    value={
                      newOffice.address
                    }
                    onChange={(
                      e
                    ) =>
                      setNewOffice(
                        {
                          ...newOffice,

                          address:
                            e
                              .target
                              .value,
                        }
                      )
                    }
                    placeholder="City / Street address"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                  />
                </div>

                {/* LATITUDE */}

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Latitude *
                  </label>

                  <input
                    type="number"
                    step="any"
                    value={
                      newOffice.latitude
                    }
                    onChange={(
                      e
                    ) =>
                      setNewOffice(
                        {
                          ...newOffice,

                          latitude:
                            e
                              .target
                              .value,
                        }
                      )
                    }
                    placeholder="e.g. 12.9866"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                    required
                  />
                </div>

                {/* LONGITUDE */}

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Longitude *
                  </label>

                  <input
                    type="number"
                    step="any"
                    value={
                      newOffice.longitude
                    }
                    onChange={(
                      e
                    ) =>
                      setNewOffice(
                        {
                          ...newOffice,

                          longitude:
                            e
                              .target
                              .value,
                        }
                      )
                    }
                    placeholder="e.g. 77.6663"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                    required
                  />
                </div>

                {/* RADIUS */}

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Allowed Radius
                    (km)
                  </label>

                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={
                      newOffice.radiusKm
                    }
                    onChange={(
                      e
                    ) =>
                      setNewOffice(
                        {
                          ...newOffice,

                          radiusKm:
                            e
                              .target
                              .value,
                        }
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                  />
                </div>

                {/* GPS */}

                <div className="flex items-end">

                  <button
                    type="button"
                    onClick={
                      handleDetectCurrentLocation
                    }
                    disabled={
                      gettingLocation
                    }
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-60"
                  >
                    <Crosshair
                      size={
                        15
                      }
                    />

                    {gettingLocation
                      ? "Detecting GPS..."
                      : "Use My Current GPS"}
                  </button>
                </div>
              </div>

              {/* FORM BUTTONS */}

              <div className="flex justify-end gap-3 pt-2">

                <button
                  type="button"
                  onClick={() =>
                    setShowAddOffice(
                      false
                    )
                  }
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
                >
                  Save Office
                  Location
                </button>
              </div>
            </form>
          )}

          {/* ====================================================
              OFFICE LIST
          ==================================================== */}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

            {offices.map(
              (off) => (
                <div
                  key={
                    off.id
                  }
                  className="flex items-start justify-between rounded-xl border border-slate-200 bg-slate-50 p-4"
                >

                  <div className="space-y-1">

                    <div className="flex items-center gap-2">

                      <MapPin
                        size={
                          16
                        }
                        className="text-indigo-600"
                      />

                      <h4 className="text-sm font-semibold text-slate-900">
                        {
                          off.name
                        }
                      </h4>
                    </div>

                    <p className="text-xs text-slate-500">
                      {
                        off.address
                      }
                    </p>

                    <p className="font-mono text-[11px] text-slate-600">
                      GPS:{" "}
                      {
                        off.latitude
                      }
                      ,{" "}
                      {
                        off.longitude
                      }
                    </p>

                    <span className="mt-1 inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                      Radius:{" "}
                      {off.radiusKm ||
                        2.0}{" "}
                      km
                    </span>
                  </div>

                  <button
                    onClick={() =>
                      handleDeleteOffice(
                        off.id
                      )
                    }
                    className="text-slate-400 transition hover:text-rose-600"
                    title="Remove office"
                  >
                    <Trash2
                      size={
                        16
                      }
                    />
                  </button>
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          CHANGE PASSWORD
      ======================================================== */}

      <div className="card flex max-w-md items-center justify-between p-6">

        <div className="flex items-center gap-3">

          <div>
            <Lock className="h-5 w-5 text-slate-600" />
          </div>

          <div>
            <p className="font-medium text-slate-900">
              Password
            </p>

            <p className="text-sm text-slate-500">
              Update your account
              password
            </p>
          </div>
        </div>

        <button
          onClick={() =>
            setShowPasswordModal(
              true
            )
          }
          className="btn-secondary text-sm"
        >
          Change
        </button>
      </div>

      {/* ========================================================
          CHANGE PASSWORD MODAL
      ======================================================== */}

      <ChangePasswordModal
        open={
          showPasswordModal
        }
        onClose={() =>
          setShowPasswordModal(
            false
          )
        }
      />
    </div>
  );
};

export default Settings;