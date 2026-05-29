export function createManualPaymentIntent() {
  return {
    provider: 'manual',
    status: 'pending',
    providerPayload: {
      instruction: '人工确认收款后标记为已支付',
    },
  };
}
