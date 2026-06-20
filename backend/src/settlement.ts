import { v4 as uuidv4 } from 'uuid';
import { getQuery, runQuery, getNumericConfig } from './database';
import { Order, Settlement } from './types';

export function getAgreedEnd(order: Order): Date {
  if (order.booking_mode === 'hourly' && order.end_time) {
    return new Date(`${order.end_date}T${order.end_time}:00`);
  }
  return new Date(`${order.end_date}T23:59:59`);
}

function roundUpToUnit(value: number, unit: number): number {
  if (value <= 0) return 0;
  return Math.ceil(value / unit) * unit;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export async function calculateSettlement(
  order: Order,
  actualEnd: Date,
  completedBy: string
): Promise<Settlement> {
  const commissionRate = await getNumericConfig('commission_rate', 0.1);
  const overtimeRate = await getNumericConfig('overtime_rate', 1.5);
  const minUnit = await getNumericConfig('min_billing_unit_hours', 0.5);

  const caregiver: any = await getQuery(
    'SELECT hourly_rate, daily_rate FROM caregiver_profiles WHERE id = ?',
    [order.caregiver_id]
  );
  const hourlyRate = caregiver?.hourly_rate ?? 0;
  const dailyRate = caregiver?.daily_rate ?? 0;

  const baseFee = order.total_price;
  let overtimeFee = 0;
  let agreedUnits: number | null = null;
  let actualUnits: number | null = null;
  let overtimeUnits = 0;
  const unitLabel = order.booking_mode === 'daily' ? '天' : '小时';

  const checkin = order.checkin_time ? new Date(order.checkin_time) : null;

  if (order.booking_mode === 'daily') {
    agreedUnits = order.total_days ?? 0;
    if (checkin) {
      const actualMs = actualEnd.getTime() - checkin.getTime();
      const actualDays = actualMs > 0 ? Math.ceil(actualMs / (1000 * 60 * 60 * 24)) : 0;
      actualUnits = actualDays;
      overtimeUnits = Math.max(0, actualDays - (order.total_days ?? 0));
      overtimeFee = overtimeUnits * dailyRate * overtimeRate;
    } else {
      actualUnits = agreedUnits;
    }
  } else {
    agreedUnits = order.total_hours ?? 0;
    if (checkin) {
      const actualMs = actualEnd.getTime() - checkin.getTime();
      const actualHours = actualMs > 0 ? actualMs / (1000 * 60 * 60) : 0;
      const billedActual = roundUpToUnit(actualHours, minUnit);
      actualUnits = round2(billedActual);
      overtimeUnits = round2(Math.max(0, billedActual - (order.total_hours ?? 0)));
      overtimeFee = overtimeUnits * hourlyRate * overtimeRate;
    } else {
      actualUnits = agreedUnits;
    }
  }

  overtimeFee = round2(overtimeFee);
  const totalFee = round2(baseFee + overtimeFee);
  const platformFee = round2(totalFee * commissionRate);
  const caregiverIncome = round2(totalFee - platformFee);

  const details = JSON.stringify({
    commission_rate: commissionRate,
    overtime_rate: overtimeRate,
    min_billing_unit_hours: minUnit,
    base_fee: baseFee,
    overtime_fee: overtimeFee,
    total_fee: totalFee,
    platform_fee: platformFee,
    caregiver_income: caregiverIncome,
    agreed_units: agreedUnits,
    actual_units: actualUnits,
    overtime_units: overtimeUnits,
    unit: unitLabel,
  });

  return {
    id: uuidv4(),
    order_id: order.id,
    caregiver_id: order.caregiver_id,
    booking_mode: order.booking_mode,
    base_fee: baseFee,
    overtime_fee: overtimeFee,
    total_fee: totalFee,
    platform_fee: platformFee,
    caregiver_income: caregiverIncome,
    agreed_units: agreedUnits,
    actual_units: actualUnits,
    overtime_units: overtimeUnits,
    details,
    completed_by: completedBy,
    created_at: new Date().toISOString(),
  };
}

export async function createSettlement(
  order: Order,
  actualEnd: Date,
  completedBy: string
): Promise<Settlement> {
  const settlement = await calculateSettlement(order, actualEnd, completedBy);
  await runQuery(
    `INSERT OR REPLACE INTO settlements (
       id, order_id, caregiver_id, booking_mode, base_fee, overtime_fee,
       total_fee, platform_fee, caregiver_income, agreed_units, actual_units,
       overtime_units, details, completed_by, created_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      settlement.id, settlement.order_id, settlement.caregiver_id, settlement.booking_mode,
      settlement.base_fee, settlement.overtime_fee, settlement.total_fee, settlement.platform_fee,
      settlement.caregiver_income, settlement.agreed_units, settlement.actual_units,
      settlement.overtime_units, settlement.details, settlement.completed_by, settlement.created_at,
    ]
  );
  return settlement;
}

export async function maybeAutoComplete(order: Order): Promise<Order | null> {
  if (!['in_service', 'pending_completion'].includes(order.status)) return null;
  const agreedEnd = getAgreedEnd(order);
  if (new Date() <= agreedEnd) return null;

  const now = new Date().toISOString();
  const actualEnd = order.actual_end_time ? new Date(order.actual_end_time) : new Date();
  await createSettlement(order, actualEnd, 'system');
  await runQuery(
    `UPDATE orders SET status = ?, actual_end_time = COALESCE(actual_end_time, ?), completed_by = ?, updated_at = ? WHERE id = ?`,
    ['completed', now, 'system', now, order.id]
  );
  const updated = await getQuery<Order>('SELECT * FROM orders WHERE id = ?', [order.id]);
  return updated || null;
}

export interface SettlementView extends Settlement {
  commission_rate: number;
  overtime_rate: number;
  min_billing_unit_hours: number;
  actual_end_time: string;
}

export function serializeSettlement(
  row: Settlement | undefined | null,
  order?: Order | null
): SettlementView | null {
  if (!row) return null;
  let details: any = {};
  try {
    details = row.details ? JSON.parse(row.details) : {};
  } catch {
    details = {};
  }
  return {
    ...row,
    commission_rate: Number(details.commission_rate) || 0,
    overtime_rate: Number(details.overtime_rate) || 0,
    min_billing_unit_hours: Number(details.min_billing_unit_hours) || 0,
    actual_end_time: order?.actual_end_time ?? row.created_at,
  };
}
