import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api';
import { filesToBase64 } from '../utils/image';
import { StarRating } from '../components/StarRating';
import {
  Order,
  ServiceRecord,
  Review,
  Settlement,
  Wallet,
  PaymentMethod,
  ORDER_STATUS_LABELS,
  BOOKING_MODE_LABELS,
  SERVICE_TYPE_LABELS,
  PAYMENT_METHOD_LABELS,
  OrderStatus,
} from '../types';

const statusColors: Record<OrderStatus, string> = {
  pending_payment: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-blue-100 text-blue-800',
  pending_service: 'bg-purple-100 text-purple-800',
  in_service: 'bg-green-100 text-green-800',
  pending_completion: 'bg-amber-100 text-amber-800',
  completed: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800',
};

const renderImages = (images: string[]) =>
  images.length > 0 ? (
    <div className="mt-2 flex flex-wrap gap-2">
      {images.map((img, i) => (
        <img
          key={i}
          src={img}
          alt={`图片${i + 1}`}
          className="w-20 h-20 object-cover rounded border"
        />
      ))}
    </div>
  ) : null;

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [settlement, setSettlement] = useState<Settlement | null>(null);
  const [records, setRecords] = useState<ServiceRecord[]>([]);
  const [review, setReview] = useState<Review | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('balance');
  const [simulateFail, setSimulateFail] = useState(false);

  const [reviewRating, setReviewRating] = useState(5);
  const [reviewContent, setReviewContent] = useState('');
  const [reviewImages, setReviewImages] = useState<string[]>([]);

  const fetchAll = useCallback(async () => {
    try {
      const [orderRes, recordsRes] = await Promise.all([
        api.get(`/orders/${id}`),
        api.get(`/orders/${id}/records`),
      ]);
      setOrder(orderRes.data.order);
      setSettlement(orderRes.data.settlement || null);
      setRecords(recordsRes.data.records || []);
      if (orderRes.data.order?.status === 'completed') {
        const reviewRes = await api.get(`/reviews/order/${id}`);
        setReview(reviewRes.data.review || null);
      }
      try {
        const walletRes = await api.get('/wallet');
        setWallet(walletRes.data.wallet);
      } catch {
        setWallet(null);
      }
    } catch (err) {
      console.error('获取订单详情失败', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handlePay = async () => {
    if (paymentMethod === 'balance' && wallet && order && wallet.balance < order.total_price) {
      if (!confirm('余额不足，是否改用第三方支付？')) return;
      setPaymentMethod('third_party');
      return;
    }
    setBusy(true);
    try {
      await api.post(`/orders/${id}/pay`, {
        payment_method: paymentMethod,
        simulate_fail: paymentMethod === 'third_party' ? simulateFail : false,
      });
      alert('支付成功');
      fetchAll();
    } catch (err: any) {
      alert(err.response?.data?.message || '支付失败');
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('确定要取消此订单吗？')) return;
    try {
      await api.post(`/orders/${id}/cancel`);
      fetchAll();
    } catch (err: any) {
      alert(err.response?.data?.message || '取消订单失败');
    }
  };

  const handleConfirmCompletion = async () => {
    if (!confirm('确认护工已完成服务？确认后将生成结算明细。')) return;
    setBusy(true);
    try {
      await api.post(`/orders/${id}/confirm-completion`);
      alert('已确认完成');
      fetchAll();
    } catch (err: any) {
      alert(err.response?.data?.message || '确认完成失败');
    } finally {
      setBusy(false);
    }
  };

  const handleReviewImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const imgs = await filesToBase64(e.target.files);
    setReviewImages((prev) => [...prev, ...imgs]);
  };

  const submitReview = async () => {
    if (!reviewContent.trim()) {
      alert('请填写评价内容');
      return;
    }
    setBusy(true);
    try {
      await api.post(`/reviews/order/${id}`, {
        rating: reviewRating,
        content: reviewContent,
        images: reviewImages,
      });
      alert('评价提交成功');
      fetchAll();
    } catch (err: any) {
      alert(err.response?.data?.message || '评价失败');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center text-gray-600">加载中...</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center text-gray-600">订单不存在</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button onClick={() => navigate('/orders')} className="mb-6 text-gray-600 hover:text-gray-900">
        ← 返回订单列表
      </button>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          <h1 className="text-xl font-bold text-gray-900">订单详情</h1>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[order.status]}`}>
            {ORDER_STATUS_LABELS[order.status]}
          </span>
        </div>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">护工：</span>
            <span className="font-medium">{order.caregiver_name || '待分配'}</span>
          </div>
          <div>
            <span className="text-gray-500">服务类型：</span>
            <span className="font-medium">{SERVICE_TYPE_LABELS[order.service_type]}</span>
          </div>
          <div>
            <span className="text-gray-500">预约方式：</span>
            <span className="font-medium">{BOOKING_MODE_LABELS[order.booking_mode]}</span>
          </div>
          <div>
            <span className="text-gray-500">服务日期：</span>
            <span className="font-medium">{order.start_date} 至 {order.end_date}</span>
          </div>
          {order.start_time && order.end_time && (
            <div>
              <span className="text-gray-500">服务时间：</span>
              <span className="font-medium">{order.start_time} - {order.end_time}</span>
            </div>
          )}
          <div>
            <span className="text-gray-500">患者：</span>
            <span className="font-medium">{order.patient_name}（{order.patient_age}岁）</span>
          </div>
          {order.checkin_time && (
            <div>
              <span className="text-gray-500">签到时间：</span>
              <span className="font-medium">{new Date(order.checkin_time).toLocaleString('zh-CN')}</span>
            </div>
          )}
          {order.checkin_location && (
            <div>
              <span className="text-gray-500">签到位置：</span>
              <span className="font-medium">{order.checkin_location}</span>
            </div>
          )}
          {order.actual_end_time && (
            <div>
              <span className="text-gray-500">实际结束：</span>
              <span className="font-medium">{new Date(order.actual_end_time).toLocaleString('zh-CN')}</span>
            </div>
          )}
        </div>
        {order.patient_condition && (
          <div className="mt-3 text-sm">
            <span className="text-gray-500">病情简述：</span>
            <span>{order.patient_condition}</span>
          </div>
        )}
        {order.notes && (
          <div className="mt-1 text-sm">
            <span className="text-gray-500">注意事项：</span>
            <span>{order.notes}</span>
          </div>
        )}
        <div className="mt-4 pt-4 border-t flex justify-between items-center">
          <span className="text-gray-600 text-sm">订单金额</span>
          <span className="text-2xl font-bold text-primary-600">¥{order.total_price}</span>
        </div>
      </div>

      {order.status === 'pending_payment' && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">支付方式</h2>
          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
              <div className="flex items-center">
                <input
                  type="radio"
                  name="paymentMethod"
                  checked={paymentMethod === 'balance'}
                  onChange={() => setPaymentMethod('balance')}
                  className="h-4 w-4 text-primary-600"
                />
                <span className="ml-3 font-medium">余额支付</span>
              </div>
              <span className="text-sm text-gray-500">余额 ¥{wallet?.balance ?? 0}</span>
            </label>
            <label className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
              <div className="flex items-center">
                <input
                  type="radio"
                  name="paymentMethod"
                  checked={paymentMethod === 'third_party'}
                  onChange={() => setPaymentMethod('third_party')}
                  className="h-4 w-4 text-primary-600"
                />
                <span className="ml-3 font-medium">第三方支付（模拟）</span>
              </div>
            </label>
            {paymentMethod === 'third_party' && (
              <label className="flex items-center p-3 bg-gray-50 rounded-lg text-sm">
                <input
                  type="checkbox"
                  checked={simulateFail}
                  onChange={(e) => setSimulateFail(e.target.checked)}
                  className="h-4 w-4 text-primary-600"
                />
                <span className="ml-3 text-gray-600">模拟支付失败（测试回调）</span>
              </label>
            )}
          </div>
          <div className="mt-4 flex space-x-3">
            <button
              onClick={handlePay}
              disabled={busy}
              className="bg-primary-600 text-white px-6 py-2 rounded-md font-medium hover:bg-primary-700 disabled:opacity-50"
            >
              {busy ? '处理中...' : '确认支付'}
            </button>
            <button
              onClick={handleCancel}
              className="border border-red-300 text-red-600 px-4 py-2 rounded-md font-medium hover:bg-red-50"
            >
              取消订单
            </button>
          </div>
        </div>
      )}

      {(order.status === 'paid' || order.status === 'pending_service') && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <button
            onClick={handleCancel}
            className="border border-red-300 text-red-600 px-4 py-2 rounded-md font-medium hover:bg-red-50"
          >
            取消订单
          </button>
        </div>
      )}

      {order.status === 'pending_completion' && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-amber-900 mb-2">护工已发起完成请求</h2>
          <p className="text-amber-800 text-sm mb-4">
            请确认护工已完成服务。确认后将根据实际服务时长生成结算明细（含加班费）。
          </p>
          <button
            onClick={handleConfirmCompletion}
            disabled={busy}
            className="bg-amber-600 text-white px-6 py-2 rounded-md font-medium hover:bg-amber-700 disabled:opacity-50"
          >
            {busy ? '处理中...' : '确认完成'}
          </button>
        </div>
      )}

      {order.status === 'in_service' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6 text-green-800">
          服务进行中，护工可在服务过程中记录护理内容。
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">服务记录</h2>
        {records.length === 0 ? (
          <div className="text-gray-500 text-sm">暂无服务记录</div>
        ) : (
          <div className="relative pl-6">
            <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-gray-200" />
            {records.map((r) => (
              <div key={r.id} className="relative mb-6 last:mb-0">
                <div className="absolute -left-[18px] top-1 w-3 h-3 rounded-full bg-primary-600 border-2 border-white" />
                <div className="text-xs text-gray-500 mb-1">
                  {new Date(r.created_at).toLocaleString('zh-CN')}
                </div>
                <div className="text-sm text-gray-800 whitespace-pre-wrap">{r.content}</div>
                {renderImages(r.images)}
              </div>
            ))}
          </div>
        )}
      </div>

      {settlement && <SettlementCard settlement={settlement} />}

      {order.status === 'completed' && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">订单评价</h2>
          {review ? (
            <div>
              <div className="flex items-center mb-2">
                <StarRating value={review.rating} readonly size="md" />
                <span className="ml-2 text-sm text-gray-500">
                  {new Date(review.created_at).toLocaleString('zh-CN')}
                </span>
              </div>
              <p className="text-gray-800 whitespace-pre-wrap">{review.content}</p>
              {renderImages(review.images)}
              {review.reply && (
                <div className="mt-3 p-3 bg-gray-50 rounded">
                  <div className="text-xs text-gray-500 mb-1">护工回复</div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{review.reply}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">评分</label>
                <StarRating value={reviewRating} onChange={setReviewRating} size="lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">评价内容</label>
                <textarea
                  value={reviewContent}
                  onChange={(e) => setReviewContent(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="请对护工的服务进行评价"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">上传图片（选填）</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleReviewImages}
                  className="text-sm"
                />
                {reviewImages.length > 0 && renderImages(reviewImages)}
              </div>
              <button
                onClick={submitReview}
                disabled={busy}
                className="bg-primary-600 text-white px-6 py-2 rounded-md font-medium hover:bg-primary-700 disabled:opacity-50"
              >
                {busy ? '提交中...' : '提交评价'}
              </button>
            </div>
          )}
        </div>
      )}

      {order.caregiver_id && (
        <div className="text-center">
          <Link
            to={`/caregivers/${order.caregiver_id}`}
            className="text-primary-600 hover:text-primary-700 text-sm"
          >
            查看护工详情与评价 →
          </Link>
        </div>
      )}
    </div>
  );
}

function SettlementCard({ settlement }: { settlement: Settlement }) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">结算明细</h2>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">基础服务费</span>
          <span>¥{settlement.base_fee}</span>
        </div>
        {settlement.overtime_fee > 0 && (
          <>
            <div className="flex justify-between">
              <span className="text-gray-600">
                加班费（{settlement.overtime_units} 单位 ×{settlement.overtime_rate}倍）
              </span>
              <span>¥{settlement.overtime_fee}</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>约定 / 实际时长</span>
              <span>
                {settlement.agreed_units ?? '-'} / {settlement.actual_units ?? '-'}
                {settlement.booking_mode === 'daily' ? ' 天' : ' 小时'}
              </span>
            </div>
          </>
        )}
        <div className="flex justify-between border-t pt-2 font-medium">
          <span>应付总额</span>
          <span>¥{settlement.total_fee}</span>
        </div>
        <div className="flex justify-between text-gray-500">
          <span>平台抽成（{(settlement.commission_rate * 100).toFixed(0)}%）</span>
          <span>¥{settlement.platform_fee}</span>
        </div>
        <div className="flex justify-between text-green-700">
          <span>护工实得</span>
          <span className="font-semibold">¥{settlement.caregiver_income}</span>
        </div>
        <div className="text-xs text-gray-400 pt-1">
          完成时间：{new Date(settlement.actual_end_time).toLocaleString('zh-CN')} ·
          完成方：{settlement.completed_by === 'patient' ? '患者确认' : '系统自动'}
        </div>
      </div>
    </div>
  );
}
