import{
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    Plus,
    Trash2,
    Printer,
    Search,
    Filter,
    ArrowLeft,
    FileText,
    Eye,
    Clock,
    CheckCircle2,
} from "lucide-react";

import { format } from "date-fns";
import logo from "../assets/logo.jpg";
import api from "../api/axios";

// ============================================================
// ITEM
// ============================================================

const emptyItem = () => ({
    itemNo: "",
    idNo: "",
    partNo: "",
    description: "",
    manufacturerPartNo: "",
    qty: "",
    uom: "",
    estimatedDor: "",
    hsnCode: "",
    remarks: "",
});

// ============================================================
// APPROVAL MATRIX
// ============================================================

const APPROVAL_COLUMNS = [
    "Requested By",
    "Approved By",
    "Authorised By",
    "MTL Issued By",
];

const emptyApprovalRow = () =>
    Object.fromEntries(
        APPROVAL_COLUMNS.map(
            (column) => [
                column,
                "",
            ]
        )
    );

// ============================================================
// TODAY DATE
// ============================================================

const getTodayInputDate = () => {
    const now =
        new Date();

    const year =
        now.getFullYear();

    const month =
        String(
            now.getMonth() +
            1
        ).padStart(
            2,
            "0"
        );

    const day =
        String(
            now.getDate()
        ).padStart(
            2,
            "0"
        );

    return `${year}-${month}-${day}`;
};

// ============================================================
// AUTO RESIZE TEXTAREA
// ============================================================

const autoResizeTextarea = (
    element
) => {
    if (!element) {
        return;
    }

    element.style.height =
        "auto";

    element.style.height =
        `${element.scrollHeight}px`;
};

// ============================================================
// FALLBACK HISTORY
// ============================================================

const INITIAL_PAST_PASSES = [
    {
        id: 1,

        gatePassNo:
            "GP-2026-001",

        passType:
            "Returnable",

        to:
            "TechCorp India Pvt Ltd, Whitefield, Bengaluru",

        modeOfTransport:
            "DOCKET #7712",

        purpose:
            "Equipment Repair & Calibration",

        createdAt:
            "2026-08-24",
    },

    {
        id: 2,

        gatePassNo:
            "GP-2026-002",

        passType:
            "Non-Returnable",

        to:
            "Apex Logistics, Electronic City, Bengaluru",

        modeOfTransport:
            "Vehicle KA-01-MJ-4321",

        purpose:
            "Scrap Material Disposal",

        createdAt:
            "2026-08-20",
    },

    {
        id: 3,

        gatePassNo:
            "GP-2026-003",

        passType:
            "Returnable",

        to:
            "SmartSys Solutions, Indiranagar, Bengaluru",

        modeOfTransport:
            "Courier Express",

        purpose:
            "Demo Unit Testing",

        createdAt:
            "2026-08-15",
    },
];

// ============================================================
// NORMALIZE OLD + NEW RECORDS
// ============================================================

const normalizeGatePass = (
    pass
) => ({
    ...pass,

    id:
        pass.id ||
        pass._id,

    createdAt:
        pass.gatePassDate ||
        pass.createdAt,

    items:
        Array.isArray(
            pass.items
        )
            ? pass.items.map(
                (
                    item,
                    index
                ) => ({
                    ...emptyItem(),

                    ...item,

                    itemNo:
                        item.itemNo ||
                        String(
                            index +
                            1
                        ),

                    // Old records using hsnCode
                    // continue to display.
                    partNo:
                        item.partNo ||
                        item.hsnCode ||
                        "",
                })
            )
            : [],

    approvalName:
        pass.approvalName ||
        emptyApprovalRow(),

    approvalEmpNo:
        pass.approvalEmpNo ||
        emptyApprovalRow(),

    approvalDept:
        pass.approvalDept ||
        emptyApprovalRow(),
});

// ============================================================
// COMPONENT
// ============================================================

const GatePass = () => {
    // ========================================================
    // PAGE
    // ========================================================

    const [
        view,
        setView,
    ] = useState(
        "list"
    );

    // ========================================================
    // HISTORY
    // ========================================================

    const [
        pastPasses,
        setPastPasses,
    ] = useState(
        INITIAL_PAST_PASSES
    );

    const [
        canViewAll,
        setCanViewAll,
    ] = useState(
        false
    );

    const [
        savingGatePass,
        setSavingGatePass,
    ] = useState(
        false
    );

    const [
        savedPassId,
        setSavedPassId,
    ] = useState(
        null
    );

    // ========================================================
    // FILTERS
    // ========================================================

    const [
        search,
        setSearch,
    ] = useState(
        ""
    );

    const [
        typeFilter,
        setTypeFilter,
    ] = useState(
        ""
    );

    const [
        monthFilter,
        setMonthFilter,
    ] = useState(
        ""
    );

    const [
        yearFilter,
        setYearFilter,
    ] = useState(
        String(
            new Date().getFullYear()
        )
    );

    // ========================================================
    // FORM
    // ========================================================

    const [
        passType,
        setPassType,
    ] = useState(
        "Returnable"
    );

    const [
        to,
        setTo,
    ] = useState(
        ""
    );

    const [
        gatePassNo,
        setGatePassNo,
    ] = useState(
        ""
    );

    const [
        modeOfTransport,
        setModeOfTransport,
    ] = useState(
        ""
    );

    const [
        purpose,
        setPurpose,
    ] = useState(
        ""
    );

    const [
        gatePassDate,
        setGatePassDate,
    ] = useState(
        getTodayInputDate()
    );

    const [
        items,
        setItems,
    ] = useState([
        emptyItem(),
    ]);

    const [
        approvalName,
        setApprovalName,
    ] = useState(
        emptyApprovalRow()
    );

    const [
        approvalEmpNo,
        setApprovalEmpNo,
    ] = useState(
        emptyApprovalRow()
    );

    const [
        approvalDept,
        setApprovalDept,
    ] = useState(
        emptyApprovalRow()
    );

    // ========================================================
    // LOAD HISTORY
    // ========================================================

    useEffect(() => {
        let mounted =
            true;

        const fetchGatePassHistory =
            async () => {
                try {
                    const response =
                        await api.get(
                            "/gate-passes"
                        );

                    if (
                        !mounted
                    ) {
                        return;
                    }

                    const data =
                        response.data
                            ?.data ||
                        [];

                    setPastPasses(
                        data.map(
                            normalizeGatePass
                        )
                    );

                    setCanViewAll(
                        Boolean(
                            response.data
                                ?.canViewAll
                        )
                    );
                } catch (error) {
                    console.error(
                        "Fetch Gate Pass History Error:",
                        error
                    );
                }
            };

        fetchGatePassHistory();

        return () => {
            mounted =
                false;
        };
    }, []);

    // ========================================================
    // FILTERED HISTORY
    // ========================================================

    const filteredPasses =
        useMemo(() => {
            return pastPasses.filter(
                (pass) => {
                    const keyword =
                        search
                            .trim()
                            .toLowerCase();

                    const passTo =
                        String(
                            pass.to ||
                            ""
                        ).toLowerCase();

                    const passNo =
                        String(
                            pass.gatePassNo ||
                            ""
                        ).toLowerCase();

                    const passPurpose =
                        String(
                            pass.purpose ||
                            ""
                        ).toLowerCase();

                    const matchesSearch =
                        !keyword ||
                        passTo.includes(
                            keyword
                        ) ||
                        passNo.includes(
                            keyword
                        ) ||
                        passPurpose.includes(
                            keyword
                        );

                    const matchesType =
                        !typeFilter ||
                        pass.passType ===
                        typeFilter;

                    const passDate =
                        new Date(
                            pass.createdAt
                        );

                    const matchesMonth =
                        !monthFilter ||
                        passDate.getMonth() +
                        1 ===
                        Number(
                            monthFilter
                        );

                    const matchesYear =
                        !yearFilter ||
                        passDate.getFullYear() ===
                        Number(
                            yearFilter
                        );

                    return (
                        matchesSearch &&
                        matchesType &&
                        matchesMonth &&
                        matchesYear
                    );
                }
            );
        }, [
            pastPasses,
            search,
            typeFilter,
            monthFilter,
            yearFilter,
        ]);

    // ========================================================
    // STATS
    // ========================================================

    const stats =
        useMemo(() => {
            const returnable =
                pastPasses.filter(
                    (pass) =>
                        pass.passType ===
                        "Returnable"
                ).length;

            const nonReturnable =
                pastPasses.filter(
                    (pass) =>
                        pass.passType ===
                        "Non-Returnable"
                ).length;

            return {
                total:
                    pastPasses.length,

                returnable,

                nonReturnable,
            };
        }, [
            pastPasses,
        ]);

    // ========================================================
    // ITEM UPDATE
    // ========================================================

    const updateItem = (
        index,
        field,
        value
    ) => {
        setItems(
            (previous) =>
                previous.map(
                    (
                        item,
                        currentIndex
                    ) =>
                        currentIndex ===
                            index
                            ? {
                                ...item,

                                [field]:
                                    value,
                            }
                            : item
                )
        );
    };

    // ========================================================
    // AUTOMATIC UOM LOOKUP
    //
    // WH Part No. is the lookup key.
    // ========================================================

    const fetchItemUom = async (
        index,
        whPartNo
    ) => {
        const cleanPartNo =
            String(
                whPartNo ||
                ""
            ).trim();

        if (!cleanPartNo) {
            updateItem(
                index,
                "uom",
                ""
            );

            return;
        }

        try {
            const response =
                await api.get(
                    "/gate-passes/item-details",
                    {
                        params: {
                            whPartNo:
                                cleanPartNo,
                        },
                    }
                );

            const masterItem =
                response.data
                    ?.data;

            setItems(
                (previous) =>
                    previous.map(
                        (
                            currentItem,
                            currentIndex
                        ) =>
                            currentIndex ===
                                index
                                ? {
                                    ...currentItem,

                                    uom:
                                        masterItem?.uom ||
                                        "",
                                }
                                : currentItem
                    )
            );
        } catch (error) {
            console.error(
                "Gate Pass UOM Lookup Error:",
                error
            );

            updateItem(
                index,
                "uom",
                ""
            );
        }
    };

    // ========================================================
    // ADD ITEM
    // ========================================================

    const addItemRow = () => {
        setItems(
            (previous) => [
                ...previous,

                emptyItem(),
            ]
        );
    };

    // ========================================================
    // REMOVE ITEM
    // ========================================================

    const removeItemRow = (
        index
    ) => {
        setItems(
            (previous) =>
                previous.filter(
                    (
                        _,
                        currentIndex
                    ) =>
                        currentIndex !==
                        index
                )
        );
    };

    // ========================================================
    // NEW PASS
    // ========================================================

    const handleOpenCreateForm =
        () => {
            setPassType(
                "Returnable"
            );

            setGatePassNo(
                ""
            );

            setTo(
                ""
            );

            setModeOfTransport(
                ""
            );

            setPurpose(
                ""
            );

            setGatePassDate(
                getTodayInputDate()
            );

            setItems([
                emptyItem(),
            ]);

            setApprovalName(
                emptyApprovalRow()
            );

            setApprovalEmpNo(
                emptyApprovalRow()
            );

            setApprovalDept(
                emptyApprovalRow()
            );

            setSavedPassId(
                null
            );

            setView(
                "create"
            );
        };

    // ========================================================
    // SAVE + PRINT
    // ========================================================

    const handleSaveAndPrint =
        async () => {
            try {
                if (!savedPassId) {
                    setSavingGatePass(
                        true
                    );

                    const preparedItems =
                        items.map(
                            (
                                item,
                                index
                            ) => ({
                                ...item,

                                itemNo:
                                    String(
                                        index +
                                        1
                                    ),
                            })
                        );

                    const response =
                        await api.post(
                            "/gate-passes",
                            {
                                gatePassNo,

                                passType,

                                to,

                                modeOfTransport,

                                purpose,

                                gatePassDate,

                                items:
                                    preparedItems,

                                approvalName,

                                approvalEmpNo,

                                approvalDept,
                            }
                        );

                    const savedPass =
                        normalizeGatePass(
                            response.data
                                ?.data ||
                            {}
                        );

                    if (
                        savedPass.id
                    ) {
                        setSavedPassId(
                            savedPass.id
                        );
                    }

                    // Backend returns the final UOM.
                    if (
                        savedPass.items
                            ?.length
                    ) {
                        setItems(
                            savedPass.items.map(
                                (
                                    item,
                                    index
                                ) => ({
                                    ...emptyItem(),

                                    ...item,

                                    itemNo:
                                        String(
                                            index +
                                            1
                                        ),
                                })
                            )
                        );
                    }

                    setPastPasses(
                        (
                            previous
                        ) => {
                            const withoutDuplicate =
                                previous.filter(
                                    (
                                        pass
                                    ) =>
                                        String(
                                            pass.id
                                        ) !==
                                        String(
                                            savedPass.id
                                        )
                                );

                            return savedPass.id
                                ? [
                                    savedPass,

                                    ...withoutDuplicate,
                                ]
                                : previous;
                        }
                    );

                    if (
                        response.data
                            ?.canViewAll !==
                        undefined
                    ) {
                        setCanViewAll(
                            Boolean(
                                response
                                    .data
                                    .canViewAll
                            )
                        );
                    }
                }

                setTimeout(
                    () => {
                        window.print();
                    },
                    150
                );
            } catch (error) {
                console.error(
                    "Generate Gate Pass Error:",
                    error
                );

                alert(
                    error.response
                        ?.data
                        ?.error ||
                    "Failed to save gate pass. Please try again."
                );
            } finally {
                setSavingGatePass(
                    false
                );
            }
        };

    // ========================================================
    // OPEN EXISTING
    // ========================================================

    const openExistingPass = (
        pass
    ) => {
        setPassType(
            pass.passType ||
            "Returnable"
        );

        setGatePassNo(
            pass.gatePassNo ||
            ""
        );

        setTo(
            pass.to ||
            ""
        );

        setModeOfTransport(
            pass.modeOfTransport ||
            ""
        );

        setPurpose(
            pass.purpose ||
            ""
        );

        const originalDate =
            pass.gatePassDate ||
            pass.createdAt;

        if (originalDate) {
            try {
                setGatePassDate(
                    format(
                        new Date(
                            originalDate
                        ),
                        "yyyy-MM-dd"
                    )
                );
            } catch {
                setGatePassDate(
                    getTodayInputDate()
                );
            }
        }

        setItems(
            pass.items?.length
                ? pass.items.map(
                    (
                        item,
                        index
                    ) => ({
                        ...emptyItem(),

                        ...item,

                        itemNo:
                            String(
                                index +
                                1
                            ),

                        partNo:
                            item.partNo ||
                            item.hsnCode ||
                            "",
                    })
                )
                : [
                    emptyItem(),
                ]
        );

        setApprovalName(
            pass.approvalName ||
            emptyApprovalRow()
        );

        setApprovalEmpNo(
            pass.approvalEmpNo ||
            emptyApprovalRow()
        );

        setApprovalDept(
            pass.approvalDept ||
            emptyApprovalRow()
        );

        setSavedPassId(
            pass.id ||
            pass._id
        );

        setView(
            "create"
        );
    };

    // ========================================================
    // LIST PAGE
    // ========================================================

    if (
        view ===
        "list"
    ) {
        return (
            <div className="min-h-screen bg-slate-50 p-4 md:p-6">
                <div className="mx-auto max-w-7xl space-y-6">

                    {/* HEADER */}

                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">
                                Gate Pass
                            </h1>

                            <p className="text-sm text-slate-500">
                                View past gate passes and generate new ones
                            </p>
                        </div>

                        <button
                            onClick={
                                handleOpenCreateForm
                            }
                            className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-indigo-700"
                        >
                            <Plus
                                size={
                                    19
                                }
                            />

                            Generate Gate Pass
                        </button>
                    </div>

                    {/* STAT CARDS */}

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-slate-500">
                                        Total Gate Passes
                                    </p>

                                    <p className="mt-0.5 text-xl font-bold text-slate-900">
                                        {
                                            stats.total
                                        }
                                    </p>
                                </div>

                                <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
                                    <FileText
                                        size={
                                            20
                                        }
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-slate-500">
                                        Returnable
                                    </p>

                                    <p className="mt-0.5 text-xl font-bold text-slate-900">
                                        {
                                            stats.returnable
                                        }
                                    </p>
                                </div>

                                <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
                                    <Clock
                                        size={
                                            20
                                        }
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-slate-500">
                                        Non-Returnable
                                    </p>

                                    <p className="mt-0.5 text-xl font-bold text-slate-900">
                                        {
                                            stats.nonReturnable
                                        }
                                    </p>
                                </div>

                                <div className="rounded-lg bg-violet-50 p-2 text-violet-600">
                                    <CheckCircle2
                                        size={
                                            20
                                        }
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* FILTERS */}

                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                        <div className="mb-2 flex items-center gap-2">
                            <Filter
                                size={
                                    16
                                }
                                className="text-slate-500"
                            />

                            <h2 className="text-sm font-semibold text-slate-900">
                                Filters
                            </h2>
                        </div>

                        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-4">
                            <div className="relative">
                                <Search
                                    size={
                                        16
                                    }
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                                />

                                <input
                                    value={
                                        search
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        setSearch(
                                            event
                                                .target
                                                .value
                                        )
                                    }
                                    placeholder="Search recipient, gate pass no..."
                                    className="w-full rounded-xl border border-slate-200 py-1.5 pl-9 pr-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                />
                            </div>

                            <select
                                value={
                                    typeFilter
                                }
                                onChange={(
                                    event
                                ) =>
                                    setTypeFilter(
                                        event
                                            .target
                                            .value
                                    )
                                }
                                className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-indigo-500"
                            >
                                <option value="">
                                    All Pass Types
                                </option>

                                <option value="Returnable">
                                    Returnable
                                </option>

                                <option value="Non-Returnable">
                                    Non-Returnable
                                </option>
                            </select>

                            <select
                                value={
                                    monthFilter
                                }
                                onChange={(
                                    event
                                ) =>
                                    setMonthFilter(
                                        event
                                            .target
                                            .value
                                    )
                                }
                                className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-indigo-500"
                            >
                                <option value="">
                                    All Months
                                </option>

                                {Array.from(
                                    {
                                        length:
                                            12,
                                    },
                                    (
                                        _,
                                        index
                                    ) => (
                                        <option
                                            key={
                                                index +
                                                1
                                            }
                                            value={
                                                index +
                                                1
                                            }
                                        >
                                            {new Date(
                                                2000,
                                                index
                                            ).toLocaleString(
                                                "en-IN",
                                                {
                                                    month:
                                                        "long",
                                                }
                                            )}
                                        </option>
                                    )
                                )}
                            </select>

                            <select
                                value={
                                    yearFilter
                                }
                                onChange={(
                                    event
                                ) =>
                                    setYearFilter(
                                        event
                                            .target
                                            .value
                                    )
                                }
                                className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-indigo-500"
                            >
                                {Array.from(
                                    {
                                        length:
                                            6,
                                    },
                                    (
                                        _,
                                        index
                                    ) => {
                                        const year =
                                            new Date().getFullYear() -
                                            index;

                                        return (
                                            <option
                                                key={
                                                    year
                                                }
                                                value={
                                                    year
                                                }
                                            >
                                                {
                                                    year
                                                }
                                            </option>
                                        );
                                    }
                                )}
                            </select>
                        </div>
                    </div>

                    {/* HISTORY TABLE */}

                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                            <div>
                                <h2 className="font-bold text-slate-900">
                                    Past Gate Passes
                                </h2>

                                <p className="mt-0.5 text-xs text-slate-500">
                                    {
                                        filteredPasses.length
                                    }{" "}
                                    record
                                    {filteredPasses.length !==
                                        1
                                        ? "s"
                                        : ""}{" "}
                                    found
                                </p>
                            </div>
                        </div>

                        {filteredPasses.length ===
                            0 ? (
                            <div className="flex min-h-[250px] flex-col items-center justify-center px-6 text-center">
                                <div className="mb-3 rounded-full bg-slate-100 p-3">
                                    <FileText
                                        size={
                                            24
                                        }
                                        className="text-slate-400"
                                    />
                                </div>

                                <h3 className="font-semibold text-slate-800">
                                    No gate passes found
                                </h3>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full table-fixed text-left">
                                    <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                        <tr>
                                            <th className="px-5 py-3">
                                                Gate Pass No.
                                            </th>

                                            <th className="px-5 py-3">
                                                Date
                                            </th>

                                            <th className="px-5 py-3">
                                                Pass Type
                                            </th>

                                            <th className="px-5 py-3">
                                                Recipient / To
                                            </th>

                                            <th className="px-5 py-3">
                                                Purpose
                                            </th>

                                            {canViewAll && (
                                                <th className="px-5 py-3">
                                                    Generated By
                                                </th>
                                            )}
                                        </tr>
                                    </thead>

                                    <tbody className="divide-y divide-slate-100 text-sm">
                                        {filteredPasses.map(
                                            (
                                                pass
                                            ) => (
                                                <tr
                                                    key={
                                                        pass.id
                                                    }
                                                    className="transition hover:bg-slate-50"
                                                >
                                                    <td className="px-5 py-3.5 font-medium text-slate-800">
                                                        {pass.gatePassNo ||
                                                            "—"}
                                                    </td>

                                                    <td className="px-5 py-3.5 text-slate-600">
                                                        {pass.createdAt
                                                            ? format(
                                                                new Date(
                                                                    pass.createdAt
                                                                ),
                                                                "dd MMM yyyy"
                                                            )
                                                            : "—"}
                                                    </td>

                                                    <td className="px-5 py-3.5">
                                                        <span
                                                            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${pass.passType ===
                                                                "Returnable"
                                                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                                                : "border-violet-200 bg-violet-50 text-violet-700"
                                                                }`}
                                                        >
                                                            {
                                                                pass.passType
                                                            }
                                                        </span>
                                                    </td>

                                                    <td className="max-w-[220px] truncate px-5 py-3.5 text-slate-700">
                                                        {pass.to ||
                                                            "—"}
                                                    </td>

                                                    <td className="max-w-[200px] truncate px-5 py-3.5 text-slate-600">
                                                        {pass.purpose ||
                                                            "—"}
                                                    </td>

                                                    {canViewAll && (
                                                        <td className="px-5 py-3.5 text-slate-600">
                                                            {pass.createdByName ||
                                                                "Admin"}
                                                        </td>
                                                    )}
                                                </tr>
                                            )
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // ========================================================
    // GATE PASS DOCUMENT
    // ========================================================

    return (
        <>
            <style>
                {`

                    /* ================================================
                       PROFESSIONAL DOCUMENT FONT
                    ================================================ */

                    .gate-pass-document,
                    .gate-pass-document input,
                    .gate-pass-document textarea,
                    .gate-pass-document table,
                    .gate-pass-document button {
                        font-family: "Times New Roman", Times, serif;
                    }

                    /* ================================================
                       TABLE
                    ================================================ */

                    .gate-pass-date-screen {
    text-align: center;
    font-family: "Times New Roman", Times, serif;
    font-size: 14px;
}

.gate-pass-date-screen::-webkit-datetime-edit {
    text-align: center;
}

.gate-pass-date-screen::-webkit-calendar-picker-indicator {
    margin-left: 0;
}

                    .gate-pass-table {
                        width: 100%;
                        border-collapse: collapse;
                        table-layout: fixed;
                    }

                    .gate-pass-table th,
                    .gate-pass-table td {
                        border: 1px solid #0f172a;
                        vertical-align: middle;
                    }


                    /* ================================================
   PRINT ITEM ROW - PERFECT VERTICAL ALIGNMENT
================================================ */

.gate-pass-item-cell {
    vertical-align: middle !important;
    padding: 0 !important;
}

.gate-pass-item-input,
.gate-pass-item-textarea {
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;

    width: 100% !important;
    height: 28px !important;
    min-height: 28px !important;

    margin: 0 !important;
    padding: 0 2px !important;

    line-height: 28px !important;
    text-align: center !important;
    vertical-align: middle !important;

    border: none !important;
    background: transparent !important;
    box-sizing: border-box !important;

    overflow: hidden !important;
    resize: none !important;
}

.gate-pass-item-textarea {
    padding-top: 7px !important;
    padding-bottom: 0 !important;
    line-height: 14px !important;
}
                    /* ================================================
                       ITEM ROW
                    ================================================ */

                    .gate-pass-item-cell {
                        vertical-align: middle !important;
                    }

                    .gate-pass-item-input,
                    .gate-pass-item-textarea {
                        display: block;
                        width: 100%;
                        margin: 0 auto;
                        padding: 4px 2px;
                        border: none;
                        background: transparent;
                        text-align: center;
                        line-height: 16px;
                        outline: none;
                        box-sizing: border-box;
                        font-family: "Times New Roman", Times, serif;
                    }

                    .gate-pass-item-textarea {
                        min-height: 26px;
                        resize: none;
                        overflow: hidden;
                    }

                    /* ================================================
                       AUTO TO TEXTAREA
                    ================================================ */

                    .gate-pass-to-textarea {
                        display: block;
                        width: 100%;
                        min-height: 20px;
                        height: auto;
                        overflow: hidden;
                        resize: none;
                        border: none;
                        background: transparent;
                        padding: 0;
                        line-height: 20px;
                        outline: none;
                        box-sizing: border-box;
                    }

                    /* ================================================
                       DATE
                    ================================================ */

                    .gate-pass-date-print {
                        display: none;
                    }

                    /* ================================================
                       TABLE SCROLLBAR
                    ================================================ */

                    .gate-pass-table-wrapper {
                        scrollbar-width: none;
                    }

                    .gate-pass-table-wrapper::-webkit-scrollbar {
                        display: none;
                    }

                    /* ================================================
                       PRINT
                    ================================================ */

                    @media print {
    @page {
        size: A4 portrait;
        margin: 6mm;
    }

    html,
    body {
        margin: 0 !important;
        padding: 0 !important;
        background: white !important;
        overflow: visible !important;

        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
    }

    .print-hidden {
        display: none !important;
    }

    html,
    body,
    #root,
    main {
        overflow: visible !important;
        scrollbar-width: none !important;
    }

    html::-webkit-scrollbar,
    body::-webkit-scrollbar,
    #root::-webkit-scrollbar,
    main::-webkit-scrollbar {
        display: none !important;
        width: 0 !important;
        height: 0 !important;
    }

    /* ================================================
       GATE PASS DOCUMENT
    ================================================ */

    .gate-pass-document {
        width: 100% !important;
        max-width: none !important;
        margin: 0 !important;
        padding: 0 !important;
        box-shadow: none !important;
        overflow: visible !important;

        font-family:
            "Times New Roman",
            Times,
            serif !important;
    }

    .gate-pass-document * {
        font-family:
            "Times New Roman",
            Times,
            serif !important;
    }

    /* ================================================
       TABLE WRAPPER / SCROLLBAR
    ================================================ */

    .gate-pass-table-wrapper {
        overflow: visible !important;
        scrollbar-width: none !important;
    }

    .gate-pass-table-wrapper::-webkit-scrollbar {
        display: none !important;
        width: 0 !important;
        height: 0 !important;
    }

    /* ================================================
       TABLE
    ================================================ */

    .gate-pass-table {
        width: 100% !important;
        border-collapse: collapse !important;
        table-layout: fixed !important;
    }

    .gate-pass-table th,
    .gate-pass-table td {
        border: 1pt solid #000 !important;
        vertical-align: middle !important;

        padding-top: 2px !important;
        padding-bottom: 2px !important;

        line-height: 1.1 !important;
    }

    /* ================================================
       ITEM ROW - VERTICAL + HORIZONTAL ALIGNMENT
    ================================================ */

    .gate-pass-item-cell {
        vertical-align: middle !important;
        padding: 0 !important;
        text-align: center !important;
    }

    /* Normal input fields:
       ID, WH Part No, Qty, UOM
    */

    .gate-pass-item-input {
        display: block !important;

        width: 100% !important;
        height: 28px !important;
        min-height: 28px !important;

        margin: 0 !important;
        padding: 0 2px !important;

        border: none !important;
        outline: none !important;

        background: transparent !important;

        text-align: center !important;
        vertical-align: middle !important;

        line-height: 28px !important;

        box-sizing: border-box !important;

        color: #000 !important;

        font-family:
            "Times New Roman",
            Times,
            serif !important;
    }

    /* Textarea fields:
       Description
       Manufacturer Part No.
       Remarks
    */

    .gate-pass-item-textarea {
        display: block !important;

        width: 100% !important;
        height: 28px !important;
        min-height: 28px !important;

        margin: 0 !important;

        /*
           This top padding is what vertically centers
           textarea text like "Tools", "24-HZ", "good".
        */
        padding: 7px 2px 0 2px !important;

        border: none !important;
        outline: none !important;

        background: transparent !important;

        text-align: center !important;
        vertical-align: middle !important;

        line-height: 14px !important;

        box-sizing: border-box !important;

        overflow: hidden !important;
        resize: none !important;

        color: #000 !important;

        font-family:
            "Times New Roman",
            Times,
            serif !important;
    }

    /* ================================================
       DATE FIELD
    ================================================ */

    .gate-pass-date-screen {
        display: none !important;
    }

    .gate-pass-date-print {
        display: block !important;

        width: 100% !important;

        margin: 0 !important;

        text-align: center !important;

        color: #000 !important;

        font-family:
            "Times New Roman",
            Times,
            serif !important;

        font-size: 11px !important;
        line-height: 28px !important;
    }

    /* ================================================
       ALL PRINTED INPUT/TEXTAREA TEXT
    ================================================ */

    input,
    textarea {
        color: #000 !important;

        font-family:
            "Times New Roman",
            Times,
            serif !important;
    }

    textarea {
        overflow: hidden !important;
        resize: none !important;
    }

    /* ================================================
       APPROVAL MATRIX
    ================================================ */

    .approval-matrix-section {
        break-inside: avoid !important;
        page-break-inside: avoid !important;
    }

    .approval-matrix-section input,
    .approval-matrix-section textarea {
        color: #000 !important;

        font-family:
            "Times New Roman",
            Times,
            serif !important;

        text-align: center !important;
    }

    /* ================================================
       PREVENT ROWS / SECTIONS SPLITTING
    ================================================ */

    .gate-pass-section,
    .approval-matrix-section,
    tr {
        break-inside: avoid !important;
        page-break-inside: avoid !important;
    }
}
                `}
            </style>

            <div className="min-h-screen bg-slate-100 px-4 py-6 print:bg-white print:p-0">

                {/* SCREEN CONTROLS */}

                <div className="print-hidden mx-auto mb-4 flex max-w-5xl items-center justify-between">

                    <button
                        onClick={() =>
                            setView(
                                "list"
                            )
                        }
                        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                    >
                        <ArrowLeft
                            size={
                                16
                            }
                        />

                        Back to Gate Passes
                    </button>

                    <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1">
                        <button
                            type="button"
                            onClick={() =>
                                setPassType(
                                    "Returnable"
                                )
                            }
                            className={`rounded-lg px-4 py-2 text-xs font-semibold ${passType ===
                                "Returnable"
                                ? "bg-indigo-600 text-white"
                                : "text-slate-600"
                                }`}
                        >
                            Returnable
                        </button>

                        <button
                            type="button"
                            onClick={() =>
                                setPassType(
                                    "Non-Returnable"
                                )
                            }
                            className={`rounded-lg px-4 py-2 text-xs font-semibold ${passType ===
                                "Non-Returnable"
                                ? "bg-indigo-600 text-white"
                                : "text-slate-600"
                                }`}
                        >
                            Non-Returnable
                        </button>
                    </div>

                    <button
                        onClick={
                            handleSaveAndPrint
                        }
                        disabled={
                            savingGatePass
                        }
                        className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 font-semibold text-white shadow hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <Printer
                            size={
                                17
                            }
                        />

                        {savingGatePass
                            ? "Saving..."
                            : "Download / Print"}
                    </button>
                </div>

                {/* DOCUMENT */}

                <div className="gate-pass-document mx-auto max-w-5xl bg-white px-8 py-6 shadow-xl print:p-0 print:shadow-none">

                    {/* COMPANY */}

                    <div className="gate-pass-section text-center">
                        <img
                            src={
                                logo
                            }
                            alt="Wehark Solutions"
                            className="mx-auto h-14 w-auto object-contain"
                        />

                        <h1 className="mt-1 text-[17px] font-bold uppercase tracking-wide text-slate-950">
                            WEHARK SOLUTIONS PRIVATE LIMITED
                        </h1>

                        <p className="mt-1 text-[11px] font-medium text-slate-900">
                            Earthen Phoenix, 1st Floor, 10th E Cross,
                            Sanjeevappa Layout, Nagavarapalya,
                        </p>

                        <p className="text-[11px] font-medium text-slate-900">
                            CV Ramannagar, Bengaluru - 560093
                        </p>

                        <p className="text-[11px] font-medium text-slate-900">
                            Ph No.: +91 8867590544
                        </p>

                        <h2 className="mt-2 text-[13px] font-bold">
                            {passType ===
                                "Returnable"
                                ? "Returnable Pass"
                                : "Non-Returnable Pass"}
                        </h2>
                    </div>

                    {/* BASIC DETAILS */}

                    <div className="gate-pass-section mt-4 text-[12px]">

                        <div className="flex items-start justify-between gap-6">

                            {/* GP NO */}

                            <div className="flex flex-1 items-center gap-2">
                                <span className="shrink-0 font-bold">
                                    GP No:
                                </span>

                                <input
                                    value={
                                        gatePassNo
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        setGatePassNo(
                                            event
                                                .target
                                                .value
                                        )
                                    }
                                    placeholder="Enter Gate Pass No."
                                    className="w-full border-0 border-b border-dashed border-slate-400 bg-transparent px-1 py-0.5 font-semibold outline-none print:border-none"
                                />
                            </div>

                            {/* DATE */}

                            <div className="flex shrink-0 items-center gap-2">
                                <span className="font-bold">
                                    Date:
                                </span>

                                <input
                                    type="date"
                                    value={
                                        gatePassDate
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        setGatePassDate(
                                            event
                                                .target
                                                .value
                                        )
                                    }
                                    className="gate-pass-date-screen border-none bg-transparent font-semibold outline-none"
                                />

                                <span className="gate-pass-date-print font-semibold">
                                    {gatePassDate
                                        ? format(
                                            new Date(
                                                `${gatePassDate}T00:00:00`
                                            ),
                                            "dd-MM-yyyy"
                                        )
                                        : "—"}
                                </span>
                            </div>
                        </div>

                        {/* TO */}

                        <div className="mt-3">
                            <p className="font-bold">
                                To:
                            </p>

                            <textarea
                                value={
                                    to
                                }
                                ref={(
                                    element
                                ) =>
                                    autoResizeTextarea(
                                        element
                                    )
                                }
                                onChange={(
                                    event
                                ) => {
                                    setTo(
                                        event
                                            .target
                                            .value
                                    );

                                    autoResizeTextarea(
                                        event.target
                                    );
                                }}
                                rows={
                                    1
                                }
                                placeholder="Recipient / Company name and full address"
                                className="gate-pass-to-textarea mt-1 text-[12px] font-medium"
                            />
                        </div>

                        {/* PURPOSE */}

                        <div className="mt-2 flex items-center gap-2">
                            <span className="shrink-0 font-bold">
                                Purpose:
                            </span>

                            <input
                                value={
                                    purpose
                                }
                                onChange={(
                                    event
                                ) =>
                                    setPurpose(
                                        event
                                            .target
                                            .value
                                    )
                                }
                                className="w-full border-none bg-transparent outline-none"
                                placeholder="Purpose"
                            />
                        </div>

                        {/* MODE */}

                        <div className="mt-1 flex items-center gap-2">
                            <span className="shrink-0 font-bold">
                                Mode / Docket:
                            </span>

                            <input
                                value={
                                    modeOfTransport
                                }
                                onChange={(
                                    event
                                ) =>
                                    setModeOfTransport(
                                        event
                                            .target
                                            .value
                                    )
                                }
                                className="w-full border-none bg-transparent outline-none"
                                placeholder="Mode of Transport / Docket No."
                            />
                        </div>
                    </div>

                    {/* ITEM TABLE */}

                    <div className="gate-pass-section gate-pass-table-wrapper mt-4 overflow-x-auto">
                        <table className="gate-pass-table text-[10px]">
                            <colgroup>
                                <col
                                    style={{
                                        width:
                                            "6%",
                                    }}
                                />

                                <col
                                    style={{
                                        width:
                                            "8%",
                                    }}
                                />

                                <col
                                    style={{
                                        width:
                                            "12%",
                                    }}
                                />

                                <col
                                    style={{
                                        width:
                                            "17%",
                                    }}
                                />

                                <col
                                    style={{
                                        width:
                                            "13%",
                                    }}
                                />

                                <col
                                    style={{
                                        width:
                                            "7%",
                                    }}
                                />

                                <col
                                    style={{
                                        width:
                                            "8%",
                                    }}
                                />

                                <col
                                    style={{
                                        width:
                                            "15%",
                                    }}
                                />

                                <col
                                    style={{
                                        width:
                                            "14%",
                                    }}
                                />
                            </colgroup>

                            <thead>
                                <tr>
                                    <th className="px-1 py-1.5 text-center">
                                        Sl.No
                                    </th>

                                    <th className="px-1 py-1.5 text-center">
                                        Id.No
                                    </th>

                                    <th className="px-1 py-1.5 text-center">
                                        WH Part No.
                                    </th>

                                    <th className="px-1 py-1.5 text-center">
                                        Description
                                    </th>

                                    <th className="px-1 py-1.5 text-center">
                                        Manf.
                                        <br />
                                        Part No.
                                    </th>

                                    <th className="px-1 py-1.5 text-center">
                                        Qty
                                    </th>

                                    <th className="px-1 py-1.5 text-center">
                                        UOM
                                    </th>

                                    <th className="px-1 py-1.5 text-center">
                                        Estimated
                                        <br />
                                        DOR
                                    </th>

                                    <th className="px-1 py-1.5 text-center">
                                        <span className="flex items-center justify-center gap-1">
                                            Remarks

                                            <button
                                                type="button"
                                                onClick={
                                                    addItemRow
                                                }
                                                className="print-hidden text-indigo-600 hover:text-indigo-800"
                                                title="Add row"
                                            >
                                                <Plus
                                                    size={
                                                        13
                                                    }
                                                />
                                            </button>
                                        </span>
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {items.map(
                                    (
                                        item,
                                        index
                                    ) => (
                                        <tr
                                            key={
                                                index
                                            }
                                        >
                                            {/* AUTOMATIC SERIAL NUMBER */}

                                            <td className="gate-pass-item-cell p-1 text-center font-semibold">
                                                {
                                                    index +
                                                    1
                                                }
                                            </td>

                                            {/* ID NUMBER */}

                                            <td className="gate-pass-item-cell p-1">
                                                <input
                                                    value={
                                                        item.idNo
                                                    }
                                                    onChange={(
                                                        event
                                                    ) =>
                                                        updateItem(
                                                            index,
                                                            "idNo",
                                                            event
                                                                .target
                                                                .value
                                                        )
                                                    }
                                                    className="gate-pass-item-input"
                                                />
                                            </td>

                                            {/* WH PART NUMBER */}

                                            <td className="gate-pass-item-cell p-1">
                                                <input
                                                    value={
                                                        item.partNo
                                                    }
                                                    onChange={(
                                                        event
                                                    ) => {
                                                        const value =
                                                            event
                                                                .target
                                                                .value;

                                                        setItems(
                                                            (
                                                                previous
                                                            ) =>
                                                                previous.map(
                                                                    (
                                                                        currentItem,
                                                                        currentIndex
                                                                    ) =>
                                                                        currentIndex ===
                                                                            index
                                                                            ? {
                                                                                ...currentItem,

                                                                                partNo:
                                                                                    value,

                                                                                // Clear previous unit
                                                                                // whenever item changes.
                                                                                uom:
                                                                                    "",
                                                                            }
                                                                            : currentItem
                                                                )
                                                        );
                                                    }}
                                                    onBlur={(
                                                        event
                                                    ) =>
                                                        fetchItemUom(
                                                            index,
                                                            event
                                                                .target
                                                                .value
                                                        )
                                                    }
                                                    placeholder="WH Part No."
                                                    className="gate-pass-item-input"
                                                />
                                            </td>

                                            {/* DESCRIPTION */}

                                            <td className="gate-pass-item-cell p-1">
                                                <textarea
                                                    value={
                                                        item.description
                                                    }
                                                    ref={(
                                                        element
                                                    ) =>
                                                        autoResizeTextarea(
                                                            element
                                                        )
                                                    }
                                                    onChange={(
                                                        event
                                                    ) => {
                                                        updateItem(
                                                            index,
                                                            "description",
                                                            event
                                                                .target
                                                                .value
                                                        );

                                                        autoResizeTextarea(
                                                            event.target
                                                        );
                                                    }}
                                                    rows={
                                                        1
                                                    }
                                                    className="gate-pass-item-textarea"
                                                />
                                            </td>

                                            {/* MANUFACTURER PART */}

                                            <td className="gate-pass-item-cell p-1">
                                                <textarea
                                                    value={
                                                        item.manufacturerPartNo
                                                    }
                                                    ref={(
                                                        element
                                                    ) =>
                                                        autoResizeTextarea(
                                                            element
                                                        )
                                                    }
                                                    onChange={(
                                                        event
                                                    ) => {
                                                        updateItem(
                                                            index,
                                                            "manufacturerPartNo",
                                                            event
                                                                .target
                                                                .value
                                                        );

                                                        autoResizeTextarea(
                                                            event.target
                                                        );
                                                    }}
                                                    rows={
                                                        1
                                                    }
                                                    className="gate-pass-item-textarea"
                                                />
                                            </td>

                                            {/* QTY */}

                                            <td className="gate-pass-item-cell p-1">
                                                <input
                                                    value={
                                                        item.qty
                                                    }
                                                    onChange={(
                                                        event
                                                    ) =>
                                                        updateItem(
                                                            index,
                                                            "qty",
                                                            event
                                                                .target
                                                                .value
                                                        )
                                                    }
                                                    className="gate-pass-item-input"
                                                />
                                            </td>

                                            {/* UOM - MANUAL */}

                                            <td className="gate-pass-item-cell p-1">
                                                <input
                                                    value={item.uom || ""}
                                                    onChange={(event) =>
                                                        updateItem(
                                                            index,
                                                            "uom",
                                                            event.target.value
                                                        )
                                                    }
                                                    className="gate-pass-item-input"
                                                />
                                            </td>

                                            {/* ESTIMATED DOR */}

                                            <td className="gate-pass-item-cell p-1">
                                                <input
                                                    type="date"
                                                    value={
                                                        item.estimatedDor
                                                    }
                                                    onChange={(
                                                        event
                                                    ) =>
                                                        updateItem(
                                                            index,
                                                            "estimatedDor",
                                                            event
                                                                .target
                                                                .value
                                                        )
                                                    }
                                                    className="gate-pass-date-screen gate-pass-item-input text-[18px] text-center"
                                                />

                                                <span className="gate-pass-date-print text-center leading-4">
                                                    {item.estimatedDor
                                                        ? format(
                                                            new Date(
                                                                `${item.estimatedDor}T00:00:00`
                                                            ),
                                                            "dd-MM-yyyy"
                                                        )
                                                        : ""}
                                                </span>
                                            </td>

                                            {/* REMARKS */}

                                            <td className="gate-pass-item-cell p-1">
                                                <div className="flex items-center">
                                                    <textarea
                                                        value={
                                                            item.remarks
                                                        }
                                                        ref={(
                                                            element
                                                        ) =>
                                                            autoResizeTextarea(
                                                                element
                                                            )
                                                        }
                                                        onChange={(
                                                            event
                                                        ) => {
                                                            updateItem(
                                                                index,
                                                                "remarks",
                                                                event
                                                                    .target
                                                                    .value
                                                            );

                                                            autoResizeTextarea(
                                                                event.target
                                                            );
                                                        }}
                                                        rows={
                                                            1
                                                        }
                                                        className="gate-pass-item-textarea"
                                                    />

                                                    {items.length >
                                                        1 && (
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    removeItemRow(
                                                                        index
                                                                    )
                                                                }
                                                                className="print-hidden shrink-0 text-rose-500 hover:text-rose-700"
                                                                title="Remove row"
                                                            >
                                                                <Trash2
                                                                    size={
                                                                        13
                                                                    }
                                                                />
                                                            </button>
                                                        )}
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* APPROVAL MATRIX */}

                    <div className="gate-pass-section approval-matrix-section mt-4">
                        <table className="gate-pass-table text-[10px]">
                            <colgroup>
                                {Array.from({
                                    length:
                                        APPROVAL_COLUMNS.length +
                                        1,
                                }).map((_, index) => (
                                    <col
                                        key={
                                            index
                                        }
                                        style={{
                                            width:
                                                `${100 /
                                                (APPROVAL_COLUMNS.length +
                                                    1)}%`,
                                        }}
                                    />
                                ))}
                            </colgroup>

                            <thead>
                                <tr>
                                    <th className="px-1 py-1.5"></th>

                                    {APPROVAL_COLUMNS.map(
                                        (
                                            column
                                        ) => (
                                            <th
                                                key={
                                                    column
                                                }
                                                className="px-1 py-1.5 text-center"
                                            >
                                                {
                                                    column
                                                }
                                            </th>
                                        )
                                    )}
                                </tr>
                            </thead>

                            <tbody>
                                {/* NAME */}

                                <tr>
                                    <td className="px-2 py-1.5 font-bold">
                                        Name
                                    </td>

                                    {APPROVAL_COLUMNS.map(
                                        (
                                            column
                                        ) => (
                                            <td
                                                key={
                                                    column
                                                }
                                                className="p-1 align-middle"
                                            >
                                                <textarea
                                                    value={
                                                        approvalName[
                                                        column
                                                        ] ||
                                                        ""
                                                    }
                                                    onChange={(
                                                        event
                                                    ) =>
                                                        setApprovalName(
                                                            (
                                                                previous
                                                            ) => ({
                                                                ...previous,

                                                                [column]:
                                                                    event
                                                                        .target
                                                                        .value,
                                                            })
                                                        )
                                                    }
                                                    rows={
                                                        1
                                                    }
                                                    className="w-full resize-none overflow-hidden border-none bg-transparent py-1 text-center leading-4 outline-none"
                                                />
                                            </td>
                                        )
                                    )}
                                </tr>

                                {/* EMP NO */}

                                <tr>
                                    <td className="px-2 py-1.5 font-bold">
                                        Emp.No
                                    </td>

                                    {APPROVAL_COLUMNS.map(
                                        (
                                            column
                                        ) => (
                                            <td
                                                key={
                                                    column
                                                }
                                                className="p-1 align-middle"
                                            >
                                                <input
                                                    value={
                                                        approvalEmpNo[
                                                        column
                                                        ] ||
                                                        ""
                                                    }
                                                    onChange={(
                                                        event
                                                    ) =>
                                                        setApprovalEmpNo(
                                                            (
                                                                previous
                                                            ) => ({
                                                                ...previous,

                                                                [column]:
                                                                    event
                                                                        .target
                                                                        .value,
                                                            })
                                                        )
                                                    }
                                                    className="w-full border-none bg-transparent py-1 text-center leading-4 outline-none"
                                                />
                                            </td>
                                        )
                                    )}
                                </tr>

                                {/* DEPARTMENT */}

                                <tr>
                                    <td className="px-2 py-1.5 font-bold">
                                        Dept
                                    </td>

                                    {APPROVAL_COLUMNS.map(
                                        (
                                            column
                                        ) => (
                                            <td
                                                key={
                                                    column
                                                }
                                                className="p-1 align-middle"
                                            >
                                                <input
                                                    value={
                                                        approvalDept[
                                                        column
                                                        ] ||
                                                        ""
                                                    }
                                                    onChange={(
                                                        event
                                                    ) =>
                                                        setApprovalDept(
                                                            (
                                                                previous
                                                            ) => ({
                                                                ...previous,

                                                                [column]:
                                                                    event
                                                                        .target
                                                                        .value,
                                                            })
                                                        )
                                                    }
                                                    className="w-full border-none bg-transparent py-1 text-center leading-4 outline-none"
                                                />
                                            </td>
                                        )
                                    )}
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* NOTE */}

                    <p className="mt-3 text-center text-[10px] text-slate-700">
                        Note: This is a computer-generated gate pass; therefore, a signature is not required.
                    </p>

                    {/* FOOTER */}

                    <div className="mt-3 border-t border-slate-300 pt-1.5 text-center text-[9px] text-slate-500">
                        CIN: U46909TN2024PTC17326

                        &nbsp;&nbsp;&nbsp;
                        |
                        &nbsp;&nbsp;&nbsp;

                        GSTIN: 29AADCW9221H1Z2

                    </div>
                </div>
            </div>
        </>
    );
};

export default GatePass;