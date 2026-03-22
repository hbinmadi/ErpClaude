import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { useAuth } from './hooks/useAuth';
import { ThemeProvider } from './lib/ThemeContext';

import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import AccountsPage from './pages/accounts/AccountsPage';
import JournalPage from './pages/accounts/JournalPage';
import JournalEntryFormPage from './pages/accounts/JournalEntryFormPage';
import SuppliersPage from './pages/purchase/SuppliersPage';
import SupplierFormPage from './pages/purchase/SupplierFormPage';
import PurchaseOrdersPage from './pages/purchase/PurchaseOrdersPage';
import PurchaseOrderFormPage from './pages/purchase/PurchaseOrderFormPage';
import SupplierInvoicesPage from './pages/purchase/SupplierInvoicesPage';
import CustomersPage from './pages/sales/CustomersPage';
import CustomerFormPage from './pages/sales/CustomerFormPage';
import SalesOrdersPage from './pages/sales/SalesOrdersPage';
import SalesInvoicesPage from './pages/sales/SalesInvoicesPage';
import SalesInvoiceFormPage from './pages/sales/SalesInvoiceFormPage';
import EmployeesPage from './pages/hr/EmployeesPage';
import EmployeeFormPage from './pages/hr/EmployeeFormPage';
import PayrollPage from './pages/hr/PayrollPage';
import LeavePage from './pages/hr/LeavePage';
import ProductsPage from './pages/inventory/ProductsPage';
import ProductFormPage from './pages/inventory/ProductFormPage';
import StockPage from './pages/inventory/StockPage';
import TrialBalancePage from './pages/reports/TrialBalancePage';
import ProfitLossPage from './pages/reports/ProfitLossPage';
import BalanceSheetPage from './pages/reports/BalanceSheetPage';
import ArAgeingPage from './pages/reports/ArAgeingPage';
import ApAgeingPage from './pages/reports/ApAgeingPage';
import ZatcaPage from './pages/zatca/ZatcaPage';
import BranchesPage from './pages/branches/BranchesPage';
import BranchFormPage from './pages/branches/BranchFormPage';
import BranchProductsPage from './pages/branches/BranchProductsPage';
import BranchTransfersPage from './pages/branches/BranchTransfersPage';
import BranchTransferFormPage from './pages/branches/BranchTransferFormPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg)',
        color: 'var(--text-muted)',
        fontFamily: 'var(--font)',
        fontSize: 14,
        gap: 10,
      }}>
        <div style={{
          width: 20,
          height: 20,
          border: '2px solid var(--border)',
          borderTopColor: 'var(--primary)',
          borderRadius: '50%',
          animation: 'spin 0.7s linear infinite',
        }} />
        Loading…
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const loadUser = useAuth(s => s.loadUser);
  useEffect(() => {
    loadUser();
  }, [loadUser]);

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<DashboardPage />} />
              <Route path="/accounts" element={<AccountsPage />} />
              <Route path="/journal" element={<JournalPage />} />
              <Route path="/journal/new" element={<JournalEntryFormPage />} />
              <Route path="/suppliers" element={<SuppliersPage />} />
              <Route path="/suppliers/new" element={<SupplierFormPage />} />
              <Route path="/suppliers/:id" element={<SupplierFormPage />} />
              <Route path="/purchase-orders" element={<PurchaseOrdersPage />} />
              <Route path="/purchase-orders/new" element={<PurchaseOrderFormPage />} />
              <Route path="/purchase-orders/:id" element={<PurchaseOrderFormPage />} />
              <Route path="/supplier-invoices" element={<SupplierInvoicesPage />} />
              <Route path="/inventory/products" element={<ProductsPage />} />
              <Route path="/inventory/products/new" element={<ProductFormPage />} />
              <Route path="/inventory/products/:id" element={<ProductFormPage />} />
              <Route path="/inventory/stock" element={<StockPage />} />
              <Route path="/customers" element={<CustomersPage />} />
              <Route path="/customers/new" element={<CustomerFormPage />} />
              <Route path="/customers/:id" element={<CustomerFormPage />} />
              <Route path="/sales-orders" element={<SalesOrdersPage />} />
              <Route path="/sales-invoices" element={<SalesInvoicesPage />} />
              <Route path="/sales-invoices/new" element={<SalesInvoiceFormPage />} />
              <Route path="/sales-invoices/:id" element={<SalesInvoiceFormPage />} />
              <Route path="/employees" element={<EmployeesPage />} />
              <Route path="/employees/new" element={<EmployeeFormPage />} />
              <Route path="/employees/:id" element={<EmployeeFormPage />} />
              <Route path="/payroll" element={<PayrollPage />} />
              <Route path="/leave" element={<LeavePage />} />
              <Route path="/reports/trial-balance" element={<TrialBalancePage />} />
              <Route path="/reports/profit-loss" element={<ProfitLossPage />} />
              <Route path="/reports/balance-sheet" element={<BalanceSheetPage />} />
              <Route path="/reports/ar-ageing" element={<ArAgeingPage />} />
              <Route path="/reports/ap-ageing" element={<ApAgeingPage />} />
              <Route path="/zatca" element={<ZatcaPage />} />
              <Route path="/branches" element={<BranchesPage />} />
              <Route path="/branches/new" element={<BranchFormPage />} />
              <Route path="/branches/:id" element={<BranchFormPage />} />
              <Route path="/branches/:id/products" element={<BranchProductsPage />} />
              <Route path="/branch-transfers" element={<BranchTransfersPage />} />
              <Route path="/branch-transfers/new" element={<BranchTransferFormPage />} />
              <Route path="/branch-transfers/:id" element={<BranchTransferFormPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
