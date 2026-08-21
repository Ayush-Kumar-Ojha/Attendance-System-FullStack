import Post from "../models/Post.js";
import Employee from "../models/Employee.js";
import User from "../models/User.js";

const getAuthorInfo = async (userId) => {
    const employee = await Employee.findOne({
        userId,
    }).lean();

    if (employee) {
        return {
            id: userId.toString(),
            name: `${employee.firstName} ${employee.lastName}`,
            image: employee.image || null,
            position: employee.position || "Employee",
            department: employee.department || null,
            role: "EMPLOYEE",
        };
    }

    const user = await User.findById(userId).lean();

    return {
        id: userId.toString(),
        name: "Admin",
        image: user?.image || null,
        position: "Administrator",
        department: null,
        role: "ADMIN",
    };
};

const formatPost = async (
    post,
    currentUserId,
    includeReshare = true
) => {
    const author = await getAuthorInfo(post.authorId);

    const comments = await Promise.all(
        (post.comments || []).map(async (comment) => ({
            id: comment._id.toString(),
            text: comment.text,
            createdAt: comment.createdAt,
            author: await getAuthorInfo(comment.authorId),
        }))
    );

    let audienceLabel = "Everyone";

    if (post.audience?.type === "DEPARTMENT") {
        audienceLabel = `Departments: ${
            post.audience.departments.join(", ")
        }`;
    }

    if (post.audience?.type === "SPECIFIC") {
        audienceLabel = `Selected employees (${
            post.audience.employeeIds.length
        })`;
    }

    let resharedFrom = null;

    if (
        includeReshare &&
        post.resharedFrom
    ) {
        const originalPost =
            await Post.findById(post.resharedFrom).lean();

        if (originalPost) {
            resharedFrom = {
                id: originalPost._id.toString(),
                text: originalPost.text,
                images:
                    originalPost.images ||
                    [],
                createdAt:
                    originalPost.createdAt,
                author:
                    await getAuthorInfo(
                        originalPost.authorId
                    ),
            };
        }
    }

    return {
        id: post._id.toString(),
        text: post.text,
        images:
            post.images ||
            (post.image ? [post.image] : []),
        createdAt: post.createdAt,
        author,
        likeCount: post.likes?.length || 0,
        likedByMe:
            post.likes?.some(
                (id) =>
                    id.toString() ===
                    currentUserId.toString()
            ) || false,
        comments,
        audienceLabel,
        resharedFrom,
    };
};

const canViewPost = (post, viewer) => {
    if (viewer.role === "ADMIN") {
        return true;
    }

    if (
        post.authorId.toString() ===
        viewer.userId
    ) {
        return true;
    }

    const audience =
        post.audience || {
            type: "EVERYONE",
        };

    if (audience.type === "EVERYONE") {
        return true;
    }

    if (
        audience.type === "DEPARTMENT"
    ) {
        return audience.departments.includes(
            viewer.department
        );
    }

    if (
        audience.type === "SPECIFIC"
    ) {
        return audience.employeeIds.some(
            (id) =>
                id.toString() ===
                viewer.employeeId
        );
    }

    return false;
};

// ======================================
// GET POSTS
// ======================================
export const getPosts = async (req, res) => {
    try {
        const session = req.session;

        const viewer = {
            userId: session.userId,
            role: session.role,
            department: null,
            employeeId: null,
        };

        if (session.role !== "ADMIN") {
            const employee =
                await Employee.findOne({
                    userId: session.userId,
                }).lean();

            if (employee) {
                viewer.department =
                    employee.department;

                viewer.employeeId =
                    employee._id.toString();
            }
        }

        const allPosts = await Post.find()
            .sort({ createdAt: -1 })
            .lean();

        const visiblePosts =
            allPosts.filter((post) =>
                canViewPost(post, viewer)
            );

        const formatted =
            await Promise.all(
                visiblePosts.map((post) =>
                    formatPost(
                        post,
                        session.userId
                    )
                )
            );

        return res.json({
            data: formatted,
        });
    } catch (error) {
        console.error(
            "Get Posts Error:",
            error
        );

        return res.status(500).json({
            error: "Failed to fetch posts",
        });
    }
};

// ======================================
// CREATE POST
// ======================================
export const createPost = async (req, res) => {
    try {
        const {
            text,
            audienceType,
            departments,
            employeeIds,
        } = req.body;

        if (
            !text ||
            !text.trim()
        ) {
            return res.status(400).json({
                error: "Post text is required",
            });
        }

        const isAdmin =
            req.session.role === "ADMIN";

        let audience = {
            type: "EVERYONE",
            departments: [],
            employeeIds: [],
        };

        if (
            isAdmin &&
            audienceType
        ) {
            audience.type =
                audienceType;

            if (
                audienceType ===
                    "DEPARTMENT" &&
                departments
            ) {
                try {
                    audience.departments =
                        JSON.parse(
                            departments
                        );
                } catch {}
            }

            if (
                audienceType ===
                    "SPECIFIC" &&
                employeeIds
            ) {
                try {
                    audience.employeeIds =
                        JSON.parse(
                            employeeIds
                        );
                } catch {}
            }
        }

        const images =
            (req.files || []).map(
                (file) => file.path
            );

        const post =
            await Post.create({
                authorId:
                    req.session.userId,
                text: text.trim(),
                images,
                audience,
            });

        const formatted =
            await formatPost(
                post.toObject(),
                req.session.userId
            );

        return res.status(201).json({
            success: true,
            data: formatted,
        });
    } catch (error) {
        console.error(
            "Create Post Error:",
            error
        );

        return res.status(500).json({
            error: "Failed to create post",
        });
    }
};

// ======================================
// RESHARE POST
// ======================================
// POST /api/posts/:id/reshare
export const resharePost = async (
    req,
    res
) => {
    try {
        const originalPost =
            await Post.findById(
                req.params.id
            );

        if (!originalPost) {
            return res.status(404).json({
                error: "Original post not found",
            });
        }

        const session =
            req.session;

        // Make sure user is actually allowed
        // to see the original post.
        const viewer = {
            userId: session.userId,
            role: session.role,
            department: null,
            employeeId: null,
        };

        if (session.role !== "ADMIN") {
            const employee =
                await Employee.findOne({
                    userId: session.userId,
                }).lean();

            if (employee) {
                viewer.department =
                    employee.department;

                viewer.employeeId =
                    employee._id.toString();
            }
        }

        if (
            !canViewPost(
                originalPost,
                viewer
            )
        ) {
            return res.status(403).json({
                error: "You cannot reshare this post",
            });
        }

        const customText =
            typeof req.body.text ===
            "string"
                ? req.body.text.trim()
                : "";

        const resharedPost =
            await Post.create({
                authorId:
                    session.userId,

                text:
                    customText ||
                    "Reshared a post",

                images: [],

                audience:
                    originalPost.audience ||
                    {
                        type: "EVERYONE",
                        departments: [],
                        employeeIds: [],
                    },

                resharedFrom:
                    originalPost._id,
            });

        const formatted =
            await formatPost(
                resharedPost.toObject(),
                session.userId
            );

        return res.status(201).json({
            success: true,
            data: formatted,
        });
    } catch (error) {
        console.error(
            "Reshare Post Error:",
            error
        );

        return res.status(500).json({
            error: "Failed to reshare post",
        });
    }
};

// ======================================
// DELETE POST
// ======================================
export const deletePost = async (
    req,
    res
) => {
    try {
        const post =
            await Post.findById(
                req.params.id
            );

        if (!post) {
            return res.status(404).json({
                error: "Post not found",
            });
        }

        const isAuthor =
            post.authorId.toString() ===
            req.session.userId;

        const isAdmin =
            req.session.role ===
            "ADMIN";

        if (!isAuthor && !isAdmin) {
            return res.status(403).json({
                error:
                    "Not authorized to delete this post",
            });
        }

        await Post.findByIdAndDelete(
            req.params.id
        );

        return res.json({
            success: true,
        });
    } catch (error) {
        console.error(
            "Delete Post Error:",
            error
        );

        return res.status(500).json({
            error: "Failed to delete post",
        });
    }
};

// ======================================
// LIKE
// ======================================
export const toggleLike = async (
    req,
    res
) => {
    try {
        const post =
            await Post.findById(
                req.params.id
            );

        if (!post) {
            return res.status(404).json({
                error: "Post not found",
            });
        }

        const userId =
            req.session.userId;

        const alreadyLiked =
            post.likes.some(
                (id) =>
                    id.toString() ===
                    userId
            );

        if (alreadyLiked) {
            post.likes =
                post.likes.filter(
                    (id) =>
                        id.toString() !==
                        userId
                );
        } else {
            post.likes.push(
                userId
            );
        }

        await post.save();

        return res.json({
            success: true,
            likeCount:
                post.likes.length,
            likedByMe:
                !alreadyLiked,
        });
    } catch (error) {
        console.error(
            "Toggle Like Error:",
            error
        );

        return res.status(500).json({
            error: "Failed to update like",
        });
    }
};

// ======================================
// COMMENT
// ======================================
export const addComment = async (
    req,
    res
) => {
    try {
        const { text } =
            req.body;

        if (
            !text ||
            !text.trim()
        ) {
            return res.status(400).json({
                error:
                    "Comment text is required",
            });
        }

        const post =
            await Post.findById(
                req.params.id
            );

        if (!post) {
            return res.status(404).json({
                error: "Post not found",
            });
        }

        post.comments.push({
            authorId:
                req.session.userId,
            text: text.trim(),
        });

        await post.save();

        const newComment =
            post.comments[
                post.comments.length - 1
            ];

        const author =
            await getAuthorInfo(
                req.session.userId
            );

        return res.status(201).json({
            success: true,
            comment: {
                id:
                    newComment._id.toString(),
                text:
                    newComment.text,
                createdAt:
                    newComment.createdAt,
                author,
            },
        });
    } catch (error) {
        console.error(
            "Add Comment Error:",
            error
        );

        return res.status(500).json({
            error:
                "Failed to add comment",
        });
    }
};