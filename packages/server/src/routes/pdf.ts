import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { htmlToPdf } from '../services/pdf/PdfService';
import { renderSalesInvoice } from '../services/pdf/templates/salesInvoice';
import { renderPurchaseOrder } from '../services/pdf/templates/purchaseOrder';
import { renderDeliveryNote } from '../services/pdf/templates/deliveryNote';
import { renderPayslip } from '../services/pdf/templates/payslip';

const router = Router();
router.use(authenticate);

function sendPdf(res: any, buffer: Buffer, filename: string) {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${filename}.pdf"`);
  res.setHeader('Content-Length', buffer.length);
  res.send(buffer);
}

router.get('/sales-invoices/:id', requireRole('admin', 'accountant', 'sales'), async (req, res) => {
  try {
    const html = await renderSalesInvoice(Number(req.params.id));
    const pdf  = await htmlToPdf(html);
    sendPdf(res, pdf, `invoice-${req.params.id}`);
  } catch (err: any) {
    res.status(err.status || 500).json({ error: 'PDF_ERROR', message: err.message });
  }
});

router.get('/purchase-orders/:id', requireRole('admin', 'accountant', 'purchase'), async (req, res) => {
  try {
    const html = await renderPurchaseOrder(Number(req.params.id));
    const pdf  = await htmlToPdf(html);
    sendPdf(res, pdf, `po-${req.params.id}`);
  } catch (err: any) {
    res.status(err.status || 500).json({ error: 'PDF_ERROR', message: err.message });
  }
});

router.get('/deliveries/:id', requireRole('admin', 'sales', 'warehouse'), async (req, res) => {
  try {
    const html = await renderDeliveryNote(Number(req.params.id));
    const pdf  = await htmlToPdf(html);
    sendPdf(res, pdf, `delivery-${req.params.id}`);
  } catch (err: any) {
    res.status(err.status || 500).json({ error: 'PDF_ERROR', message: err.message });
  }
});

router.get('/payslips/:runId/:employeeId', requireRole('admin', 'accountant'), async (req, res) => {
  try {
    const html = await renderPayslip(Number(req.params.runId), Number(req.params.employeeId));
    const pdf  = await htmlToPdf(html);
    sendPdf(res, pdf, `payslip-${req.params.runId}-${req.params.employeeId}`);
  } catch (err: any) {
    res.status(err.status || 500).json({ error: 'PDF_ERROR', message: err.message });
  }
});

export default router;
