export type UserRole = 'patient' | 'caregiver' | 'admin';

export type ServiceType = 'normal' | 'intensive' | 'night';

export type OrderStatus =
  | 'pending_payment'
  | 'paid'
  | 'pending_service'
  | 'in_service'
  | 'pending_completion'
  | 'completed'
  | 'cancelled';

export type BookingMode = 'daily' | 'hourly';

export type PaymentMethod = 'balance' | 'third_party';

export interface User {
  id: string;
  username: string;
  name: string;
  phone: string;
  role: UserRole;
}

export interface Caregiver {
  id: string;
  user_id: string;
  username: string;
  name: string;
  phone: string;
  avatar: string;
  bio: string;
  certificate_url: string;
  work_years: number;
  service_types: string;
  hourly_rate: number;
  daily_rate: number;
  rating: number;
  rating_count: number;
}

export interface Order {
  id: string;
  patient_id: string;
  caregiver_id: string;
  booking_mode: BookingMode;
  service_type: ServiceType;
  start_date: string;
  end_date: string;
  start_time: string | null;
  end_time: string | null;
  total_hours: number | null;
  total_days: number | null;
  total_price: number;
  patient_name: string;
  patient_age: number;
  patient_condition: string;
  notes: string;
  status: OrderStatus;
  checkin_time: string | null;
  checkin_location: string | null;
  actual_end_time: string | null;
  completed_by: string | null;
  payment_method: PaymentMethod | null;
  created_at: string;
  updated_at: string;
  caregiver_name?: string;
  patient_name_user?: string;
  patient_phone?: string;
  settlement?: Settlement | null;
}

export interface ServiceRecord {
  id: string;
  order_id: string;
  caregiver_id: string;
  content: string;
  images: string[];
  created_at: string;
  caregiver_name?: string;
}

export interface Review {
  id: string;
  order_id: string;
  patient_id: string;
  caregiver_id: string;
  rating: number;
  content: string;
  images: string[];
  reply: string | null;
  replied_at: string | null;
  created_at: string;
  patient_name?: string;
}

export interface RatingDistribution {
  rating: number;
  count: number;
}

export interface ReviewStats {
  average: number;
  total: number;
  distribution: RatingDistribution[];
}

export interface ReviewAggregation {
  stats: ReviewStats;
  reviews: Review[];
}

export interface Settlement {
  id: string;
  order_id: string;
  booking_mode: BookingMode;
  base_fee: number;
  overtime_fee: number;
  total_fee: number;
  platform_fee: number;
  caregiver_income: number;
  agreed_units: number | null;
  actual_units: number | null;
  overtime_units: number;
  commission_rate: number;
  overtime_rate: number;
  completed_by: string;
  actual_end_time: string;
  created_at: string;
}

export interface Wallet {
  id: string;
  user_id: string;
  balance: number;
  updated_at: string;
}

export interface WalletTransaction {
  id: string;
  wallet_id: string;
  type: 'recharge' | 'payment' | 'refund' | 'income';
  amount: number;
  balance_after: number;
  related_order_id: string | null;
  description: string;
  created_at: string;
}

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  normal: '普通陪护',
  intensive: '重症护理',
  night: '夜间陪护',
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: '待支付',
  paid: '待接单',
  pending_service: '待签到',
  in_service: '服务中',
  pending_completion: '待确认完成',
  completed: '已完成',
  cancelled: '已取消',
};

export const BOOKING_MODE_LABELS: Record<BookingMode, string> = {
  daily: '按天预约',
  hourly: '按小时预约',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  balance: '余额支付',
  third_party: '第三方支付',
};
