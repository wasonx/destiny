import React, { useEffect, useMemo, useState } from 'react';
import { MapPin, PackageCheck, ReceiptText, RefreshCw, ShoppingBag, Sparkles } from 'lucide-react';
import { fetchValueState } from '../lib/customerAuth';
import { createAddress, createOrder, createRefundRequest, CustomerAddress, CustomerOrder, CustomerProduct, listAddresses, listOrders, listProducts } from '../lib/customerCommerce';

function money(cents?: number) {
  return (Number(cents || 0) / 100).toFixed(2);
}

function statusText(status?: string) {
  const labels: Record<string, string> = {
    pending_payment: '待支付确认',
    paid: '已支付',
    pending_fulfillment: '待发货',
    shipped: '已发货',
    completed: '已完成',
    refund_requested: '退款处理中',
    refunded: '已退款',
    closed: '已关闭',
  };
  return status ? labels[status] || status : '待处理';
}

function productTypeText(product: CustomerProduct) {
  return product.requires_shipping || product.product_type === 'physical_goods' ? '实物商品' : '虚拟权益';
}

function orderAmount(order: CustomerOrder) {
  return Number(order.amount_cents || 0) + Number(order.freight_cents || 0);
}

function addressLabel(address: CustomerAddress) {
  return [
    address.receiver_name || address.receiverName,
    address.phone,
    address.province,
    address.city,
    address.district,
    address.detail_address || address.detailAddress,
  ].filter(Boolean).join(' ');
}

export default function CustomerCenter() {
  const [valueState, setValueState] = useState<any>(null);
  const [products, setProducts] = useState<CustomerProduct[]>([]);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [addressForm, setAddressForm] = useState({
    receiver_name: '',
    phone: '',
    province: '',
    city: '',
    district: '',
    detail_address: '',
  });
  const [loading, setLoading] = useState(false);
  const [busySku, setBusySku] = useState('');
  const [savingAddress, setSavingAddress] = useState(false);
  const [refundingId, setRefundingId] = useState('');
  const [message, setMessage] = useState('');

  async function loadCenter() {
    setLoading(true);
    setMessage('');
    try {
      const [stateData, productData, orderData, addressData] = await Promise.all([
        fetchValueState().catch(() => null),
        listProducts().catch(() => ({ products: [] })),
        listOrders().catch(() => ({ orders: [] })),
        listAddresses().catch(() => ({ addresses: [] })),
      ]);
      setValueState(stateData);
      setProducts(productData.products || []);
      setOrders(orderData.orders || []);
      setAddresses(addressData.addresses || []);
      if (!selectedAddressId && addressData.addresses?.[0]?.id) {
        setSelectedAddressId(addressData.addresses[0].id);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCenter();
  }, []);

  async function saveAddress() {
    if (savingAddress) return;
    if (!addressForm.receiver_name || !addressForm.phone || !addressForm.detail_address) {
      setMessage('请填写收货人、手机号和详细地址。');
      return;
    }
    setSavingAddress(true);
    setMessage('');
    try {
      const result = await createAddress({ ...addressForm, is_default: !addresses.length });
      setMessage('收货地址已保存。');
      setAddressForm({ receiver_name: '', phone: '', province: '', city: '', district: '', detail_address: '' });
      await loadCenter();
      if (result.address?.id) {
        setSelectedAddressId(result.address.id);
      }
    } catch (error) {
      setMessage('地址保存失败，请稍后再试。');
    } finally {
      setSavingAddress(false);
    }
  }

  async function buyProduct(product: CustomerProduct) {
    if (busySku) return;
    const requiresAddress = product.requires_shipping || product.product_type === 'physical_goods';
    const selectedAddress = addresses.find((address) => address.id === selectedAddressId) || null;
    if (requiresAddress && !selectedAddress) {
      setMessage('实物商品需要先保存并选择收货地址。');
      return;
    }
    setBusySku(product.sku);
    setMessage('');
    try {
      await createOrder({
        provider: 'manual',
        items: [{ sku: product.sku, quantity: 1 }],
        address: requiresAddress ? { ...selectedAddress, address_snapshot: addressLabel(selectedAddress) } : null,
      });
      setMessage('订单已创建，等待后台人工确认支付。');
      await loadCenter();
    } catch (error) {
      setMessage('下单失败，请稍后再试。');
    } finally {
      setBusySku('');
    }
  }

  async function requestRefund(order: CustomerOrder) {
    if (refundingId) return;
    setRefundingId(order.id);
    setMessage('');
    try {
      await createRefundRequest(order.id, {
        reason: '客户在 H5 申请退款',
        amount_cents: orderAmount(order),
      });
      setMessage('退款申请已提交，等待后台处理。');
      await loadCenter();
    } catch (error) {
      setMessage('退款申请失败，请稍后再试。');
    } finally {
      setRefundingId('');
    }
  }

  const points = valueState?.points || {};
  const virtualProducts = useMemo(() => products.filter((item) => !(item.requires_shipping || item.product_type === 'physical_goods')), [products]);
  const physicalProducts = useMemo(() => products.filter((item) => item.requires_shipping || item.product_type === 'physical_goods'), [products]);

  return (
    <div className="space-y-6 py-4">
      <section className="flex flex-col gap-4 border-b border-shadow-gray pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-mono text-xs uppercase text-wisdom-gold">CUSTOMER CENTER</p>
          <h2 className="mt-2 font-serif text-2xl text-ink-blue">客户中心</h2>
          <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">查看会员、积分、商城商品和订单状态。</p>
        </div>
        <button
          onClick={() => void loadCenter()}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-shadow-gray px-4 py-3 text-sm text-ink-blue transition-colors hover:bg-surface disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          刷新
        </button>
      </section>

      {message ? <p className="rounded-lg border border-wisdom-gold/30 bg-wisdom-gold/10 px-4 py-3 text-sm text-ink-blue">{message}</p> : null}

      <section className="grid gap-3 rounded-lg border border-shadow-gray bg-white p-5 md:grid-cols-4">
        <div><p className="text-xs text-on-surface-variant">会员状态</p><p className="font-serif text-xl">{valueState?.membership?.plan_code || '普通客户'}</p></div>
        <div><p className="text-xs text-on-surface-variant">报告次数</p><p className="font-serif text-xl">{valueState?.reportQuotaBalance ?? 0}</p></div>
        <div><p className="text-xs text-on-surface-variant">积分余额</p><p className="font-serif text-xl">{points.points_balance ?? 0}</p></div>
        <div><p className="text-xs text-on-surface-variant">成长等级</p><p className="font-serif text-xl">{points.growth_level || '启蒙'}</p></div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-serene-teal" />
          <h3 className="font-serif text-xl text-ink-blue">收货地址</h3>
        </div>
        <div className="rounded-lg border border-shadow-gray bg-white p-5">
          <label className="block text-sm">
            选择收货地址
            <select value={selectedAddressId} onChange={(event) => setSelectedAddressId(event.target.value)} className="mt-2 w-full rounded-md border border-shadow-gray px-3 py-2">
              <option value="">请选择地址</option>
              {addresses.map((address) => (
                <option key={address.id || addressLabel(address)} value={address.id || ''}>{addressLabel(address)}</option>
              ))}
            </select>
          </label>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <input value={addressForm.receiver_name} onChange={(event) => setAddressForm({ ...addressForm, receiver_name: event.target.value })} placeholder="收货人" className="rounded-md border border-shadow-gray px-3 py-2" />
            <input value={addressForm.phone} onChange={(event) => setAddressForm({ ...addressForm, phone: event.target.value })} placeholder="手机号" className="rounded-md border border-shadow-gray px-3 py-2" />
            <input value={addressForm.province} onChange={(event) => setAddressForm({ ...addressForm, province: event.target.value })} placeholder="省份" className="rounded-md border border-shadow-gray px-3 py-2" />
            <input value={addressForm.city} onChange={(event) => setAddressForm({ ...addressForm, city: event.target.value })} placeholder="城市" className="rounded-md border border-shadow-gray px-3 py-2" />
            <input value={addressForm.district} onChange={(event) => setAddressForm({ ...addressForm, district: event.target.value })} placeholder="区县" className="rounded-md border border-shadow-gray px-3 py-2" />
            <input value={addressForm.detail_address} onChange={(event) => setAddressForm({ ...addressForm, detail_address: event.target.value })} placeholder="详细地址" className="rounded-md border border-shadow-gray px-3 py-2" />
          </div>
          <button onClick={() => void saveAddress()} disabled={savingAddress} className="mt-4 rounded-lg bg-ink-blue px-4 py-3 text-sm text-white disabled:opacity-60">
            {savingAddress ? '保存中' : '保存地址'}
          </button>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <ShoppingBag className="h-5 w-5 text-serene-teal" />
          <h3 className="font-serif text-xl text-ink-blue">商城</h3>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[...virtualProducts, ...physicalProducts].map((product) => (
            <article key={product.sku} className="rounded-lg border border-shadow-gray bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="font-serif text-lg text-ink-blue">{product.name}</h4>
                  <p className="mt-1 text-xs text-on-surface-variant">{productTypeText(product)}</p>
                </div>
                <span className="rounded-md border border-wisdom-gold/30 bg-wisdom-gold/10 px-3 py-1 text-sm text-ink-blue">¥{money(product.price_cents)}</span>
              </div>
              <button
                onClick={() => void buyProduct(product)}
                disabled={Boolean(busySku)}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-ink-blue px-4 py-3 text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                <Sparkles className="h-4 w-4" />
                {busySku === product.sku ? '创建中' : '创建订单'}
              </button>
            </article>
          ))}
        </div>
        {!products.length && !loading ? <p className="rounded-lg border border-shadow-gray bg-white p-5 text-sm text-on-surface-variant">暂无上架商品。</p> : null}
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <ReceiptText className="h-5 w-5 text-serene-teal" />
          <h3 className="font-serif text-xl text-ink-blue">订单</h3>
        </div>
        <div className="space-y-3">
          {orders.map((order) => (
            <article key={order.id} className="rounded-lg border border-shadow-gray bg-white p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h4 className="font-serif text-lg text-ink-blue">{order.order_no || order.id}</h4>
                  <p className="mt-1 text-sm text-on-surface-variant">{(order.items || []).map((item) => `${item.name || item.sku} x${item.quantity || 1}`).join('，') || '订单明细待同步'}</p>
                </div>
                <div className="md:text-right">
                  <p className="font-serif text-lg text-ink-blue">¥{money(orderAmount(order))}</p>
                  <p className="mt-1 text-xs text-on-surface-variant">{statusText(order.status)}</p>
                </div>
              </div>
              <button
                onClick={() => void requestRefund(order)}
                disabled={Boolean(refundingId)}
                className="mt-4 inline-flex items-center gap-2 rounded-lg border border-shadow-gray px-4 py-2 text-sm text-ink-blue transition-colors hover:bg-surface disabled:opacity-60"
              >
                <PackageCheck className="h-4 w-4" />
                {refundingId === order.id ? '提交中' : '申请退款'}
              </button>
            </article>
          ))}
        </div>
        {!orders.length && !loading ? <p className="rounded-lg border border-shadow-gray bg-white p-5 text-sm text-on-surface-variant">暂无订单。</p> : null}
      </section>
    </div>
  );
}
