import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { requestId } from './middleware/requestId';
import { generalLimiter } from './middleware/rateLimiter';
import authRoutes from './routes/auth';
import accountRoutes from './routes/accounts';
import journalRoutes from './routes/journal';
import supplierRoutes from './routes/suppliers';
import purchaseOrderRoutes from './routes/purchaseOrders';
import supplierInvoiceRoutes from './routes/supplierInvoices';
import productRoutes from './routes/products';
import inventoryRoutes from './routes/inventory';
import customerRoutes from './routes/customers';
import salesOrderRoutes from './routes/salesOrders';
import salesInvoiceRoutes from './routes/salesInvoices';
import employeeRoutes from './routes/employees';
import payrollRoutes from './routes/payroll';
import leaveRoutes from './routes/leaveRequests';
import reportRoutes from './routes/reports';
import pdfRoutes from './routes/pdf';
import zatcaRoutes from './routes/zatca';
import branchRoutes from './routes/branches';
import branchTransferRoutes from './routes/branchTransfers';
import { startRetryJob } from './services/zatca/ZatcaRetryJob';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(requestId);
app.use(generalLimiter);

// Health
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// Routes
app.use('/api/auth', authRoutes);

app.use('/api/accounts', accountRoutes);
app.use('/api/journal-entries', journalRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/purchase-orders', purchaseOrderRoutes);
app.use('/api/supplier-invoices', supplierInvoiceRoutes);
app.use('/api/products', productRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/sales-orders', salesOrderRoutes);
app.use('/api/sales-invoices', salesInvoiceRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/payroll-runs', payrollRoutes);
app.use('/api/leave-requests', leaveRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/pdf', pdfRoutes);
app.use('/api/zatca', zatcaRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/branch-transfers', branchTransferRoutes);

const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, () => {
  console.log(`Server on port ${PORT}`);
  startRetryJob();
});
export default app;
