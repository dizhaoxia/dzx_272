import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { Caregiver, SERVICE_TYPE_LABELS, ServiceType } from '../types';

export function CaregiverDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [caregiver, setCaregiver] = useState<Caregiver | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCaregiver();
  }, [id]);

  const fetchCaregiver = async () => {
    try {
      const res = await api.get(`/caregivers/${id}`);
      setCaregiver(res.data.caregiver);
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

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => navigate('/caregivers')}
        className="mb-6 text-gray-600 hover:text-gray-900"
      >
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
                  <span
                    key={t}
                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm"
                  >
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
              <img
                src={caregiver.certificate_url}
                alt="执业证书"
                className="max-w-md rounded-lg border"
              />
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
    </div>
  );
}
