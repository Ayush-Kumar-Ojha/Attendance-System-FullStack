import {
    useState,
    useEffect,
    useCallback,
    useMemo,
} from "react";

import {
    Plus,
    MessagesSquare,
    Search,
    ShieldAlert,
    Ban,
    MessageSquareOff,
} from "lucide-react";

import api from "../api/axios";
import toast from "react-hot-toast";

import Loading from "../components/Loading";

import PostCard from "../components/walls/PostCard";
import CreatePostModal from "../components/walls/CreatePostModal";
import EmployeeProfileModal from "../components/walls/EmployeeProfileModal";
import DMPanel from "../components/walls/DMPanel";
import BlockedChatsModal from "../components/walls/BlockedChatsModal";
import RestrictedPostersModal from "../components/walls/RestrictedPostersModal";

import { useDepartments } from "../hooks/useDepartments";
import { useAuth } from "../context/AuthContext";

const Walls = () => {
    const { user } = useAuth();
    const isAdmin = user?.role === "ADMIN";

    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);

    const [showModal, setShowModal] = useState(false);
    const [showBlockedChatsModal, setShowBlockedChatsModal] = useState(false);
    const [showRestrictedPostersModal, setShowRestrictedPostersModal] = useState(false);

    const [profileEmployeeId, setProfileEmployeeId] = useState(null);
    const [targetRestrictUser, setTargetRestrictUser] = useState(null);

    const [searchTerm, setSearchTerm] = useState("");
    const [filterDept, setFilterDept] = useState("");

    const [postingRestriction, setPostingRestriction] = useState({
        isBlockedNow: false,
        blockType: "NONE",
        blockedUntil: null,
        reason: "",
    });

    const { departments } = useDepartments();

    const fetchPosts = useCallback(async () => {
        try {
            const response = await api.get("/posts");
            setPosts(response.data.data || []);
        } catch (error) {
            toast.error(error?.response?.data?.error || "Failed to load posts");
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchPostingRestriction = useCallback(async () => {
        if (isAdmin) return;

        try {
            const response = await api.get("/posts/user-restriction");
            setPostingRestriction(response.data);
        } catch (error) {
            console.error("Restriction status fetch error:", error);
        }
    }, [isAdmin]);

    useEffect(() => {
        fetchPosts();
        fetchPostingRestriction();
    }, [fetchPosts, fetchPostingRestriction]);

    const filteredPosts = useMemo(() => {
        return posts.filter((post) => {
            if (filterDept && post.author.department !== filterDept) {
                return false;
            }

            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                const text = post.text?.toLowerCase() || "";
                const author = post.author.name?.toLowerCase() || "";

                if (!text.includes(term) && !author.includes(term)) {
                    return false;
                }
            }

            return true;
        });
    }, [posts, searchTerm, filterDept]);

    const handleAuthorClick = (author) => {
        if (isAdmin && author.role === "EMPLOYEE") {
            setTargetRestrictUser(author);
        } else if (author.role === "EMPLOYEE") {
            setProfileEmployeeId(author.id);
        }
    };

    const handleCreatePostClick = () => {
        if (!isAdmin && postingRestriction.isBlockedNow) {
            if (postingRestriction.blockType === "PERMANENT") {
                toast.error("Your posting privileges have been permanently restricted by Admin.");
            } else if (postingRestriction.blockType === "TEMPORARY") {
                const untilStr = postingRestriction.blockedUntil
                    ? new Date(postingRestriction.blockedUntil).toLocaleString("en-IN")
                    : "";
                toast.error(`Posting is temporarily restricted by Admin until ${untilStr}.`);
            }
            return;
        }

        setShowModal(true);
    };

    if (loading) {
        return <Loading />;
    }

    return (
        <div className="animate-fade-in pb-6">
            {/* WALLS HEADER */}
            <div className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-500 rounded-2xl px-6 py-5 sm:px-7 sm:py-6 mb-5 relative overflow-hidden">
                <div className="absolute -top-10 -right-10 w-44 h-44 bg-white/10 rounded-full blur-2xl" />
                <div className="absolute -bottom-16 -left-10 w-48 h-48 bg-white/10 rounded-full blur-2xl" />

                <div className="relative flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">
                            Walls
                        </h1>
                        <p className="text-indigo-100 text-sm mt-1">
                            See what's happening across the team
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
                        {/* ADMIN MANAGEMENT BUTTONS (LEFT OF CREATE POST) */}
                        {isAdmin && (
                            <>
                                <button
                                    onClick={() => setShowBlockedChatsModal(true)}
                                    className="bg-white/15 hover:bg-white/25 text-white font-medium px-3.5 py-2.5 rounded-xl flex items-center gap-2 text-xs transition-colors backdrop-blur-sm shadow-sm cursor-pointer"
                                >
                                    <MessageSquareOff className="w-4 h-4 text-rose-200" />
                                    Blocked Chats
                                </button>

                                <button
                                    onClick={() => setShowRestrictedPostersModal(true)}
                                    className="bg-white/15 hover:bg-white/25 text-white font-medium px-3.5 py-2.5 rounded-xl flex items-center gap-2 text-xs transition-colors backdrop-blur-sm shadow-sm cursor-pointer"
                                >
                                    <Ban className="w-4 h-4 text-amber-200" />
                                    Posting Restrictions
                                </button>
                            </>
                        )}

                        <button
                            onClick={handleCreatePostClick}
                            className="bg-white text-indigo-600 hover:bg-indigo-50 font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2 justify-center transition-colors shadow-lg cursor-pointer text-sm"
                        >
                            <Plus className="w-4 h-4" />
                            Create Post
                        </button>
                    </div>
                </div>
            </div>

            {/* Posting Restriction Notice Banner for Employee */}
            {!isAdmin && postingRestriction.isBlockedNow && (
                <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 flex items-start gap-3 text-rose-800 text-sm">
                    <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                        <p className="font-semibold text-rose-900">
                            Posting Privilege Restricted
                        </p>
                        <p className="mt-0.5 text-xs">
                            {postingRestriction.blockType === "PERMANENT"
                                ? "Admin has permanently disabled posting for your account."
                                : `Admin has temporarily suspended your posting privileges until ${
                                      postingRestriction.blockedUntil
                                          ? new Date(postingRestriction.blockedUntil).toLocaleString("en-IN")
                                          : "further notice"
                                  }.`}
                        </p>
                    </div>
                </div>
            )}

            {/* FEED & MESSAGE PANEL */}
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_420px] xl:grid-cols-[minmax(0,1fr)_440px] gap-5">
                <div className="min-w-0">
                    <div className="flex flex-col sm:flex-row gap-3 mb-5">
                        <div className="relative flex-1">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                            <input
                                placeholder="Search posts or people..."
                                className="w-full pl-10"
                                value={searchTerm}
                                onChange={(event) => setSearchTerm(event.target.value)}
                            />
                        </div>

                        <select
                            value={filterDept}
                            onChange={(event) => setFilterDept(event.target.value)}
                            className="sm:w-48"
                        >
                            <option value="">All Departments</option>
                            {departments.map((department) => (
                                <option key={department} value={department}>
                                    {department}
                                </option>
                            ))}
                        </select>
                    </div>

                    {filteredPosts.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-dashed border-indigo-200 p-12 text-center text-slate-400">
                            <MessagesSquare className="w-10 h-10 mx-auto mb-3 text-indigo-200" />
                            {posts.length === 0
                                ? "No posts yet — be the first to share something!"
                                : "No posts match your search"}
                        </div>
                    ) : (
                        <div className="space-y-5">
                            {filteredPosts.map((post) => (
                                <PostCard
                                    key={post.id}
                                    post={post}
                                    onUpdate={fetchPosts}
                                    onAuthorClick={handleAuthorClick}
                                />
                            ))}
                        </div>
                    )}
                </div>

                <aside className="hidden lg:block min-w-0">
                    <DMPanel />
                </aside>
            </div>

            <CreatePostModal
                open={showModal}
                onClose={() => setShowModal(false)}
                onSuccess={fetchPosts}
            />

            <EmployeeProfileModal
                employeeId={profileEmployeeId}
                onClose={() => setProfileEmployeeId(null)}
            />

            <RestrictedPostersModal
                open={Boolean(targetRestrictUser)}
                onClose={() => setTargetRestrictUser(null)}
                targetUser={targetRestrictUser}
                onSuccess={fetchPosts}
            />

            <BlockedChatsModal
                open={showBlockedChatsModal}
                onClose={() => setShowBlockedChatsModal(false)}
                onUpdate={fetchPosts}
            />

            <RestrictedPostersModal
                open={showRestrictedPostersModal}
                onClose={() => setShowRestrictedPostersModal(false)}
                onUpdate={fetchPosts}
            />
        </div>
    );
};

export default Walls;