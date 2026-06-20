import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { Order, ORDER_STATUS_LABELS, BOOKING_MODE_LABELS, SERVICE_TYPE_LABELS, OrderStatus } from '../types';

const statusColors: Record<OrderStatus, string> = {
  pending_payment: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-blue-100 text-blue-800',
  pending_service: 'bg-purple-100 text-purple-800',
  in_service: 'bg-green-100 text-green-800',
  completed: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800',
};

export function OrderListPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [status, setStatus] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, [status]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (status !== 'all') params.append('status', status);
      const res = await api.get(`/orders?${params.toString()}`);
      setOrders(res.data.orders);
    } catch (err) {
      console.error('获取订单列表失败', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (orderId: string) => {
    if (!confirm('确定要取消此订单吗？')) return;
    try {
      await api.post(`/orders/${orderId}/cancel`);
      fetchOrders();
    } catch (err: any) {
      alert(err.response?.data?.message || '取消订单失败');
    }
  };

  const handlePay = async (orderId: string) => {
    try {
      await api.post(`/orders/${orderId}/pay`);
      fetchOrders();
    } catch (err: any) {
      alert(err.response?.data?.message || '支付失败');
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="text-center text-gray-600">加载中...</div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">我的订单</h1>

      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap gap-2">
          {[
            { value: 'all', label: '全部' },
            { value: 'pending_payment', label: '待支付' },
            { value: 'paid', label: '待接单' },
            { value: 'pending_service', label: '待签到' },
            { value: 'in_service', label: '服务中' },
            { value: 'completed', label: '已完成' },
            { value: 'cancelled', label: '已取消' },
          ].map((s) => (
            <button
              key={s.value}
              onClick={() => setStatus(s.value)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                status === s.value
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="text-gray-500 mb-4">暂无订单</div>
          <Link
            to="/caregivers"
            className="bg-primary-600 text-white px-6 py-2 rounded-md font-medium hover:bg-primary-700"
          >
            去预约护工
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="p-4 bg-gray-50 flex justify-between items-center">
                <div className="text-sm text-gray-500">
                  订单号：{order.id.substring(0, 8)}...
                  <span className="ml-4">{new Date(order.created_at).toLocaleString('zh-CN')}</span>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[order.status]}`}>
                  {ORDER_STATUS_LABELS[order.status]}
                </span>
              </div>
              <div className="p-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-500">护工</div>
                    <div className="font-medium text-gray-900 mt-1">
                      {(order as any).caregiver_name || '待分配'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">服务类型</div>
                    <div className="font-medium text-gray-900 mt-1">
                      {SERVICE_TYPE_LABELS[order.service_type]}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">预约方式</div>
                    <div className="font-medium text-gray-900 mt-1">
                      {BOOKING_MODE_LABELS[order.booking_mode]}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">服务日期</div>
                    <div className="font-medium text-gray-900 mt-1">
                      {order.start_date} 至 {order.end_date}
                    </div>
                  </div>
                  {order.start_time && order.end_time && (
                    <div>
                      <div className="text-sm text-gray-500">服务时间</div>
                      <div className="font-medium text-gray-900 mt-1">
                        {order.start_time} - {order.end_time}
                      </div>
                    </div>
                  )}
                  <div>
                    <div className="text-sm text-gray-500">患者</div>
                    <div className="font-medium text-gray-900 mt-1">
                      {order.patient_name}（{order.patient_age}岁）
                    </div>
                  </div>
                  {order.checkin_time && (
                    <div>
                      <div className="text-sm text-gray-500">签到时间</div>
                      <div className="font-medium text-gray-900 mt-1">
                        {new Date(order.checkin_time).toLocaleString('zh-CN')}
                      </div>
                    </div>
                  )}
                  {order.checkin_location && (
                    <div>
                      <div className="text-sm text-gray-500">签到位置</div>
                      <div className="font-medium text-gray-900 mt-1">{order.checkin_location}</div>
                    </div>
                  )}
                </div>
                <div className="mt-4 pt-4 border-t flex justify-between items-center">
                  <div className="text-lg font-bold text-primary-600">
                    ¥{order.total_price}
                  </div>
                  <div className="flex space-x-3">
                    {order.status === 'pending_payment' && (
                      <button
                        onClick={() => handlePay(order.id)}
                        className="bg-primary-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-700"
                      >
                        去支付
                      </button>
                    )}
                    {(order.status === 'pending_payment' ||
                      order.status === 'pending_service' ||
                      order.status === 'paid') && (
                      <button
                        onClick={() => handleCancel(order.id)}
                        className="border border-red-300 text-red-600 px-4 py-2 rounded-md text-sm font-medium hover:bg-red-50"
                      >
                        取消订单
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
