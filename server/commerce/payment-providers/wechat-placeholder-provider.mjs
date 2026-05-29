export function createWechatPlaceholderPaymentIntent() {
  return {
    provider: 'wechat_placeholder',
    status: 'created',
    providerPayload: {
      disabledReason: '微信支付真实接口尚未接入',
    },
  };
}
