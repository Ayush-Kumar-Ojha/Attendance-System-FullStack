import MessageRequest from "../models/MessageRequest.js";
import Conversation from "../models/Conversation.js";
import Employee from "../models/Employee.js";
import User from "../models/User.js";

const getPersonInfo = async (userId) => {
    const employee = await Employee.findOne({ userId }).lean();

    if (employee) {
        return {
            id: userId.toString(),
            name: `${employee.firstName} ${employee.lastName}`,
            image: employee.image || null,
            department: employee.department || "Not specified",
            position: employee.position || "Employee",
            role: "EMPLOYEE",
        };
    }

    const user = await User.findById(userId).lean();

    return {
        id: userId.toString(),
        name: "Admin",
        image: user?.image || null,
        department: "Administration",
        position: "Administrator",
        role: "ADMIN",
    };
};

// ======================================
// Get Message Requests
// GET /api/messages/requests
// ======================================
export const getMessageRequests = async (req, res) => {
    try {
        const userId = req.session.userId;

        const incoming = await MessageRequest.find({
            recipientId: userId,
            status: "PENDING",
        })
            .sort({ createdAt: -1 })
            .lean();

        const outgoing = await MessageRequest.find({
            senderId: userId,
            status: "PENDING",
        })
            .sort({ createdAt: -1 })
            .lean();

        const incomingData = await Promise.all(
            incoming.map(async (request) => ({
                id: request._id.toString(),
                type: "INCOMING",
                createdAt: request.createdAt,
                person: await getPersonInfo(request.senderId),
            }))
        );

        const outgoingData = await Promise.all(
            outgoing.map(async (request) => ({
                id: request._id.toString(),
                type: "OUTGOING",
                createdAt: request.createdAt,
                person: await getPersonInfo(request.recipientId),
            }))
        );

        return res.json({
            incoming: incomingData,
            outgoing: outgoingData,
        });
    } catch (error) {
        console.error("Get Message Requests Error:", error);

        return res.status(500).json({
            error: "Failed to fetch message requests",
        });
    }
};

// ======================================
// Send Message Request
// POST /api/messages/requests
// ======================================
export const sendMessageRequest = async (req, res) => {
    try {
        const senderId = req.session.userId;
        const { recipientId } = req.body;

        if (!recipientId) {
            return res.status(400).json({
                error: "recipientId is required",
            });
        }

        if (senderId === recipientId) {
            return res.status(400).json({
                error: "You cannot send a request to yourself",
            });
        }

        // Check whether conversation already exists
        const existingConversation = await Conversation.findOne({
            participants: {
                $all: [senderId, recipientId],
                $size: 2,
            },
        });

        if (existingConversation) {
            return res.status(400).json({
                error: "Conversation already exists",
                conversationId: existingConversation._id.toString(),
            });
        }

        // Check pending request in either direction
        const existingRequest = await MessageRequest.findOne({
            $or: [
                {
                    senderId,
                    recipientId,
                    status: "PENDING",
                },
                {
                    senderId: recipientId,
                    recipientId: senderId,
                    status: "PENDING",
                },
            ],
        });

        if (existingRequest) {
            return res.status(400).json({
                error: "A message request is already pending",
            });
        }

        const request = await MessageRequest.create({
            senderId,
            recipientId,
            status: "PENDING",
        });

        return res.status(201).json({
            success: true,
            id: request._id.toString(),
            message: "Message request sent",
        });
    } catch (error) {
        console.error("Send Message Request Error:", error);

        return res.status(500).json({
            error: "Failed to send message request",
        });
    }
};

// ======================================
// Accept / Reject Request
// PATCH /api/messages/requests/:id
// ======================================
export const respondToMessageRequest = async (req, res) => {
    try {
        const userId = req.session.userId;
        const { action } = req.body;

        if (!["ACCEPT", "REJECT"].includes(action)) {
            return res.status(400).json({
                error: "Action must be ACCEPT or REJECT",
            });
        }

        const request = await MessageRequest.findById(req.params.id);

        if (!request) {
            return res.status(404).json({
                error: "Message request not found",
            });
        }

        if (request.recipientId.toString() !== userId) {
            return res.status(403).json({
                error: "You are not authorized to respond to this request",
            });
        }

        if (request.status !== "PENDING") {
            return res.status(400).json({
                error: "Request has already been handled",
            });
        }

        if (action === "REJECT") {
            request.status = "REJECTED";
            await request.save();

            return res.json({
                success: true,
                message: "Message request rejected",
            });
        }

        request.status = "ACCEPTED";
        await request.save();

        let conversation = await Conversation.findOne({
            participants: {
                $all: [request.senderId, request.recipientId],
                $size: 2,
            },
        });

        if (!conversation) {
            conversation = await Conversation.create({
                participants: [request.senderId, request.recipientId],
            });
        }

        const otherPerson = await getPersonInfo(request.senderId);

        return res.json({
            success: true,
            message: "Message request accepted",
            conversation: {
                id: conversation._id.toString(),
                otherPerson,
            },
        });
    } catch (error) {
        console.error("Respond Message Request Error:", error);

        return res.status(500).json({
            error: "Failed to respond to message request",
        });
    }
};