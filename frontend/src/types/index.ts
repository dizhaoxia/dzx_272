export type UserRole = 'patient' | 'caregiver' | 'admin';

export type ServiceType = 'normal' | 'intensive' | 'night';

export type OrderStatus =
  | 'pending_payment'
  | 'paid'
  | 'pending_service'
  | 'in_service'
  | 'completed'
  | 'cancelled';

export type BookingMode = 'daily' | 'hourly';

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
  created_at: string;
  updated_at: string;
  caregiver_name?: string;
  patient_name_user?: string;
  patient_phone?: string;
}

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  normal: '普通陪护',
  intensive: '重症护理',
  night: '夜间陪护',
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: '待支付',
  paid: '已支付',
  pending_service: '待服务',
  in_service: '服务中',
  completed: '已完成',
  cancelled: '已取消',
};

export const BOOKING_MODE_LABELS: Record<BookingMode, string> = {
  daily: '按天预约',
  hourly: '按小时预约',
};
