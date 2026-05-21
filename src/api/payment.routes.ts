import { Router } from 'express';
import { AppContainer } from '../container';

export function paymentRoutes(container: AppContainer): Router {
  const router = Router();

  router.post('/webhooks/payments', async (req, res, next) => {
    try {
      const rawBody = JSON.stringify(req.body);
      const signature = req.header('x-alphapulse-signature');
      if (!container.payments.verifyWebhook(signature, rawBody)) {
        res.status(401).json({ error: 'invalid signature' });
        return;
      }
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  router.post('/webhooks/nowpayments', async (req, res, next) => {
    try {
      const rawBody = JSON.stringify(req.body);
      const signature = req.header('x-nowpayments-sig');
      if (!container.payments.verifyNowPaymentsWebhook(signature, rawBody)) {
        res.status(401).json({ error: 'invalid signature' });
        return;
      }

      const status = String(req.body.payment_status ?? '').toLowerCase();
      const invoiceId = String(req.body.order_id ?? req.body.invoice_id ?? '');
      const txHash = String(req.body.purchase_id ?? req.body.payment_id ?? req.body.outcome_hash ?? '');

      if (invoiceId && txHash && ['finished', 'confirmed', 'partially_paid'].includes(status)) {
        await container.payments.confirmNowPaymentsInvoice(invoiceId, txHash, req.body);
      }

      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
