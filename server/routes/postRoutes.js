import { Router } from "express";

import { protect } from "../middleware/auth.js";
import { uploadPostImages } from "../middleware/uploadPost.js";

import {
    getPosts,
    createPost,
    deletePost,
    toggleLike,
    addComment,
    resharePost,
} from "../controllers/postController.js";

const postRouter = Router();

postRouter.get("/", protect, getPosts);

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

// Reshare
postRouter.post(
    "/:id/reshare",
    protect,
    resharePost
);

export default postRouter;