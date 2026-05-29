const transitions = {
  created: ['pending', 'cancelled'],
  pending: ['paid', 'failed', 'cancelled'],
  failed: ['pending'],
  paid: [],
  cancelled: [],
};

export function assertPaymentTransition(from, to) {
  if (!transitions[from]?.includes(to)) {
    throw new Error(`INVALID_PAYMENT_TRANSITION:${from}->${to}`);
  }
  return true;
}
