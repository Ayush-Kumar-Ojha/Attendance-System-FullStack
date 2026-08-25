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
} from "lucide-react";

import api from "../api/axios";
import toast from "react-hot-toast";

import Loading from "../components/Loading";

import PostCard from "../components/walls/PostCard";
import CreatePostModal from "../components/walls/CreatePostModal";
import EmployeeProfileModal from "../components/walls/EmployeeProfileModal";
import DMPanel from "../components/walls/DMPanel";

import { useDepartments } from "../hooks/useDepartments";

const Walls = () => {
    const [posts, setPosts] =
        useState([]);

    const [loading, setLoading] =
        useState(true);

    const [showModal, setShowModal] =
        useState(false);

    const [
        profileEmployeeId,
        setProfileEmployeeId,
    ] = useState(null);

    const [searchTerm, setSearchTerm] =
        useState("");

    const [filterDept, setFilterDept] =
        useState("");

    const { departments } =
        useDepartments();

    const fetchPosts =
        useCallback(async () => {
            try {
                const response =
                    await api.get(
                        "/posts"
                    );

                setPosts(
                    response.data.data ||
                        []
                );
            } catch (error) {
                toast.error(
                    error?.response?.data
                        ?.error ||
                        "Failed to load posts"
                );
            } finally {
                setLoading(false);
            }
        }, []);

    useEffect(() => {
        fetchPosts();
    }, [fetchPosts]);

    const filteredPosts =
        useMemo(() => {
            return posts.filter(
                (post) => {
                    if (
                        filterDept &&
                        post.author
                            .department !==
                            filterDept
                    ) {
                        return false;
                    }

                    if (searchTerm) {
                        const term =
                            searchTerm.toLowerCase();

                        const text =
                            post.text
                                ?.toLowerCase() ||
                            "";

                        const author =
                            post.author.name
                                ?.toLowerCase() ||
                            "";

                        if (
                            !text.includes(
                                term
                            ) &&
                            !author.includes(
                                term
                            )
                        ) {
                            return false;
                        }
                    }

                    return true;
                }
            );
        }, [
            posts,
            searchTerm,
            filterDept,
        ]);

    const handleAuthorClick = (
        author
    ) => {
        if (
            author.role ===
            "EMPLOYEE"
        ) {
            setProfileEmployeeId(
                author.id
            );
        }
    };

    if (loading) {
        return <Loading />;
    }

    return (
        <div className="animate-fade-in pb-6">
            {/* SHORTER WALLS HEADER */}
            <div className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-500 rounded-2xl px-6 py-5 sm:px-7 sm:py-6 mb-5 relative overflow-hidden">
                <div className="absolute -top-10 -right-10 w-44 h-44 bg-white/10 rounded-full blur-2xl" />

                <div className="absolute -bottom-16 -left-10 w-48 h-48 bg-white/10 rounded-full blur-2xl" />

                <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">
                            Walls
                        </h1>

                        <p className="text-indigo-100 text-sm mt-1">
                            See what's happening across the team
                        </p>
                    </div>

                    <button
                        onClick={() =>
                            setShowModal(
                                true
                            )
                        }
                        className="bg-white text-indigo-600 hover:bg-indigo-50 font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2 w-full sm:w-auto justify-center transition-colors shadow-lg"
                    >
                        <Plus className="w-4 h-4" />

                        Create Post
                    </button>
                </div>
            </div>

            {/* WIDER MESSAGE COLUMN */}
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_420px] xl:grid-cols-[minmax(0,1fr)_440px] gap-5">
                {/* FEED */}
                <div className="min-w-0">
                    <div className="flex flex-col sm:flex-row gap-3 mb-5">
                        <div className="relative flex-1">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />

                            <input
                                placeholder="Search posts or people..."
                                className="w-full pl-10"
                                value={
                                    searchTerm
                                }
                                onChange={(
                                    event
                                ) =>
                                    setSearchTerm(
                                        event
                                            .target
                                            .value
                                    )
                                }
                            />
                        </div>

                        <select
                            value={
                                filterDept
                            }
                            onChange={(
                                event
                            ) =>
                                setFilterDept(
                                    event
                                        .target
                                        .value
                                )
                            }
                            className="sm:w-48"
                        >
                            <option value="">
                                All Departments
                            </option>

                            {departments.map(
                                (
                                    department
                                ) => (
                                    <option
                                        key={
                                            department
                                        }
                                        value={
                                            department
                                        }
                                    >
                                        {
                                            department
                                        }
                                    </option>
                                )
                            )}
                        </select>
                    </div>

                    {filteredPosts.length ===
                    0 ? (
                        <div className="bg-white rounded-2xl border border-dashed border-indigo-200 p-12 text-center text-slate-400">
                            <MessagesSquare className="w-10 h-10 mx-auto mb-3 text-indigo-200" />

                            {posts.length ===
                            0
                                ? "No posts yet — be the first to share something!"
                                : "No posts match your search"}
                        </div>
                    ) : (
                        <div className="space-y-5">
                            {filteredPosts.map(
                                (post) => (
                                    <PostCard
                                        key={
                                            post.id
                                        }
                                        post={
                                            post
                                        }
                                        onUpdate={
                                            fetchPosts
                                        }
                                        onAuthorClick={
                                            handleAuthorClick
                                        }
                                    />
                                )
                            )}
                        </div>
                    )}
                </div>

                {/* MESSAGE PANEL */}
                <aside className="hidden lg:block min-w-0">
                    <DMPanel />
                </aside>
            </div>

            <CreatePostModal
                open={showModal}
                onClose={() =>
                    setShowModal(
                        false
                    )
                }
                onSuccess={
                    fetchPosts
                }
            />

            <EmployeeProfileModal
                employeeId={
                    profileEmployeeId
                }
                onClose={() =>
                    setProfileEmployeeId(
                        null
                    )
                }
            />
        </div>
    );
};

export default Walls;