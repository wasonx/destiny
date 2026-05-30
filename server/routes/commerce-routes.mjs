import { createOrder, createPaymentIntent, markOrderShipped, markPaymentPaid } from '../commerce/order-service.mjs';
import { buildEntitlementPayload } from '../commerce/product-mapping-service.mjs';
import { createRefundRequest, reviewRefundRequest } from '../commerce/refund-service.mjs';
import { requireSession } from '../middleware/require-session.mjs';
import { requirePlatformAdmin } from '../middleware/roles.mjs';
import { memory, nextId } from './memory-state.mjs';

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function knownCommerceStatus(error) {
  if (['INVALID_ORDER', 'ADDRESS_REQUIRED', 'PRODUCT_NOT_AVAILABLE', 'INSUFFICIENT_INVENTORY', 'INVALID_ORDER_STATUS', 'INVALID_REFUND_ORDER_STATUS'].includes(error.code)) {
    return 400;
  }
  if (error.code === 'REFUND_NOT_FOUND') return 404;
  if (error.message?.startsWith('INVALID_PAYMENT_TRANSITION')) return 400;
  if (error.message === 'PAYMENT_NOT_FOUND' || error.message === 'ORDER_NOT_FOUND') return 404;
  return 500;
}

function mountDatabaseCommerceRoutes(app, { pool, config }) {
  const customerOnly = requireSession({ pool, config, accountTypes: ['customer'] });
  const adminSession = requireSession({ pool, config, accountTypes: ['editor', 'admin'] });
  const platformAdminOnly = (req, res, next) => {
    if (!requirePlatformAdmin(req, res, pool)) return;
    next();
  };
  const adminOnly = [adminSession, platformAdminOnly];

  app.get('/destiny-api/customer/products', asyncRoute(async (_req, res) => {
    const result = await pool.query(
      `
        select *
        from app.commerce_products
        where status = 'active'
        order by created_at desc
      `,
    );
    res.json({ products: result.rows });
  }));

  app.get('/destiny-api/customer/addresses', customerOnly, asyncRoute(async (req, res) => {
    const result = await pool.query(
      `
        select *
        from app.customer_addresses
        where customer_id = $1
        order by is_default desc, created_at desc
      `,
      [req.session.user_id],
    );
    res.json({ addresses: result.rows });
  }));

  app.post('/destiny-api/customer/addresses', customerOnly, asyncRoute(async (req, res) => {
    const result = await pool.query(
      `
        insert into app.customer_addresses(customer_id, receiver_name, phone, province, city, district, detail_address, is_default)
        values ($1, $2, $3, $4, $5, $6, $7, $8)
        returning *
      `,
      [
        req.session.user_id,
        req.body?.receiver_name || req.body?.receiverName,
        req.body?.phone,
        req.body?.province || '',
        req.body?.city || '',
        req.body?.district || '',
        req.body?.detail_address || req.body?.detailAddress,
        Boolean(req.body?.is_default || req.body?.isDefault),
      ],
    );
    res.status(201).json({ address: result.rows[0] });
  }));

  app.patch('/destiny-api/customer/addresses/:id', customerOnly, asyncRoute(async (req, res) => {
    const result = await pool.query(
      `
        update app.customer_addresses
        set receiver_name = coalesce($3, receiver_name),
            phone = coalesce($4, phone),
            province = coalesce($5, province),
            city = coalesce($6, city),
            district = coalesce($7, district),
            detail_address = coalesce($8, detail_address),
            is_default = coalesce($9, is_default),
            updated_at = now()
        where id = $1 and customer_id = $2
        returning *
      `,
      [
        req.params.id,
        req.session.user_id,
        req.body?.receiver_name || req.body?.receiverName || null,
        req.body?.phone || null,
        req.body?.province || null,
        req.body?.city || null,
        req.body?.district || null,
        req.body?.detail_address || req.body?.detailAddress || null,
        typeof req.body?.is_default === 'boolean' ? req.body.is_default : (typeof req.body?.isDefault === 'boolean' ? req.body.isDefault : null),
      ],
    );
    res.json({ address: result.rows[0] || null });
  }));

  app.post('/destiny-api/customer/orders', customerOnly, asyncRoute(async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query('begin');
      const order = await createOrder(client, {
        customerId: req.session.user_id,
        items: req.body?.items || [],
        address: req.body?.address || null,
        freightCents: Number(req.body?.freight_cents || req.body?.freightCents || 800),
      });
      const payment = await createPaymentIntent(client, {
        orderId: order.id,
        amountCents: Number(order.amount_cents) + Number(order.freight_cents || 0),
        provider: req.body?.provider || 'manual',
      });
      await client.query('commit');
      res.status(201).json({ order, payment });
    } catch (error) {
      await client.query('rollback');
      res.status(knownCommerceStatus(error)).json({ error: error.code || error.message });
    } finally {
      client.release();
    }
  }));

  app.get('/destiny-api/customer/orders', customerOnly, asyncRoute(async (req, res) => {
    const result = await pool.query(
      `
        select *
        from app.commerce_orders
        where customer_id = $1
        order by created_at desc
      `,
      [req.session.user_id],
    );
    res.json({ orders: result.rows });
  }));

  app.get('/destiny-api/customer/orders/:id', customerOnly, asyncRoute(async (req, res) => {
    const result = await pool.query(
      'select * from app.commerce_orders where id = $1 and customer_id = $2',
      [req.params.id, req.session.user_id],
    );
    res.json({ order: result.rows[0] || null });
  }));

  app.post('/destiny-api/customer/orders/:id/refund-requests', customerOnly, asyncRoute(async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query('begin');
      const order = await client.query('select * from app.commerce_orders where id = $1 and customer_id = $2 for update', [req.params.id, req.session.user_id]);
      if (!order.rowCount) {
        await client.query('rollback');
        res.status(404).json({ error: 'ORDER_NOT_FOUND' });
        return;
      }
      const refund = await createRefundRequest(client, {
        orderId: req.params.id,
        customerId: req.session.user_id,
        reason: req.body?.reason || '客户申请退款',
        amountCents: Number(req.body?.amount_cents || req.body?.amountCents || order.rows[0].amount_cents),
      });
      await client.query("update app.commerce_orders set status = 'refund_requested', updated_at = now() where id = $1", [req.params.id]);
      await client.query('commit');
      res.status(201).json({ refundRequest: refund });
    } catch (error) {
      await client.query('rollback');
      res.status(knownCommerceStatus(error)).json({ error: error.code || error.message });
    } finally {
      client.release();
    }
  }));

  app.get('/destiny-api/admin/products', adminOnly, asyncRoute(async (_req, res) => {
    const result = await pool.query('select * from app.commerce_products order by created_at desc');
    res.json({ products: result.rows });
  }));

  app.post('/destiny-api/admin/products', adminOnly, asyncRoute(async (req, res) => {
    const product = { ...req.body, entitlement_payload: req.body?.entitlement_payload || req.body?.entitlementPayload || {} };
    const entitlement = buildEntitlementPayload(product);
    const result = await pool.query(
      `
        insert into app.commerce_products(medusa_product_id, sku, name, product_type, price_cents, currency, entitlement_payload, requires_shipping, status)
        values ($1, $2, $3, $4, $5, $6, $7, $8, coalesce($9, 'active'))
        returning *
      `,
      [
        product.medusa_product_id || product.medusaProductId || null,
        product.sku,
        product.name,
        product.product_type || product.productType,
        Number(product.price_cents || product.priceCents || 0),
        product.currency || 'CNY',
        product.entitlement_payload,
        Boolean(product.requires_shipping || product.requiresShipping || entitlement.requiresShipping),
        product.status || 'active',
      ],
    );
    if (result.rows[0]?.requires_shipping) {
      await pool.query(
        `
          insert into app.commerce_inventory(sku, quantity, safety_stock)
          values ($1, 0, 0)
          on conflict (sku) do nothing
        `,
        [result.rows[0].sku],
      );
    }
    res.status(201).json({ product: result.rows[0] });
  }));

  app.patch('/destiny-api/admin/products/:id', adminOnly, asyncRoute(async (req, res) => {
    const result = await pool.query(
      `
        update app.commerce_products
        set name = coalesce($2, name),
            price_cents = coalesce($3, price_cents),
            entitlement_payload = coalesce($4, entitlement_payload),
            requires_shipping = coalesce($5, requires_shipping),
            status = coalesce($6, status),
            updated_at = now()
        where id = $1
        returning *
      `,
      [
        req.params.id,
        req.body?.name || null,
        req.body?.price_cents || req.body?.priceCents || null,
        req.body?.entitlement_payload || req.body?.entitlementPayload || null,
        typeof req.body?.requires_shipping === 'boolean'
          ? req.body.requires_shipping
          : (typeof req.body?.requiresShipping === 'boolean' ? req.body.requiresShipping : null),
        req.body?.status || null,
      ],
    );
    res.json({ product: result.rows[0] || null });
  }));

  app.get('/destiny-api/admin/inventory', adminOnly, asyncRoute(async (_req, res) => {
    const result = await pool.query('select * from app.commerce_inventory order by updated_at desc');
    res.json({ inventory: result.rows });
  }));

  app.patch('/destiny-api/admin/inventory/:sku', adminOnly, asyncRoute(async (req, res) => {
    const result = await pool.query(
      `
        insert into app.commerce_inventory(sku, quantity, safety_stock)
        values ($1, $2, $3)
        on conflict (sku) do update
        set quantity = excluded.quantity,
            safety_stock = excluded.safety_stock,
            updated_at = now()
        returning *
      `,
      [req.params.sku, Number(req.body?.quantity || 0), Number(req.body?.safety_stock || req.body?.safetyStock || 0)],
    );
    res.json({ inventory: result.rows[0] });
  }));

  app.get('/destiny-api/admin/orders', adminOnly, asyncRoute(async (_req, res) => {
    const result = await pool.query('select * from app.commerce_orders order by created_at desc');
    res.json({ orders: result.rows });
  }));

  app.get('/destiny-api/admin/payments', adminOnly, asyncRoute(async (_req, res) => {
    const result = await pool.query('select * from app.payment_intents order by created_at desc');
    res.json({ payments: result.rows });
  }));

  app.post('/destiny-api/admin/payments/:id/mark-paid', adminOnly, asyncRoute(async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query('begin');
      const payment = await markPaymentPaid(client, { paymentIntentId: req.params.id, actorUserId: req.session.user_id });
      const order = await client.query('select * from app.commerce_orders where id = $1', [payment.order_id]);
      await client.query('commit');
      res.json({ payment, order: order.rows[0] || null });
    } catch (error) {
      await client.query('rollback');
      res.status(knownCommerceStatus(error)).json({ error: error.code || error.message });
    } finally {
      client.release();
    }
  }));

  app.post('/destiny-api/admin/orders/:id/ship', adminOnly, asyncRoute(async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query('begin');
      const shipment = await markOrderShipped(client, {
        orderId: req.params.id,
        carrier: req.body?.carrier,
        trackingNo: req.body?.tracking_no || req.body?.trackingNo,
        actorUserId: req.session.user_id,
      });
      const order = await client.query('select * from app.commerce_orders where id = $1', [req.params.id]);
      await client.query('commit');
      res.json({ shipment, order: order.rows[0] || null });
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }));

  app.get('/destiny-api/admin/refund-requests', adminOnly, asyncRoute(async (_req, res) => {
    const result = await pool.query('select * from app.refund_requests order by created_at desc');
    res.json({ refundRequests: result.rows });
  }));

  app.post('/destiny-api/admin/refund-requests/:id/review', adminOnly, asyncRoute(async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query('begin');
      const refund = await reviewRefundRequest(client, {
        refundRequestId: req.params.id,
        status: req.body?.status || 'approved',
        reviewerId: req.session.user_id,
        note: req.body?.note || '',
      });
      await client.query('commit');
      res.json({ refundRequest: refund });
    } catch (error) {
      await client.query('rollback');
      res.status(knownCommerceStatus(error)).json({ error: error.code || error.message });
    } finally {
      client.release();
    }
  }));

  app.get('/destiny-api/admin/delivery-logs', adminOnly, asyncRoute(async (_req, res) => {
    const result = await pool.query('select * from app.entitlement_deliveries order by delivered_at desc');
    res.json({ deliveryLogs: result.rows });
  }));

  app.get('/destiny-api/admin/shipments', adminOnly, asyncRoute(async (_req, res) => {
    const result = await pool.query('select * from app.shipments order by shipped_at desc');
    res.json({ shipments: result.rows });
  }));
}

function mountMemoryCommerceRoutes(app) {
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
    const order = memory.orders.find((item) => item.id === req.params.id);
    if (!order || !['paid', 'pending_fulfillment', 'shipped', 'completed'].includes(order.status)) {
      res.status(400).json({ error: 'INVALID_REFUND_ORDER_STATUS' });
      return;
    }
    const refund = { id: nextId('refund'), order_id: req.params.id, status: 'requested', ...req.body };
    memory.refunds.unshift(refund);
    order.status = 'refund_requested';
    res.status(201).json({ refundRequest: refund });
  });

  app.get('/destiny-api/admin/products', (_req, res) => res.json({ products: memory.products }));
  app.post('/destiny-api/admin/products', (req, res) => {
    const product = { id: nextId('product'), status: 'active', ...req.body };
    product.entitlement = buildEntitlementPayload(product);
    memory.products.unshift(product);
    if (product.requires_shipping || product.product_type === 'physical_goods') {
      memory.inventory.unshift({ sku: product.sku, quantity: 0, safety_stock: 0, updated_at: new Date().toISOString() });
    }
    res.status(201).json({ product });
  });
  app.patch('/destiny-api/admin/products/:id', (req, res) => {
    const product = memory.products.find((item) => item.id === req.params.id);
    Object.assign(product, req.body || {});
    res.json({ product });
  });
  app.get('/destiny-api/admin/inventory', (_req, res) => res.json({ inventory: memory.inventory }));
  app.patch('/destiny-api/admin/inventory/:sku', (req, res) => {
    let row = memory.inventory.find((item) => item.sku === req.params.sku);
    if (!row) {
      row = { sku: req.params.sku, quantity: 0, safety_stock: 0, updated_at: new Date().toISOString() };
      memory.inventory.unshift(row);
    }
    Object.assign(row, {
      quantity: Number(req.body?.quantity || 0),
      safety_stock: Number(req.body?.safety_stock || req.body?.safetyStock || 0),
      updated_at: new Date().toISOString(),
    });
    res.json({ inventory: row });
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
    if (!refund) {
      res.status(404).json({ error: 'REFUND_NOT_FOUND' });
      return;
    }
    Object.assign(refund, { status: req.body?.status || 'approved', review_note: req.body?.note || '' });
    const order = memory.orders.find((item) => item.id === refund?.order_id);
    if (order) {
      order.status = refund.status === 'approved' || refund.status === 'processed'
        ? 'refunded'
        : (order.items || []).some((item) => item.requires_shipping || item.product_type === 'physical_goods') ? 'pending_fulfillment' : 'paid';
    }
    res.json({ refundRequest: refund });
  });
  app.get('/destiny-api/admin/delivery-logs', (_req, res) => res.json({ deliveryLogs: [] }));
  app.get('/destiny-api/admin/shipments', (_req, res) => res.json({ shipments: memory.shipments }));
}

export function mountCommerceRoutes(app, { pool = null, config = null } = {}) {
  if (pool) {
    mountDatabaseCommerceRoutes(app, { pool, config });
    return;
  }
  mountMemoryCommerceRoutes(app);
}
