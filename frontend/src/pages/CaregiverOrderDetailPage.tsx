import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { filesToBase64 } from '../utils/image';
import { StarRating } from '../components/StarRating';
import {
  Order,
  ServiceRecord,
  Review,
  Settlement,
  ORDER_STATUS_LABELS,
  BOOKING_MODE_LABELS,
  SERVICE_TYPE_LABELS,
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
        <img key={i} src={img} alt={`图片${i + 1}`} className="w-20 h-20 object-cover rounded border" />
      ))}
    </div>
  ) : null;

export function CaregiverOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [settlement, setSettlement] = useState<Settlement | null>(null);
  const [records, setRecords] = useState<ServiceRecord[]>([]);
  const [review, setReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [recordContent, setRecordContent] = useState('');
  const [recordImages, setRecordImages] = useState<string[]>([]);
  const [replyText, setReplyText] = useState('');

  const fetchAll = useCallback(async () => {
    try {
      const [orderRes, recordsRes] = await Promise.all([
        api.get(`/caregiver/orders/${id}`),
        api.get(`/caregiver/orders/${id}/records`),
      ]);
      setOrder(orderRes.data.order);
      setSettlement(orderRes.data.settlement || null);
      setRecords(recordsRes.data.records || []);
      if (orderRes.data.order?.status === 'completed') {
        const reviewRes = await api.get(`/reviews/order/${id}`);
        setReview(reviewRes.data.review || null);
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

  const handleRecordImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const imgs = await filesToBase64(e.target.files);
    setRecordImages((prev) => [...prev, ...imgs]);
  };

  const submitRecord = async () => {
    if (!recordContent.trim()) {
      alert('请填写护理内容');
      return;
    }
    setBusy(true);
    try {
      await api.post(`/caregiver/orders/${id}/records`, {
        content: recordContent,
        images: recordImages,
      });
      setRecordContent('');
      setRecordImages([]);
      fetchAll();
    } catch (err: any) {
      alert(err.response?.data?.message || '记录失败');
    } finally {
      setBusy(false);
    }
  };

  const handleComplete = async () => {
    if (!confirm('确定要发起完成服务请求吗？将通知患者确认。')) return;
    setBusy(true);
    try {
      await api.post(`/caregiver/orders/${id}/complete`);
      fetchAll();
    } catch (err: any) {
      alert(err.response?.data?.message || '发起完成失败');
    } finally {
      setBusy(false);
    }
  };

  const submitReply = async () => {
    if (!review) return;
    if (!replyText.trim()) {
      alert('请填写回复内容');
      return;
    }
    setBusy(true);
    try {
      await api.post(`/reviews/${review.id}/reply`, { reply: replyText });
      setReplyText('');
      fetchAll();
    } catch (err: any) {
      alert(err.response?.data?.message || '回复失败');
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

  const canRecord = order.status === 'in_service' || order.status === 'pending_completion';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button onClick={() => navigate('/caregiver/orders')} className="mb-6 text-gray-600 hover:text-gray-900">
        ← 返回接单管理
      </button>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          <h1 className="text-xl font-bold text-gray-900">服务订单</h1>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[order.status]}`}>
            {ORDER_STATUS_LABELS[order.status]}
          </span>
        </div>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">患者：</span>
            <span className="font-medium">{order.patient_name_user || order.patient_name}</span>
          </div>
          <div>
            <span className="text-gray-500">联系电话：</span>
            <span className="font-medium">{order.patient_phone || '暂无'}</span>
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
          <div className="md:col-span-2">
            <span className="text-gray-500">病情简述：</span>
            <span>{order.patient_condition}</span>
          </div>
          {order.notes && (
            <div className="md:col-span-2">
              <span className="text-gray-500">注意事项：</span>
              <span>{order.notes}</span>
            </div>
          )}
        </div>
        <div className="mt-4 pt-4 border-t flex justify-between items-center">
          <span className="text-gray-600 text-sm">订单金额</span>
          <span className="text-2xl font-bold text-primary-600">¥{order.total_price}</span>
        </div>
      </div>

      {order.status === 'in_service' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
          <p className="text-green-800 text-sm mb-3">服务进行中，请及时记录护理内容。</p>
          <button
            onClick={handleComplete}
            disabled={busy}
            className="bg-primary-600 text-white px-6 py-2 rounded-md font-medium hover:bg-primary-700 disabled:opacity-50"
          >
            发起完成服务
          </button>
        </div>
      )}

      {order.status === 'pending_completion' && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-6 text-amber-800 text-sm">
          已发起完成请求，等待患者确认。患者确认后将自动生成结算明细；超过约定结束时间系统将自动完成结算。
        </div>
      )}

      {canRecord && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">添加服务记录</h2>
          <div className="space-y-4">
            <textarea
              value={recordContent}
              onChange={(e) => setRecordContent(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              placeholder="记录本次护理内容，如：早间协助洗漱、喂药、测量血压等"
            />
            <div>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleRecordImages}
                className="text-sm"
              />
              {recordImages.length > 0 && renderImages(recordImages)}
            </div>
            <button
              onClick={submitRecord}
              disabled={busy}
              className="bg-primary-600 text-white px-6 py-2 rounded-md font-medium hover:bg-primary-700 disabled:opacity-50"
            >
              {busy ? '提交中...' : '提交记录'}
            </button>
          </div>
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
          <h2 className="text-lg font-semibold text-gray-900 mb-4">患者评价</h2>
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
              {review.reply ? (
                <div className="mt-3 p-3 bg-gray-50 rounded">
                  <div className="text-xs text-gray-500 mb-1">我的回复</div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{review.reply}</p>
                </div>
              ) : (
                <div className="mt-3 space-y-2">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    rows={2}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    placeholder="回复患者评价（选填）"
                  />
                  <button
                    onClick={submitReply}
                    disabled={busy}
                    className="bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
                  >
                    回复评价
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-gray-500 text-sm">患者暂未评价</div>
          )}
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
          <div className="flex justify-between">
            <span className="text-gray-600">
              加班费（{settlement.overtime_units} 单位 ×{settlement.overtime_rate}倍）
            </span>
            <span>¥{settlement.overtime_fee}</span>
          </div>
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
          <span>实得收入</span>
          <span className="font-semibold">¥{settlement.caregiver_income}</span>
        </div>
      </div>
    </div>
  );
}
