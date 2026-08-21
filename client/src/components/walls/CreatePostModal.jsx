import { useState, useRef, useEffect } from "react";
import { X, Image as ImageIcon, Loader2, Users } from "lucide-react";
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import { useDepartments } from "../../hooks/useDepartments";

const CreatePostModal = ({ open, onClose, onSuccess }) => {
    const { user } = useAuth();
    const isAdmin = user?.role === "ADMIN";
    const { departments } = useDepartments();

    const [text, setText] = useState("");
    const [imageFiles, setImageFiles] = useState([]);
    const [imagePreviews, setImagePreviews] = useState([]);
    const [posting, setPosting] = useState(false);
    const fileInputRef = useRef(null);

    const [audienceType, setAudienceType] = useState("EVERYONE");
    const [selectedDepartments, setSelectedDepartments] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]);

    useEffect(() => {
        if (isAdmin && open) {
            api.get("/employees").then((res) => setEmployees(res.data.filter((e) => !e.isDeleted))).catch(() => { });
        }
    }, [isAdmin, open]);

    if (!open) return null;

    const handleImageChange = (e) => {
        const files = Array.from(e.target.files).slice(0, 5 - imageFiles.length);
        if (files.length === 0) return;
        setImageFiles((prev) => [...prev, ...files]);
        setImagePreviews((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))]);
    };

    const removeImage = (index) => {
        setImageFiles((prev) => prev.filter((_, i) => i !== index));
        setImagePreviews((prev) => prev.filter((_, i) => i !== index));
    };

    const toggleDepartment = (dept) => {
        setSelectedDepartments((prev) => prev.includes(dept) ? prev.filter((d) => d !== dept) : [...prev, dept]);
    };

    const toggleEmployee = (id) => {
        setSelectedEmployeeIds((prev) => prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]);
    };

    const audiencePreview = () => {
        if (audienceType === "EVERYONE") return "Visible to everyone";
        if (audienceType === "DEPARTMENT") {
            if (selectedDepartments.length === 0) return "Select at least one department";
            const count = employees.filter((e) => selectedDepartments.includes(e.department)).length;
            return `Visible to ${count} employee${count !== 1 ? "s" : ""} in ${selectedDepartments.join(", ")}`;
        }
        if (audienceType === "SPECIFIC") {
            return `Visible to ${selectedEmployeeIds.length} selected employee${selectedEmployeeIds.length !== 1 ? "s" : ""}`;
        }
        return "";
    };

    const resetForm = () => {
        setText(""); setImageFiles([]); setImagePreviews([]);
        setAudienceType("EVERYONE"); setSelectedDepartments([]); setSelectedEmployeeIds([]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!text.trim()) return;
        setPosting(true);

        const formData = new FormData();
        formData.append("text", text);
        imageFiles.forEach((file) => formData.append("images", file));

        if (isAdmin) {
            formData.append("audienceType", audienceType);
            if (audienceType === "DEPARTMENT") formData.append("departments", JSON.stringify(selectedDepartments));
            if (audienceType === "SPECIFIC") formData.append("employeeIds", JSON.stringify(selectedEmployeeIds));
        }

        try {
            await api.post("/posts", formData);
            resetForm();
            onSuccess();
            onClose();
        } finally {
            setPosting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto bg-slate-900/40 backdrop-blur-sm" onClick={onClose}>
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl my-6 max-h-[calc(100vh-48px)] overflow-y-auto animate-fade-in border border-indigo-100" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between p-6 pb-0">
                    <h2 className="text-lg font-semibold text-slate-900">Create Post</h2>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        rows={4}
                        maxLength={2000}
                        className="resize-none w-full"
                        placeholder="What's on your mind?"
                    />

                    <div className="flex justify-end text-[11px] text-slate-400 -mt-2">
                        {text.length}/2000
                    </div>

                    {imagePreviews.length > 0 && (
                        <div className="flex gap-2 overflow-x-auto pb-1">
                            {imagePreviews.map((src, i) => (
                                <div key={i} className="relative shrink-0">
                                    <img src={src} alt="" className="h-24 w-24 object-cover rounded-xl border border-indigo-100" />
                                    <button
                                        type="button"
                                        onClick={() => removeImage(i)}
                                        className="absolute -top-1.5 -right-1.5 bg-white border border-slate-200 rounded-full p-0.5 text-slate-500 hover:text-rose-600 shadow-sm"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageChange} />

                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={imageFiles.length >= 5}
                        className="btn-secondary text-sm flex items-center gap-2 disabled:opacity-50"
                    >
                        <ImageIcon className="w-4 h-4" />
                        Add Images ({imageFiles.length}/5)
                    </button>

                    {isAdmin && (
                        <div className="border border-indigo-100 bg-indigo-50/30 rounded-xl p-4 space-y-3">
                            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                <Users className="w-4 h-4 text-indigo-500" />
                                Audience
                            </label>

                            <select value={audienceType} onChange={(e) => setAudienceType(e.target.value)}>
                                <option value="EVERYONE">Everyone</option>
                                <option value="DEPARTMENT">Specific Departments</option>
                                <option value="SPECIFIC">Specific Employees</option>
                            </select>

                            {audienceType === "DEPARTMENT" && (
                                <div className="flex flex-wrap gap-2">
                                    {departments.map((dept) => (
                                        <button
                                            type="button"
                                            key={dept}
                                            onClick={() => toggleDepartment(dept)}
                                            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${selectedDepartments.includes(dept) ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"}`}
                                        >
                                            {dept}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {audienceType === "SPECIFIC" && (
                                <div className="max-h-40 overflow-y-auto space-y-1.5">
                                    {employees.map((emp) => (
                                        <label key={emp._id || emp.id} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={selectedEmployeeIds.includes(emp._id || emp.id)}
                                                onChange={() => toggleEmployee(emp._id || emp.id)}
                                            />
                                            {emp.firstName} {emp.lastName}
                                        </label>
                                    ))}
                                </div>
                            )}

                            <p className="text-xs text-indigo-600 font-medium">{audiencePreview()}</p>
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
                        <button type="submit" disabled={posting || !text.trim()} className="btn-primary flex-1 flex items-center justify-center gap-2">
                            {posting && <Loader2 className="w-4 h-4 animate-spin" />}
                            Post
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreatePostModal;