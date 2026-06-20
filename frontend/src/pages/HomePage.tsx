import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function HomePage() {
  const { isAuthenticated, hasRole } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            专业医院陪护服务
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            为您的家人提供专业、贴心、可靠的护工陪护服务。持证上岗，经验丰富，让您安心放心。
          </p>
          <div className="flex justify-center space-x-4">
            {!isAuthenticated ? (
              <>
                <Link
                  to="/register"
                  className="bg-primary-600 text-white px-8 py-3 rounded-lg text-lg font-medium hover:bg-primary-700 transition"
                >
                  立即注册
                </Link>
                <Link
                  to="/caregivers"
                  className="bg-white text-primary-600 px-8 py-3 rounded-lg text-lg font-medium border border-primary-600 hover:bg-gray-50 transition"
                >
                  浏览护工
                </Link>
              </>
            ) : (
              <>
                {hasRole('patient') && (
                  <Link
                    to="/caregivers"
                    className="bg-primary-600 text-white px-8 py-3 rounded-lg text-lg font-medium hover:bg-primary-700 transition"
                  >
                    预约护工
                  </Link>
                )}
                {hasRole('patient') && (
                  <Link
                    to="/orders"
                    className="bg-white text-primary-600 px-8 py-3 rounded-lg text-lg font-medium border border-primary-600 hover:bg-gray-50 transition"
                  >
                    查看订单
                  </Link>
                )}
                {hasRole('caregiver') && (
                  <Link
                    to="/caregiver/orders"
                    className="bg-primary-600 text-white px-8 py-3 rounded-lg text-lg font-medium hover:bg-primary-700 transition"
                  >
                    管理订单
                  </Link>
                )}
              </>
            )}
          </div>
        </div>

        <div className="mt-20 grid md:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="text-4xl mb-4">👨‍⚕️</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">专业持证护工</h3>
            <p className="text-gray-600">所有护工均持有执业证书，经过严格筛选和培训，确保服务质量。</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="text-4xl mb-4">⏰</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">灵活预约模式</h3>
            <p className="text-gray-600">支持按天或按小时预约，满足不同场景的陪护需求。</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="text-4xl mb-4">⭐</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">真实评价体系</h3>
            <p className="text-gray-600">基于真实服务评价的评分系统，帮您找到最合适的护工。</p>
          </div>
        </div>
      </div>
    </div>
  );
}
