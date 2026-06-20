import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Navbar } from './components/Navbar';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { CaregiverListPage } from './pages/CaregiverListPage';
import { CaregiverDetailPage } from './pages/CaregiverDetailPage';
import { BookingPage } from './pages/BookingPage';
import { OrderListPage } from './pages/OrderListPage';
import { CaregiverOrdersPage } from './pages/CaregiverOrdersPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <main>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/caregivers" element={<CaregiverListPage />} />
              <Route path="/caregivers/:id" element={<CaregiverDetailPage />} />
              <Route
                path="/caregivers/:id/booking"
                element={
                  <ProtectedRoute roles={['patient']}>
                    <BookingPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/orders"
                element={
                  <ProtectedRoute roles={['patient', 'admin']}>
                    <OrderListPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/caregiver/orders"
                element={
                  <ProtectedRoute roles={['caregiver']}>
                    <CaregiverOrdersPage />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
