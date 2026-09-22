import { env } from "../env";
import { mockProvider } from "./mockProvider";
import { razorpayProvider } from "./razorpayProvider";
import type { PaymentProvider } from "./types";

export * from "./types";

export const paymentProvider: PaymentProvider =
  env.PAYMENT_PROVIDER === "razorpay" ? razorpayProvider : mockProvider;
