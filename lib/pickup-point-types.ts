export type PickupPointSummary = {
  id: string;
  name: string;
  address: string;
  city: string;
  district: string | null;
  workHours: string | null;
  phone: string | null;
  rating: number;
  isFree: boolean;
};
