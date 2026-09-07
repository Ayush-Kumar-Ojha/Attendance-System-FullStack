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
            isChatBlocked: employee.isChatBlocked || false,
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
        isChatBlocked: false,
    };
};

// GET ADMINS LIST FOR EMPLOYEE CHAT
export const getAdminsList = async (req, res) => {
    try {
        const adminUsers = await User.find({ role: "ADMIN" }).select("_id email image").lean();

        const result = await Promise.all(
            adminUsers.map(async (admin) => {
                const emp = await Employee.findOne({ userId: admin._id }).lean();
                return {
                    id: admin._id.toString(),
                    userId: admin._id.toString(),
                    name: emp ? `${emp.firstName} ${emp.lastName}` : "Admin",
                    email: admin.email,
                    image: admin.image || emp?.image || null,
                    role: "ADMIN",
                    position: "Administrator",
                    department: "Administration",
                };
            })
        );

        return res.json({ data: result });
    } catch (error) {
        console.error("Get Admins Error:", error);
        return res.status(500).json({ error: "Failed to fetch admin list" });
    }
};

// GET BLOCKED CHAT USERS LIST (Admin Only)
export const getBlockedChatUsers = async (req, res) => {
    try {
        const adminRole = req.user?.role || req.session?.role;
        if (adminRole !== "ADMIN") {
            return res.status(403).json({ error: "Admin access required" });
        }

        const blockedUsers = await User.find({ isChatBlocked: true }).lean();

        const result = await Promise.all(
            blockedUsers.map(async (u) => {
                const emp = await Employee.findOne({ userId: u._id }).lean();
                return {
                    userId: u._id.toString(),
                    name: emp ? `${emp.firstName} ${emp.lastName}` : "Employee",
                    email: u.email,
                    image: u.image || emp?.image || null,
                    department: emp?.department || "N/A",
                    position: emp?.position || "Employee",
                    isChatBlocked: true,
                };
            })
        );

        return res.json({ data: result });
    } catch (error) {
        console.error("Get Blocked Chat Users Error:", error);
        return res.status(500).json({ error: "Failed to fetch blocked chat users" });
    }
};

export const getConversations = async (req, res) => {
    try {
        const userId = (req.user?._id || req.user?.id || req.session?.userId)?.toString();
        const userRole = req.user?.role || req.session?.role;
        const isAdmin = userRole === "ADMIN";

        const conversations = await Conversation.find({ participants: userId })
            .sort({ lastMessageAt: -1 })
            .lean();

        let result = await Promise.all(
            conversations.map(async (conversation) => {
                const otherId = conversation.participants.find(
                    (participant) => participant.toString() !== userId
                );

                if (!otherId) return null;
                const otherPerson = await getPersonInfo(otherId);

                const unreadCount = await Message.countDocuments({
                    conversationId: conversation._id,
                    senderId: { $ne: userId },
                    readBy: { $ne: userId },
                });

                return {
                    id: conversation._id.toString(),
                    otherPerson,
                    lastMessageText: conversation.lastMessageText || "",
                    lastMessageAt: conversation.lastMessageAt,
                    unreadCount,
                    isBlocked: conversation.isBlocked || false,
                };
            })
        );

        result = result.filter(Boolean);

        // Non-admin employees can ONLY view conversations with Admins
        if (!isAdmin) {
            result = result.filter((conv) => conv.otherPerson && conv.otherPerson.role === "ADMIN");
        }

        return res.json({ data: result });
    } catch (error) {
        console.error("Get Conversations Error:", error);
        return res.status(500).json({ error: "Failed to fetch conversations" });
    }
};

export const getOrCreateConversation = async (req, res) => {
    try {
        const userId = (req.user?._id || req.user?.id || req.session?.userId)?.toString();
        const userRole = req.user?.role || req.session?.role;
        const isAdmin = userRole === "ADMIN";
        const { otherUserId } = req.body;

        if (!otherUserId) return res.status(400).json({ error: "otherUserId is required" });
        if (userId === otherUserId) return res.status(400).json({ error: "Cannot create conversation with yourself" });

        const currentUser = await User.findById(userId).lean();
        if (currentUser?.isChatBlocked) {
            return res.status(403).json({ error: "Your chat privileges have been blocked by Admin." });
        }

        if (!isAdmin) {
            const targetUser = await User.findById(otherUserId).lean();
            if (!targetUser || targetUser.role !== "ADMIN") {
                return res.status(403).json({ error: "Employees can only chat with Admins." });
            }
        }

        let conversation = await Conversation.findOne({
            participants: { $all: [userId, otherUserId], $size: 2 },
        });

        if (!conversation) {
            conversation = await Conversation.create({
                participants: [userId, otherUserId],
            });
        }

        const otherPerson = await getPersonInfo(otherUserId);
        return res.json({ id: conversation._id.toString(), otherPerson, isBlocked: conversation.isBlocked || false });
    } catch (error) {
        console.error("Get Or Create Conversation Error:", error);
        return res.status(500).json({ error: "Failed to start conversation" });
    }
};

export const getMessages = async (req, res) => {
    try {
        const userId = (req.user?._id || req.user?.id || req.session?.userId)?.toString();
        const conversation = await Conversation.findById(req.params.id);

        if (!conversation || !conversation.participants.some((p) => p.toString() === userId)) {
            return res.status(403).json({ error: "Not authorized" });
        }

        const messages = await Message.find({ conversationId: req.params.id }).sort({ createdAt: 1 }).lean();

        await Message.updateMany(
            { conversationId: req.params.id, senderId: { $ne: userId }, readBy: { $ne: userId } },
            { $addToSet: { readBy: userId } }
        );

        return res.json({
            data: messages.map((m) => ({
                id: m._id.toString(),
                text: m.text,
                senderId: m.senderId.toString(),
                createdAt: m.createdAt,
            })),
            isBlocked: conversation.isBlocked || false,
        });
    } catch (error) {
        console.error("Get Messages Error:", error);
        return res.status(500).json({ error: "Failed to fetch messages" });
    }
};

export const sendMessage = async (req, res) => {
    try {
        const userId = (req.user?._id || req.user?.id || req.session?.userId)?.toString();
        const userRole = req.user?.role || req.session?.role;
        const isAdmin = userRole === "ADMIN";
        const { text } = req.body;

        if (!text || !text.trim()) return res.status(400).json({ error: "Message text is required" });

        const currentUser = await User.findById(userId).lean();
        if (currentUser?.isChatBlocked && !isAdmin) {
            return res.status(403).json({ error: "Your chat feature has been blocked by Admin." });
        }

        const conversation = await Conversation.findById(req.params.id);
        if (!conversation || !conversation.participants.some((p) => p.toString() === userId)) {
            return res.status(403).json({ error: "Not authorized" });
        }

        if (conversation.isBlocked && !isAdmin) {
            return res.status(403).json({ error: "Chat in this conversation has been blocked by Admin." });
        }

        if (!isAdmin) {
            const otherId = conversation.participants.find((p) => p.toString() !== userId);
            const otherUser = await User.findById(otherId).lean();
            if (!otherUser || otherUser.role !== "ADMIN") {
                return res.status(403).json({ error: "Employees can only message Admins." });
            }
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
        return res.status(500).json({ error: "Failed to send message" });
    }
};

// ADMIN: TOGGLE BLOCK CHAT FOR USER / CONVERSATION
export const toggleBlockChat = async (req, res) => {
    try {
        const adminRole = req.user?.role || req.session?.role;
        if (adminRole !== "ADMIN") {
            return res.status(403).json({ error: "Admin access required" });
        }

        const { targetUserId, conversationId, block } = req.body;

        if (targetUserId) {
            const isChatBlocked = Boolean(block);
            await User.findByIdAndUpdate(targetUserId, { isChatBlocked });
            await Employee.findOneAndUpdate({ userId: targetUserId }, { isChatBlocked });

            if (isChatBlocked) {
                await Conversation.updateMany(
                    { participants: targetUserId },
                    { isBlocked: true, blockedBy: req.session?.userId || req.user?._id }
                );
            } else {
                await Conversation.updateMany(
                    { participants: targetUserId },
                    { isBlocked: false, blockedBy: null }
                );
            }

            return res.json({
                success: true,
                message: `User chat access has been ${isChatBlocked ? "blocked" : "unblocked"}.`,
                isChatBlocked,
            });
        }

        if (conversationId) {
            const conversation = await Conversation.findById(conversationId);
            if (!conversation) return res.status(404).json({ error: "Conversation not found" });

            conversation.isBlocked = block !== undefined ? Boolean(block) : !conversation.isBlocked;
            conversation.blockedBy = conversation.isBlocked ? (req.session?.userId || req.user?._id) : null;
            await conversation.save();

            return res.json({
                success: true,
                message: `Conversation has been ${conversation.isBlocked ? "blocked" : "unblocked"}.`,
                isBlocked: conversation.isBlocked,
            });
        }

        return res.status(400).json({ error: "targetUserId or conversationId is required" });
    } catch (error) {
        console.error("Toggle Block Chat Error:", error);
        return res.status(500).json({ error: "Failed to block/unblock chat" });
    }
};