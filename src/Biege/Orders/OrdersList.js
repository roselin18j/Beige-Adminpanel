
import React, { useCallback, useEffect, useMemo, useState } from "react";
import DataTable from "react-data-table-component";
import { toast } from "react-toastify";
import {
  FaEye,
  FaArrowLeft,
  FaSearch,
  FaSync,
  FaFileInvoice,
  FaBox,
  FaTruck,
  FaCheckCircle,
  FaTimesCircle,
  FaStickyNote,
  FaDownload,
  FaFilter,
} from "react-icons/fa";

import { makeApiRequest } from "../../AxiosServices/apiCall";



const formatDate = (date) => {
  if (!date) return "-";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) return "-";

  return parsedDate.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatDateTime = (date) => {
  if (!date) return "-";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) return "-";

  return parsedDate.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatCurrency = (amount) => {
  return `₹${Number(amount || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const getResponsePayload = (response) => {
  return response?.data?.data || response?.data || response || {};
};

const getOrderId = (order) =>
  order?.orderId || order?.orderNumber || order?.invoiceId || order?._id || "-";

const getCustomerName = (order) =>
  order?.customer?.name ||
  order?.customerName ||
  order?.user?.username ||
  order?.userid?.username ||
  order?.delivery_Address?.name ||
  "-";

const getCustomerEmail = (order) =>
  order?.customer?.email ||
  order?.customerEmail ||
  order?.user?.email ||
  order?.userid?.email ||
  order?.delivery_Address?.email ||
  "-";

const getCustomerPhone = (order) =>
  order?.customer?.phone ||
  order?.customerPhone ||
  order?.user?.mobile ||
  order?.userid?.mobile ||
  order?.delivery_Address?.mobile ||
  "-";



const getItems = (order) => {
  if (Array.isArray(order?.product)) {
    return order.product.flatMap((product) => {
      const details = Array.isArray(product?.productdetails)
        ? product.productdetails
        : [];

      return details.map((detail) => {
        const price = Number(detail?.price || 0);
        const quantity = Number(detail?.quantity || 0);
        const discount = Number(detail?.discount_price || 0);
        const gstAmount = Number(detail?.gstPrice || 0);

        const calculatedTotal =
          (price - discount + gstAmount) * quantity;

        return {
          ...detail,
          productName: product?.productname || "-",
          productId: product?.productid?._id || product?.productid || "",
          category: product?.category || "-",
          productimages: product?.productimages || [],
          sku: product?.sku || product?.productid?.sku || "",
          variantName: [detail?.size, detail?.shade]
            .filter(Boolean)
            .join(" / ") || "-",
          price,
          quantity,
          discount,
          gstAmount,
          total:
            detail?.total !== undefined &&
            detail?.total !== null &&
            Number(detail.total) > 0
              ? Number(detail.total)
              : calculatedTotal,
        };
      });
    });
  }

  return order?.items || order?.products || order?.orderItems || [];
};

const getOrderTotal = (order) =>
  Number(
    order?.amount ??
      order?.totalAmount ??
      order?.grandTotal ??
      order?.total ??
      order?.payableAmount ??
      0
  );


const getStatus = (order) => {
  const orderStatus = String(order?.orderStatus || "").toUpperCase();
  const legacyStatus = String(
    order?.productStatus || order?.deliveryStatus || ""
  ).toUpperCase();

  if (
    orderStatus === "PENDING" &&
    legacyStatus &&
    legacyStatus !== "PENDING"
  ) {
    return legacyStatus;
  }

  return orderStatus || legacyStatus || "PENDING";
};

const getPaymentStatus = (order) => {
  let status =
    order?.paymentDetail?.status ||
    order?.payment?.status ||
    order?.paymentStatus ||
    "PENDING";

  status = String(status).toUpperCase();

  if (status === "SUCCESS") return "PAID";

  return status;
};

const getStatusColor = (status) => {
  const value = String(status || "").toUpperCase();

  const colors = {
    PENDING: "bg-yellow-100 text-yellow-800",
    CONFIRMED: "bg-blue-100 text-blue-800",
    PROCESSING: "bg-indigo-100 text-indigo-800",
    PACKED: "bg-purple-100 text-purple-800",
    SHIPPED: "bg-cyan-100 text-cyan-800",
    DELIVERED: "bg-green-100 text-green-800",
    CANCELLED: "bg-red-100 text-red-800",
    PAID: "bg-green-100 text-green-800",
    SUCCESS: "bg-green-100 text-green-800",
    FAILED: "bg-red-100 text-red-800",
    REFUNDED: "bg-purple-100 text-purple-800",
  };

  return colors[value] || "bg-gray-100 text-gray-700";
};

const getPaymentMethod = (order) =>
  order?.paymentMethod ||
  order?.paymentDetail?.paymentMethod ||
  order?.payment?.method ||
  "-";

const getAddress = (order) =>
  order?.delivery_Address ||
  order?.shippingAddress ||
  order?.billingAddress ||
  order?.shipping ||
  order?.billing ||
  {};

const getProductImage = (item) => {
  const images = item?.productimages;

  if (!Array.isArray(images) || !images.length) return "";

  const firstImage = images[0];

  return typeof firstImage === "string"
    ? firstImage
    : firstImage?.media || firstImage?.url || "";
};



const StatusBadge = ({ status }) => (
  <span
    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusColor(
      status
    )}`}
  >
    {status || "PENDING"}
  </span>
);

const DetailRow = ({ label, value }) => (
  <div className="flex flex-col gap-1 border-b border-[#eee7dd] py-3 sm:flex-row sm:items-center sm:justify-between">
    <span className="text-sm text-gray-500">{label}</span>
    <span className="break-words text-sm font-medium text-gray-800 sm:text-right">
      {value !== undefined && value !== null && value !== "" ? value : "-"}
    </span>
  </div>
);

const SectionCard = ({ title, children, action }) => (
  <div className="rounded-xl border border-[#e9e1d6] bg-white p-4 shadow-sm sm:p-5">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[#eee7dd] pb-3">
      <h3 className="font-semibold text-[#514536]">{title}</h3>
      {action}
    </div>
    {children}
  </div>
);

const AddressBlock = ({ title, address }) => (
  <div className="rounded-lg border border-[#eee7dd] bg-[#fdfbf8] p-4">
    <h4 className="mb-3 text-sm font-semibold text-[#514536]">{title}</h4>

    <p className="text-sm font-semibold text-gray-800">
      {address?.name || "-"}
    </p>

    <p className="mt-1 whitespace-pre-line text-sm text-gray-600">
      {[
        address?.address,
        address?.addressLine2,
        address?.city,
        address?.state,
        address?.country,
        address?.pincode,
      ]
        .filter(Boolean)
        .join(", ") || "-"}
    </p>

    <p className="mt-2 text-sm text-gray-600">
      Phone: {address?.mobile || address?.phone || "-"}
    </p>

    <p className="text-sm text-gray-600">
      Email: {address?.email || "-"}
    </p>
  </div>
);



const OrdersList = () => {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalRows, setTotalRows] = useState(0);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [summary, setSummary] = useState({
    totalOrders: 0,
    pending: 0,
    processing: 0,
    delivered: 0,
    cancelled: 0,
  });

  const [showShipmentForm, setShowShipmentForm] = useState(false);
  const [courierName, setCourierName] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");

  const [note, setNote] = useState("");



  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });

      if (search.trim()) params.append("search", search.trim());
      if (status) params.append("status", status);
      if (paymentStatus) params.append("paymentStatus", paymentStatus);
      if (paymentMethod) params.append("paymentMethod", paymentMethod);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const response = await makeApiRequest({
        url: `orders/get-orders?${params.toString()}`,
        method: "GET",
      });

      if (response?.status === false || response?.data?.status === false) {
        toast.error(
          response?.message ||
            response?.data?.message ||
            "Unable to fetch orders"
        );
        return;
      }

      const payload = getResponsePayload(response);

      // Supports both:
      // { data: { orders: [] } }
      // { data: { data: { orders: [] } } }
      // { data: [] }
      const orderList = Array.isArray(payload?.orders)
        ? payload.orders
        : Array.isArray(payload?.data?.orders)
        ? payload.data.orders
        : Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload)
        ? payload
        : [];

      setOrders(orderList);

      const total =
        payload?.totalOrders ??
        payload?.total ??
        payload?.count ??
        payload?.pagination?.total ??
        payload?.data?.totalOrders ??
        orderList.length;

      setTotalRows(Number(total));

      if (payload?.summary) {
        setSummary((previous) => ({
          ...previous,
          ...payload.summary,
        }));
      } else if (payload?.data?.summary) {
        setSummary((previous) => ({
          ...previous,
          ...payload.data.summary,
        }));
      }
    } catch (error) {
      console.error("Fetch orders error:", error);
      toast.error("Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  }, [
    page,
    limit,
    search,
    status,
    paymentStatus,
    paymentMethod,
    startDate,
    endDate,
  ]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);



  const fetchOrderDetails = async (id) => {
    try {
      setDetailLoading(true);

      const response = await makeApiRequest({
        url: `orders/get-order/${id}`,
        method: "GET",
      });

      if (response?.status === false || response?.data?.status === false) {
        toast.error(
          response?.message ||
            response?.data?.message ||
            "Unable to fetch order details"
        );
        return;
      }

      const payload = getResponsePayload(response);

      const order =
        payload?.order ||
        payload?.data?.order ||
        payload?.data ||
        payload;

      if (!order || !order._id) {
        toast.error("Order details not found");
        return;
      }

      setSelectedOrder(order);

      setCourierName(
        order?.shipment?.courierName || order?.courierName || ""
      );

      setTrackingNumber(
        order?.shipment?.trackingNumber || order?.trackingNumber || ""
      );

      setTrackingUrl(
        order?.shipment?.trackingUrl || order?.trackingUrl || ""
      );

      setShowShipmentForm(false);
      setNote("");
    } catch (error) {
      console.error("Fetch order details error:", error);
      toast.error("Failed to fetch order details");
    } finally {
      setDetailLoading(false);
    }
  };



  const performOrderAction = async (endpoint, data = {}) => {
    if (!selectedOrder?._id) {
      toast.error("Order not selected");
      return;
    }

    try {
      setActionLoading(true);

      const response = await makeApiRequest({
        url: `orders/${endpoint}/${selectedOrder._id}`,
        method: "POST",
        data,
      });

      if (response?.status === false || response?.data?.status === false) {
        toast.error(
          response?.message ||
            response?.data?.message ||
            "Order action failed"
        );
        return;
      }

      toast.success(
        response?.message ||
          response?.data?.message ||
          "Order updated successfully"
      );

      await fetchOrderDetails(selectedOrder._id);
      await fetchOrders();
    } catch (error) {
      console.error("Order action error:", error);
      toast.error(
        error?.response?.data?.message || "Unable to update order"
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmOrder = () => {
    performOrderAction("confirm");
  };

  const handlePackOrder = () => {
    performOrderAction("pack");
  };

  const handleDeliverOrder = () => {
    performOrderAction("deliver");
  };

  const handleCancelOrder = () => {
    const confirmed = window.confirm(
      "Are you sure you want to cancel this order?"
    );

    if (!confirmed) return;

    const reason = window.prompt("Enter cancellation reason:");

    if (reason === null) return;

    performOrderAction("cancel", {
      cancelReason: reason,
      reason,
    });
  };

  const handleCreateShipment = (event) => {
    event.preventDefault();

    if (!courierName.trim()) {
      toast.error("Please enter courier name");
      return;
    }

    if (!trackingNumber.trim()) {
      toast.error("Please enter tracking number");
      return;
    }

    performOrderAction("create-shipment", {
      courierName,
      trackingNumber,
      trackingUrl,
    });
  };

  const handleAddNote = (event) => {
    event.preventDefault();

    if (!note.trim()) {
      toast.error("Please enter a note");
      return;
    }

    performOrderAction("add-note", {
      note: note.trim(),
      message: note.trim(),
    });
  };

  // --------------------------------------------------
  // DOCUMENTS
  // --------------------------------------------------

  const openOrderDocument = async (endpoint) => {
    if (!selectedOrder?._id) return;

    try {
      const response = await makeApiRequest({
        url: `orders/${endpoint}/${selectedOrder._id}`,
        method: "GET",
      });

      const payload = getResponsePayload(response);
      const url = payload?.url || payload?.data?.url;

      if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
      } else {
        toast.error("Document URL not available");
      }
    } catch (error) {
      console.error("Document error:", error);
      toast.error("Unable to open document");
    }
  };

  // --------------------------------------------------
  // CSV EXPORT
  // --------------------------------------------------

  const exportCSV = () => {
    if (!orders.length) {
      toast.error("No orders available to export");
      return;
    }

    const headers = [
      "Order ID",
      "Customer",
      "Email",
      "Phone",
      "Order Date",
      "Order Status",
      "Payment Status",
      "Payment Method",
      "Amount",
    ];

    const rows = orders.map((order) => [
      getOrderId(order),
      getCustomerName(order),
      getCustomerEmail(order),
      getCustomerPhone(order),
      formatDate(order?.orderdate || order?.createdAt),
      getStatus(order),
      getPaymentStatus(order),
      getPaymentMethod(order),
      getOrderTotal(order),
    ]);

    const escapeCSV = (value) =>
      `"${String(value ?? "").replace(/"/g, '""')}"`;

    const csv = [
      headers.map(escapeCSV).join(","),
      ...rows.map((row) => row.map(escapeCSV).join(",")),
    ].join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "orders.csv";
    link.click();

    URL.revokeObjectURL(url);
  };

  // --------------------------------------------------
  // TABLE COLUMNS
  // --------------------------------------------------

  const columns = useMemo(
    () => [
      {
        name: "Order ID",
        selector: (row) => getOrderId(row),
        sortable: true,
        minWidth: "150px",
        cell: (row) => (
          <div>
            <p className="font-semibold text-[#514536]">
              {getOrderId(row)}
            </p>
            <p className="text-xs text-gray-400">
              {row?.invoiceId || ""}
            </p>
          </div>
        ),
      },
      {
        name: "Customer",
        minWidth: "180px",
        cell: (row) => (
          <div className="py-2">
            <p className="font-medium text-gray-800">
              {getCustomerName(row)}
            </p>
            <p className="text-xs text-gray-500">
              {getCustomerEmail(row)}
            </p>
          </div>
        ),
      },
      {
        name: "Date",
        selector: (row) => row?.orderdate || row?.createdAt || "",
        sortable: true,
        minWidth: "120px",
        cell: (row) => (
          <span className="text-sm text-gray-600">
            {formatDate(row?.orderdate || row?.createdAt)}
          </span>
        ),
      },
      {
        name: "Amount",
        selector: (row) => getOrderTotal(row),
        sortable: true,
        minWidth: "120px",
        cell: (row) => (
          <span className="font-semibold text-gray-800">
            {formatCurrency(getOrderTotal(row))}
          </span>
        ),
      },
      {
        name: "Order Status",
        minWidth: "130px",
        cell: (row) => <StatusBadge status={getStatus(row)} />,
      },
      {
        name: "Payment",
        minWidth: "120px",
        cell: (row) => (
          <StatusBadge status={getPaymentStatus(row)} />
        ),
      },
      {
        name: "Action",
        button: true,
        minWidth: "100px",
        cell: (row) => (
          <button
            type="button"
            onClick={() => fetchOrderDetails(row._id)}
            className="flex items-center gap-2 rounded-lg bg-[#514536] px-3 py-2 text-xs font-medium text-white transition hover:bg-[#77664f]"
          >
            <FaEye />
            View
          </button>
        ),
      },
    ],
    []
  );

  // --------------------------------------------------
  // DETAIL VIEW DATA
  // --------------------------------------------------

  const items = selectedOrder ? getItems(selectedOrder) : [];

  const deliveryAddress = selectedOrder
    ? getAddress(selectedOrder)
    : {};

  const billingAddress =
    selectedOrder?.billingAddress ||
    selectedOrder?.billing ||
    selectedOrder?.delivery_Address ||
    {};

  const paymentDetail =
    selectedOrder?.paymentDetailId ||
    selectedOrder?.payment ||
    {};

   

  const subtotal =
    selectedOrder?.subtotal !== undefined &&
    Number(selectedOrder.subtotal) > 0
      ? Number(selectedOrder.subtotal)
      : items.reduce(
          (sum, item) =>
            sum + Number(item.price || 0) * Number(item.quantity || 0),
          0
        );

  const discountAmount = Number(
    selectedOrder?.totalDiscount ??
      selectedOrder?.couponDiscountAmount ??
      selectedOrder?.couponDiscount ??
      0
  );

  const taxAmount =
    selectedOrder?.taxAmount !== undefined &&
    Number(selectedOrder.taxAmount) > 0
      ? Number(selectedOrder.taxAmount)
      : items.reduce(
          (sum, item) =>
            sum +
            Number(item.gstAmount || 0) * Number(item.quantity || 0),
          0
        );

  const shippingCharge = Number(selectedOrder?.shippingCharge || 0);

  const orderTotal = getOrderTotal(selectedOrder || {});

  const statusHistory = selectedOrder?.statusHistory || [];
  const internalNotes = selectedOrder?.internalNotes || [];

  // --------------------------------------------------
  // SUMMARY CARDS
  // --------------------------------------------------

  const summaryCards = [
    {
      title: "Total Orders",
      value: summary.totalOrders ?? totalRows,
      icon: <FaBox />,
      color: "bg-[#eee8dc]",
    },
    {
      title: "Pending",
      value: summary.pending ?? 0,
      icon: <FaSync />,
      color: "bg-yellow-100",
    },
    {
      title: "Processing",
      value: summary.processing ?? 0,
      icon: <FaTruck />,
      color: "bg-blue-100",
    },
    {
      title: "Delivered",
      value: summary.delivered ?? 0,
      icon: <FaCheckCircle />,
      color: "bg-green-100",
    },
    {
      title: "Cancelled",
      value: summary.cancelled ?? 0,
      icon: <FaTimesCircle />,
      color: "bg-red-100",
    },
  ];

  // --------------------------------------------------
  // RENDER DETAIL VIEW
  // --------------------------------------------------

  if (selectedOrder) {
    return (
      <div className="min-h-screen bg-[#faf8f4] p-3 sm:p-5">
        <div className="mx-auto max-w-7xl">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="mb-3 flex items-center gap-2 text-sm font-medium text-[#77664f] hover:text-[#514536]"
              >
                <FaArrowLeft />
                Back to Orders
              </button>

              <h2 className="text-xl font-bold text-[#514536] sm:text-2xl">
                Order Details
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                {getOrderId(selectedOrder)}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={getStatus(selectedOrder)} />

              <button
                type="button"
                onClick={() => fetchOrderDetails(selectedOrder._id)}
                className="flex items-center gap-2 rounded-lg border border-[#d9cdbc] bg-white px-3 py-2 text-sm text-[#514536] hover:bg-[#f5f0e8]"
              >
                <FaSync />
                Refresh
              </button>
            </div>
          </div>

          {detailLoading ? (
            <div className="rounded-xl bg-white p-10 text-center text-gray-500">
              Loading order details...
            </div>
          ) : (
            <>
              {/* ORDER ACTIONS */}
              <SectionCard title="Order Actions">
                <div className="flex flex-wrap gap-2">
                  {getStatus(selectedOrder) === "PENDING" && (
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={handleConfirmOrder}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      Confirm Order
                    </button>
                  )}

                  {["CONFIRMED", "PROCESSING"].includes(
                    getStatus(selectedOrder)
                  ) && (
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={handlePackOrder}
                      className="rounded-lg bg-purple-600 px-4 py-2 text-sm text-white hover:bg-purple-700 disabled:opacity-50"
                    >
                      Mark as Packed
                    </button>
                  )}

                  {["PACKED", "SHIPPED"].includes(
                    getStatus(selectedOrder)
                  ) && (
                    <>
                      <button
                        type="button"
                        onClick={() => setShowShipmentForm((value) => !value)}
                        className="rounded-lg bg-cyan-600 px-4 py-2 text-sm text-white hover:bg-cyan-700"
                      >
                        {selectedOrder?.shipment?.trackingNumber ||
                        selectedOrder?.trackingNumber
                          ? "Update Shipment"
                          : "Create Shipment"}
                      </button>

                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={handleDeliverOrder}
                        className="rounded-lg bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        Mark Delivered
                      </button>
                    </>
                  )}

                  {!["DELIVERED", "CANCELLED"].includes(
                    getStatus(selectedOrder)
                  ) && (
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={handleCancelOrder}
                      className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      Cancel Order
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => openOrderDocument("invoice")}
                    className="flex items-center gap-2 rounded-lg border border-[#d9cdbc] bg-white px-4 py-2 text-sm text-[#514536] hover:bg-[#f5f0e8]"
                  >
                    <FaFileInvoice />
                    Invoice
                  </button>

                  <button
                    type="button"
                    onClick={() => openOrderDocument("packing-slip")}
                    className="flex items-center gap-2 rounded-lg border border-[#d9cdbc] bg-white px-4 py-2 text-sm text-[#514536] hover:bg-[#f5f0e8]"
                  >
                    <FaDownload />
                    Packing Slip
                  </button>
                </div>

                {showShipmentForm && (
                  <form
                    onSubmit={handleCreateShipment}
                    className="mt-5 grid grid-cols-1 gap-3 rounded-lg bg-[#faf8f4] p-4 md:grid-cols-3"
                  >
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Courier Name
                      </label>
                      <input
                        type="text"
                        value={courierName}
                        onChange={(event) =>
                          setCourierName(event.target.value)
                        }
                        placeholder="Enter courier name"
                        className="w-full rounded-lg border border-[#d9cdbc] bg-white px-3 py-2 text-sm outline-none focus:border-[#8b765b]"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Tracking Number / AWB
                      </label>
                      <input
                        type="text"
                        value={trackingNumber}
                        onChange={(event) =>
                          setTrackingNumber(event.target.value)
                        }
                        placeholder="Enter tracking number"
                        className="w-full rounded-lg border border-[#d9cdbc] bg-white px-3 py-2 text-sm outline-none focus:border-[#8b765b]"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Tracking URL
                      </label>
                      <input
                        type="url"
                        value={trackingUrl}
                        onChange={(event) =>
                          setTrackingUrl(event.target.value)
                        }
                        placeholder="https://..."
                        className="w-full rounded-lg border border-[#d9cdbc] bg-white px-3 py-2 text-sm outline-none focus:border-[#8b765b]"
                      />
                    </div>

                    <div className="flex gap-2 md:col-span-3">
                      <button
                        type="submit"
                        disabled={actionLoading}
                        className="rounded-lg bg-[#514536] px-4 py-2 text-sm text-white hover:bg-[#77664f] disabled:opacity-50"
                      >
                        Save Shipment
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowShipmentForm(false)}
                        className="rounded-lg border border-[#d9cdbc] px-4 py-2 text-sm text-gray-700"
                      >
                        Close
                      </button>
                    </div>
                  </form>
                )}
              </SectionCard>

              {/* CUSTOMER AND ORDER INFORMATION */}
              <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
                <SectionCard title="Customer Information">
                  <DetailRow
                    label="Customer Name"
                    value={getCustomerName(selectedOrder)}
                  />
                  <DetailRow
                    label="Email"
                    value={getCustomerEmail(selectedOrder)}
                  />
                  <DetailRow
                    label="Mobile"
                    value={getCustomerPhone(selectedOrder)}
                  />
                  <DetailRow
                    label="Customer ID"
                    value={
                      selectedOrder?.userid?._id ||
                      selectedOrder?.userid ||
                      "-"
                    }
                  />
                </SectionCard>

                <SectionCard title="Order Information">
                  <DetailRow
                    label="Order ID"
                    value={getOrderId(selectedOrder)}
                  />
                  <DetailRow
                    label="Invoice ID"
                    value={selectedOrder?.invoiceId}
                  />
                  <DetailRow
                    label="Order Date"
                    value={formatDateTime(
                      selectedOrder?.orderdate || selectedOrder?.createdAt
                    )}
                  />
                  <DetailRow
                    label="Delivery Date"
                    value={formatDate(selectedOrder?.deliveryDate)}
                  />
                  <DetailRow
                    label="Order Status"
                    value={<StatusBadge status={getStatus(selectedOrder)} />}
                  />
                  <DetailRow
                    label="Payment Status"
                    value={
                      <StatusBadge status={getPaymentStatus(selectedOrder)} />
                    }
                  />
                  <DetailRow
                    label="Source"
                    value={selectedOrder?.source || "WEBSITE"}
                  />
                </SectionCard>
              </div>

              {/* ADDRESSES */}
              <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
                <SectionCard title="Billing Address">
                  <AddressBlock
                    title="Billing Details"
                    address={billingAddress}
                  />
                </SectionCard>

                <SectionCard title="Shipping Address">
                  <AddressBlock
                    title="Delivery Details"
                    address={deliveryAddress}
                  />
                </SectionCard>
              </div>

              {/* ORDERED PRODUCTS */}
              <div className="mt-5">
                <SectionCard title={`Ordered Products (${items.length})`}>
                  {items.length === 0 ? (
                    <p className="py-5 text-center text-sm text-gray-500">
                      No products found for this order.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[700px] border-collapse text-left">
                        <thead>
                          <tr className="bg-[#faf8f4] text-xs uppercase text-gray-500">
                            <th className="px-3 py-3">Product</th>
                            <th className="px-3 py-3">Variant</th>
                            <th className="px-3 py-3">Price</th>
                            <th className="px-3 py-3">Discount</th>
                            <th className="px-3 py-3">GST</th>
                            <th className="px-3 py-3">Quantity</th>
                            <th className="px-3 py-3">Total</th>
                          </tr>
                        </thead>

                        <tbody>
                          {items.map((item, index) => {
                            const image = getProductImage(item);

                            return (
                              <tr
                                key={item?._id || index}
                                className="border-b border-[#eee7dd]"
                              >
                                <td className="px-3 py-3">
                                  <div className="flex items-center gap-3">
                                    {image ? (
                                      <img
                                        src={image}
                                        alt={item?.productName || "Product"}
                                        className="h-12 w-12 rounded-lg border border-[#eee7dd] object-cover"
                                      />
                                    ) : (
                                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#f3eee5] text-[#8b765b]">
                                        <FaBox />
                                      </div>
                                    )}

                                    <div>
                                      <p className="font-medium text-gray-800">
                                        {item?.productName || item?.name || "-"}
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        {item?.category || ""}
                                      </p>
                                      {item?.sku && (
                                        <p className="text-xs text-gray-400">
                                          SKU: {item.sku}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </td>

                                <td className="px-3 py-3 text-sm text-gray-600">
                                  {item?.variantName || "-"}
                                </td>

                                <td className="px-3 py-3 text-sm text-gray-700">
                                  {formatCurrency(item?.price)}
                                </td>

                                <td className="px-3 py-3 text-sm text-gray-700">
                                  {formatCurrency(item?.discount)}
                                </td>

                                <td className="px-3 py-3 text-sm text-gray-700">
                                  {formatCurrency(item?.gstAmount)}
                                </td>

                                <td className="px-3 py-3 text-sm text-gray-700">
                                  {item?.quantity || 0}
                                </td>

                                <td className="px-3 py-3 text-sm font-semibold text-gray-800">
                                  {formatCurrency(item?.total)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </SectionCard>
              </div>

              {/* ORDER TOTALS */}

              
              <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
                <SectionCard title="Payment Information">
                  <DetailRow
                    label="Payment Method"
                    value={getPaymentMethod(selectedOrder)}
                  />
                  <DetailRow
                    label="Payment ID"
                    value={
                      paymentDetail?.paymentId ||
                      paymentDetail?.transactionId ||
                      paymentDetail?.reference ||
                      "-"
                    }
                  />
                  <DetailRow
                    label="Payment Date"
                    value={formatDateTime(paymentDetail?.createdAt)}
                  />
                  <DetailRow
                    label="Payment Amount"
                    value={
                      paymentDetail?.amount !== undefined
                        ? formatCurrency(paymentDetail.amount)
                        : "-"
                    }
                  />
                  <DetailRow
                    label="Currency"
                    value={paymentDetail?.currency || "INR"}
                  />
                  <DetailRow
                    label="Payment Status"
                    value={<StatusBadge status={getPaymentStatus(selectedOrder)} />}
                  />
                </SectionCard>

                <SectionCard title="Order Summary">
                  <DetailRow
                    label="Subtotal"
                    value={formatCurrency(subtotal)}
                  />
                  <DetailRow
                    label="Discount"
                    value={formatCurrency(discountAmount)}
                  />
                  <DetailRow
                    label={`GST (${selectedOrder?.gstPercentage || 0}%)`}
                    value={formatCurrency(taxAmount)}
                  />
                  <DetailRow
                    label="Shipping Charge"
                    value={formatCurrency(shippingCharge)}
                  />
                  <div className="mt-3 flex items-center justify-between rounded-lg bg-[#f5f0e8] px-4 py-4">
                    <span className="font-semibold text-[#514536]">
                      Order Total
                    </span>
                    <span className="text-lg font-bold text-[#514536]">
                      {formatCurrency(orderTotal)}
                    </span>
                  </div>
                </SectionCard>
              </div>




              {/* SHIPMENT DETAILS */}
              <div className="mt-5">
                <SectionCard title="Shipment Details">
                  <DetailRow
                    label="Courier"
                    value={
                      selectedOrder?.shipment?.courierName ||
                      selectedOrder?.courierName
                    }
                  />
                  <DetailRow
                    label="Tracking Number / AWB"
                    value={
                      selectedOrder?.shipment?.trackingNumber ||
                      selectedOrder?.trackingNumber
                    }
                  />
                  <DetailRow
                    label="Shipment ID"
                    value={selectedOrder?.shipment?.shipmentId}
                  />
                  <DetailRow
                    label="Shipped At"
                    value={formatDateTime(
                      selectedOrder?.shipment?.shippedAt
                    )}
                  />
                  <DetailRow
                    label="Delivered At"
                    value={formatDateTime(
                      selectedOrder?.shipment?.deliveredAt
                    )}
                  />

                  {(selectedOrder?.shipment?.trackingUrl ||
                    selectedOrder?.trackingUrl) && (
                    <div className="pt-3">
                      <a
                        href={
                          selectedOrder?.shipment?.trackingUrl ||
                          selectedOrder?.trackingUrl
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-medium text-blue-600 hover:underline"
                      >
                        Track Shipment
                      </a>
                    </div>
                  )}
                </SectionCard>
              </div>

              {/* STATUS HISTORY */}
              <div className="mt-5">
                <SectionCard title="Order Status Timeline">
                  {statusHistory.length === 0 ? (
                    <p className="py-3 text-sm text-gray-500">
                      No status history available.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {statusHistory.map((history, index) => (
                        <div
                          key={history?._id || index}
                          className="flex gap-3"
                        >
                          <div className="mt-1 h-3 w-3 shrink-0 rounded-full bg-[#8b765b]" />

                          <div>
                            <p className="text-sm font-semibold text-gray-800">
                              {history?.status || history?.orderStatus || "-"}
                            </p>
                            <p className="text-xs text-gray-500">
                              {history?.note ||
                                history?.message ||
                                history?.description ||
                                ""}
                            </p>
                            <p className="mt-1 text-xs text-gray-400">
                              {formatDateTime(
                                history?.createdAt || history?.date
                              )}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </SectionCard>
              </div>

              {/* INTERNAL NOTES */}
              <div className="mt-5">
                <SectionCard title="Internal Notes">
                  <form onSubmit={handleAddNote} className="mb-5">
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Add Note
                    </label>

                    <textarea
                      rows={3}
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                      placeholder="Enter internal order note..."
                      className="w-full rounded-lg border border-[#d9cdbc] bg-white p-3 text-sm outline-none focus:border-[#8b765b]"
                    />

                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="mt-2 flex items-center gap-2 rounded-lg bg-[#514536] px-4 py-2 text-sm text-white hover:bg-[#77664f] disabled:opacity-50"
                    >
                      <FaStickyNote />
                      Add Note
                    </button>
                  </form>

                  {internalNotes.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      No internal notes available.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {internalNotes.map((item, index) => (
                        <div
                          key={item?._id || index}
                          className="rounded-lg border border-[#eee7dd] bg-[#fdfbf8] p-3"
                        >
                          <p className="whitespace-pre-line text-sm text-gray-700">
                            {typeof item === "string"
                              ? item
                              : item?.note || item?.message || "-"}
                          </p>

                          {typeof item !== "string" && (
                            <p className="mt-2 text-xs text-gray-400">
                              {formatDateTime(item?.createdAt)}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </SectionCard>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // --------------------------------------------------
  // RENDER ORDERS LIST
  // --------------------------------------------------

  return (
    <div className="min-h-screen bg-[#faf8f4] p-3 sm:p-5">
      <div className="mx-auto max-w-7xl">
        {/* PAGE HEADER */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-[#514536] sm:text-2xl">
              Orders Management
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Manage and track customer orders
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={fetchOrders}
              disabled={loading}
              className="flex items-center gap-2 rounded-lg border border-[#d9cdbc] bg-white px-4 py-2 text-sm text-[#514536] hover:bg-[#f5f0e8] disabled:opacity-50"
            >
              <FaSync />
              Refresh
            </button>

            <button
              type="button"
              onClick={exportCSV}
              className="flex items-center gap-2 rounded-lg bg-[#514536] px-4 py-2 text-sm text-white hover:bg-[#77664f]"
            >
              <FaDownload />
              Export CSV
            </button>
          </div>
        </div>

        {/* SUMMARY */}
        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {summaryCards.map((card) => (
            <div
              key={card.title}
              className="rounded-xl border border-[#e9e1d6] bg-white p-4 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{card.title}</p>
                  <h3 className="mt-2 text-2xl font-bold text-[#514536]">
                    {card.value}
                  </h3>
                </div>

                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-xl text-[#77664f] ${card.color}`}
                >
                  {card.icon}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* FILTERS */}
        <div className="mb-5 rounded-xl border border-[#e9e1d6] bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <FaFilter className="text-[#77664f]" />
            <h3 className="font-semibold text-[#514536]">
              Search & Filters
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="relative">
              <FaSearch className="absolute left-3 top-3.5 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search order, customer..."
                className="w-full rounded-lg border border-[#d9cdbc] py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#8b765b]"
              />
            </div>

            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-[#d9cdbc] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#8b765b]"
            >
              <option value="">All Order Status</option>
              <option value="PENDING">Pending</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="PROCESSING">Processing</option>
              <option value="PACKED">Packed</option>
              <option value="SHIPPED">Shipped</option>
              <option value="DELIVERED">Delivered</option>
              <option value="CANCELLED">Cancelled</option>
            </select>

            <select
              value={paymentStatus}
              onChange={(event) => {
                setPaymentStatus(event.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-[#d9cdbc] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#8b765b]"
            >
              <option value="">All Payment Status</option>
              <option value="PENDING">Pending</option>
              <option value="PAID">Paid</option>
              <option value="SUCCESS">Success</option>
              <option value="FAILED">Failed</option>
              <option value="REFUNDED">Refunded</option>
            </select>

            <select
              value={paymentMethod}
              onChange={(event) => {
                setPaymentMethod(event.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-[#d9cdbc] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#8b765b]"
            >
              <option value="">All Payment Methods</option>
              <option value="COD">Cash on Delivery</option>
              <option value="ONLINE">Online</option>
              <option value="RAZORPAY">Razorpay</option>
              <option value="UPI">UPI</option>
              <option value="CARD">Card</option>
              <option value="NETBANKING">Net Banking</option>
            </select>

            <div>
              <label className="mb-1 block text-xs text-gray-500">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(event) => {
                  setStartDate(event.target.value);
                  setPage(1);
                }}
                className="w-full rounded-lg border border-[#d9cdbc] px-3 py-2 text-sm outline-none focus:border-[#8b765b]"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-gray-500">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={(event) => {
                  setEndDate(event.target.value);
                  setPage(1);
                }}
                className="w-full rounded-lg border border-[#d9cdbc] px-3 py-2 text-sm outline-none focus:border-[#8b765b]"
              />
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setStatus("");
                  setPaymentStatus("");
                  setPaymentMethod("");
                  setStartDate("");
                  setEndDate("");
                  setPage(1);
                }}
                className="w-full rounded-lg border border-[#d9cdbc] px-4 py-2 text-sm text-[#514536] hover:bg-[#f5f0e8]"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-[#e9e1d6] bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#eee7dd] px-4 py-4">
            <h3 className="font-semibold text-[#514536]">
              All Orders
            </h3>

            <span className="text-sm text-gray-500">
              {totalRows} order(s)
            </span>
          </div>

          <DataTable
            columns={columns}
            data={orders}
            progressPending={loading}
            pagination
            paginationServer
            paginationTotalRows={totalRows}
            paginationDefaultPage={page}
            paginationPerPage={limit}
            paginationRowsPerPageOptions={[10, 20, 50, 100]}
            onChangePage={(newPage) => setPage(newPage)}
            onChangeRowsPerPage={(newLimit, newPage) => {
              setLimit(newLimit);
              setPage(newPage);
            }}
            highlightOnHover
            responsive
            persistTableHead
            noDataComponent={
              <div className="py-10 text-center text-sm text-gray-500">
                No orders found.
              </div>
            }
            progressComponent={
              <div className="py-10 text-sm text-gray-500">
                Loading orders...
              </div>
            }
            customStyles={{
              table: {
                style: {
                  backgroundColor: "#ffffff",
                },
              },
              headRow: {
                style: {
                  backgroundColor: "#faf8f4",
                  borderBottom: "1px solid #e9e1d6",
                  minHeight: "52px",
                },
              },
              headCells: {
                style: {
                  color: "#77664f",
                  fontSize: "12px",
                  fontWeight: "600",
                },
              },
              rows: {
                style: {
                  minHeight: "65px",
                  borderBottom: "1px solid #f0ebe3",
                },
                highlightOnHoverStyle: {
                  backgroundColor: "#faf8f4",
                  transition: "background-color 0.2s",
                },
              },
              cells: {
                style: {
                  color: "#514536",
                  fontSize: "13px",
                },
              },
              pagination: {
                style: {
                  borderTop: "1px solid #e9e1d6",
                  backgroundColor: "#ffffff",
                  color: "#514536",
                },
              },
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default OrdersList;
