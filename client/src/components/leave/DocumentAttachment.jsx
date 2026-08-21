import { useState, useRef } from "react";
import { FileText, Upload, Download, Trash2, Loader2 } from "lucide-react";
import api from "../../api/axios";
import toast from "react-hot-toast";

const DocumentAttachment = ({ type, label, doc, isAdmin, onUpdate }) => {
    const [uploading, setUploading] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const fileInputRef = useRef(null);

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("file", file);

        setUploading(true);
        try {
            await api.post(`/documents/${type}`, formData);
            toast.success(`${label} uploaded`);
            onUpdate();
        } catch (err) {
            toast.error(err.response?.data?.error || err.message);
        } finally {
            setUploading(false);
            e.target.value = "";
        }
    };

    const handleDelete = async () => {
        if (!confirm(`Remove ${label}?`)) return;
        setDeleting(true);
        try {
            await api.delete(`/documents/${type}`);
            toast.success(`${label} removed`);
            onUpdate();
        } catch (err) {
            toast.error(err.response?.data?.error || err.message);
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="card p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
                <div className="p-2.5 bg-indigo-50 rounded-lg shrink-0">
                    <FileText className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{label}</p>
                    {doc ? (
                        <p className="text-xs text-slate-500 truncate">{doc.fileName}</p>
                    ) : (
                        <p className="text-xs text-slate-400">Not uploaded yet</p>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
                {doc && (
                    <a
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors border border-indigo-200"
                    >
                        <Download className="w-3.5 h-3.5" />
                        Download
                    </a>
                )}

                {isAdmin && (
                    <>
                        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            className="btn-secondary text-xs flex items-center gap-1.5 !py-1.5"
                        >
                            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                            {doc ? "Replace" : "Upload"}
                        </button>

                        {doc && (
                            <button
                                onClick={handleDelete}
                                disabled={deleting}
                                className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                            >
                                {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                            </button>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default DocumentAttachment;