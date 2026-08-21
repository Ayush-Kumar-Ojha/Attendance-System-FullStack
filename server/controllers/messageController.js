import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import Employee from "../models/Employee.js";
import User from "../models/User.js";

const getPersonInfo = async (userId) => {
    const employee = await Employee.findOne({ userId }).lean();

    if (employee) {
        return {
            id: userId.toString(),
            name: `${employee.firstName} ${employee.lastName}`,
            image: employee.image || null,
            role: "EMPLOYEE",
            department: employee.department || "Not specified",
            position: employee.position || "Employee",
        };
    }

    const user = await User.findById(userId).lean();

    return {
        id: userId.toString(),
        name: "Admin",
        image: user?.image || null,
        role: "ADMIN",
        department: "Administration",
        position: "Administrator",
    };
};

// ======================================
// GET CONVERSATIONS
// ======================================
export const getConversations = async (req, res) => {
    try {
        const userId = req.session.userId;

        const conversations = await Conversation.find({
            participants: userId,
        })
            .sort({ lastMessageAt: -1 })
            .lean();

        const result = await Promise.all(
            conversations.map(async (conversation) => {
                const otherId = conversation.participants.find(
                    (participant) =>
                        participant.toString() !== userId
                );

                if (!otherId) return null;

                const otherPerson = await getPersonInfo(otherId);

                const unreadCount =
                    await Message.countDocuments({
                        conversationId: conversation._id,
                        senderId: { $ne: userId },
                        readBy: { $ne: userId },
                    });

                return {
                    id: conversation._id.toString(),
                    otherPerson,
                    lastMessageText:
                        conversation.lastMessageText || "",
                    lastMessageAt: conversation.lastMessageAt,
                    unreadCount,
                };
            })
        );

        return res.json({
            data: result.filter(Boolean),
        });
    } catch (error) {
        console.error(
            "Get Conversations Error:",
            error
        );

        return res.status(500).json({
            error: "Failed to fetch conversations",
        });
    }
};

// ======================================
// GET OR CREATE CONVERSATION
// ======================================
export const getOrCreateConversation = async (req, res) => {
    try {
        const userId = req.session.userId;
        const { otherUserId } = req.body;

        if (!otherUserId) {
            return res.status(400).json({
                error: "otherUserId is required",
            });
        }

        if (userId === otherUserId) {
            return res.status(400).json({
                error: "Cannot create conversation with yourself",
            });
        }

        let conversation = await Conversation.findOne({
            participants: {
                $all: [userId, otherUserId],
                $size: 2,
            },
        });

        if (!conversation) {
            conversation = await Conversation.create({
                participants: [userId, otherUserId],
            });
        }

        const otherPerson = await getPersonInfo(otherUserId);

        return res.json({
            id: conversation._id.toString(),
            otherPerson,
        });
    } catch (error) {
        console.error(
            "Get Or Create Conversation Error:",
            error
        );

        return res.status(500).json({
            error: "Failed to start conversation",
        });
    }
};

// ======================================
// GET MESSAGES
// ======================================
export const getMessages = async (req, res) => {
    try {
        const userId = req.session.userId;

        const conversation = await Conversation.findById(
            req.params.id
        );

        if (
            !conversation ||
            !conversation.participants.some(
                (participant) =>
                    participant.toString() === userId
            )
        ) {
            return res.status(403).json({
                error: "Not authorized",
            });
        }

        const messages = await Message.find({
            conversationId: req.params.id,
        })
            .sort({ createdAt: 1 })
            .lean();

        await Message.updateMany(
            {
                conversationId: req.params.id,
                senderId: { $ne: userId },
                readBy: { $ne: userId },
            },
            {
                $addToSet: {
                    readBy: userId,
                },
            }
        );

        return res.json({
            data: messages.map((message) => ({
                id: message._id.toString(),
                text: message.text,
                senderId: message.senderId.toString(),
                createdAt: message.createdAt,
            })),
        });
    } catch (error) {
        console.error("Get Messages Error:", error);

        return res.status(500).json({
            error: "Failed to fetch messages",
        });
    }
};

// ======================================
// SEND MESSAGE
// ======================================
export const sendMessage = async (req, res) => {
    try {
        const userId = req.session.userId;
        const { text } = req.body;

        if (!text || !text.trim()) {
            return res.status(400).json({
                error: "Message text is required",
            });
        }

        const conversation = await Conversation.findById(
            req.params.id
        );

        if (
            !conversation ||
            !conversation.participants.some(
                (participant) =>
                    participant.toString() === userId
            )
        ) {
            return res.status(403).json({
                error: "Not authorized",
            });
        }

        const cleanText = text.trim();

        const message = await Message.create({
            conversationId: req.params.id,
            senderId: userId,
            text: cleanText,
            readBy: [userId],
        });

        conversation.lastMessageAt = new Date();
        conversation.lastMessageText = cleanText;

        await conversation.save();

        return res.status(201).json({
            id: message._id.toString(),
            text: message.text,
            senderId: userId,
            createdAt: message.createdAt,
        });
    } catch (error) {
        console.error("Send Message Error:", error);

        return res.status(500).json({
            error: "Failed to send message",
        });
    }
};