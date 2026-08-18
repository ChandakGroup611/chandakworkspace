import React from "react";
import { Metadata } from "next";
import { Check, Star, Zap, Shield, Crown } from "lucide-react";
import { AppCard } from "@/components/ui/AppCard";
import { AppButton } from "@/components/ui/AppButton";
import { AppBadge } from "@/components/ui/AppBadge";

export const metadata: Metadata = {
  title: "Subscription | Chandak Workspace",
  description: "Manage your workspace subscription and billing.",
};

const pricingPlans = [
  {
    name: "Starter",
    price: "$0",
    period: "forever",
    description: "Perfect for individuals and small teams getting started.",
    icon: <Zap className="w-5 h-5 text-accent" />,
    features: [
      "Up to 5 Users",
      "Basic Task Management",
      "Standard Support",
      "5GB Storage",
    ],
    buttonText: "Current Plan",
    highlighted: false,
    color: "blue",
  },
  {
    name: "Professional",
    price: "$29",
    period: "per user/month",
    description: "Advanced tools for growing teams that need more power.",
    icon: <Star className="w-5 h-5 text-theme-icon" />,
    features: [
      "Unlimited Users",
      "Advanced Hierarchy & Workspaces",
      "Priority Support (24/7)",
      "100GB Storage",
      "Custom Workflows & Automations",
      "Timeline Audits",
    ],
    buttonText: "Upgrade to Pro",
    highlighted: true,
    color: "accent",
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "billed annually",
    description: "Maximum security, control, and dedicated support for large organizations.",
    icon: <Crown className="w-5 h-5 text-warning" />,
    features: [
      "Everything in Professional",
      "Single Sign-On (SSO)",
      "Dedicated Success Manager",
      "Unlimited Storage",
      "Advanced Access Controls (IAM)",
      "Custom SLA & Contracts",
    ],
    buttonText: "Contact Sales",
    highlighted: false,
    color: "amber",
  },
];

export default function SubscriptionPage() {
  return (
    <div className="w-full space-y-8 animate-in fade-in-50 duration-700 py-6 px-4 md:px-8 max-w-7xl mx-auto">
      {/* Header */}
      <header className="text-center space-y-4 pb-8 border-b border-border/30">
        <AppBadge variant="neutral" className="px-3 py-1 text-theme-icon border border-theme-btn-primary/30 bg-theme-btn-primary/5 rounded-full mb-2">
          Plans & Pricing
        </AppBadge>
        <h1 id="subscription-page-title" className="text-3xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-br from-foreground via-foreground/90 to-foreground/50 bg-clip-text text-transparent">
          Upgrade your workspace
        </h1>
        <p className="text-sm md:text-base text-muted max-w-2xl mx-auto leading-relaxed">
          Choose the perfect plan for your team. Whether you're just starting out or scaling globally, we have a solution that fits your needs.
        </p>
      </header>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
        {pricingPlans.map((plan, idx) => (
          <AppCard 
            key={plan.name}
            className={`relative flex flex-col h-full overflow-hidden transition-all duration-300 hover:-translate-y-2 hover:shadow-xl ${
              plan.highlighted 
                ? 'border-theme-btn-primary shadow-[0_0_40px_-15px_rgba(var(--accent),0.3)] bg-gradient-to-b from-accent/5 to-transparent' 
                : 'border-border/40 hover:border-border/80'
            }`}
          >
            {plan.highlighted && (
              <div className="absolute top-0 inset-x-0 h-1 bg-theme-btn-primary" />
            )}
            
            <div className="p-6 md:p-8 flex-1 flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-2 rounded-xl bg-${plan.color}-500/10`}>
                  {plan.icon}
                </div>
                <h3 className="text-xl font-bold">{plan.name}</h3>
                {plan.highlighted && (
                  <AppBadge className="ml-auto bg-theme-btn-primary text-theme-icon-foreground border-none shadow-sm text-[10px] uppercase tracking-wider font-bold">
                    Most Popular
                  </AppBadge>
                )}
              </div>
              
              <div className="mb-2">
                <span className="text-4xl font-extrabold tracking-tight">{plan.price}</span>
                {plan.price !== "Custom" && (
                  <span className="text-sm text-muted font-medium ml-1">/{plan.period}</span>
                )}
              </div>
              
              <p className="text-sm text-muted mb-8 min-h-[40px]">
                {plan.description}
              </p>
              
              <div className="space-y-4 mb-8 flex-1">
                {plan.features.map((feature, fIdx) => (
                  <div key={fIdx} className="flex items-start gap-3">
                    <div className={`mt-0.5 shrink-0 rounded-full p-0.5 ${plan.highlighted ? 'bg-theme-btn-primary/20 text-theme-icon' : 'bg-surface/50 text-muted'}`}>
                      <Check className="w-3.5 h-3.5" strokeWidth={3} />
                    </div>
                    <span className="text-sm font-medium opacity-90">{feature}</span>
                  </div>
                ))}
              </div>
              
              <div className="mt-auto pt-6 border-t border-border/40">
                <AppButton 
                  variant={plan.highlighted ? "primary" : "outline"} 
                  className={`w-full py-6 text-sm font-bold shadow-sm transition-all duration-300 ${
                    plan.highlighted 
                      ? 'shadow-[0_4px_20px_-5px_rgba(var(--accent),0.4)] hover:shadow-[0_6px_25px_-5px_rgba(var(--accent),0.6)] hover:scale-[1.02]' 
                      : 'hover:bg-surface'
                  }`}
                >
                  {plan.buttonText}
                </AppButton>
              </div>
            </div>
          </AppCard>
        ))}
      </div>
      
      {/* Footer / FAQ Teaser */}
      <div className="mt-16 text-center pb-12">
        <div className="inline-flex items-center justify-center gap-2 p-4 rounded-2xl bg-surface/30 border border-border/40 backdrop-blur-sm">
          <Shield className="w-5 h-5 text-muted" />
          <span className="text-sm font-medium text-muted">All plans include enterprise-grade security and 99.9% uptime SLA.</span>
        </div>
      </div>
    </div>
  );
}
