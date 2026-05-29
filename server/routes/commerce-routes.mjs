import { buildEntitlementPayload } from '../commerce/product-mapping-service.mjs';
import { memory, nextId } from './memory-state.mjs';

export function mountCommerceRoutes(app) {
  app.get('/destiny-api/customer/products', (_req, res) => {
    res.json({ products: memory.products.filter((product) => product.status === 'active') });
  });

  app.get('/destiny-api/customer/addresses', (_req, res) => res.json({ addresses: memory.addresses }));

  app.post('/destiny-api/customer/addresses', (req, res) => {
    const address = { id: nextId('address'), ...req.body };
    memory.addresses.push(address);
    res.status(201).json({ address });
  });

  app.patch('/destiny-api/customer/addresses/:id', (req, res) => {
    const address = memory.addresses.find((item) => item.id === req.params.id);
    Object.assign(address, req.body || {});
    res.json({ address });
  });

  app.post('/destiny-api/customer/orders', (req, res) => {
    const items = req.body?.items || [];
    const amount = items.reduce((sum, item) => sum + Number(item.price_cents || 0) * Number(item.quantity || 1), 0);
    const order = {
      id: nextId('order'),
      order_no: `ZS${Date.now()}`,
      status: 'pending_payment',
      amount_cents: amount,
      freight_cents: amount >= 9900 ? 0 : Number(req.body?.freight_cents || 800),
      items,
      address_snapshot: req.body?.address || null,
    };
    memory.orders.unshift(order);
    const payment = { id: nextId('payment'), order_id: order.id, provider: req.body?.provider || 'manual', status: 'pending', amount_cents: order.amount_cents + order.freight_cents };
    memory.payments.unshift(payment);
    res.status(201).json({ order, payment });
  });

  app.get('/destiny-api/customer/orders', (_req, res) => res.json({ orders: memory.orders }));
  app.get('/destiny-api/customer/orders/:id', (req, res) => res.json({ order: memory.orders.find((item) => item.id === req.params.id) || null }));

  app.post('/destiny-api/customer/orders/:id/refund-requests', (req, res) => {
    const refund = { id: nextId('refund'), order_id: req.params.id, status: 'requested', ...req.body };
    memory.refunds.unshift(refund);
    res.status(201).json({ refundRequest: refund });
  });

  app.get('/destiny-api/admin/products', (_req, res) => res.json({ products: memory.products }));
  app.post('/destiny-api/admin/products', (req, res) => {
    const product = { id: nextId('product'), status: 'active', ...req.body };
    product.entitlement = buildEntitlementPayload(product);
    memory.products.unshift(product);
    res.status(201).json({ product });
  });
  app.patch('/destiny-api/admin/products/:id', (req, res) => {
    const product = memory.products.find((item) => item.id === req.params.id);
    Object.assign(product, req.body || {});
    res.json({ product });
  });

  app.get('/destiny-api/admin/orders', (_req, res) => res.json({ orders: memory.orders }));
  app.get('/destiny-api/admin/payments', (_req, res) => res.json({ payments: memory.payments }));
  app.post('/destiny-api/admin/payments/:id/mark-paid', (req, res) => {
    const payment = memory.payments.find((item) => item.id === req.params.id);
    if (payment) payment.status = 'paid';
    const order = memory.orders.find((item) => item.id === payment?.order_id);
    if (order) order.status = order.items.some((item) => item.requires_shipping || item.product_type === 'physical_goods') ? 'pending_fulfillment' : 'paid';
    res.json({ payment, order });
  });

  app.post('/destiny-api/admin/orders/:id/ship', (req, res) => {
    const shipment = { id: nextId('shipment'), order_id: req.params.id, carrier: req.body?.carrier, tracking_no: req.body?.trackingNo, shipped_at: new Date().toISOString() };
    memory.shipments.unshift(shipment);
    const order = memory.orders.find((item) => item.id === req.params.id);
    if (order) order.status = 'shipped';
    res.json({ shipment, order });
  });

  app.get('/destiny-api/admin/refund-requests', (_req, res) => res.json({ refundRequests: memory.refunds }));
  app.post('/destiny-api/admin/refund-requests/:id/review', (req, res) => {
    const refund = memory.refunds.find((item) => item.id === req.params.id);
    Object.assign(refund, { status: req.body?.status || 'approved', review_note: req.body?.note || '' });
    res.json({ refundRequest: refund });
  });
  app.get('/destiny-api/admin/delivery-logs', (_req, res) => res.json({ deliveryLogs: [] }));
  app.get('/destiny-api/admin/shipments', (_req, res) => res.json({ shipments: memory.shipments }));
}
