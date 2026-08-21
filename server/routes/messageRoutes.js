import { Router } from "express";

import { protect } from "../middleware/auth.js";

import {
    getConversations,
    getOrCreateConversation,
    getMessages,
    sendMessage,
} from "../controllers/messageController.js";

import {
    getMessageRequests,
    sendMessageRequest,
    respondToMessageRequest,
} from "../controllers/messageRequestController.js";

const messageRouter = Router();

// Message requests
messageRouter.get("/requests", protect, getMessageRequests);
messageRouter.post("/requests", protect, sendMessageRequest);
messageRouter.patch(
    "/requests/:id",
    protect,
    respondToMessageRequest
);

// Conversations
messageRouter.get(
    "/conversations",
    protect,
    getConversations
);

messageRouter.post(
    "/conversations",
    protect,
    getOrCreateConversation
);

// Messages
messageRouter.get(
    "/conversations/:id/messages",
    protect,
    getMessages
);

messageRouter.post(
    "/conversations/:id/messages",
    protect,
    sendMessage
);

export default messageRouter;