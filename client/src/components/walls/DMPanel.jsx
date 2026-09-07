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
    ShieldAlert,
    ShieldCheck,
    Lock,
    Ban,
} from "lucide-react";

import { format } from "date-fns";
import toast from "react-hot-toast";

import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import RestrictedPostersModal from "./RestrictedPostersModal";

const DMPanel = () => {
    const { user } = useAuth();

    const [conversations, setConversations] =
        useState([]);

    const [directory, setDirectory] =
        useState([]);

    const [admins, setAdmins] =
        useState([]);

    const [requests, setRequests] =
        useState({
            incoming: [],
            outgoing: [],
        });

    const [searchTerm, setSearchTerm] =
        useState("");

    const [
        activeConversation,
        setActiveConversation,
    ] = useState(null);

    const [messages, setMessages] =
        useState([]);

    const [messageInput, setMessageInput] =
        useState("");

    const [sending, setSending] =
        useState(false);

    const [
        loadingRequests,
        setLoadingRequests,
    ] = useState(false);

    const [
        showRequests,
        setShowRequests,
    ] = useState(false);

    const [
        togglingBlock,
        setTogglingBlock,
    ] = useState(false);

    const [
        targetRestrictUser,
        setTargetRestrictUser,
    ] = useState(null);

    const scrollRef =
        useRef(null);

    const currentUserId =
        user?.id ||
        user?._id ||
        user?.userId ||
        user?.user?._id ||
        null;

    const isAdmin =
        user?.role === "ADMIN" ||
        user?.user?.role === "ADMIN";

    // =====================================================
    // HELPER - NORMALIZE USER ID
    // =====================================================

    const getUserId = useCallback(
        (person) => {
            if (!person) {
                return null;
            }

            const value =
                person.userId?._id ||
                person.userId ||
                person.id ||
                person._id ||
                null;

            return value
                ? String(value)
                : null;
        },
        []
    );

    // =====================================================
    // HELPER - CONVERSATION ID
    // =====================================================

    const getConversationId = (
        conversation
    ) => {
        if (!conversation) {
            return null;
        }

        return (
            conversation.id ||
            conversation._id ||
            null
        );
    };

    // =====================================================
    // HELPER - OTHER PERSON ID
    // =====================================================

    const getOtherPersonId = (
        conversation
    ) => {
        if (
            !conversation ||
            !conversation.otherPerson
        ) {
            return null;
        }

        return getUserId(
            conversation.otherPerson
        );
    };

    // =====================================================
    // FETCH CONVERSATIONS
    // =====================================================

    const fetchConversations =
        useCallback(async () => {
            try {
                const response =
                    await api.get(
                        "/messages/conversations"
                    );

                const data =
                    Array.isArray(
                        response.data
                    )
                        ? response.data
                        : response.data
                              ?.data || [];

                setConversations(
                    Array.isArray(data)
                        ? data
                        : []
                );
            } catch (error) {
                console.error(
                    "Conversation fetch error:",
                    error
                );
            }
        }, []);

    // =====================================================
    // FETCH EMPLOYEE DIRECTORY
    // =====================================================

    const fetchDirectory =
        useCallback(async () => {
            try {
                const response =
                    await api.get(
                        "/employees/directory"
                    );

                const data =
                    Array.isArray(
                        response.data
                    )
                        ? response.data
                        : response.data
                              ?.data || [];

                setDirectory(
                    Array.isArray(data)
                        ? data
                        : []
                );
            } catch (error) {
                console.error(
                    "Directory fetch error:",
                    error
                );
            }
        }, []);

    // =====================================================
    // FETCH ADMINS
    // =====================================================

    const fetchAdmins =
        useCallback(async () => {
            try {
                const response =
                    await api.get(
                        "/messages/admins"
                    );

                const data =
                    Array.isArray(
                        response.data
                    )
                        ? response.data
                        : response.data
                              ?.data || [];

                setAdmins(
                    Array.isArray(data)
                        ? data
                        : []
                );
            } catch (error) {
                console.error(
                    "Admin fetch error:",
                    error
                );
            }
        }, []);

    // =====================================================
    // FETCH MESSAGE REQUESTS
    // =====================================================

    const fetchRequests =
        useCallback(async () => {
            try {
                const response =
                    await api.get(
                        "/messages/requests"
                    );

                setRequests({
                    incoming:
                        response.data
                            ?.incoming ||
                        response.data?.data
                            ?.incoming ||
                        [],

                    outgoing:
                        response.data
                            ?.outgoing ||
                        response.data?.data
                            ?.outgoing ||
                        [],
                });
            } catch (error) {
                console.error(
                    "Message requests fetch error:",
                    error
                );
            }
        }, []);

    // =====================================================
    // INITIAL LOAD
    // =====================================================

    useEffect(() => {
        let mounted = true;

        const load = async () => {
            if (!mounted) {
                return;
            }

            await Promise.all([
                fetchConversations(),
                fetchDirectory(),
                fetchRequests(),

                !isAdmin
                    ? fetchAdmins()
                    : Promise.resolve(),
            ]);
        };

        load();

        const interval =
            setInterval(() => {
                fetchConversations();
                fetchRequests();
            }, 6000);

        return () => {
            mounted = false;

            clearInterval(
                interval
            );
        };
    }, [
        fetchConversations,
        fetchDirectory,
        fetchRequests,
        fetchAdmins,
        isAdmin,
    ]);

    // =====================================================
    // FETCH MESSAGES
    // =====================================================

    const fetchMessages =
        useCallback(
            async (
                conversationId
            ) => {
                if (
                    !conversationId
                ) {
                    return;
                }

                try {
                    const response =
                        await api.get(
                            `/messages/conversations/${conversationId}/messages`
                        );

                    const data =
                        Array.isArray(
                            response.data
                        )
                            ? response.data
                            : response
                                  .data
                                  ?.data ||
                              [];

                    setMessages(
                        Array.isArray(
                            data
                        )
                            ? data
                            : []
                    );

                    const newBlocked =
                        response.data
                            ?.isBlocked;

                    if (
                        newBlocked !==
                        undefined
                    ) {
                        setActiveConversation(
                            (
                                previous
                            ) => {
                                if (
                                    !previous
                                ) {
                                    return previous;
                                }

                                // IMPORTANT:
                                // Do NOT make a new object
                                // when nothing changed.
                                if (
                                    previous.isBlocked ===
                                    newBlocked
                                ) {
                                    return previous;
                                }

                                return {
                                    ...previous,

                                    isBlocked:
                                        newBlocked,
                                };
                            }
                        );
                    }
                } catch (error) {
                    console.error(
                        "Message fetch error:",
                        error
                    );
                }
            },
            []
        );

    // =====================================================
    // ACTIVE CONVERSATION ID
    // =====================================================

    const activeConversationId =
        getConversationId(
            activeConversation
        );

    // =====================================================
    // MESSAGE POLLING
    // =====================================================

    useEffect(() => {
        if (
            !activeConversationId
        ) {
            return;
        }

        const interval =
            setInterval(() => {
                fetchMessages(
                    activeConversationId
                );
            }, 3000);

        return () => {
            clearInterval(
                interval
            );
        };
    }, [
        activeConversationId,
        fetchMessages,
    ]);

    // =====================================================
    // AUTO SCROLL
    // =====================================================

    useEffect(() => {
        if (
            !scrollRef.current
        ) {
            return;
        }

        scrollRef.current.scrollTop =
            scrollRef.current
                .scrollHeight;
    }, [messages]);

    // =====================================================
    // OPEN CONVERSATION
    // =====================================================

    const openConversation =
        async (
            conversation
        ) => {
            if (
                !conversation
            ) {
                return;
            }

            const conversationId =
                getConversationId(
                    conversation
                );

            if (
                !conversationId
            ) {
                toast.error(
                    "Conversation ID not found"
                );

                return;
            }

            setShowRequests(
                false
            );

            setSearchTerm("");

            setActiveConversation(
                conversation
            );

            await fetchMessages(
                conversationId
            );

            await fetchConversations();
        };

    // =====================================================
    // START DIRECT CONVERSATION
    // =====================================================

    const startDirectConversationWithUser =
        async (
            targetUserId
        ) => {
            if (
                !targetUserId
            ) {
                toast.error(
                    "Unable to identify user"
                );

                return;
            }

            try {
                const response =
                    await api.post(
                        "/messages/conversations",
                        {
                            otherUserId:
                                targetUserId,
                        }
                    );

                const conversation =
                    response.data
                        ?.data ||
                    response.data;

                if (
                    !conversation
                ) {
                    return;
                }

                setShowRequests(
                    false
                );

                setActiveConversation(
                    conversation
                );

                const conversationId =
                    getConversationId(
                        conversation
                    );

                if (
                    conversationId
                ) {
                    await fetchMessages(
                        conversationId
                    );
                }

                await fetchConversations();
            } catch (error) {
                console.error(
                    "Start conversation error:",
                    error
                );

                toast.error(
                    error?.response
                        ?.data?.error ||
                        "Unable to start conversation"
                );
            }
        };

    // =====================================================
    // SEND MESSAGE REQUEST
    // =====================================================

    const sendRequest =
        async (
            person
        ) => {
            const recipientId =
                getUserId(
                    person
                );

            if (
                !recipientId
            ) {
                toast.error(
                    "Unable to identify employee"
                );

                return;
            }

            try {
                await api.post(
                    "/messages/requests",
                    {
                        recipientId,
                    }
                );

                toast.success(
                    `Message request sent to ${
                        person?.name ||
                        "employee"
                    }`
                );

                await fetchRequests();
            } catch (error) {
                console.error(
                    "Message request error:",
                    error
                );

                toast.error(
                    error?.response
                        ?.data?.error ||
                        "Unable to send request"
                );
            }
        };

    // =====================================================
    // ACCEPT MESSAGE REQUEST
    // =====================================================

    const acceptRequest =
        async (
            request
        ) => {
            const requestId =
                request?.id ||
                request?._id;

            if (
                !requestId
            ) {
                return;
            }

            setLoadingRequests(
                true
            );

            try {
                const response =
                    await api.patch(
                        `/messages/requests/${requestId}`,
                        {
                            action:
                                "ACCEPT",
                        }
                    );

                await fetchRequests();

                await fetchConversations();

                const conversation =
                    response.data
                        ?.conversation ||
                    response.data
                        ?.data
                        ?.conversation;

                if (
                    conversation
                ) {
                    setShowRequests(
                        false
                    );

                    setActiveConversation(
                        conversation
                    );

                    const id =
                        getConversationId(
                            conversation
                        );

                    if (id) {
                        await fetchMessages(
                            id
                        );
                    }
                }

                toast.success(
                    "Message request accepted"
                );
            } catch (error) {
                console.error(
                    "Accept request error:",
                    error
                );

                toast.error(
                    error?.response
                        ?.data?.error ||
                        "Unable to accept request"
                );
            } finally {
                setLoadingRequests(
                    false
                );
            }
        };

    // =====================================================
    // REJECT MESSAGE REQUEST
    // =====================================================

    const rejectRequest =
        async (
            request
        ) => {
            const requestId =
                request?.id ||
                request?._id;

            if (
                !requestId
            ) {
                return;
            }

            setLoadingRequests(
                true
            );

            try {
                await api.patch(
                    `/messages/requests/${requestId}`,
                    {
                        action:
                            "REJECT",
                    }
                );

                await fetchRequests();

                toast.success(
                    "Message request rejected"
                );
            } catch (error) {
                console.error(
                    "Reject request error:",
                    error
                );

                toast.error(
                    error?.response
                        ?.data?.error ||
                        "Unable to reject request"
                );
            } finally {
                setLoadingRequests(
                    false
                );
            }
        };

    // =====================================================
    // ADMIN BLOCK / UNBLOCK CHAT
    // =====================================================

    const handleToggleBlockChat =
        async () => {
            if (
                !activeConversation ||
                !isAdmin
            ) {
                return;
            }

            const targetUserId =
                getUserId(
                    activeConversation
                        ?.otherPerson
                );

            if (
                !targetUserId
            ) {
                toast.error(
                    "Unable to identify employee"
                );

                return;
            }

            const newBlockStatus =
                !Boolean(
                    activeConversation
                        .isBlocked
                );

            setTogglingBlock(
                true
            );

            try {
                const response =
                    await api.post(
                        "/messages/toggle-block",
                        {
                            targetUserId,

                            block:
                                newBlockStatus,
                        }
                    );

                setActiveConversation(
                    (
                        previous
                    ) => {
                        if (
                            !previous
                        ) {
                            return previous;
                        }

                        return {
                            ...previous,

                            isBlocked:
                                newBlockStatus,
                        };
                    }
                );

                toast.success(
                    response.data
                        ?.message ||
                        (
                            newBlockStatus
                                ? "Chat blocked successfully"
                                : "Chat unblocked successfully"
                        )
                );

                await fetchConversations();
            } catch (error) {
                console.error(
                    "Toggle block error:",
                    error
                );

                toast.error(
                    error?.response
                        ?.data?.error ||
                        "Failed to update chat status"
                );
            } finally {
                setTogglingBlock(
                    false
                );
            }
        };

    // =====================================================
    // SEND MESSAGE
    // =====================================================

    const handleSend =
        async (
            event
        ) => {
            event.preventDefault();

            const text =
                messageInput.trim();

            if (
                !text ||
                !activeConversationId
            ) {
                return;
            }

            if (
                activeConversation
                    ?.isBlocked &&
                !isAdmin
            ) {
                toast.error(
                    "Chat in this conversation has been blocked by Admin."
                );

                return;
            }

            setSending(
                true
            );

            try {
                const response =
                    await api.post(
                        `/messages/conversations/${activeConversationId}/messages`,
                        {
                            text,
                        }
                    );

                const newMessage =
                    response.data
                        ?.data ||
                    response.data;

                if (
                    newMessage
                ) {
                    setMessages(
                        (
                            previous
                        ) => [
                            ...previous,
                            newMessage,
                        ]
                    );
                }

                setMessageInput(
                    ""
                );

                await fetchConversations();
            } catch (error) {
                console.error(
                    "Send message error:",
                    error
                );

                toast.error(
                    error?.response
                        ?.data?.error ||
                        "Unable to send message"
                );
            } finally {
                setSending(
                    false
                );
            }
        };

    // =====================================================
    // NORMALIZED ADMINS
    // =====================================================

    const adminList =
        useMemo(() => {
            const map =
                new Map();

            // Admin API
            (
                Array.isArray(
                    admins
                )
                    ? admins
                    : []
            ).forEach(
                (
                    admin
                ) => {
                    const id =
                        getUserId(
                            admin
                        );

                    if (!id) {
                        return;
                    }

                    map.set(
                        id,
                        {
                            ...admin,

                            userId:
                                id,

                            role:
                                "ADMIN",
                        }
                    );
                }
            );

            // Directory may also
            // contain Admin.
            (
                Array.isArray(
                    directory
                )
                    ? directory
                    : []
            ).forEach(
                (
                    person
                ) => {
                    const role =
                        person?.role ||
                        person?.user
                            ?.role;

                    if (
                        role !==
                        "ADMIN"
                    ) {
                        return;
                    }

                    const id =
                        getUserId(
                            person
                        );

                    if (!id) {
                        return;
                    }

                    // Do NOT duplicate the Admin.
                    map.set(
                        id,
                        {
                            ...map.get(
                                id
                            ),

                            ...person,

                            userId:
                                id,

                            role:
                                "ADMIN",
                        }
                    );
                }
            );

            return Array.from(
                map.values()
            );
        }, [
            admins,
            directory,
            getUserId,
        ]);

    // =====================================================
    // PEOPLE AVAILABLE TO CURRENT USER
    // =====================================================

    const sourcePeople =
        useMemo(() => {
            if (!isAdmin) {
                // =========================================
                // EMPLOYEE:
                // ONLY ADMIN IS AVAILABLE
                // =========================================

                return adminList;
            }

            // =============================================
            // ADMIN:
            // ALL DIRECTORY USERS
            // =============================================

            const map =
                new Map();

            (
                Array.isArray(
                    directory
                )
                    ? directory
                    : []
            ).forEach(
                (
                    person
                ) => {
                    const id =
                        getUserId(
                            person
                        );

                    if (
                        !id ||
                        id ===
                            String(
                                currentUserId ||
                                ""
                            )
                    ) {
                        return;
                    }

                    map.set(
                        id,
                        {
                            ...person,

                            userId:
                                id,
                        }
                    );
                }
            );

            return Array.from(
                map.values()
            );
        }, [
            isAdmin,
            adminList,
            directory,
            getUserId,
            currentUserId,
        ]);

    // =====================================================
    // CONVERSATION MAP
    // =====================================================

    const conversationMap =
        useMemo(() => {
            const map =
                new Map();

            conversations.forEach(
                (
                    conversation
                ) => {
                    const otherId =
                        getOtherPersonId(
                            conversation
                        );

                    if (!otherId) {
                        return;
                    }

                    map.set(
                        otherId,
                        conversation
                    );
                }
            );

            return map;
        }, [
            conversations,
            getUserId,
        ]);

    // =====================================================
    // REQUEST MAPS
    // =====================================================

    const incomingRequestIds =
        useMemo(() => {
            const set =
                new Set();

            requests.incoming.forEach(
                (
                    request
                ) => {
                    const id =
                        getUserId(
                            request?.person
                        );

                    if (id) {
                        set.add(
                            id
                        );
                    }
                }
            );

            return set;
        }, [
            requests.incoming,
            getUserId,
        ]);

    const outgoingRequestIds =
        useMemo(() => {
            const set =
                new Set();

            requests.outgoing.forEach(
                (
                    request
                ) => {
                    const id =
                        getUserId(
                            request?.person
                        );

                    if (id) {
                        set.add(
                            id
                        );
                    }
                }
            );

            return set;
        }, [
            requests.outgoing,
            getUserId,
        ]);

    // =====================================================
    // COMBINED UNIQUE LIST
    // =====================================================

    const combinedList =
        useMemo(() => {
            let list =
                sourcePeople
                    .map(
                        (
                            person
                        ) => {
                            const id =
                                getUserId(
                                    person
                                );

                            if (!id) {
                                return null;
                            }

                            const conversation =
                                conversationMap.get(
                                    id
                                );

                            let type =
                                "NEW";

                            if (
                                conversation
                            ) {
                                type =
                                    "CONVERSATION";
                            } else if (
                                outgoingRequestIds.has(
                                    id
                                )
                            ) {
                                type =
                                    "OUTGOING_REQUEST";
                            } else if (
                                incomingRequestIds.has(
                                    id
                                )
                            ) {
                                type =
                                    "INCOMING_REQUEST";
                            }

                            return {
                                ...person,

                                userId:
                                    id,

                                type,

                                conversation,
                            };
                        }
                    )
                    .filter(
                        Boolean
                    );

            // Remove logged-in user.
            if (
                currentUserId
            ) {
                list =
                    list.filter(
                        (
                            person
                        ) =>
                            String(
                                person.userId
                            ) !==
                            String(
                                currentUserId
                            )
                    );
            }

            const term =
                searchTerm
                    .trim()
                    .toLowerCase();

            if (term) {
                list =
                    list.filter(
                        (
                            person
                        ) => {
                            const values =
                                [
                                    person.name,
                                    person.firstName,
                                    person.lastName,
                                    person.email,
                                    person.position,
                                    person.department,
                                ];

                            return values.some(
                                (
                                    value
                                ) =>
                                    String(
                                        value ||
                                        ""
                                    )
                                        .toLowerCase()
                                        .includes(
                                            term
                                        )
                            );
                        }
                    );
            }

            return list;
        }, [
            sourcePeople,
            conversationMap,
            outgoingRequestIds,
            incomingRequestIds,
            currentUserId,
            searchTerm,
            getUserId,
        ]);

    // =====================================================
    // TOTAL UNREAD
    // =====================================================

    const totalUnread =
        conversations.reduce(
            (
                total,
                conversation
            ) =>
                total +
                Number(
                    conversation
                        ?.unreadCount ||
                        0
                ),
            0
        );

    const incomingRequestsCount =
        requests.incoming.length;

    // =====================================================
    // ACTIVE CHAT VIEW
    // =====================================================

    if (
        activeConversation
    ) {
        const otherPerson =
            activeConversation
                .otherPerson ||
            {};

        const isChatBlocked =
            Boolean(
                activeConversation
                    .isBlocked
            );

        return (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 h-[calc(100vh-105px)] min-h-[600px] flex flex-col overflow-hidden sticky top-5">

                {/* ================= HEADER ================= */}

                <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-blue-50">

                    <div className="flex items-center gap-3 min-w-0">

                        <button
                            type="button"
                            onClick={() => {
                                setActiveConversation(
                                    null
                                );

                                setMessages(
                                    []
                                );
                            }}
                            className="p-2 rounded-lg hover:bg-white text-slate-500 transition-colors shrink-0"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </button>

                        <Avatar
                            person={
                                otherPerson
                            }
                            size="large"
                        />

                        <div className="min-w-0">

                            <p className="text-sm font-semibold text-slate-900 truncate">
                                {otherPerson.name ||
                                    "User"}
                            </p>

                            <p className="text-xs text-slate-400 truncate">
                                {otherPerson.position ||
                                    otherPerson.department ||
                                    (
                                        otherPerson.role ===
                                        "ADMIN"
                                            ? "Administrator"
                                            : ""
                                    )}
                            </p>

                        </div>

                    </div>

                    {/* ADMIN CONTROLS */}

                    {isAdmin && (
                        <div className="flex items-center gap-1.5 shrink-0">

                            <button
                                type="button"
                                onClick={() =>
                                    setTargetRestrictUser(
                                        otherPerson
                                    )
                                }
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition"
                            >
                                <Ban className="w-3.5 h-3.5" />

                                Restrict Posting
                            </button>

                            <button
                                type="button"
                                disabled={
                                    togglingBlock
                                }
                                onClick={
                                    handleToggleBlockChat
                                }
                                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition ${
                                    isChatBlocked
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                        : "bg-rose-50 text-rose-700 border-rose-200"
                                }`}
                            >
                                {togglingBlock ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : isChatBlocked ? (
                                    <>
                                        <ShieldCheck className="w-3.5 h-3.5" />

                                        Unblock
                                    </>
                                ) : (
                                    <>
                                        <ShieldAlert className="w-3.5 h-3.5" />

                                        Block
                                    </>
                                )}
                            </button>

                        </div>
                    )}

                </div>

                {/* ================= BLOCK NOTICE ================= */}

                {isChatBlocked && (
                    <div className="px-4 py-2 bg-rose-50 border-b border-rose-100 text-xs text-rose-700 flex items-center gap-2">

                        <Lock className="w-3.5 h-3.5 shrink-0" />

                        Chat in this conversation has been blocked by Admin.

                    </div>
                )}

                {/* ================= MESSAGES ================= */}

                <div
                    ref={
                        scrollRef
                    }
                    className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-slate-50/70 to-white"
                >

                    {messages.length ===
                    0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center">

                            <div className="w-14 h-14 rounded-full bg-indigo-50 flex items-center justify-center mb-3">
                                <MessageCircle className="w-6 h-6 text-indigo-500" />
                            </div>

                            <p className="text-sm font-medium text-slate-700">
                                Start a conversation
                            </p>

                            <p className="text-xs text-slate-400 mt-1">
                                Send a message to{" "}
                                {otherPerson.name ||
                                    "this user"}
                            </p>

                        </div>
                    ) : (
                        messages.map(
                            (
                                message,
                                index
                            ) => {
                                const senderId =
                                    message
                                        ?.senderId
                                        ?._id ||
                                    message
                                        ?.senderId ||
                                    message
                                        ?.sender
                                        ?._id ||
                                    message
                                        ?.sender
                                        ?.id ||
                                    null;

                                const isMine =
                                    String(
                                        senderId ||
                                        ""
                                    ) ===
                                    String(
                                        currentUserId ||
                                        ""
                                    );

                                const key =
                                    message.id ||
                                    message._id ||
                                    `${senderId}-${message.createdAt}-${index}`;

                                return (
                                    <div
                                        key={
                                            key
                                        }
                                        className={`flex ${
                                            isMine
                                                ? "justify-end"
                                                : "justify-start"
                                        }`}
                                    >
                                        <div
                                            className={`max-w-[80%] rounded-2xl px-4 py-2.5 shadow-sm text-sm ${
                                                isMine
                                                    ? "bg-gradient-to-br from-indigo-600 to-blue-500 text-white rounded-br-sm"
                                                    : "bg-white text-slate-700 border border-slate-200 rounded-bl-sm"
                                            }`}
                                        >
                                            <p className="whitespace-pre-wrap break-words">
                                                {message.text}
                                            </p>

                                            {message.createdAt && (
                                                <p
                                                    className={`mt-1.5 text-[10px] ${
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
                                            )}
                                        </div>
                                    </div>
                                );
                            }
                        )
                    )}

                </div>

                {/* ================= MESSAGE INPUT ================= */}

                <form
                    onSubmit={
                        handleSend
                    }
                    className="flex gap-2 p-3 border-t border-slate-100 bg-white"
                >

                    <input
                        type="text"
                        value={
                            messageInput
                        }
                        onChange={(event) =>
                            setMessageInput(
                                event.target.value
                            )
                        }
                        placeholder={
                            isChatBlocked &&
                            !isAdmin
                                ? "Chat has been blocked by Admin..."
                                : "Type a message..."
                        }
                        disabled={
                            isChatBlocked &&
                            !isAdmin
                        }
                        className="flex-1 text-sm !py-2.5 disabled:bg-slate-50 disabled:text-slate-400"
                    />

                    <button
                        type="submit"
                        disabled={
                            sending ||
                            !messageInput.trim() ||
                            (
                                isChatBlocked &&
                                !isAdmin
                            )
                        }
                        className="w-11 h-11 rounded-xl shrink-0 bg-gradient-to-br from-indigo-600 to-blue-500 text-white flex items-center justify-center disabled:opacity-50 hover:opacity-90"
                    >
                        {sending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Send className="w-4 h-4" />
                        )}
                    </button>

                </form>

                <RestrictedPostersModal
                    open={
                        Boolean(
                            targetRestrictUser
                        )
                    }
                    onClose={() =>
                        setTargetRestrictUser(
                            null
                        )
                    }
                    targetUser={
                        targetRestrictUser
                    }
                />

            </div>
        );
    }

    // =====================================================
    // MAIN MESSAGE PANEL
    // =====================================================

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 h-[calc(100vh-105px)] min-h-[600px] flex flex-col overflow-hidden sticky top-5">

            {/* ================= HEADER ================= */}

            <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-indigo-50/70 to-blue-50/70">

                <div className="flex items-center justify-between mb-3">

                    <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">

                        <MessageCircle className="w-4 h-4 text-indigo-600" />

                        Messages

                        {totalUnread >
                            0 && (
                            <span className="px-2 py-0.5 bg-indigo-600 text-white rounded-full text-[10px]">
                                {
                                    totalUnread
                                }
                            </span>
                        )}

                    </h2>

                    {/* Message request button is mainly useful for Admin. */}

                    {isAdmin && (
                        <button
                            type="button"
                            onClick={() =>
                                setShowRequests(
                                    true
                                )
                            }
                            className="relative p-2 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-white transition"
                        >
                            <UserPlus className="w-4 h-4" />

                            {incomingRequestsCount >
                                0 && (
                                <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 bg-rose-500 rounded-full text-white text-[9px] flex items-center justify-center">
                                    {
                                        incomingRequestsCount
                                    }
                                </span>
                            )}

                        </button>
                    )}

                </div>

                <div className="relative">

                    <Search className="absolute w-4 h-4 text-slate-400 left-3 top-1/2 -translate-y-1/2" />

                    <input
                        type="text"
                        value={
                            searchTerm
                        }
                        onChange={(event) =>
                            setSearchTerm(
                                event.target.value
                            )
                        }
                        placeholder={
                            isAdmin
                                ? "Search employees..."
                                : "Search admin..."
                        }
                        className="w-full pl-10 text-sm !py-2.5"
                    />

                </div>

            </div>

            {/* ================================================= */}
            {/* REQUESTS */}
            {/* ================================================= */}

            {showRequests &&
            isAdmin ? (
                <div className="flex-1 overflow-y-auto">

                    <div className="flex items-center gap-2 p-4 border-b border-slate-100">

                        <button
                            type="button"
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
                                Employees who want to connect with you
                            </p>
                        </div>

                    </div>

                    {requests.incoming.length ===
                        0 &&
                    requests.outgoing.length ===
                        0 && (
                        <EmptyState
                            icon={
                                <UserPlus className="w-5 h-5 text-slate-400" />
                            }
                            title="No message requests"
                            description="New requests will appear here."
                        />
                    )}

                    {requests.incoming.length >
                        0 && (
                        <>
                            <SectionTitle>
                                Incoming
                            </SectionTitle>

                            {requests.incoming.map(
                                (
                                    request
                                ) => (
                                    <RequestCard
                                        key={
                                            request.id ||
                                            request._id
                                        }
                                        request={
                                            request
                                        }
                                        loading={
                                            loadingRequests
                                        }
                                        onAccept={() =>
                                            acceptRequest(
                                                request
                                            )
                                        }
                                        onReject={() =>
                                            rejectRequest(
                                                request
                                            )
                                        }
                                    />
                                )
                            )}
                        </>
                    )}

                    {requests.outgoing.length >
                        0 && (
                        <>
                            <SectionTitle>
                                Sent Requests
                            </SectionTitle>

                            {requests.outgoing.map(
                                (
                                    request
                                ) => (
                                    <div
                                        key={
                                            request.id ||
                                            request._id
                                        }
                                        className="flex items-center gap-3 p-4 border-b border-slate-100"
                                    >
                                        <Avatar
                                            person={
                                                request.person
                                            }
                                        />

                                        <div className="min-w-0 flex-1">

                                            <p className="text-sm font-medium text-slate-800 truncate">
                                                {request.person?.name ||
                                                    "Employee"}
                                            </p>

                                            <p className="flex items-center gap-1 mt-0.5 text-xs text-amber-500">
                                                <Clock3 className="w-3 h-3" />

                                                Waiting for response
                                            </p>

                                        </div>
                                    </div>
                                )
                            )}
                        </>
                    )}

                </div>
            ) : (
                // =================================================
                // UNIQUE DIRECTORY / CONVERSATIONS
                // =================================================

                <div className="flex-1 overflow-y-auto">

                    {combinedList.length ===
                    0 ? (
                        <EmptyState
                            icon={
                                <Search className="w-5 h-5 text-slate-400" />
                            }
                            title="No one found"
                            description={
                                isAdmin
                                    ? "No employee matches your search."
                                    : "No admin user found."
                            }
                        />
                    ) : (
                        combinedList.map(
                            (
                                person
                            ) => {
                                const personId =
                                    getUserId(
                                        person
                                    );

                                const conversation =
                                    person.conversation;

                                // =================================
                                // EXISTING CONVERSATION
                                // =================================

                                if (
                                    person.type ===
                                        "CONVERSATION" &&
                                    conversation
                                ) {
                                    return (
                                        <div
                                            key={
                                                personId
                                            }
                                            className="flex items-center gap-2 p-3.5 border-b border-slate-50 hover:bg-indigo-50/60 transition group"
                                        >

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    openConversation(
                                                        conversation
                                                    )
                                                }
                                                className="flex flex-1 items-center gap-3 min-w-0 text-left"
                                            >

                                                <Avatar
                                                    person={
                                                        person
                                                    }
                                                />

                                                <div className="flex-1 min-w-0">

                                                    <p className="text-sm font-semibold text-slate-900 truncate">
                                                        {person.name ||
                                                            (
                                                                !isAdmin
                                                                    ? "Admin"
                                                                    : "Employee"
                                                            )}
                                                    </p>

                                                    <p className="text-xs text-slate-400 truncate">
                                                        {conversation.lastMessageText ||
                                                            (
                                                                person.role ===
                                                                "ADMIN"
                                                                    ? "Administrator"
                                                                    : person.position ||
                                                                      "Say hello 👋"
                                                            )}
                                                    </p>

                                                </div>

                                                {Number(
                                                    conversation.unreadCount ||
                                                    0
                                                ) >
                                                    0 && (
                                                    <span className="min-w-5 h-5 px-1 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center">
                                                        {
                                                            conversation.unreadCount
                                                        }
                                                    </span>
                                                )}

                                            </button>

                                            {isAdmin && (
                                                <button
                                                    type="button"
                                                    title="Restrict Posting"
                                                    onClick={() =>
                                                        setTargetRestrictUser(
                                                            person
                                                        )
                                                    }
                                                    className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
                                                >
                                                    <Ban className="w-4 h-4" />
                                                </button>
                                            )}

                                        </div>
                                    );
                                }

                                // =================================
                                // PERSON WITHOUT CONVERSATION
                                // =================================

                                const incoming =
                                    person.type ===
                                    "INCOMING_REQUEST";

                                const outgoing =
                                    person.type ===
                                    "OUTGOING_REQUEST";

                                return (
                                    <div
                                        key={
                                            personId
                                        }
                                        className="flex items-center justify-between gap-3 p-3.5 border-b border-slate-50 hover:bg-slate-50/70 transition"
                                    >

                                        <div className="flex items-center gap-3 min-w-0">

                                            <Avatar
                                                person={
                                                    person
                                                }
                                            />

                                            <div className="min-w-0">

                                                <p className="text-sm font-semibold text-slate-900 truncate">
                                                    {person.name ||
                                                        (
                                                            !isAdmin
                                                                ? "Admin"
                                                                : "Employee"
                                                        )}
                                                </p>

                                                <p className="text-xs text-slate-400 truncate">
                                                    {!isAdmin
                                                        ? "Administrator"
                                                        : person.position ||
                                                          person.department ||
                                                          "Employee"}
                                                </p>

                                            </div>

                                        </div>

                                        <div className="flex items-center gap-1.5 shrink-0">

                                            {/* EMPLOYEE -> ADMIN DIRECT CHAT */}

                                            {!isAdmin ? (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        startDirectConversationWithUser(
                                                            personId
                                                        )
                                                    }
                                                    className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition"
                                                >
                                                    Chat
                                                </button>
                                            ) : incoming ? (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setShowRequests(
                                                            true
                                                        )
                                                    }
                                                    className="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 text-xs font-semibold hover:bg-indigo-100 transition"
                                                >
                                                    Respond
                                                </button>
                                            ) : outgoing ? (
                                                <span className="flex items-center gap-1 text-xs text-amber-500">
                                                    <Clock3 className="w-3.5 h-3.5" />

                                                    Pending
                                                </span>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        sendRequest(
                                                            person
                                                        )
                                                    }
                                                    title="Send message request"
                                                    className="p-2 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition"
                                                >
                                                    <UserPlus className="w-4 h-4" />
                                                </button>
                                            )}

                                            {isAdmin && (
                                                <button
                                                    type="button"
                                                    title="Restrict Posting"
                                                    onClick={() =>
                                                        setTargetRestrictUser(
                                                            person
                                                        )
                                                    }
                                                    className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
                                                >
                                                    <Ban className="w-4 h-4" />
                                                </button>
                                            )}

                                        </div>

                                    </div>
                                );
                            }
                        )
                    )}

                </div>
            )}

            <RestrictedPostersModal
                open={
                    Boolean(
                        targetRestrictUser
                    )
                }
                onClose={() =>
                    setTargetRestrictUser(
                        null
                    )
                }
                targetUser={
                    targetRestrictUser
                }
            />

        </div>
    );
};

// =====================================================
// AVATAR
// =====================================================

const Avatar = ({
    person,
    size = "normal",
}) => {
    const dimension =
        size === "large"
            ? "w-10 h-10"
            : "w-10 h-10";

    const name =
        person?.name ||
        `${person?.firstName || ""} ${person?.lastName || ""}`.trim() ||
        "User";

    return (
        <div
            className={`${dimension} rounded-full bg-indigo-100 flex items-center justify-center overflow-hidden shrink-0`}
        >
            {person?.image ? (
                <img
                    src={
                        person.image
                    }
                    alt={
                        name
                    }
                    className="w-full h-full object-cover"
                />
            ) : (
                <span className="text-sm font-semibold text-indigo-600">
                    {name
                        .charAt(0)
                        .toUpperCase()}
                </span>
            )}
        </div>
    );
};

// =====================================================
// EMPTY STATE
// =====================================================

const EmptyState = ({
    icon,
    title,
    description,
}) => {
    return (
        <div className="p-8 text-center">

            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-100 flex items-center justify-center">
                {icon}
            </div>

            <p className="text-sm font-medium text-slate-600">
                {title}
            </p>

            <p className="mt-1 text-xs text-slate-400">
                {description}
            </p>

        </div>
    );
};

// =====================================================
// SECTION TITLE
// =====================================================

const SectionTitle = ({
    children,
}) => {
    return (
        <div className="px-4 py-3 bg-slate-50">

            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {children}
            </p>

        </div>
    );
};

// =====================================================
// MESSAGE REQUEST CARD
// =====================================================

const RequestCard = ({
    request,
    loading,
    onAccept,
    onReject,
}) => {
    const person =
        request?.person ||
        {};

    return (
        <div className="p-4 border-b border-slate-100">

            <div className="flex items-center gap-3">

                <Avatar
                    person={
                        person
                    }
                />

                <div className="min-w-0 flex-1">

                    <p className="text-sm font-semibold text-slate-800 truncate">
                        {person.name ||
                            "Employee"}
                    </p>

                    <p className="text-xs text-slate-400 truncate">
                        {person.position ||
                            person.department ||
                            "Employee"}
                    </p>

                </div>

            </div>

            <div className="flex gap-2 mt-3">

                <button
                    type="button"
                    disabled={
                        loading
                    }
                    onClick={
                        onAccept
                    }
                    className="flex-1 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-indigo-700 disabled:opacity-50"
                >
                    <Check className="w-3.5 h-3.5" />

                    Accept
                </button>

                <button
                    type="button"
                    disabled={
                        loading
                    }
                    onClick={
                        onReject
                    }
                    className="flex-1 py-2 rounded-lg bg-slate-100 text-slate-600 text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-slate-200 disabled:opacity-50"
                >
                    <X className="w-3.5 h-3.5" />

                    Decline
                </button>

            </div>

        </div>
    );
};

export default DMPanel;