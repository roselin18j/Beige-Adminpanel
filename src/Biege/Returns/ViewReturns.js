
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import DataTable from "react-data-table-component";
import { toast } from "react-toastify";
import { makeApiRequest } from "../../AxiosServices/apiCall";

const theme = {
  headBg: "#f0e5d3",
  headText: "#6f533b",
  navy: "#1f2a4a",
  muted: "#7f8ba5",
  border: "#e9ebf3",
};

const inputCls =
  "w-full rounded-[10px] border border-[#e9ebf3] bg-[#f5f6fb] px-3.5 py-2.5 text-sm text-[#1f2a4a] outline-none transition placeholder:text-[#a9b2c7] disabled:cursor-not-allowed disabled:bg-[#eef0f6]";

const labelCls =
  "mb-1.5 block text-[13px] font-semibold text-[#1f2a4a]";

const btnBase =
  "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-[10px] px-[18px] py-[9px] text-[13px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-60";

const btnPrimary =
  `${btnBase} bg-[#6f533b] text-white shadow-[0_6px_14px_rgba(111,83,59,0.2)]`;

const btnOutline =
  `${btnBase} border border-[#e9ebf3] bg-white text-[#5a432f] hover:border-[#6f533b] hover:bg-[#fff9ef]`;

const actBase =
  "inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition";

const initialRejectValues = {
  rejectionReason: "",
};

const initialPickupValues = {
  courierName: "",
  pickupDate: "",
  trackingNumber: "",
  trackingUrl: "",
  notes: "",
};

const initialReceiveValues = {
  condition: "GOOD",
  conditionNotes: "",
  restock: false,
  warehouseId: "",
};

const initialRefundValues = {
  refundType: "FULL",
  refundMethod: "GATEWAY",
  refundAmount: "",
  reason: "",
};

// STATUS COLORS
const statusColors = {
  REQUESTED: "bg-[#fff3d6] text-[#b7791f]",
  APPROVED: "bg-[#e9ebff] text-[#6b73d6]",
  REJECTED: "bg-[#fdeaea] text-[#d64550]",
  PICKUP_SCHEDULED: "bg-[#e9ebff] text-[#6b73d6]",
  RECEIVED: "bg-[#e1f6ea] text-[#1f9d62]",
  REFUNDED: "bg-[#e1f6ea] text-[#1f9d62]",
};

const renderStatus = (value) => (
  <span
    className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-bold tracking-wide ${
      statusColors[value] || "bg-[#eef0f6] text-[#7f8ba5]"
    }`}
  >
    <span className="h-1.5 w-1.5 rounded-full bg-current" />
    {value?.replaceAll("_", " ") || "N/A"}
  </span>
);

const tableCustomStyles = {
  table: {
    style: {
      backgroundColor: "#ffffff",
    },
  },
  headRow: {
    style: {
      backgroundColor: theme.headBg,
      borderBottom: "none",
      minHeight: "50px",
    },
  },
  headCells: {
    style: {
      fontSize: "12px",
      fontWeight: "700",
      letterSpacing: "0.05em",
      textTransform: "uppercase",
      color: theme.headText,
      paddingLeft: "14px",
      paddingRight: "14px",
    },
  },
  rows: {
    style: {
      minHeight: "72px",
      fontSize: "13px",
      color: theme.navy,
      "&:not(:last-of-type)": {
        borderBottom: `1px solid ${theme.border}`,
      },
    },
    highlightOnHoverStyle: {
      backgroundColor: "#fff9ef",
      transitionDuration: "0.15s",
      outline: "none",
    },
  },
  cells: {
    style: {
      paddingLeft: "14px",
      paddingRight: "14px",
    },
  },
  pagination: {
    style: {
      borderTop: `1px solid ${theme.border}`,
      minHeight: "58px",
      fontSize: "13px",
      color: theme.muted,
    },
  },
};

// REUSABLE MODAL
function Modal({
  title,
  onClose,
  disabled,
  size = "max-w-lg",
  children,
  footer,
}) {
  return (
    <div className="fixed inset-0 z-[1050] flex items-center justify-center overflow-y-auto bg-[#1f2a4a]/45 p-4">
      <div
        className={`w-full ${size} overflow-hidden rounded-2xl bg-white shadow-[0_20px_50px_rgba(31,42,74,0.2)]`}
      >
        <div className="flex items-center justify-between bg-[#5a432f] px-6 py-[18px]">
          <h5 className="text-lg font-bold text-white">{title}</h5>

          <button
            type="button"
            onClick={onClose}
            disabled={disabled}
            className="cursor-pointer text-2xl leading-none text-white disabled:opacity-40"
          >
            &times;
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-6">
          {children}
        </div>

        <div className="flex flex-wrap justify-end gap-2.5 border-t border-[#e9ebf3] px-6 py-4">
          {footer}
        </div>
      </div>
    </div>
  );
}

// RESPONSE HELPERS
const getPayload = (response) => {
  return response?.data?.data || response?.data || response || {};
};

const getCustomerName = (customer) => {
  if (!customer) return "N/A";

  if (typeof customer === "string") return customer;

  return (
    customer.username ||
    customer.name ||
    customer.fullname ||
    [customer.firstname, customer.lastname].filter(Boolean).join(" ") ||
    "N/A"
  );
};

const getOrderId = (order) => {
  if (!order) return "N/A";

  if (typeof order === "string") return order;

  return order.orderId || order._id || "N/A";
};

const getReturnAmount = (row) => {
  return Number(
    row?.refundAmount ??
    row?.returnAmount ??
    row?.totalAmount ??
    row?.amount ??
    0
  );
};

function ViewReturns() {
  // MAIN DATA
  const [returns, setReturns] = useState([]);
  const [warehouses, setWarehouses] = useState([]);

  // LOADING
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // FILTERS
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // PAGINATION
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);

  // DETAILS
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  // ACTION MODALS
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showPickupModal, setShowPickupModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);

  // FORM VALUES
  const [rejectValues, setRejectValues] = useState(initialRejectValues);
  const [pickupValues, setPickupValues] = useState(initialPickupValues);
  const [receiveValues, setReceiveValues] = useState(initialReceiveValues);
  const [refundValues, setRefundValues] = useState(initialRefundValues);

  // ------------------------------------------------
  // GET RETURNS
  // ------------------------------------------------

  const getReturns = useCallback(async () => {
    try {
      setLoading(true);

      let url = `get-returns?page=${page}&limit=${limit}`;

      if (search.trim()) {
        url += `&search=${encodeURIComponent(search.trim())}`;
      }

      if (status) {
        url += `&status=${status}`;
      }

      if (startDate) {
        url += `&startDate=${startDate}`;
      }

      if (endDate) {
        url += `&endDate=${endDate}`;
      }

      const response = await makeApiRequest({
        url,
        method: "GET",
      });

      console.log("get-returns", response);

      const payload = getPayload(response);

      if (response?.status && Array.isArray(payload.returns)) {
        setReturns(payload.returns);

        setTotalRecords(
          payload.pagination?.total ??
          payload.pagination?.totalRecords ??
          payload.totalRecords ??
          payload.returns.length
        );
      } else if (response?.status && Array.isArray(payload.data)) {
        setReturns(payload.data);

        setTotalRecords(
          payload.pagination?.total ??
          payload.pagination?.totalRecords ??
          payload.data.length
        );
      } else if (response?.status && Array.isArray(response.data)) {
        setReturns(response.data);

        setTotalRecords(
          response.pagination?.total ??
          response.pagination?.totalRecords ??
          response.data.length
        );
      } else {
        setReturns([]);
        setTotalRecords(0);
      }
    } catch (error) {
      console.error("Get returns error:", error);

      setReturns([]);
      setTotalRecords(0);

      toast.error(
        error?.response?.data?.message ||
        "Failed to fetch return requests"
      );
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, status, startDate, endDate]);

  useEffect(() => {
    getReturns();
  }, [getReturns]);

  // ------------------------------------------------
  // GET WAREHOUSES
  // ------------------------------------------------

  const getWarehouses = async () => {
    try {
      const response = await makeApiRequest({
        url: "warehouse/get-warehouses",
        method: "GET",
      });

      console.log("get-warehouses", response);

      const payload = getPayload(response);

      if (response?.status && Array.isArray(payload)) {
        setWarehouses(payload);
      } else {
        setWarehouses([]);
      }
    } catch (error) {
      console.error("Get warehouses error:", error);
      setWarehouses([]);
    }
  };

  useEffect(() => {
    getWarehouses();
  }, []);

  // ------------------------------------------------
  // GET RETURN DETAILS
  // ------------------------------------------------

  const handleViewDetails = async (id) => {
    try {
      const response = await makeApiRequest({
        url: `get-return/${id}`,
        method: "GET",
      });

      console.log("get-return details", response);

      const payload = getPayload(response);

      if (response?.status) {
        setSelectedReturn(payload.return || payload.data || payload);
        setShowDetails(true);
      } else {
        toast.error(response?.message || "Failed to fetch return details");
      }
    } catch (error) {
      console.error("Return details error:", error);

      toast.error(
        error?.response?.data?.message ||
        "Failed to fetch return details"
      );
    }
  };

  const closeDetails = () => {
    setShowDetails(false);
    setSelectedReturn(null);
  };

  // ------------------------------------------------
  // REFRESH SELECTED RETURN
  // ------------------------------------------------

  const refreshReturn = async (id) => {
    await getReturns();

    if (id) {
      const response = await makeApiRequest({
        url: `get-return/${id}`,
        method: "GET",
      });

      const payload = getPayload(response);

      if (response?.status) {
        setSelectedReturn(payload.return || payload.data || payload);
      }
    }
  };

  // ------------------------------------------------
  // APPROVE RETURN
  // ------------------------------------------------

  const handleApproveReturn = async (row) => {
    const confirmed = window.confirm(
      `Are you sure you want to approve return ${row.returnId || row._id}?`
    );

    if (!confirmed) return;

    try {
      setSubmitting(true);

      const response = await makeApiRequest({
        url: `approve-return/${row._id}`,
        method: "PUT",
        data: {
          status: "APPROVED",
        },
      });

      console.log("approve-return", response);

      if (response?.status) {
        toast.success(response.message || "Return approved successfully");

        await refreshReturn(row._id);
      } else {
        toast.error(response?.message || "Failed to approve return");
      }
    } catch (error) {
      console.error("Approve return error:", error);

      toast.error(
        error?.response?.data?.message ||
        "Failed to approve return"
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ------------------------------------------------
  // OPEN REJECT MODAL
  // ------------------------------------------------

  const openRejectModal = (row) => {
    setSelectedReturn(row);
    setRejectValues({ ...initialRejectValues });
    setShowRejectModal(true);
  };

  const closeRejectModal = () => {
    if (submitting) return;

    setShowRejectModal(false);
    setRejectValues({ ...initialRejectValues });
  };

  // ------------------------------------------------
  // REJECT RETURN
  // ------------------------------------------------

  const handleRejectReturn = async (e) => {
    e.preventDefault();

    if (!rejectValues.rejectionReason.trim()) {
      toast.error("Please enter rejection reason");
      return;
    }

    try {
      setSubmitting(true);

      const response = await makeApiRequest({
        url: `reject-return/${selectedReturn._id}`,
        method: "PUT",
        data: {
          rejectionReason: rejectValues.rejectionReason.trim(),
          status: "REJECTED",
        },
      });

      console.log("reject-return", response);

      if (response?.status) {
        toast.success(response.message || "Return rejected successfully");

        setShowRejectModal(false);
        setRejectValues({ ...initialRejectValues });

        await refreshReturn(selectedReturn._id);
      } else {
        toast.error(response?.message || "Failed to reject return");
      }
    } catch (error) {
      console.error("Reject return error:", error);

      toast.error(
        error?.response?.data?.message ||
        "Failed to reject return"
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ------------------------------------------------
  // OPEN PICKUP MODAL
  // ------------------------------------------------

  const openPickupModal = (row) => {
    setSelectedReturn(row);
    setPickupValues({ ...initialPickupValues });
    setShowPickupModal(true);
  };

  const closePickupModal = () => {
    if (submitting) return;

    setShowPickupModal(false);
    setPickupValues({ ...initialPickupValues });
  };

  // ------------------------------------------------
  // SCHEDULE PICKUP
  // ------------------------------------------------

  const handleSchedulePickup = async (e) => {
    e.preventDefault();

    const {
      courierName,
      pickupDate,
      trackingNumber,
      trackingUrl,
      notes,
    } = pickupValues;

    if (!courierName.trim() || !pickupDate) {
      toast.error("Courier name and pickup date are required");
      return;
    }

    try {
      setSubmitting(true);

      const response = await makeApiRequest({
        url: `schedule-return-pickup/${selectedReturn._id}`,
        method: "POST",
        data: {
          courierName: courierName.trim(),
          pickupDate,
          trackingNumber: trackingNumber.trim(),
          trackingUrl: trackingUrl.trim(),
          notes: notes.trim(),
        },
      });

      console.log("schedule-return-pickup", response);

      if (response?.status) {
        toast.success(response.message || "Return pickup scheduled");

        setShowPickupModal(false);
        setPickupValues({ ...initialPickupValues });

        await refreshReturn(selectedReturn._id);
      } else {
        toast.error(response?.message || "Failed to schedule pickup");
      }
    } catch (error) {
      console.error("Schedule pickup error:", error);

      toast.error(
        error?.response?.data?.message ||
        "Failed to schedule pickup"
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ------------------------------------------------
  // OPEN RECEIVE MODAL
  // ------------------------------------------------

  const openReceiveModal = (row) => {
    setSelectedReturn(row);

    setReceiveValues({
      ...initialReceiveValues,
    });

    setShowReceiveModal(true);
  };

  const closeReceiveModal = () => {
    if (submitting) return;

    setShowReceiveModal(false);
    setReceiveValues({ ...initialReceiveValues });
  };

  // ------------------------------------------------
  // MARK RETURN RECEIVED
  // ------------------------------------------------

  const handleReceiveReturn = async (e) => {
    e.preventDefault();

    if (
      receiveValues.restock &&
      !receiveValues.warehouseId
    ) {
      toast.error("Select a warehouse for restocking");
      return;
    }

    try {
      setSubmitting(true);

      const response = await makeApiRequest({
        url: `receive-return/${selectedReturn._id}`,
        method: "PUT",
        data: {
          condition: receiveValues.condition,
          conditionNotes: receiveValues.conditionNotes.trim(),
          restock: receiveValues.restock,
          warehouseId: receiveValues.restock
            ? receiveValues.warehouseId
            : undefined,
        },
      });

      console.log("receive-return", response);

      if (response?.status) {
        toast.success(response.message || "Return received successfully");

        setShowReceiveModal(false);
        setReceiveValues({ ...initialReceiveValues });

        await refreshReturn(selectedReturn._id);
      } else {
        toast.error(response?.message || "Failed to receive return");
      }
    } catch (error) {
      console.error("Receive return error:", error);

      toast.error(
        error?.response?.data?.message ||
        "Failed to receive return"
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ------------------------------------------------
  // OPEN REFUND MODAL
  // ------------------------------------------------

  const openRefundModal = (row) => {
    setSelectedReturn(row);

    const amount = getReturnAmount(row);

    setRefundValues({
      ...initialRefundValues,
      refundAmount: String(amount),
    });

    setShowRefundModal(true);
  };

  const closeRefundModal = () => {
    if (submitting) return;

    setShowRefundModal(false);
    setRefundValues({ ...initialRefundValues });
  };

  // ------------------------------------------------
  // ISSUE REFUND
  // ------------------------------------------------

  const handleIssueRefund = async (e) => {
    e.preventDefault();

    const requestedAmount = Number(refundValues.refundAmount);
    const maximumAmount = getReturnAmount(selectedReturn);

    if (
      !Number.isFinite(requestedAmount) ||
      requestedAmount <= 0
    ) {
      toast.error("Enter a valid refund amount");
      return;
    }

    if (
      refundValues.refundType === "FULL" &&
      requestedAmount !== maximumAmount
    ) {
      toast.error("Full refund amount must match the return amount");
      return;
    }

    if (requestedAmount > maximumAmount) {
      toast.error("Refund amount cannot exceed the return amount");
      return;
    }

    if (!refundValues.reason.trim()) {
      toast.error("Please enter refund reason");
      return;
    }

    const confirmed = window.confirm(
      `Confirm refund of ₹${requestedAmount.toFixed(2)}?`
    );

    if (!confirmed) return;

    try {
      setSubmitting(true);

      const response = await makeApiRequest({
        url: `issue-return-refund/${selectedReturn._id}`,
        method: "POST",
        data: {
          refundType: refundValues.refundType,
          refundMethod: refundValues.refundMethod,
          refundAmount: requestedAmount,
          reason: refundValues.reason.trim(),
        },
      });

      console.log("issue-return-refund", response);

      if (response?.status) {
        toast.success(response.message || "Refund processed successfully");

        setShowRefundModal(false);
        setRefundValues({ ...initialRefundValues });

        await refreshReturn(selectedReturn._id);
      } else {
        toast.error(response?.message || "Failed to process refund");
      }
    } catch (error) {
      console.error("Issue refund error:", error);

      toast.error(
        error?.response?.data?.message ||
        "Failed to process refund"
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ------------------------------------------------
  // SEARCH / FILTER
  // ------------------------------------------------

  const handleSearch = (value) => {
    setSearch(value);
    setPage(1);
  };

  const handleStatusChange = (value) => {
    setStatus(value);
    setPage(1);
  };

  const handleDateChange = (field, value) => {
    if (field === "startDate") {
      setStartDate(value);
    } else {
      setEndDate(value);
    }

    setPage(1);
  };

  const clearFilters = () => {
    setSearch("");
    setStatus("");
    setStartDate("");
    setEndDate("");
    setPage(1);
  };

  // ------------------------------------------------
  // DATATABLE COLUMNS
  // ------------------------------------------------

  const columns = useMemo(
    () => [
      {
        name: "S.No",
        width: "70px",
        center: true,
        cell: (row, index) => (
          <span className="font-semibold text-[#7f8ba5]">
            {(page - 1) * limit + index + 1}
          </span>
        ),
      },
      {
        name: "Return ID",
        minWidth: "155px",
        selector: (row) => row.returnId || row._id || "N/A",
        cell: (row) => (
          <div>
            <div className="font-bold text-[#6f533b]">
              {row.returnId || "N/A"}
            </div>
            <div className="text-[10px] text-[#7f8ba5]">
              {row._id || ""}
            </div>
          </div>
        ),
      },
      {
        name: "Order ID",
        minWidth: "145px",
        selector: (row) => getOrderId(row.orderId || row.order),
        cell: (row) => (
          <span className="rounded-md bg-[#f0e5d3] px-2.5 py-1 font-mono text-xs text-[#6f533b]">
            {getOrderId(row.orderId || row.order)}
          </span>
        ),
      },
      {
        name: "Customer",
        minWidth: "170px",
        selector: (row) =>
          getCustomerName(row.userid || row.customer),
        cell: (row) => (
          <div className="py-2">
            <div className="font-bold text-[#1f2a4a]">
              {getCustomerName(row.userid || row.customer)}
            </div>
            <div className="text-[11px] text-[#7f8ba5]">
              {row.userid?.email || row.customer?.email || ""}
            </div>
          </div>
        ),
      },
      {
        name: "Product",
        minWidth: "180px",
        selector: (row) =>
          row.productName ||
          row.productId?.productname ||
          row.product?.productname ||
          row.items?.[0]?.productName ||
          "N/A",
        cell: (row) => (
          <div className="py-2">
            <div className="font-semibold text-[#1f2a4a]">
              {row.productName ||
                row.productId?.productname ||
                row.product?.productname ||
                row.items?.[0]?.productName ||
                "N/A"}
            </div>
            <div className="text-[11px] text-[#7f8ba5]">
              Qty: {row.quantity ?? row.items?.[0]?.quantity ?? 1}
            </div>
          </div>
        ),
      },
      {
        name: "Amount",
        width: "120px",
        selector: (row) => getReturnAmount(row),
        sortable: true,
        cell: (row) => (
          <strong className="text-[#1f2a4a]">
            ₹{getReturnAmount(row).toFixed(2)}
          </strong>
        ),
      },
      {
        name: "Reason",
        minWidth: "160px",
        selector: (row) => row.reason || "N/A",
        cell: (row) => (
          <span className="text-xs text-[#5a432f]">
            {row.reason || "N/A"}
          </span>
        ),
      },
      {
        name: "Date",
        minWidth: "135px",
        selector: (row) => row.createdAt || "",
        sortable: true,
        cell: (row) => (
          <span className="text-xs text-[#7f8ba5]">
            {row.createdAt
              ? new Date(row.createdAt).toLocaleDateString()
              : "N/A"}
          </span>
        ),
      },
      {
        name: "Status",
        minWidth: "165px",
        selector: (row) => row.status || "",
        cell: (row) => renderStatus(row.status),
      },
      {
        name: "Action",
        minWidth: "330px",
        center: true,
        cell: (row) => (
          <div className="flex flex-wrap items-center justify-center gap-2 py-2">
            <button
              type="button"
              onClick={() => handleViewDetails(row._id)}
              className={`${actBase} border border-[#e9ebf3] bg-white text-[#6f533b] hover:bg-[#fff9ef]`}
            >
              <i className="fa fa-eye"></i>
              View
            </button>

            {row.status === "REQUESTED" && (
              <>
                <button
                  type="button"
                  onClick={() => handleApproveReturn(row)}
                  disabled={submitting}
                  className={`${actBase} border border-[#d1f0df] bg-[#e1f6ea] text-[#1f9d62]`}
                >
                  <i className="fa fa-check"></i>
                  Approve
                </button>

                <button
                  type="button"
                  onClick={() => openRejectModal(row)}
                  disabled={submitting}
                  className={`${actBase} border border-[#fdeaea] bg-[#fdeaea] text-[#d64550]`}
                >
                  <i className="fa fa-times"></i>
                  Reject
                </button>
              </>
            )}

            {row.status === "APPROVED" && (
              <button
                type="button"
                onClick={() => openPickupModal(row)}
                className={`${actBase} border border-[#e9ebff] bg-[#e9ebff] text-[#6b73d6]`}
              >
                <i className="fa fa-truck"></i>
                Schedule Pickup
              </button>
            )}

            {row.status === "PICKUP_SCHEDULED" && (
              <button
                type="button"
                onClick={() => openReceiveModal(row)}
                className={`${actBase} border border-[#d1f0df] bg-[#e1f6ea] text-[#1f9d62]`}
              >
                <i className="fa fa-box"></i>
                Receive
              </button>
            )}

            {row.status === "RECEIVED" && (
              <button
                type="button"
                onClick={() => openRefundModal(row)}
                className={`${actBase} border border-[#d1f0df] bg-[#e1f6ea] text-[#1f9d62]`}
              >
                <i className="fa fa-money"></i>
                Refund
              </button>
            )}
          </div>
        ),
      },
    ],
    [page, limit, submitting]
  );

  // ------------------------------------------------
  // DETAILS HELPERS
  // ------------------------------------------------

  const detailLabel = "text-[13px] font-bold text-[#1f2a4a]";
  const detailValue = "mt-1 break-words text-sm text-[#5a432f]";

  const selectedPhotos =
    selectedReturn?.customerPhotos ||
    selectedReturn?.returnPhotos ||
    selectedReturn?.photos ||
    [];

  const selectedItems =
    selectedReturn?.items ||
    selectedReturn?.returnItems ||
    [];

  const selectedOrder =
    selectedReturn?.orderId || selectedReturn?.order;

  // ------------------------------------------------
  // UI
  // ------------------------------------------------

  return (
    <div className="min-h-screen bg-[#f5f6fb] px-3.5 py-[18px] text-[#1f2a4a] md:px-8 md:py-7">

      {/* HEADER */}

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3.5">
        <div>
          <h1 className="mb-1 text-[28px] font-bold text-black">
            Returns & Refunds
          </h1>

          <p className="text-sm text-black">
            Manage customer return requests, inspections and refunds
          </p>
        </div>

        <button
          type="button"
          className={btnOutline}
          onClick={getReturns}
          disabled={loading}
        >
          <i className="fa fa-refresh"></i>
          Refresh
        </button>
      </div>

      {/* SUMMARY CARDS */}

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            title: "Total Returns",
            value: totalRecords,
            icon: "fa fa-undo",
            color: "bg-[#f0e5d3] text-[#6f533b]",
          },
          {
            title: "Requested",
            value: returns.filter((r) => r.status === "REQUESTED").length,
            icon: "fa fa-clock-o",
            color: "bg-[#fff3d6] text-[#b7791f]",
          },
          {
            title: "Approved",
            value: returns.filter((r) => r.status === "APPROVED").length,
            icon: "fa fa-check-circle",
            color: "bg-[#e9ebff] text-[#6b73d6]",
          },
          {
            title: "Refunded",
            value: returns.filter((r) => r.status === "REFUNDED").length,
            icon: "fa fa-money",
            color: "bg-[#e1f6ea] text-[#1f9d62]",
          },
        ].map((card) => (
          <div
            key={card.title}
            className="rounded-2xl border border-[#e9ebf3] bg-white p-5 shadow-[0_4px_18px_rgba(31,42,74,0.04)]"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-[#7f8ba5]">
                  {card.title}
                </p>
                <h3 className="mt-2 text-2xl font-bold text-[#1f2a4a]">
                  {card.value}
                </h3>
              </div>

              <div
                className={`flex h-12 w-12 items-center justify-center rounded-xl ${card.color}`}
              >
                <i className={`${card.icon} text-xl`}></i>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* FILTERS */}

      <div className="mb-4 rounded-2xl border border-[#e9ebf3] bg-white p-6 shadow-[0_4px_18px_rgba(31,42,74,0.04)]">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div className="w-full max-w-[400px]">
            <label className={labelCls}>Search Returns</label>

            <input
              type="text"
              className={inputCls}
              placeholder="Search return ID, order ID or customer"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>

          <button
            type="button"
            className={btnOutline}
            onClick={clearFilters}
          >
            <i className="fa fa-refresh"></i>
            Clear Filters
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className={labelCls}>Return Status</label>

            <select
              className={inputCls}
              value={status}
              onChange={(e) => handleStatusChange(e.target.value)}
            >
              <option value="">All Status</option>
              <option value="REQUESTED">Requested</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="PICKUP_SCHEDULED">Pickup Scheduled</option>
              <option value="RECEIVED">Received</option>
              <option value="REFUNDED">Refunded</option>
            </select>
          </div>

          <div>
            <label className={labelCls}>From Date</label>

            <input
              type="date"
              className={inputCls}
              value={startDate}
              max={endDate || undefined}
              onChange={(e) =>
                handleDateChange("startDate", e.target.value)
              }
            />
          </div>

          <div>
            <label className={labelCls}>To Date</label>

            <input
              type="date"
              className={inputCls}
              value={endDate}
              min={startDate || undefined}
              onChange={(e) =>
                handleDateChange("endDate", e.target.value)
              }
            />
          </div>
        </div>
      </div>

      {/* RETURNS TABLE */}

      <div className="overflow-hidden rounded-2xl border border-[#e9ebf3] bg-white shadow-[0_4px_18px_rgba(31,42,74,0.04)]">

        <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-[#e9ebf3] px-6 py-[18px]">
          <h5 className="text-lg font-bold text-[#1f2a4a]">
            Return Requests
          </h5>

          <span className="rounded-[10px] bg-[#f0e5d3] px-3.5 py-1.5 text-xs font-bold text-[#6f533b]">
            Total Records: {totalRecords}
          </span>
        </div>

        <DataTable
          columns={columns}
          data={returns}
          customStyles={tableCustomStyles}
          progressPending={loading}
          progressComponent={
            <div className="p-[30px] text-[#7f8ba5]">
              Loading return requests...
            </div>
          }
          noDataComponent={
            <div className="p-10 text-[#7f8ba5]">
              No return requests found
            </div>
          }
          pagination
          paginationServer
          paginationTotalRows={totalRecords}
          paginationPerPage={limit}
          paginationDefaultPage={page}
          paginationRowsPerPageOptions={[10, 20, 50, 100]}
          onChangePage={(newPage) => setPage(newPage)}
          onChangeRowsPerPage={(newLimit) => {
            setLimit(newLimit);
            setPage(1);
          }}
          highlightOnHover
          responsive
          persistTableHead
        />
      </div>

      {/* ==========================================
          RETURN DETAILS MODAL
      ========================================== */}

      {showDetails && selectedReturn && (
        <Modal
          title="Return Details"
          size="max-w-5xl"
          onClose={closeDetails}
          footer={
            <button
              type="button"
              className={btnOutline}
              onClick={closeDetails}
            >
              Close
            </button>
          }
        >
          <div className="space-y-6">

            {/* BASIC DETAILS */}

            <div className="rounded-xl border border-[#e9ebf3] p-4">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-[#7f8ba5]">Return ID</p>
                  <h3 className="font-bold text-[#6f533b]">
                    {selectedReturn.returnId || selectedReturn._id}
                  </h3>
                </div>

                {renderStatus(selectedReturn.status)}
              </div>

              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div>
                  <p className={detailLabel}>Order ID</p>
                  <p className={detailValue}>
                    {getOrderId(selectedOrder)}
                  </p>
                </div>

                <div>
                  <p className={detailLabel}>Customer</p>
                  <p className={detailValue}>
                    {getCustomerName(
                      selectedReturn.userid || selectedReturn.customer
                    )}
                  </p>
                </div>

                <div>
                  <p className={detailLabel}>Return Date</p>
                  <p className={detailValue}>
                    {selectedReturn.createdAt
                      ? new Date(
                          selectedReturn.createdAt
                        ).toLocaleDateString()
                      : "N/A"}
                  </p>
                </div>

                <div>
                  <p className={detailLabel}>Return Amount</p>
                  <p className={detailValue}>
                    ₹{getReturnAmount(selectedReturn).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            {/* CUSTOMER INFORMATION */}

            <div>
              <h4 className="mb-3 text-base font-bold text-[#1f2a4a]">
                Customer Information
              </h4>

              <div className="grid grid-cols-1 gap-4 rounded-xl border border-[#e9ebf3] p-4 md:grid-cols-2">
                <div>
                  <p className={detailLabel}>Customer Name</p>
                  <p className={detailValue}>
                    {getCustomerName(
                      selectedReturn.userid || selectedReturn.customer
                    )}
                  </p>
                </div>

                <div>
                  <p className={detailLabel}>Email</p>
                  <p className={detailValue}>
                    {(selectedReturn.userid || selectedReturn.customer)?.email ||
                      "N/A"}
                  </p>
                </div>

                <div>
                  <p className={detailLabel}>Mobile</p>
                  <p className={detailValue}>
                    {(selectedReturn.userid || selectedReturn.customer)?.mobile ||
                      "N/A"}
                  </p>
                </div>
              </div>
            </div>

            {/* PRODUCT DETAILS */}

            <div>
              <h4 className="mb-3 text-base font-bold text-[#1f2a4a]">
                Returned Products
              </h4>

              {(selectedItems.length > 0 ? selectedItems : [selectedReturn]).map(
                (item, index) => {
                  const product =
                    item.productId ||
                    item.product ||
                    selectedReturn.productId ||
                    selectedReturn.product ||
                    {};

                  const productName =
                    item.productName ||
                    item.productname ||
                    product.productname ||
                    product.name ||
                    "N/A";

                  const images =
                    item.productimages ||
                    product.productimages ||
                    [];

                  const image =
                    item.image ||
                    (typeof images[0] === "string"
                      ? images[0]
                      : images[0]?.media);

                  return (
                    <div
                      key={item._id || index}
                      className="mb-3 flex flex-wrap items-center gap-4 rounded-xl border border-[#e9ebf3] p-4"
                    >
                      {image ? (
                        <img
                          src={image}
                          alt={productName}
                          className="h-16 w-16 rounded-lg border border-[#e9ebf3] object-cover"
                        />
                      ) : (
                        <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-[#f0e5d3] text-[#6f533b]">
                          <i className="fa fa-image text-xl"></i>
                        </div>
                      )}

                      <div className="min-w-[150px] flex-1">
                        <p className="font-bold text-[#1f2a4a]">
                          {productName}
                        </p>
                        <p className="mt-1 text-xs text-[#7f8ba5]">
                          Variant: {item.variantName || item.variant || "N/A"}
                        </p>
                        <p className="text-xs text-[#7f8ba5]">
                          Quantity: {item.quantity ?? selectedReturn.quantity ?? 1}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-[#7f8ba5]">Return Amount</p>
                        <p className="font-bold text-[#6f533b]">
                          ₹{Number(
                            item.returnAmount ??
                            item.total ??
                            item.price ??
                            selectedReturn.returnAmount ??
                            0
                          ).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  );
                }
              )}
            </div>

            {/* RETURN REASON */}

            <div className="rounded-xl border border-[#e9ebf3] p-4">
              <h4 className="mb-3 font-bold text-[#1f2a4a]">
                Return Request Information
              </h4>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <p className={detailLabel}>Return Reason</p>
                  <p className={detailValue}>
                    {selectedReturn.reason || "N/A"}
                  </p>
                </div>

                <div>
                  <p className={detailLabel}>Additional Description</p>
                  <p className={detailValue}>
                    {selectedReturn.description ||
                      selectedReturn.customerMessage ||
                      "N/A"}
                  </p>
                </div>
              </div>
            </div>

            {/* ELIGIBILITY */}

            <div className="rounded-xl border border-[#e9ebf3] p-4">
              <h4 className="mb-3 font-bold text-[#1f2a4a]">
                Return Eligibility
              </h4>

              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    selectedReturn.eligibility?.eligible ??
                    selectedReturn.isEligible
                      ? "bg-[#e1f6ea] text-[#1f9d62]"
                      : "bg-[#fdeaea] text-[#d64550]"
                  }`}
                >
                  {(
                    selectedReturn.eligibility?.eligible ??
                    selectedReturn.isEligible
                  ) === true
                    ? "ELIGIBLE"
                    : (
                        selectedReturn.eligibility?.eligible ??
                        selectedReturn.isEligible
                      ) === false
                      ? "NOT ELIGIBLE"
                      : "NOT CHECKED"}
                </span>

                <span className="text-xs text-[#7f8ba5]">
                  {selectedReturn.eligibility?.reason ||
                    selectedReturn.eligibilityReason ||
                    "Eligibility information not available"}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-4">
                <div>
                  <p className={detailLabel}>Product Condition</p>
                  <p className={detailValue}>
                    {selectedReturn.productCondition || "N/A"}
                  </p>
                </div>

                <div>
                  <p className={detailLabel}>Opened Product</p>
                  <p className={detailValue}>
                    {selectedReturn.isOpened === true
                      ? "Yes"
                      : selectedReturn.isOpened === false
                        ? "No"
                        : "N/A"}
                  </p>
                </div>
              </div>
            </div>

            {/* CUSTOMER PHOTOS */}

            <div>
              <h4 className="mb-3 font-bold text-[#1f2a4a]">
                Customer Uploaded Photos
              </h4>

              {selectedPhotos.length > 0 ? (
                <div className="flex flex-wrap gap-3">
                  {selectedPhotos.map((photo, index) => {
                    const url =
                      typeof photo === "string"
                        ? photo
                        : photo?.url || photo?.media;

                    return url ? (
                      <a
                        key={photo._id || index}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <img
                          src={url}
                          alt={`Return evidence ${index + 1}`}
                          className="h-24 w-24 rounded-xl border border-[#e9ebf3] object-cover"
                        />
                      </a>
                    ) : null;
                  })}
                </div>
              ) : (
                <p className="rounded-lg bg-[#f5f6fb] p-4 text-sm text-[#7f8ba5]">
                  No customer photos uploaded.
                </p>
              )}
            </div>

            {/* PICKUP INFORMATION */}

            {selectedReturn.pickup && (
              <div className="rounded-xl border border-[#e9ebf3] p-4">
                <h4 className="mb-3 font-bold text-[#1f2a4a]">
                  Pickup Information
                </h4>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className={detailLabel}>Courier</p>
                    <p className={detailValue}>
                      {selectedReturn.pickup.courierName || "N/A"}
                    </p>
                  </div>

                  <div>
                    <p className={detailLabel}>Pickup Date</p>
                    <p className={detailValue}>
                      {selectedReturn.pickup.pickupDate
                        ? new Date(
                            selectedReturn.pickup.pickupDate
                          ).toLocaleDateString()
                        : "N/A"}
                    </p>
                  </div>

                  <div>
                    <p className={detailLabel}>Tracking Number</p>
                    <p className={detailValue}>
                      {selectedReturn.pickup.trackingNumber || "N/A"}
                    </p>
                  </div>

                  <div>
                    <p className={detailLabel}>Tracking URL</p>
                    {selectedReturn.pickup.trackingUrl ? (
                      <a
                        href={selectedReturn.pickup.trackingUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 block break-all text-sm text-[#6f533b] underline"
                      >
                        Track Pickup
                      </a>
                    ) : (
                      <p className={detailValue}>N/A</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* INSPECTION INFORMATION */}

            {selectedReturn.inspection && (
              <div className="rounded-xl border border-[#e9ebf3] p-4">
                <h4 className="mb-3 font-bold text-[#1f2a4a]">
                  Product Inspection
                </h4>

                <p className={detailLabel}>Condition</p>
                <p className={detailValue}>
                  {selectedReturn.inspection.condition || "N/A"}
                </p>

                <p className={`${detailLabel} mt-3`}>Inspection Notes</p>
                <p className={detailValue}>
                  {selectedReturn.inspection.conditionNotes || "N/A"}
                </p>

                <p className={`${detailLabel} mt-3`}>Restocked</p>
                <p className={detailValue}>
                  {selectedReturn.inspection.restocked ? "Yes" : "No"}
                </p>
              </div>
            )}

            {/* REFUND INFORMATION */}

            {selectedReturn.refund && (
              <div className="rounded-xl border border-[#e9ebf3] p-4">
                <h4 className="mb-3 font-bold text-[#1f2a4a]">
                  Refund Information
                </h4>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className={detailLabel}>Refund Amount</p>
                    <p className={detailValue}>
                      ₹{Number(
                        selectedReturn.refund.refundAmount || 0
                      ).toFixed(2)}
                    </p>
                  </div>

                  <div>
                    <p className={detailLabel}>Refund Method</p>
                    <p className={detailValue}>
                      {selectedReturn.refund.refundMethod || "N/A"}
                    </p>
                  </div>

                  <div>
                    <p className={detailLabel}>Gateway Refund ID</p>
                    <p className={detailValue}>
                      {selectedReturn.refund.gatewayRefundId || "N/A"}
                    </p>
                  </div>

                  <div>
                    <p className={detailLabel}>Refund Status</p>
                    <p className={detailValue}>
                      {selectedReturn.refund.status || "N/A"}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* REJECTION INFORMATION */}

            {selectedReturn.rejectionReason && (
              <div className="rounded-xl border border-[#fdeaea] bg-[#fff8f8] p-4">
                <h4 className="font-bold text-[#d64550]">
                  Rejection Reason
                </h4>
                <p className="mt-2 text-sm text-[#5a432f]">
                  {selectedReturn.rejectionReason}
                </p>
              </div>
            )}

          </div>
        </Modal>
      )}

      {/* ==========================================
          REJECT RETURN MODAL
      ========================================== */}

      {showRejectModal && selectedReturn && (
        <form onSubmit={handleRejectReturn}>
          <Modal
            title="Reject Return Request"
            onClose={closeRejectModal}
            disabled={submitting}
            footer={
              <>
                <button
                  type="button"
                  className={btnOutline}
                  onClick={closeRejectModal}
                  disabled={submitting}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className={`${btnBase} bg-[#d64550] text-white`}
                  disabled={submitting}
                >
                  {submitting ? "Rejecting..." : "Reject Return"}
                </button>
              </>
            }
          >
            <div className="mb-4 rounded-xl bg-[#fff3f3] p-4">
              <p className="text-sm font-bold text-[#d64550]">
                Return ID: {selectedReturn.returnId || selectedReturn._id}
              </p>
              <p className="mt-1 text-xs text-[#7f8ba5]">
                The rejection reason will be sent to the customer.
              </p>
            </div>

            <label className={labelCls}>
              Rejection Reason *
            </label>

            <textarea
              className={inputCls}
              rows="4"
              placeholder="Enter reason for rejecting this return..."
              value={rejectValues.rejectionReason}
              onChange={(e) =>
                setRejectValues({
                  ...rejectValues,
                  rejectionReason: e.target.value,
                })
              }
              required
            />
          </Modal>
        </form>
      )}

      {/* ==========================================
          SCHEDULE PICKUP MODAL
      ========================================== */}

      {showPickupModal && selectedReturn && (
        <form onSubmit={handleSchedulePickup}>
          <Modal
            title="Schedule Return Pickup"
            size="max-w-2xl"
            onClose={closePickupModal}
            disabled={submitting}
            footer={
              <>
                <button
                  type="button"
                  className={btnOutline}
                  onClick={closePickupModal}
                  disabled={submitting}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className={btnPrimary}
                  disabled={submitting}
                >
                  {submitting ? "Scheduling..." : "Schedule Pickup"}
                </button>
              </>
            }
          >
            <div className="mb-4 rounded-xl bg-[#f0e5d3] p-4">
              <p className="font-bold text-[#6f533b]">
                Return: {selectedReturn.returnId || selectedReturn._id}
              </p>
              <p className="mt-1 text-xs text-[#7f8ba5]">
                Arrange courier collection from the customer.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className={labelCls}>
                  Courier Name *
                </label>

                <select
                  className={inputCls}
                  value={pickupValues.courierName}
                  onChange={(e) =>
                    setPickupValues({
                      ...pickupValues,
                      courierName: e.target.value,
                    })
                  }
                  required
                >
                  <option value="">Select Courier</option>
                  <option value="Shiprocket">Shiprocket</option>
                  <option value="Blue Dart">Blue Dart</option>
                  <option value="Delhivery">Delhivery</option>
                  <option value="DTDC">DTDC</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className={labelCls}>
                  Pickup Date *
                </label>

                <input
                  type="date"
                  className={inputCls}
                  min={new Date().toISOString().slice(0, 10)}
                  value={pickupValues.pickupDate}
                  onChange={(e) =>
                    setPickupValues({
                      ...pickupValues,
                      pickupDate: e.target.value,
                    })
                  }
                  required
                />
              </div>

              <div>
                <label className={labelCls}>
                  Tracking Number
                </label>

                <input
                  type="text"
                  className={inputCls}
                  placeholder="Enter AWB / pickup tracking number"
                  value={pickupValues.trackingNumber}
                  onChange={(e) =>
                    setPickupValues({
                      ...pickupValues,
                      trackingNumber: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <label className={labelCls}>
                  Tracking URL
                </label>

                <input
                  type="url"
                  className={inputCls}
                  placeholder="https://..."
                  value={pickupValues.trackingUrl}
                  onChange={(e) =>
                    setPickupValues({
                      ...pickupValues,
                      trackingUrl: e.target.value,
                    })
                  }
                />
              </div>

              <div className="md:col-span-2">
                <label className={labelCls}>
                  Pickup Notes
                </label>

                <textarea
                  className={inputCls}
                  rows="3"
                  placeholder="Additional pickup instructions"
                  value={pickupValues.notes}
                  onChange={(e) =>
                    setPickupValues({
                      ...pickupValues,
                      notes: e.target.value,
                    })
                  }
                />
              </div>
            </div>
          </Modal>
        </form>
      )}

      {/* ==========================================
          RECEIVE RETURN / CONDITION CHECK MODAL
      ========================================== */}

      {showReceiveModal && selectedReturn && (
        <form onSubmit={handleReceiveReturn}>
          <Modal
            title="Receive Returned Product"
            size="max-w-2xl"
            onClose={closeReceiveModal}
            disabled={submitting}
            footer={
              <>
                <button
                  type="button"
                  className={btnOutline}
                  onClick={closeReceiveModal}
                  disabled={submitting}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className={btnPrimary}
                  disabled={submitting}
                >
                  {submitting ? "Saving..." : "Confirm Received"}
                </button>
              </>
            }
          >
            <div className="mb-4 rounded-xl bg-[#f0e5d3] p-4">
              <p className="font-bold text-[#6f533b]">
                Return: {selectedReturn.returnId || selectedReturn._id}
              </p>

              <p className="mt-1 text-xs text-[#7f8ba5]">
                Inspect the product before confirming receipt and restocking.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className={labelCls}>
                  Product Condition *
                </label>

                <select
                  className={inputCls}
                  value={receiveValues.condition}
                  onChange={(e) =>
                    setReceiveValues({
                      ...receiveValues,
                      condition: e.target.value,
                      restock:
                        e.target.value === "GOOD"
                          ? receiveValues.restock
                          : false,
                    })
                  }
                >
                  <option value="GOOD">Good / Unopened</option>
                  <option value="DAMAGED">Damaged</option>
                  <option value="OPENED">Opened</option>
                  <option value="DEFECTIVE">Defective</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className={labelCls}>
                  Inspection Notes
                </label>

                <textarea
                  className={inputCls}
                  rows="3"
                  placeholder="Describe the returned product condition..."
                  value={receiveValues.conditionNotes}
                  onChange={(e) =>
                    setReceiveValues({
                      ...receiveValues,
                      conditionNotes: e.target.value,
                    })
                  }
                />
              </div>

              <div className="rounded-xl border border-[#e9ebf3] p-4">
                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[#6f533b]"
                    checked={receiveValues.restock}
                    disabled={receiveValues.condition !== "GOOD"}
                    onChange={(e) =>
                      setReceiveValues({
                        ...receiveValues,
                        restock: e.target.checked,
                      })
                    }
                  />

                  <span className="text-sm font-bold text-[#1f2a4a]">
                    Restock returned product
                  </span>
                </label>

                <p className="mt-2 text-xs text-[#7f8ba5]">
                  Only products inspected and approved as sellable should be
                  added back to inventory.
                </p>

                {receiveValues.restock && (
                  <div className="mt-4">
                    <label className={labelCls}>
                      Restock Warehouse *
                    </label>

                    <select
                      className={inputCls}
                      value={receiveValues.warehouseId}
                      onChange={(e) =>
                        setReceiveValues({
                          ...receiveValues,
                          warehouseId: e.target.value,
                        })
                      }
                      required
                    >
                      <option value="">Select Warehouse</option>

                      {warehouses.map((warehouse) => (
                        <option
                          key={warehouse._id}
                          value={warehouse._id}
                        >
                          {warehouse.name} ({warehouse.code})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {receiveValues.condition !== "GOOD" && (
                <div className="rounded-lg bg-[#fff3d6] p-3 text-xs text-[#b7791f]">
                  This condition is not eligible for automatic restocking.
                  Inspect and handle the item according to your return policy.
                </div>
              )}
            </div>
          </Modal>
        </form>
      )}

      {/* ==========================================
          REFUND MODAL
      ========================================== */}

      {showRefundModal && selectedReturn && (
        <form onSubmit={handleIssueRefund}>
          <Modal
            title="Issue Refund"
            size="max-w-2xl"
            onClose={closeRefundModal}
            disabled={submitting}
            footer={
              <>
                <button
                  type="button"
                  className={btnOutline}
                  onClick={closeRefundModal}
                  disabled={submitting}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className={btnPrimary}
                  disabled={submitting}
                >
                  {submitting ? "Processing..." : "Process Refund"}
                </button>
              </>
            }
          >
            <div className="mb-4 rounded-xl bg-[#f0e5d3] p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-[#7f8ba5]">Return ID</p>
                  <p className="font-bold text-[#6f533b]">
                    {selectedReturn.returnId || selectedReturn._id}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-xs text-[#7f8ba5]">Maximum Refund</p>
                  <p className="text-xl font-bold text-[#6f533b]">
                    ₹{getReturnAmount(selectedReturn).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className={labelCls}>
                  Refund Type *
                </label>

                <select
                  className={inputCls}
                  value={refundValues.refundType}
                  onChange={(e) => {
                    const refundType = e.target.value;

                    setRefundValues((prev) => ({
                      ...prev,
                      refundType,
                      refundAmount:
                        refundType === "FULL"
                          ? String(getReturnAmount(selectedReturn))
                          : "",
                    }));
                  }}
                >
                  <option value="FULL">Full Refund</option>
                  <option value="PARTIAL">Partial Refund</option>
                </select>
              </div>

              <div>
                <label className={labelCls}>
                  Refund Amount (₹) *
                </label>

                <input
                  type="number"
                  className={inputCls}
                  min="0.01"
                  max={getReturnAmount(selectedReturn)}
                  step="0.01"
                  value={refundValues.refundAmount}
                  disabled={refundValues.refundType === "FULL"}
                  onChange={(e) =>
                    setRefundValues({
                      ...refundValues,
                      refundAmount: e.target.value,
                    })
                  }
                  required
                />

                <p className="mt-1 text-xs text-[#7f8ba5]">
                  Maximum refundable amount: ₹
                  {getReturnAmount(selectedReturn).toFixed(2)}
                </p>
              </div>

              <div>
                <label className={labelCls}>
                  Refund Method *
                </label>

                <select
                  className={inputCls}
                  value={refundValues.refundMethod}
                  onChange={(e) =>
                    setRefundValues({
                      ...refundValues,
                      refundMethod: e.target.value,
                    })
                  }
                >
                  <option value="GATEWAY">
                    Original Payment Gateway (Razorpay)
                  </option>
                  <option value="STORE_CREDIT">
                    Store Credit
                  </option>
                </select>
              </div>

              <div>
                <label className={labelCls}>
                  Refund Reason *
                </label>

                <textarea
                  className={inputCls}
                  rows="3"
                  placeholder="Enter refund reason..."
                  value={refundValues.reason}
                  onChange={(e) =>
                    setRefundValues({
                      ...refundValues,
                      reason: e.target.value,
                    })
                  }
                  required
                />
              </div>

              <div className="rounded-lg bg-[#fff3d6] p-3 text-xs text-[#8a651d]">
                Gateway refunds must be processed and verified through the
                payment gateway. Do not mark a refund as successful until
                the gateway confirms it. Store credit should be recorded
                separately in the customer's wallet.
              </div>
            </div>
          </Modal>
        </form>
      )}

    </div>
  );
}

export default ViewReturns;
