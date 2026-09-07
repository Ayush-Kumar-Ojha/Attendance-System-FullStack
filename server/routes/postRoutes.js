import { Router } from "express";

import { protect, protectAdmin } from "../middleware/auth.js";
import { uploadPostImages } from "../middleware/uploadPost.js";

import {
    getPosts,
    createPost,
    deletePost,
    toggleLike,
    addComment,
    resharePost,
    restrictUserPosting,
    getUserPostingRestriction,
    getRestrictedPosters,
} from "../controllers/postController.js";

const postRouter = Router();

postRouter.get("/", protect, getPosts);

postRouter.get("/restricted-users", protect, protectAdmin, getRestrictedPosters);
postRouter.get("/user-restriction", protect, getUserPostingRestriction);
postRouter.get("/user-restriction/:userId", protect, getUserPostingRestriction);

postRouter.post("/restrict-user/:userId", protect, protectAdmin, restrictUserPosting);

postRouter.post(
    "/",
    protect,
    uploadPostImages,
    createPost
);

postRouter.delete(
    "/:id",
    protect,
    deletePost
);

postRouter.post(
    "/:id/like",
    protect,
    toggleLike
);

postRouter.post(
    "/:id/comments",
    protect,
    addComment
);

postRouter.post(
    "/:id/reshare",
    protect,
    resharePost
);

export default postRouter;