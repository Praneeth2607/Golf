export type PlanKey = "MONTHLY" | "YEARLY";

export interface PlanDetails {
  plan: PlanKey;
  providerPlanId: string;
  amountPaise: number;
  currency: string;
  interval: string;
}

export type NormalizedEventType =
  | "ACTIVATED"
  | "CHARGED"
  | "CANCELLED"
  | "COMPLETED"
  | "PAYMENT_FAILED";

export interface NormalizedSubscriptionEvent {
  type: NormalizedEventType;
  providerSubscriptionId: string;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  /** Stable, unique-per-event key used for webhook idempotency. */
  idempotencyKey: string;
  raw: unknown;
}

export interface CheckoutSession {
  providerSubscriptionId: string;
  /**
   * Whatever the frontend needs to complete checkout. For a real gateway
   * this carries the key id / order-or-subscription id for its widget; for
   * the mock provider it just signals that no external redirect happens.
   */
  mode: "mock" | "redirect";
  checkout: Record<string, unknown>;
}

export interface PaymentProvider {
  readonly name: "mock" | "razorpay";
  getPlans(): Promise<PlanDetails[]>;
  createSubscriptionCheckout(params: {
    plan: PlanKey;
    userId: string;
    userEmail: string;
  }): Promise<CheckoutSession>;
  cancelSubscription(providerSubscriptionId: string, atCycleEnd: boolean): Promise<void>;
  /** Only meaningful for gateways with real webhooks (razorpay). */
  verifyWebhookSignature(rawBody: Buffer, signature: string | undefined): boolean;
  parseWebhookEvent(rawBody: Buffer): NormalizedSubscriptionEvent | null;
}
