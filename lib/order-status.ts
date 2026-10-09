export const ORDER_STATUS_OPTIONS = [
  { value: "pending", label: "Yangi", color: "bg-yellow-100 text-yellow-700" },
  { value: "paid", label: "To'landi", color: "bg-blue-100 text-blue-700" },
  { value: "confirmed", label: "Tasdiqlandi", color: "bg-blue-100 text-blue-700" },
  { value: "accepted", label: "Qabul qilindi", color: "bg-indigo-100 text-indigo-700" },
  { value: "preparing", label: "Tayyorlanmoqda", color: "bg-violet-100 text-violet-700" },
  { value: "packing", label: "Yig'ilmoqda", color: "bg-purple-100 text-purple-700" },
  { value: "ready_for_shipment", label: "Jo'natishga tayyor", color: "bg-fuchsia-100 text-fuchsia-700" },
  { value: "shipped", label: "Yo'lda", color: "bg-cyan-100 text-cyan-700" },
  { value: "ready_for_pickup", label: "Tayyor", color: "bg-teal-100 text-teal-700" },
  { value: "delivered", label: "Yetkazildi", color: "bg-green-100 text-green-700" },
  { value: "cancelled", label: "Bekor", color: "bg-red-100 text-red-700" },
  { value: "returned", label: "Qaytarildi", color: "bg-gray-100 text-gray-600" },
] as const;

export function getOrderStatusMeta(status: string) {
  return (
    ORDER_STATUS_OPTIONS.find((item) => item.value === status) ?? {
      value: status,
      label: status,
      color: "bg-gray-100 text-gray-600",
    }
  );
}

export function formatOrderListDate(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleDateString("uz-UZ", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function deliveryTypeLabel(type: string) {
  return type === "pickup" ? "Punkt" : "Kuryer";
}
