import { useState } from "react";

import {
    Heart,
    MessageCircle,
    Trash2,
    Loader2,
    Send,
    ShieldCheck,
    Repeat2,
} from "lucide-react";

import {
    formatDistanceToNow,
} from "date-fns";

import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";

const ImageGrid = ({ images = [] }) => {
    if (images.length === 0) return null;

    if (images.length === 1) {
        return (
            <div className="mb-3 rounded-xl overflow-hidden border border-slate-100">
                <img
                    src={images[0]}
                    alt=""
                    className="w-full max-h-[420px] object-cover"
                />
            </div>
        );
    }

    if (images.length === 2) {
        return (
            <div className="grid grid-cols-2 gap-1 mb-3 rounded-xl overflow-hidden border border-slate-100">
                {images.map((src, i) => (
                    <img
                        key={i}
                        src={src}
                        alt=""
                        className="w-full h-56 object-cover"
                    />
                ))}
            </div>
        );
    }

    if (images.length === 3) {
        return (
            <div className="grid grid-cols-2 gap-1 mb-3 rounded-xl overflow-hidden border border-slate-100">
                <img
                    src={images[0]}
                    alt=""
                    className="w-full h-full object-cover row-span-2"
                />

                <img
                    src={images[1]}
                    alt=""
                    className="w-full h-28 object-cover"
                />

                <img
                    src={images[2]}
                    alt=""
                    className="w-full h-28 object-cover"
                />
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 gap-1 mb-3 rounded-xl overflow-hidden border border-slate-100">
            {images.slice(0, 4).map((src, i) => (
                <div
                    key={i}
                    className="relative"
                >
                    <img
                        src={src}
                        alt=""
                        className="w-full h-40 object-cover"
                    />

                    {i === 3 &&
                        images.length > 4 && (
                            <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center text-white font-semibold text-lg">
                                +{images.length - 4}
                            </div>
                        )}
                </div>
            ))}
        </div>
    );
};

const OriginalPostPreview = ({ post }) => {
    if (!post) return null;

    return (
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
            <div className="px-4 py-3 flex items-center gap-3 border-b border-slate-200 bg-white">
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center overflow-hidden shrink-0">
                    {post.author?.image ? (
                        <img
                            src={post.author.image}
                            alt=""
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <span className="text-xs font-semibold text-indigo-600">
                            {post.author?.name?.[0]?.toUpperCase()}
                        </span>
                    )}
                </div>

                <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-800">
                        {post.author?.name}
                    </p>

                    <p className="text-[11px] text-slate-400">
                        {post.author?.position}
                        {post.author?.department
                            ? ` · ${post.author.department}`
                            : ""}
                    </p>
                </div>
            </div>

            <div className="p-4">
                <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {post.text}
                </p>

                <div className="mt-3">
                    <ImageGrid
                        images={post.images || []}
                    />
                </div>
            </div>
        </div>
    );
};

const PostCard = ({
    post,
    onUpdate,
    onAuthorClick,
}) => {
    const { user } = useAuth();

    const [showComments, setShowComments] =
        useState(false);

    const [commentText, setCommentText] =
        useState("");

    const [posting, setPosting] =
        useState(false);

    const [liking, setLiking] =
        useState(false);

    const [deleting, setDeleting] =
        useState(false);

    const [resharing, setResharing] =
        useState(false);

    const canDelete =
        user?.role === "ADMIN" ||
        post.author.id ===
            (user?.id ||
                user?._id ||
                user?.userId);

    const isAdminPost =
        post.author.role === "ADMIN";

    const images =
        post.images || [];

    const handleLike = async () => {
        setLiking(true);

        try {
            await api.post(
                `/posts/${post.id}/like`
            );

            onUpdate();
        } catch (error) {
            toast.error(
                error?.response?.data?.error ||
                    "Unable to like post"
            );
        } finally {
            setLiking(false);
        }
    };

    const handleComment = async (
        e
    ) => {
        e.preventDefault();

        if (!commentText.trim())
            return;

        setPosting(true);

        try {
            await api.post(
                `/posts/${post.id}/comments`,
                {
                    text: commentText,
                }
            );

            setCommentText("");

            await onUpdate();
        } catch (error) {
            toast.error(
                error?.response?.data?.error ||
                    "Unable to comment"
            );
        } finally {
            setPosting(false);
        }
    };

    const handleDelete = async () => {
        if (
            !window.confirm(
                "Delete this post?"
            )
        ) {
            return;
        }

        setDeleting(true);

        try {
            await api.delete(
                `/posts/${post.id}`
            );

            toast.success(
                "Post deleted"
            );

            onUpdate();
        } catch (error) {
            toast.error(
                error?.response?.data?.error ||
                    "Unable to delete post"
            );
        } finally {
            setDeleting(false);
        }
    };

    const handleReshare = async () => {
        const caption =
            window.prompt(
                "Add something to your reshare (optional):",
                ""
            );

        if (caption === null)
            return;

        setResharing(true);

        try {
            await api.post(
                `/posts/${post.id}/reshare`,
                {
                    text: caption,
                }
            );

            toast.success(
                "Post reshared successfully"
            );

            await onUpdate();
        } catch (error) {
            toast.error(
                error?.response?.data?.error ||
                    "Unable to reshare post"
            );
        } finally {
            setResharing(false);
        }
    };

    return (
        <div className="relative overflow-hidden bg-white rounded-2xl shadow-sm border border-slate-100 transition-all hover:shadow-lg hover:shadow-indigo-100/40 p-5 sm:p-6">
            {/* BLUE LINE FOR EVERY POST */}
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-500 to-blue-400" />

            <div className="flex items-start justify-between mb-4">
                <button
                    onClick={() =>
                        onAuthorClick?.(
                            post.author
                        )
                    }
                    className="flex items-center gap-3 text-left group"
                    disabled={
                        isAdminPost
                    }
                >
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-100 to-blue-50 ring-2 ring-white shadow-sm flex items-center justify-center overflow-hidden shrink-0">
                        {post.author.image ? (
                            <img
                                src={
                                    post.author.image
                                }
                                alt=""
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <span className="text-indigo-600 font-semibold">
                                {post.author.name?.[0]?.toUpperCase()}
                            </span>
                        )}
                    </div>

                    <div>
                        <p className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                            {post.author.name}

                            {isAdminPost && (
                                <span className="inline-flex items-center gap-1 text-[10px] bg-gradient-to-r from-indigo-600 to-blue-500 text-white px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide">
                                    <ShieldCheck className="w-3 h-3" />
                                    Admin
                                </span>
                            )}
                        </p>

                        <p className="text-xs text-slate-400">
                            {post.author.position}
                            {post.author.department
                                ? ` · ${post.author.department}`
                                : ""}

                            {" · "}

                            {formatDistanceToNow(
                                new Date(
                                    post.createdAt
                                ),
                                {
                                    addSuffix:
                                        true,
                                }
                            )}
                        </p>
                    </div>
                </button>

                <div className="flex items-center gap-2">
                    {user?.role ===
                        "ADMIN" &&
                        post.audienceLabel &&
                        post.audienceLabel !==
                            "Everyone" && (
                            <span className="text-xs bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-full font-medium">
                                {
                                    post.audienceLabel
                                }
                            </span>
                        )}

                    {canDelete && (
                        <button
                            onClick={
                                handleDelete
                            }
                            disabled={
                                deleting
                            }
                            className="p-1.5 rounded-lg hover:bg-slate-50 text-slate-400 hover:text-rose-600 transition-colors"
                        >
                            {deleting ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Trash2 className="w-4 h-4" />
                            )}
                        </button>
                    )}
                </div>
            </div>

            {post.text &&
                post.text !==
                    "Reshared a post" && (
                    <p className="text-sm text-slate-700 whitespace-pre-wrap mb-3 leading-relaxed">
                        {post.text}
                    </p>
                )}

            {post.resharedFrom && (
                <OriginalPostPreview
                    post={
                        post.resharedFrom
                    }
                />
            )}

            {!post.resharedFrom && (
                <ImageGrid
                    images={images}
                />
            )}

            <div className="flex items-center gap-5 pt-3 mt-3 border-t border-slate-100">
                <button
                    onClick={handleLike}
                    disabled={liking}
                    className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
                        post.likedByMe
                            ? "text-indigo-600"
                            : "text-slate-500 hover:text-indigo-600"
                    }`}
                >
                    <Heart
                        className={`w-4 h-4 ${
                            post.likedByMe
                                ? "fill-indigo-600"
                                : ""
                        }`}
                    />

                    {post.likeCount > 0 &&
                        post.likeCount}
                </button>

                <button
                    onClick={() =>
                        setShowComments(
                            (value) =>
                                !value
                        )
                    }
                    className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
                        showComments
                            ? "text-indigo-600"
                            : "text-slate-500 hover:text-indigo-600"
                    }`}
                >
                    <MessageCircle className="w-4 h-4" />

                    {post.comments.length >
                        0 &&
                        post.comments.length}
                </button>

                {/* RESHARE */}
                <button
                    onClick={
                        handleReshare
                    }
                    disabled={resharing}
                    className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-emerald-600 transition-colors disabled:opacity-50"
                >
                    {resharing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <Repeat2 className="w-4 h-4" />
                    )}

                    Reshare
                </button>
            </div>

            {showComments && (
                <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                    {post.comments.map(
                        (comment) => (
                            <div
                                key={
                                    comment.id
                                }
                                className="flex items-start gap-2.5"
                            >
                                <div className="w-7 h-7 rounded-full bg-indigo-50 flex items-center justify-center overflow-hidden shrink-0">
                                    {comment.author
                                        .image ? (
                                        <img
                                            src={
                                                comment
                                                    .author
                                                    .image
                                            }
                                            alt=""
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <span className="text-indigo-600 text-xs font-semibold">
                                            {comment.author.name?.[0]?.toUpperCase()}
                                        </span>
                                    )}
                                </div>

                                <div className="bg-indigo-50/60 rounded-xl px-3 py-2 flex-1">
                                    <p className="text-xs font-semibold text-slate-800">
                                        {
                                            comment
                                                .author
                                                .name
                                        }
                                    </p>

                                    <p className="text-sm text-slate-600">
                                        {
                                            comment.text
                                        }
                                    </p>
                                </div>
                            </div>
                        )
                    )}

                    <form
                        onSubmit={
                            handleComment
                        }
                        className="flex items-center gap-2"
                    >
                        <input
                            type="text"
                            value={
                                commentText
                            }
                            onChange={(e) =>
                                setCommentText(
                                    e.target
                                        .value
                                )
                            }
                            placeholder="Write a comment..."
                            className="flex-1 text-sm"
                        />

                        <button
                            type="submit"
                            disabled={
                                posting ||
                                !commentText.trim()
                            }
                            className="w-9 h-9 shrink-0 rounded-lg bg-gradient-to-br from-indigo-600 to-blue-500 text-white flex items-center justify-center hover:opacity-90 disabled:opacity-50"
                        >
                            {posting ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Send className="w-4 h-4" />
                            )}
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
};

export default PostCard;