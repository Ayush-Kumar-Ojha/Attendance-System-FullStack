import { Router } from "express";

import { protect } from "../middleware/auth.js";

import {
    getConversations,
    getOrCreateConversation,
    getMessages,
    sendMessage,
    toggleBlockChat,
    getAdminsList,
    getBlockedChatUsers,
} from "../controllers/messageController.js";

import {
    getMessageRequests,
    sendMessageRequest,
    respondToMessageRequest,
} from "../controllers/messageRequestController.js";

const messageRouter = Router();

messageRouter.get("/requests", protect, getMessageRequests);
messageRouter.post("/requests", protect, sendMessageRequest);
messageRouter.patch("/requests/:id", protect, respondToMessageRequest);

// Admin management routes
messageRouter.get("/admins", protect, getAdminsList);
messageRouter.get("/blocked-users", protect, getBlockedChatUsers);
messageRouter.post("/toggle-block", protect, toggleBlockChat);

// Conversation routes
messageRouter.get("/conversations", protect, getConversations);
messageRouter.post("/conversations", protect, getOrCreateConversation);

messageRouter.get("/conversations/:id/messages", protect, getMessages);
messageRouter.post("/conversations/:id/messages", protect, sendMessage);

export default messageRouter;