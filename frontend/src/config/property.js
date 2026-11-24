// Labels and formatting shared by every page that shows properties.
// The values match the backend (PROPERTY_TYPES / LISTING_TYPES in table.js).

export const PROPERTY_TYPES = [
  { value: "house", label: "House" },
  { value: "flat", label: "Flat" },
  { value: "shop", label: "Shop" },
  { value: "land", label: "Land" },
];

export const LISTING_TYPES = [
  { value: "sale", label: "For Sale" },
  { value: "rent", label: "For Rent" },
];

export const STATUS_LABELS = { available: "Available", sold: "Sold", rented: "Rented" };

export const labelFor = (options, value) =>
  options.find((option) => option.value === value)?.label ?? value;

// "$250,000" for a sale, "$900/month" for a rental, "–" when unknown.
export const formatPrice = (price, listingType) => {
  const amount = Number(price);
  if (price === null || price === undefined || !Number.isFinite(amount)) return "–";
  const text = `$${amount.toLocaleString("en-US")}`;
  return listingType === "rent" ? `${text}/month` : text;
};

export const dealLabel = (dealType) => (dealType === "rent" ? "Rented" : "Bought");

// Purchase/rent request statuses with their badge colours.
export const REQUEST_STATUS = {
  pending: { label: "Pending", badge: "bg-warning text-dark" },
  approved: { label: "Approved", badge: "bg-success" },
  rejected: { label: "Rejected", badge: "bg-danger" },
  cancelled: { label: "Cancelled", badge: "bg-secondary" },
};

export const requestTypeLabel = (dealType) => (dealType === "rent" ? "Rent" : "Buy");
