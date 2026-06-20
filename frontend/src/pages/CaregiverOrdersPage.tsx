import React, { useState, useEffect } from 'react';
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

export function CaregiverOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [status, setStatus] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [checkinOrderId, setCheckinOrderId] = useState<string | null>(null);
  const [checkinLocation, setCheckinLocation] = useState('');

  useEffect(() => {
    fetchOrders();
  }, [status]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (status !== 'all') params.append('status', status);
      const res = await api.get(`/caregiver/orders?${params.toString()}`);
      setOrders(res.data.orders);
    } catch (err) {
      console.error('获取订单列表失败', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (orderId: string) => {
    try {
      await api.post(`/caregiver/orders/${orderId}/accept`);
      fetchOrders();
    } catch (err: any) {
      alert(err.response?.data?.message || '接单失败');
    }
  };

  const handleReject = async (orderId: string) => {
    if (!confirm('确定要拒绝此订单吗？')) return;
    try {
      await api.post(`/caregiver/orders/${orderId}/reject`);
      fetchOrders();
    } catch (err: any) {
      alert(err.response?.data?.message || '拒单失败');
    }
  };

  const handleCheckin = async (orderId: string) => {
    if (!checkinLocation.trim()) {
      alert('请输入签到位置');
      return;
    }
    try {
      await api.post(`/caregiver/orders/${orderId}/checkin`, {
        location: checkinLocation,
      });
      setCheckinOrderId(null);
      setCheckinLocation('');
      fetchOrders();
    } catch (err: any) {
      alert(err.response?.data?.message || '签到失败');
    }
  };

  const handleComplete = async (orderId: string) => {
    if (!confirm('确定要完成此服务吗？')) return;
    try {
      await api.post(`/caregiver/orders/${orderId}/complete`);
      fetchOrders();
    } catch (err: any) {
      alert(err.response?.data?.message || '完成服务失败');
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
      <h1 className="text-2xl font-bold text-gray-900 mb-6">接单管理</h1>

      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap gap-2">
          {[
            { value: 'all', label: '全部' },
            { value: 'pending_service', label: '待接单' },
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
          <div className="text-gray-500">暂无订单</div>
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
                    <div className="text-sm text-gray-500">患者姓名</div>
                    <div className="font-medium text-gray-900 mt-1">
                      {(order as any).patient_name_user || order.patient_name}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">联系电话</div>
                    <div className="font-medium text-gray-900 mt-1">
                      {(order as any).patient_phone || '暂无'}
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
                  <div className="md:col-span-2">
                    <div className="text-sm text-gray-500">病情简述</div>
                    <div className="font-medium text-gray-900 mt-1">{order.patient_condition}</div>
                  </div>
                  {order.notes && (
                    <div className="md:col-span-2">
                      <div className="text-sm text-gray-500">注意事项</div>
                      <div className="font-medium text-gray-900 mt-1">{order.notes}</div>
                    </div>
                  )}
                  {order.checkin_time && (
                    <>
                      <div>
                        <div className="text-sm text-gray-500">签到时间</div>
                        <div className="font-medium text-gray-900 mt-1">
                          {new Date(order.checkin_time).toLocaleString('zh-CN')}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">签到位置</div>
                        <div className="font-medium text-gray-900 mt-1">{order.checkin_location}</div>
                      </div>
                    </>
                  )}
                </div>

                {checkinOrderId === order.id ? (
                  <div className="mt-4 pt-4 border-t">
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        签到位置
                      </label>
                      <input
                        type="text"
                        value={checkinLocation}
                        onChange={(e) => setCheckinLocation(e.target.value)}
                        placeholder="请输入当前位置，如：XX医院3号楼502病房"
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    <div className="flex space-x-3">
                      <button
                        onClick={() => handleCheckin(order.id)}
                        className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700"
                      >
                        确认签到
                      </button>
                      <button
                        onClick={() => {
                          setCheckinOrderId(null);
                          setCheckinLocation('');
                        }}
                        className="border border-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-50"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 pt-4 border-t flex justify-between items-center">
                    <div className="text-lg font-bold text-primary-600">¥{order.total_price}</div>
                    <div className="flex space-x-3">
                      {order.status === 'pending_service' && (
                        <>
                          <button
                            onClick={() => handleAccept(order.id)}
                            className="bg-primary-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-700"
                          >
                            确认接单
                          </button>
                          <button
                            onClick={() => handleReject(order.id)}
                            className="border border-red-300 text-red-600 px-4 py-2 rounded-md text-sm font-medium hover:bg-red-50"
                          >
                            拒单
                          </button>
                        </>
                      )}
                      {order.status === 'pending_service' && (
                        <button
                          onClick={() => setCheckinOrderId(order.id)}
                          className="hidden"
                        />
                      )}
                      {order.status === 'pending_service' && (
                        <button
                          onClick={() => setCheckinOrderId(order.id)}
                          className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700"
                        >
                          到达签到
                        </button>
                      )}
                      {order.status === 'in_service' && (
                        <button
                          onClick={() => handleComplete(order.id)}
                          className="bg-primary-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-700"
                        >
                          完成服务
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
