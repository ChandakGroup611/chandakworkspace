import React from "react";
import { Metadata } from "next";
import { SubscriptionClient } from "./SubscriptionClient";

export const metadata: Metadata = {
  title: "Subscription & Billing | Chandak Workspace",
  description: "Manage your workspace subscription tiers, software contracts, and billing audit history.",
};

export default function SubscriptionPage() {
  return <SubscriptionClient />;
}
