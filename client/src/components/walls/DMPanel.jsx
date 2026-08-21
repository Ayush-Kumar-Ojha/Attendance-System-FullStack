import {
    useState,
    useEffect,
    useRef,
    useCallback,
    useMemo,
} from "react";

import {
    Search,
    Send,
    ArrowLeft,
    MessageCircle,
    UserPlus,
    Check,
    X,
    Clock3,
    Loader2,
} from "lucide-react";

import api from "../../api/axios";
import { format } from "date-fns";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";

const DMPanel = () => {
    const { user } = useAuth();

    const [conversations, setConversations] =
        useState([]);

    const [directory, setDirectory] =
        useState([]);

    const [requests, setRequests] =
        useState({
            incoming: [],
            outgoing: [],
        });

    const [searchTerm, setSearchTerm] =
        useState("");

    const [activeConversation, setActiveConversation] =
        useState(null);

    const [messages, setMessages] =
        useState([]);

    const [messageInput, setMessageInput] =
        useState("");

    const [sending, setSending] =
        useState(false);

    const [loadingRequests, setLoadingRequests] =
        useState(false);

    const [showRequests, setShowRequests] =
        useState(false);

    const scrollRef =
        useRef(null);

    const currentUserId =
        user?.id ||
        user?._id ||
        user?.userId;

    // ======================================
    // Conversations
    // ======================================
    const fetchConversations =
        useCallback(async () => {
            try {
                const response =
                    await api.get(
                        "/messages/conversations"
                    );

                setConversations(
                    response.data.data || []
                );
            } catch (error) {
                console.error(
                    "Conversation fetch error:",
                    error
                );
            }
        }, []);

    // ======================================
    // Directory
    // ======================================
    const fetchDirectory =
        useCallback(async () => {
            try {
                const response =
                    await api.get(
                        "/employees/directory"
                    );

                setDirectory(
                    response.data || []
                );
            } catch (error) {
                console.error(
                    "Directory fetch error:",
                    error
                );
            }
        }, []);

    // ======================================
    // Requests
    // ======================================
    const fetchRequests =
        useCallback(async () => {
            try {
                const response =
                    await api.get(
                        "/messages/requests"
                    );

                setRequests({
                    incoming:
                        response.data.incoming ||
                        [],
                    outgoing:
                        response.data.outgoing ||
                        [],
                });
            } catch (error) {
                console.error(
                    "Request fetch error:",
                    error
                );
            }
        }, []);

    useEffect(() => {
        fetchConversations();
        fetchDirectory();
        fetchRequests();

        const interval =
            setInterval(() => {
                fetchConversations();
                fetchRequests();
            }, 6000);

        return () =>
            clearInterval(interval);
    }, [
        fetchConversations,
        fetchDirectory,
        fetchRequests,
    ]);

    // ======================================
    // Messages
    // ======================================
    const fetchMessages =
        useCallback(
            async (conversationId) => {
                try {
                    const response =
                        await api.get(
                            `/messages/conversations/${conversationId}/messages`
                        );

                    setMessages(
                        response.data.data ||
                            []
                    );
                } catch (error) {
                    console.error(
                        "Message fetch error:",
                        error
                    );
                }
            },
            []
        );

    const openConversation =
        async (conversation) => {
            setShowRequests(false);
            setActiveConversation(
                conversation
            );
            setSearchTerm("");

            await fetchMessages(
                conversation.id
            );

            fetchConversations();
        };

    // ======================================
    // Start message request
    // ======================================
    const sendRequest = async (
        person
    ) => {
        try {
            await api.post(
                "/messages/requests",
                {
                    recipientId:
                        person.userId,
                }
            );

            toast.success(
                `Message request sent to ${person.name}`
            );

            await fetchRequests();
        } catch (error) {
            toast.error(
                error?.response?.data?.error ||
                    "Unable to send request"
            );
        }
    };

    // ======================================
    // Accept request
    // ======================================
    const acceptRequest = async (
        request
    ) => {
        setLoadingRequests(true);

        try {
            const response =
                await api.patch(
                    `/messages/requests/${request.id}`,
                    {
                        action: "ACCEPT",
                    }
                );

            await fetchRequests();
            await fetchConversations();

            const conversation =
                response.data.conversation;

            if (conversation) {
                setShowRequests(false);

                setActiveConversation(
                    conversation
                );

                await fetchMessages(
                    conversation.id
                );
            }

            toast.success(
                "Message request accepted"
            );
        } catch (error) {
            toast.error(
                error?.response?.data?.error ||
                    "Unable to accept request"
            );
        } finally {
            setLoadingRequests(false);
        }
    };

    // ======================================
    // Reject request
    // ======================================
    const rejectRequest = async (
        request
    ) => {
        setLoadingRequests(true);

        try {
            await api.patch(
                `/messages/requests/${request.id}`,
                {
                    action: "REJECT",
                }
            );

            await fetchRequests();

            toast.success(
                "Message request rejected"
            );
        } catch (error) {
            toast.error(
                error?.response?.data?.error ||
                    "Unable to reject request"
            );
        } finally {
            setLoadingRequests(false);
        }
    };

    // ======================================
    // Poll active conversation
    // ======================================
    useEffect(() => {
        if (!activeConversation)
            return;

        const interval =
            setInterval(() => {
                fetchMessages(
                    activeConversation.id
                );
            }, 3000);

        return () =>
            clearInterval(interval);
    }, [
        activeConversation,
        fetchMessages,
    ]);

    // ======================================
    // Auto scroll
    // ======================================
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop =
                scrollRef.current.scrollHeight;
        }
    }, [messages]);

    // ======================================
    // Send message
    // ======================================
    const handleSend = async (
        event
    ) => {
        event.preventDefault();

        const text =
            messageInput.trim();

        if (
            !text ||
            !activeConversation
        ) {
            return;
        }

        setSending(true);

        try {
            const response =
                await api.post(
                    `/messages/conversations/${activeConversation.id}/messages`,
                    {
                        text,
                    }
                );

            setMessages((previous) => [
                ...previous,
                response.data,
            ]);

            setMessageInput("");

            await fetchConversations();
        } catch (error) {
            toast.error(
                error?.response?.data?.error ||
                    "Unable to send message"
            );
        } finally {
            setSending(false);
        }
    };

    // ======================================
    // Combined directory
    // ======================================
    const combinedList =
        useMemo(() => {
            const conversationUserIds =
                new Set(
                    conversations.map(
                        (conversation) =>
                            conversation
                                .otherPerson
                                .id
                    )
                );

            const outgoingUserIds =
                new Set(
                    requests.outgoing.map(
                        (request) =>
                            request.person.id
                    )
                );

            const incomingUserIds =
                new Set(
                    requests.incoming.map(
                        (request) =>
                            request.person.id
                    )
                );

            let list = directory
                .filter(
                    (person) =>
                        person.userId !==
                        currentUserId
                )
                .map((person) => {
                    if (
                        conversationUserIds.has(
                            person.userId
                        )
                    ) {
                        return {
                            ...person,
                            type: "CONVERSATION",
                        };
                    }

                    if (
                        outgoingUserIds.has(
                            person.userId
                        )
                    ) {
                        return {
                            ...person,
                            type: "OUTGOING_REQUEST",
                        };
                    }

                    if (
                        incomingUserIds.has(
                            person.userId
                        )
                    ) {
                        return {
                            ...person,
                            type: "INCOMING_REQUEST",
                        };
                    }

                    return {
                        ...person,
                        type: "NEW",
                    };
                });

            if (searchTerm) {
                const term =
                    searchTerm.toLowerCase();

                list = list.filter(
                    (person) =>
                        person.name
                            ?.toLowerCase()
                            .includes(term) ||
                        person.department
                            ?.toLowerCase()
                            .includes(term) ||
                        person.position
                            ?.toLowerCase()
                            .includes(term)
                );
            }

            return list;
        }, [
            directory,
            conversations,
            requests,
            searchTerm,
            currentUserId,
        ]);

    const totalUnread =
        conversations.reduce(
            (sum, conversation) =>
                sum +
                (conversation.unreadCount ||
                    0),
            0
        );

    const incomingRequestsCount =
        requests.incoming.length;

    // ======================================
    // Conversation screen
    // ======================================
    if (activeConversation) {
        return (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 h-[calc(100vh-105px)] min-h-[600px] flex flex-col overflow-hidden sticky top-5">
                <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-blue-50">
                    <button
                        onClick={() =>
                            setActiveConversation(
                                null
                            )
                        }
                        className="p-2 rounded-lg hover:bg-white text-slate-500 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </button>

                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center overflow-hidden shrink-0">
                        {activeConversation
                            .otherPerson
                            .image ? (
                            <img
                                src={
                                    activeConversation
                                        .otherPerson
                                        .image
                                }
                                alt=""
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <span className="text-indigo-600 text-sm font-semibold">
                                {activeConversation
                                    .otherPerson
                                    .name?.[0]?.toUpperCase()}
                            </span>
                        )}
                    </div>

                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                            {
                                activeConversation
                                    .otherPerson
                                    .name
                            }
                        </p>

                        <p className="text-xs text-slate-400">
                            {
                                activeConversation
                                    .otherPerson
                                    .position
                            }
                        </p>
                    </div>
                </div>

                <div
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-slate-50/70 to-white"
                >
                    {messages.length ===
                        0 && (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <div className="w-14 h-14 rounded-full bg-indigo-50 flex items-center justify-center mb-3">
                                <MessageCircle className="w-6 h-6 text-indigo-500" />
                            </div>

                            <p className="text-sm font-medium text-slate-700">
                                Start a conversation
                            </p>

                            <p className="text-xs text-slate-400 mt-1">
                                Send a message to{" "}
                                {
                                    activeConversation
                                        .otherPerson
                                        .name
                                }
                            </p>
                        </div>
                    )}

                    {messages.map(
                        (message) => {
                            const isMine =
                                String(
                                    message.senderId
                                ) ===
                                String(
                                    currentUserId
                                );

                            return (
                                <div
                                    key={
                                        message.id
                                    }
                                    className={`flex ${
                                        isMine
                                            ? "justify-end"
                                            : "justify-start"
                                    }`}
                                >
                                    <div
                                        className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm shadow-sm ${
                                            isMine
                                                ? "bg-gradient-to-br from-indigo-600 to-blue-500 text-white rounded-br-sm"
                                                : "bg-white text-slate-700 border border-slate-200 rounded-bl-sm"
                                        }`}
                                    >
                                        <p className="whitespace-pre-wrap break-words">
                                            {
                                                message.text
                                            }
                                        </p>

                                        <p
                                            className={`text-[10px] mt-1.5 ${
                                                isMine
                                                    ? "text-indigo-100"
                                                    : "text-slate-400"
                                            }`}
                                        >
                                            {format(
                                                new Date(
                                                    message.createdAt
                                                ),
                                                "h:mm a"
                                            )}
                                        </p>
                                    </div>
                                </div>
                            );
                        }
                    )}
                </div>

                <form
                    onSubmit={
                        handleSend
                    }
                    className="p-3 border-t border-slate-100 bg-white flex gap-2"
                >
                    <input
                        value={
                            messageInput
                        }
                        onChange={(e) =>
                            setMessageInput(
                                e.target
                                    .value
                            )
                        }
                        placeholder="Type a message..."
                        className="flex-1 text-sm !py-2.5"
                    />

                    <button
                        type="submit"
                        disabled={
                            sending ||
                            !messageInput.trim()
                        }
                        className="w-11 h-11 shrink-0 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-500 text-white flex items-center justify-center hover:opacity-90 disabled:opacity-50 shadow-sm"
                    >
                        {sending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Send className="w-4 h-4" />
                        )}
                    </button>
                </form>
            </div>
        );
    }

    // ======================================
    // Main panel
    // ======================================
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 h-[calc(100vh-105px)] min-h-[600px] flex flex-col overflow-hidden sticky top-5">
            <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-indigo-50/70 to-blue-50/70">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                        <MessageCircle className="w-4 h-4 text-indigo-600" />

                        Messages

                        {totalUnread >
                            0 && (
                            <span className="bg-indigo-600 text-white text-[10px] px-2 py-0.5 rounded-full">
                                {
                                    totalUnread
                                }
                            </span>
                        )}
                    </h2>

                    <button
                        onClick={() =>
                            setShowRequests(
                                true
                            )
                        }
                        className="relative p-2 rounded-lg hover:bg-white text-slate-500 hover:text-indigo-600 transition-colors"
                        title="Message requests"
                    >
                        <UserPlus className="w-4 h-4" />

                        {incomingRequestsCount >
                            0 && (
                            <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] flex items-center justify-center font-bold">
                                {
                                    incomingRequestsCount
                                }
                            </span>
                        )}
                    </button>
                </div>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />

                    <input
                        value={
                            searchTerm
                        }
                        onChange={(e) =>
                            setSearchTerm(
                                e.target
                                    .value
                            )
                        }
                        placeholder="Search employees or admin..."
                        className="w-full pl-10 text-sm !py-2.5"
                    />
                </div>
            </div>

            {showRequests ? (
                <div className="flex-1 overflow-y-auto">
                    <div className="p-4 border-b border-slate-100 flex items-center gap-2">
                        <button
                            onClick={() =>
                                setShowRequests(
                                    false
                                )
                            }
                            className="p-1.5 rounded-lg hover:bg-slate-100"
                        >
                            <ArrowLeft className="w-4 h-4 text-slate-500" />
                        </button>

                        <div>
                            <p className="text-sm font-semibold text-slate-900">
                                Message Requests
                            </p>

                            <p className="text-xs text-slate-400">
                                People who want to connect with you
                            </p>
                        </div>
                    </div>

                    {requests
                        .incoming
                        .length ===
                        0 &&
                        requests
                            .outgoing
                            .length ===
                            0 && (
                            <div className="p-8 text-center">
                                <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 flex items-center justify-center mb-3">
                                    <UserPlus className="w-5 h-5 text-slate-400" />
                                </div>

                                <p className="text-sm font-medium text-slate-600">
                                    No message requests
                                </p>

                                <p className="text-xs text-slate-400 mt-1">
                                    New requests will appear here.
                                </p>
                            </div>
                        )}

                    {requests
                        .incoming
                        .length >
                        0 && (
                        <div>
                            <div className="px-4 py-3 bg-slate-50">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Incoming
                                </p>
                            </div>

                            {requests.incoming.map(
                                (
                                    request
                                ) => (
                                    <div
                                        key={
                                            request.id
                                        }
                                        className="p-4 border-b border-slate-100"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center overflow-hidden shrink-0">
                                                {request
                                                    .person
                                                    .image ? (
                                                    <img
                                                        src={
                                                            request
                                                                .person
                                                                .image
                                                        }
                                                        alt=""
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <span className="text-indigo-600 font-semibold">
                                                        {request
                                                            .person
                                                            .name?.[0]?.toUpperCase()}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-slate-800">
                                                    {
                                                        request
                                                            .person
                                                            .name
                                                    }
                                                </p>

                                                <p className="text-xs text-slate-400">
                                                    {
                                                        request
                                                            .person
                                                            .position
                                                    }
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex gap-2 mt-3">
                                            <button
                                                onClick={() =>
                                                    acceptRequest(
                                                        request
                                                    )
                                                }
                                                disabled={
                                                    loadingRequests
                                                }
                                                className="flex-1 py-2 rounded-lg bg-indigo-600 text-white text-xs font-medium flex items-center justify-center gap-1.5 hover:bg-indigo-700 disabled:opacity-50"
                                            >
                                                <Check className="w-3.5 h-3.5" />
                                                Accept
                                            </button>

                                            <button
                                                onClick={() =>
                                                    rejectRequest(
                                                        request
                                                    )
                                                }
                                                disabled={
                                                    loadingRequests
                                                }
                                                className="flex-1 py-2 rounded-lg bg-slate-100 text-slate-600 text-xs font-medium flex items-center justify-center gap-1.5 hover:bg-slate-200 disabled:opacity-50"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                                Decline
                                            </button>
                                        </div>
                                    </div>
                                )
                            )}
                        </div>
                    )}

                    {requests
                        .outgoing
                        .length >
                        0 && (
                        <div>
                            <div className="px-4 py-3 bg-slate-50">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Sent Requests
                                </p>
                            </div>

                            {requests.outgoing.map(
                                (
                                    request
                                ) => (
                                    <div
                                        key={
                                            request.id
                                        }
                                        className="flex items-center gap-3 p-4 border-b border-slate-100"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center overflow-hidden shrink-0">
                                            {request
                                                .person
                                                .image ? (
                                                <img
                                                    src={
                                                        request
                                                            .person
                                                            .image
                                                    }
                                                    alt=""
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <span className="text-indigo-600 font-semibold">
                                                    {request
                                                        .person
                                                        .name?.[0]?.toUpperCase()}
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-slate-800 truncate">
                                                {
                                                    request
                                                        .person
                                                        .name
                                                }
                                            </p>

                                            <p className="text-xs text-amber-500 flex items-center gap-1 mt-0.5">
                                                <Clock3 className="w-3 h-3" />
                                                Waiting for response
                                            </p>
                                        </div>
                                    </div>
                                )
                            )}
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto">
                    {combinedList.length ===
                    0 ? (
                        <div className="p-8 text-center">
                            <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 flex items-center justify-center mb-3">
                                <Search className="w-5 h-5 text-slate-400" />
                            </div>

                            <p className="text-sm font-medium text-slate-600">
                                No one found
                            </p>

                            <p className="text-xs text-slate-400 mt-1">
                                Try another name.
                            </p>
                        </div>
                    ) : (
                        combinedList.map(
                            (person) => {
                                if (
                                    person.type ===
                                    "CONVERSATION"
                                ) {
                                    const conversation =
                                        conversations.find(
                                            (
                                                item
                                            ) =>
                                                item
                                                    .otherPerson
                                                    .id ===
                                                person.userId
                                        );

                                    return (
                                        <button
                                            key={
                                                person.userId
                                            }
                                            onClick={() =>
                                                openConversation(
                                                    conversation
                                                )
                                            }
                                            className="w-full flex items-center gap-3 p-3.5 hover:bg-indigo-50/60 transition-colors text-left border-b border-slate-50"
                                        >
                                            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center overflow-hidden shrink-0">
                                                {person.image ? (
                                                    <img
                                                        src={
                                                            person.image
                                                        }
                                                        alt=""
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <span className="text-indigo-600 font-medium">
                                                        {person.name?.[0]?.toUpperCase()}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-slate-900 truncate">
                                                    {
                                                        person.name
                                                    }
                                                </p>

                                                <p className="text-xs text-slate-400 truncate">
                                                    {conversation?.lastMessageText ||
                                                        "Say hello 👋"}
                                                </p>
                                            </div>

                                            {conversation?.unreadCount >
                                                0 && (
                                                <span className="bg-indigo-600 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                                                    {
                                                        conversation.unreadCount
                                                    }
                                                </span>
                                            )}
                                        </button>
                                    );
                                }

                                const hasIncomingRequest =
                                    person.type ===
                                    "INCOMING_REQUEST";

                                const hasOutgoingRequest =
                                    person.type ===
                                    "OUTGOING_REQUEST";

                                return (
                                    <div
                                        key={
                                            person.userId
                                        }
                                        className="flex items-center gap-3 p-3.5 border-b border-slate-50"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center overflow-hidden shrink-0">
                                            {person.image ? (
                                                <img
                                                    src={
                                                        person.image
                                                    }
                                                    alt=""
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <span className="text-indigo-600 font-medium">
                                                    {person.name?.[0]?.toUpperCase()}
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-slate-900 truncate">
                                                {
                                                    person.name
                                                }
                                            </p>

                                            <p className="text-xs text-slate-400 truncate">
                                                {
                                                    person.position
                                                }{" "}
                                                ·{" "}
                                                {
                                                    person.department
                                                }
                                            </p>
                                        </div>

                                        {hasIncomingRequest ? (
                                            <button
                                                onClick={() =>
                                                    setShowRequests(
                                                        true
                                                    )
                                                }
                                                className="text-xs font-medium text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg"
                                            >
                                                Respond
                                            </button>
                                        ) : hasOutgoingRequest ? (
                                            <span className="text-xs text-amber-500 flex items-center gap-1">
                                                <Clock3 className="w-3.5 h-3.5" />
                                                Pending
                                            </span>
                                        ) : (
                                            <button
                                                onClick={() =>
                                                    sendRequest(
                                                        person
                                                    )
                                                }
                                                className="p-2 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
                                                title="Send message request"
                                            >
                                                <UserPlus className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                );
                            }
                        )
                    )}
                </div>
            )}
        </div>
    );
};

export default DMPanel;