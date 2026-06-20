import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { StarRating } from '../components/StarRating';
import { Caregiver, ReviewAggregation, SERVICE_TYPE_LABELS, ServiceType } from '../types';

export function CaregiverDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [caregiver, setCaregiver] = useState<Caregiver | null>(null);
  const [reviews, setReviews] = useState<ReviewAggregation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCaregiver();
  }, [id]);

  const fetchCaregiver = async () => {
    try {
      const [caregiverRes, reviewsRes] = await Promise.all([
        api.get(`/caregivers/${id}`),
        api.get(`/reviews/caregiver/${id}`),
      ]);
      setCaregiver(caregiverRes.data.caregiver);
      setReviews(reviewsRes.data);
    } catch (err) {
      console.error('获取护工详情失败', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center text-gray-600">加载中...</div>
      </div>
    );
  }

  if (!caregiver) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center text-gray-600">护工不存在</div>
      </div>
    );
  }

  const stats = reviews?.stats;
  const maxCount = stats ? Math.max(...stats.distribution.map((d) => d.count), 1) : 1;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button onClick={() => navigate('/caregivers')} className="mb-6 text-gray-600 hover:text-gray-900">
        ← 返回护工列表
      </button>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-8">
          <div className="flex items-start">
            <div className="w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center text-4xl">
              👤
            </div>
            <div className="ml-6 flex-1">
              <h1 className="text-2xl font-bold text-gray-900">{caregiver.name}</h1>
              <div className="flex items-center mt-2">
                <span className="text-yellow-500 text-lg">⭐</span>
                <span className="ml-1 text-lg font-medium text-gray-700">
                  {caregiver.rating.toFixed(1)}
                </span>
                <span className="ml-2 text-sm text-gray-500">
                  ({caregiver.rating_count}条评价)
                </span>
              </div>
              <div className="mt-2 text-gray-600">从业 {caregiver.work_years} 年</div>
            </div>
            <button
              onClick={() => navigate(`/caregivers/${caregiver.id}/booking`)}
              className="bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700"
            >
              立即预约
            </button>
          </div>

          <div className="mt-8 grid md:grid-cols-2 gap-6">
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">服务价格</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">小时价格</span>
                  <span className="text-primary-600 font-semibold">¥{caregiver.hourly_rate}/小时</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">日薪</span>
                  <span className="text-primary-600 font-semibold">¥{caregiver.daily_rate}/天</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">服务项目</h3>
              <div className="flex flex-wrap gap-2">
                {caregiver.service_types.split(',').map((t) => (
                  <span key={t} className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm">
                    {SERVICE_TYPE_LABELS[t as ServiceType] || t}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">个人简介</h3>
            <p className="text-gray-600 leading-relaxed">{caregiver.bio}</p>
          </div>

          {caregiver.certificate_url && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">执业证书</h3>
              <img src={caregiver.certificate_url} alt="执业证书" className="max-w-md rounded-lg border" />
            </div>
          )}

          <div className="mt-6 pt-6 border-t">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">联系方式</h3>
            <div className="text-gray-600">
              <p>电话：{caregiver.phone}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-8 mt-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">评价汇总</h2>
        {stats && stats.total > 0 ? (
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-5xl font-bold text-primary-600">{stats.average.toFixed(1)}</div>
              <div className="mt-2 flex justify-center">
                <StarRating value={stats.average} readonly size="md" />
              </div>
              <div className="mt-2 text-sm text-gray-500">共 {stats.total} 条评价</div>
            </div>
            <div className="md:col-span-2 space-y-2">
              {stats.distribution.map((d) => (
                <div key={d.rating} className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 w-10">{d.rating}星</span>
                  <div className="flex-1 h-5 bg-gray-100 rounded overflow-hidden">
                    <div
                      className="h-full bg-yellow-400"
                      style={{ width: `${(d.count / maxCount) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-600 w-8 text-right">{d.count}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-gray-500 text-sm">暂无评价</div>
        )}

        {reviews && reviews.reviews.length > 0 && (
          <div className="mt-8 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">最新评价</h3>
            {reviews.reviews.map((r) => (
              <div key={r.id} className="border-t pt-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-gray-900">{r.patient_name || '匿名用户'}</span>
                  <span className="text-xs text-gray-400">
                    {new Date(r.created_at).toLocaleDateString('zh-CN')}
                  </span>
                </div>
                <StarRating value={r.rating} readonly size="sm" />
                <p className="mt-2 text-gray-700 text-sm whitespace-pre-wrap">{r.content}</p>
                {r.images.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {r.images.map((img, i) => (
                      <img
                        key={i}
                        src={img}
                        alt={`评价图${i + 1}`}
                        className="w-16 h-16 object-cover rounded border"
                      />
                    ))}
                  </div>
                )}
                {r.reply && (
                  <div className="mt-2 p-3 bg-gray-50 rounded">
                    <div className="text-xs text-gray-500 mb-1">护工回复</div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{r.reply}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
