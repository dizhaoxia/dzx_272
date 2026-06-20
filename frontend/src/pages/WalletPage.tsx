import React, { useState, useEffect, useCallback } from 'react';
import api from '../api';
import { Wallet, WalletTransaction } from '../types';

const typeLabels: Record<WalletTransaction['type'], string> = {
  recharge: '充值',
  payment: '支付',
  refund: '退款',
  income: '收入',
};

const typeColors: Record<WalletTransaction['type'], string> = {
  recharge: 'text-green-600',
  payment: 'text-red-600',
  refund: 'text-green-600',
  income: 'text-green-600',
};

export function WalletPage() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [walletRes, txRes] = await Promise.all([
        api.get('/wallet'),
        api.get('/wallet/transactions'),
      ]);
      setWallet(walletRes.data.wallet);
      setTransactions(txRes.data.transactions || []);
    } catch (err) {
      console.error('获取钱包信息失败', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleRecharge = async () => {
    const value = parseFloat(amount);
    if (!value || value <= 0) {
      alert('请输入有效的充值金额');
      return;
    }
    setBusy(true);
    try {
      await api.post('/wallet/recharge', { amount: value });
      setAmount('');
      fetchAll();
    } catch (err: any) {
      alert(err.response?.data?.message || '充值失败');
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

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">我的钱包</h1>

      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-lg shadow-md p-8 mb-6 text-white">
        <div className="text-sm opacity-90">账户余额</div>
        <div className="text-4xl font-bold mt-2">¥{wallet?.balance ?? 0}</div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">余额充值</h2>
        <div className="flex space-x-3">
          <input
            type="number"
            min="1"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            placeholder="输入充值金额"
          />
          <button
            onClick={handleRecharge}
            disabled={busy}
            className="bg-primary-600 text-white px-6 py-2 rounded-md font-medium hover:bg-primary-700 disabled:opacity-50"
          >
            {busy ? '处理中...' : '充值'}
          </button>
        </div>
        <div className="mt-3 flex gap-2">
          {[100, 500, 1000, 2000].map((v) => (
            <button
              key={v}
              onClick={() => setAmount(String(v))}
              className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200"
            >
              ¥{v}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">交易明细</h2>
        {transactions.length === 0 ? (
          <div className="text-gray-500 text-sm text-center py-6">暂无交易记录</div>
        ) : (
          <div className="space-y-3">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex justify-between items-center py-3 border-b last:border-b-0">
                <div>
                  <div className="font-medium text-gray-900">{typeLabels[tx.type]}</div>
                  <div className="text-xs text-gray-500">
                    {new Date(tx.created_at).toLocaleString('zh-CN')}
                    {tx.description ? ` · ${tx.description}` : ''}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-semibold ${typeColors[tx.type]}`}>
                    {tx.amount > 0 ? '+' : ''}¥{tx.amount}
                  </div>
                  <div className="text-xs text-gray-400">余额 ¥{tx.balance_after}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
