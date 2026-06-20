import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { Caregiver, BookingMode, ServiceType, BOOKING_MODE_LABELS, SERVICE_TYPE_LABELS } from '../types';

export function BookingPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [caregiver, setCaregiver] = useState<Caregiver | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);

  const [bookingMode, setBookingMode] = useState<BookingMode>('daily');
  const [serviceType, setServiceType] = useState<ServiceType>('normal');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');
  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [patientCondition, setPatientCondition] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchCaregiver();
  }, [id]);

  const fetchCaregiver = async () => {
    try {
      const res = await api.get(`/caregivers/${id}`);
      setCaregiver(res.data.caregiver);
      const types = res.data.caregiver.service_types.split(',');
      if (types.length > 0) {
        setServiceType(types[0] as ServiceType);
      }
    } catch (err) {
      console.error('获取护工详情失败', err);
    } finally {
      setLoading(false);
    }
  };

  const calculatePrice = () => {
    if (!caregiver) return 0;
    if (!startDate || !endDate) return 0;

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) return 0;

    if (bookingMode === 'daily') {
      const days = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      return days * caregiver.daily_rate;
    } else {
      if (!startTime || !endTime) return 0;
      const [sh, sm] = startTime.split(':').map(Number);
      const [eh, em] = endTime.split(':').map(Number);
      let hours = eh + em / 60 - (sh + sm / 60);
      if (hours <= 0) return 0;
      const days = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      return Math.ceil(hours) * caregiver.hourly_rate * days;
    }
  };

  const totalPrice = calculatePrice();
  const availableServiceTypes = caregiver ? caregiver.service_types.split(',') : [];

  const handleSubmit = async () => {
    setError('');
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const totalDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      let totalHours = null;
      if (bookingMode === 'hourly') {
        const [sh, sm] = startTime.split(':').map(Number);
        const [eh, em] = endTime.split(':').map(Number);
        totalHours = Math.ceil(eh + em / 60 - (sh + sm / 60));
      }

      const res = await api.post('/orders', {
        caregiver_id: id,
        booking_mode: bookingMode,
        service_type: serviceType,
        start_date: startDate,
        end_date: endDate,
        start_time: bookingMode === 'hourly' ? startTime : null,
        end_time: bookingMode === 'hourly' ? endTime : null,
        total_hours: totalHours,
        total_days: bookingMode === 'daily' ? totalDays : null,
        total_price: totalPrice,
        patient_name: patientName,
        patient_age: parseInt(patientAge),
        patient_condition: patientCondition,
        notes,
      });

      navigate(`/orders/${res.data.order.id}`);
    } catch (err: any) {
      setError(err.response?.data?.message || '提交订单失败');
    }
  };

  const canGoNext = () => {
    if (step === 1) {
      return startDate && endDate && new Date(endDate) >= new Date(startDate);
    }
    if (step === 2) {
      return patientName && patientAge && patientCondition;
    }
    return true;
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
        onClick={() => navigate(`/caregivers/${caregiver.id}`)}
        className="mb-6 text-gray-600 hover:text-gray-900"
      >
        ← 返回护工详情
      </button>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        预约 {caregiver.name}
      </h1>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="flex items-center mb-8">
        {[1, 2, 3].map((s) => (
          <React.Fragment key={s}>
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                step >= s ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-500'
              }`}
            >
              {s}
            </div>
            {s < 3 && (
              <div
                className={`flex-1 h-1 mx-2 ${step > s ? 'bg-primary-600' : 'bg-gray-200'}`}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">选择预约方式和时间</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">预约方式</label>
              <div className="flex space-x-4">
                {(['daily', 'hourly'] as BookingMode[]).map((mode) => (
                  <label key={mode} className="flex items-center">
                    <input
                      type="radio"
                      name="bookingMode"
                      value={mode}
                      checked={bookingMode === mode}
                      onChange={(e) => setBookingMode(e.target.value as BookingMode)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                    />
                    <span className="ml-2">{BOOKING_MODE_LABELS[mode]}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">服务类型</label>
              <div className="flex flex-wrap gap-4">
                {availableServiceTypes.map((type) => (
                  <label key={type} className="flex items-center">
                    <input
                      type="radio"
                      name="serviceType"
                      value={type}
                      checked={serviceType === type}
                      onChange={(e) => setServiceType(e.target.value as ServiceType)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                    />
                    <span className="ml-2">{SERVICE_TYPE_LABELS[type as ServiceType]}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">开始日期</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">结束日期</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>

            {bookingMode === 'hourly' && (
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">开始时间</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">结束时间</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>
            )}

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-gray-700">预计费用</span>
                <span className="text-2xl font-bold text-primary-600">¥{totalPrice}</span>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setStep(2)}
                disabled={!canGoNext()}
                className="bg-primary-600 text-white px-6 py-2 rounded-md font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                下一步
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">填写患者信息</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">患者姓名</label>
              <input
                type="text"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                placeholder="请输入患者姓名"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">患者年龄</label>
              <input
                type="number"
                min="0"
                max="150"
                value={patientAge}
                onChange={(e) => setPatientAge(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                placeholder="请输入患者年龄"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">病情简述</label>
              <textarea
                value={patientCondition}
                onChange={(e) => setPatientCondition(e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                placeholder="请简要描述患者病情，方便护工了解情况"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">注意事项（选填）</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                placeholder="饮食禁忌、用药提醒等特殊注意事项"
              />
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setStep(1)}
                className="border border-gray-300 text-gray-700 px-6 py-2 rounded-md font-medium hover:bg-gray-50"
              >
                上一步
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!canGoNext()}
                className="bg-primary-600 text-white px-6 py-2 rounded-md font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                下一步
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">确认订单信息</h2>

            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">护工</span>
                <span className="font-medium">{caregiver.name}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">服务类型</span>
                <span className="font-medium">{SERVICE_TYPE_LABELS[serviceType]}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">预约方式</span>
                <span className="font-medium">{BOOKING_MODE_LABELS[bookingMode]}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">服务日期</span>
                <span className="font-medium">{startDate} 至 {endDate}</span>
              </div>
              {bookingMode === 'hourly' && (
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">服务时间</span>
                  <span className="font-medium">{startTime} - {endTime}</span>
                </div>
              )}
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">患者姓名</span>
                <span className="font-medium">{patientName}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">患者年龄</span>
                <span className="font-medium">{patientAge}岁</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">病情简述</span>
                <span className="font-medium text-right max-w-xs">{patientCondition}</span>
              </div>
              {notes && (
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">注意事项</span>
                  <span className="font-medium text-right max-w-xs">{notes}</span>
                </div>
              )}
              <div className="flex justify-between py-4 bg-primary-50 px-4 rounded-lg mt-4">
                <span className="text-lg font-semibold text-gray-800">总费用</span>
                <span className="text-2xl font-bold text-primary-600">¥{totalPrice}</span>
              </div>
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setStep(2)}
                className="border border-gray-300 text-gray-700 px-6 py-2 rounded-md font-medium hover:bg-gray-50"
              >
                上一步
              </button>
              <button
                onClick={handleSubmit}
                className="bg-primary-600 text-white px-8 py-2 rounded-md font-medium hover:bg-primary-700"
              >
                提交订单
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
