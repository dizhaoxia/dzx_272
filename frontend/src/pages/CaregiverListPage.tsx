import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { Caregiver, SERVICE_TYPE_LABELS, ServiceType } from '../types';

export function CaregiverListPage() {
  const [caregivers, setCaregivers] = useState<Caregiver[]>([]);
  const [serviceType, setServiceType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('rating');
  const [sortOrder, setSortOrder] = useState<string>('desc');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCaregivers();
  }, [serviceType, sortBy, sortOrder]);

  const fetchCaregivers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (serviceType !== 'all') params.append('service_type', serviceType);
      params.append('sort_by', sortBy);
      params.append('sort_order', sortOrder);
      const res = await api.get(`/caregivers?${params.toString()}`);
      setCaregivers(res.data.caregivers);
    } catch (err) {
      console.error('获取护工列表失败', err);
    } finally {
      setLoading(false);
    }
  };

  const getServiceTypeLabels = (types: string) => {
    return types.split(',').map((t) => SERVICE_TYPE_LABELS[t as ServiceType] || t).join('、');
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center text-gray-600">加载中...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">护工列表</h1>

      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center">
            <label className="text-sm font-medium text-gray-700 mr-2">服务类型：</label>
            <select
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="all">全部</option>
              <option value="normal">普通陪护</option>
              <option value="intensive">重症护理</option>
              <option value="night">夜间陪护</option>
            </select>
          </div>
          <div className="flex items-center">
            <label className="text-sm font-medium text-gray-700 mr-2">排序：</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="rating">评分</option>
              <option value="hourly_rate">小时价格</option>
              <option value="daily_rate">日薪</option>
              <option value="work_years">工作年限</option>
            </select>
          </div>
          <div className="flex items-center">
            <label className="text-sm font-medium text-gray-700 mr-2">顺序：</label>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="desc">降序</option>
              <option value="asc">升序</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {caregivers.map((c) => (
          <div key={c.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
            <div className="p-6">
              <div className="flex items-start">
                <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center text-2xl">
                  👤
                </div>
                <div className="ml-4 flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{c.name}</h3>
                  <div className="flex items-center mt-1">
                    <span className="text-yellow-500">⭐</span>
                    <span className="ml-1 text-sm text-gray-700">{c.rating.toFixed(1)}</span>
                    <span className="ml-2 text-xs text-gray-500">({c.rating_count}条评价)</span>
                  </div>
                  <div className="mt-1 text-sm text-gray-600">
                    从业 {c.work_years} 年
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <div className="text-sm text-gray-500 mb-1">服务项目</div>
                <div className="flex flex-wrap gap-2">
                  {c.service_types.split(',').map((t) => (
                    <span
                      key={t}
                      className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded"
                    >
                      {SERVICE_TYPE_LABELS[t as ServiceType] || t}
                    </span>
                  ))}
                </div>
              </div>

              <p className="mt-4 text-sm text-gray-600 line-clamp-2">{c.bio}</p>

              <div className="mt-4 flex justify-between items-center">
                <div>
                  <span className="text-xs text-gray-500">¥{c.hourly_rate}/小时</span>
                  <span className="mx-2 text-gray-300">|</span>
                  <span className="text-xs text-gray-500">¥{c.daily_rate}/天</span>
                </div>
                <Link
                  to={`/caregivers/${c.id}`}
                  className="bg-primary-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-700"
                >
                  查看详情
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {caregivers.length === 0 && (
        <div className="text-center text-gray-500 py-12">暂无符合条件的护工</div>
      )}
    </div>
  );
}
