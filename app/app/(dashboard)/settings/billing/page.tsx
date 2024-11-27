// app/(dashboard)/settings/billing/page.tsx
"use client";

import { Usage } from "@/components/parts/usage";
import { 
  CreditCard, 
  Receipt, 
  Clock, 
  Settings,
  Download,
  AlertCircle,
  CheckCircle2,
  Ban
} from "lucide-react";
import Link from "next/link";

export default function BillingPage() {
  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto">
      {/* Usage Section */}
      <Usage />

      {/* Payment Method Section */}
      <div className="relative group overflow-hidden border border-white/[0.02] rounded-xl bg-neutral-900/50 backdrop-blur-md p-6 transition-all duration-500 shine shadow-dream">
        <div className="absolute inset-0 bg-gradient-to-br from-dream-purple/5 via-dream-cyan/5 to-dream-cyan/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ filter: "blur(40px)" }} />
        
        <div className="relative space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-dream-cyan" />
              <h3 className="text-xl font-cal text-white">Payment Method</h3>
            </div>
            <button className="px-3 py-1.5 rounded-lg text-sm text-neutral-400 hover:text-white bg-white/[0.05] hover:bg-white/[0.1] transition-colors">
              Update
            </button>
          </div>

          <div className="flex items-center gap-4 p-4 rounded-lg border border-white/[0.02] bg-white/[0.02]">
            <div className="flex-1">
              <p className="text-sm text-white">
                •••• •••• •••• 4242
              </p>
              <p className="text-xs text-neutral-400">
                Expires 12/25
              </p>
            </div>
            <CheckCircle2 className="w-5 h-5 text-custom-green" />
          </div>
        </div>
      </div>

      {/* Billing History Section */}
      <div className="relative group overflow-hidden border border-white/[0.02] rounded-xl bg-neutral-900/50 backdrop-blur-md p-6 transition-all duration-500 shine shadow-dream">
        <div className="absolute inset-0 bg-gradient-to-br from-dream-purple/5 via-dream-cyan/5 to-dream-cyan/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ filter: "blur(40px)" }} />
        
        <div className="relative space-y-4">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-dream-cyan" />
            <h3 className="text-xl font-cal text-white">Billing History</h3>
          </div>

          <div className="space-y-2">
            {[
              { date: "Nov 1, 2024", amount: "$29.00", status: "paid" },
              { date: "Oct 1, 2024", amount: "$29.00", status: "paid" },
              { date: "Sep 1, 2024", amount: "$29.00", status: "failed" }
            ].map((invoice, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-lg border border-white/[0.02] bg-white/[0.02] group">
                <div className="flex items-center gap-4">
                  {invoice.status === "paid" ? (
                    <CheckCircle2 className="w-4 h-4 text-custom-green" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-400" />
                  )}
                  <div>
                    <p className="text-sm text-white">{invoice.date}</p>
                    <p className="text-xs text-neutral-400">{invoice.amount}</p>
                  </div>
                </div>
                <button className="opacity-0 group-hover:opacity-100 transition-opacity px-3 py-1.5 rounded-lg text-sm text-neutral-400 hover:text-white bg-white/[0.05] hover:bg-white/[0.1] flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Invoice
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Plan Details */}
      <div className="relative group overflow-hidden border border-white/[0.02] rounded-xl bg-neutral-900/50 backdrop-blur-md p-6 transition-all duration-500 shine shadow-dream">
        <div className="absolute inset-0 bg-gradient-to-br from-dream-purple/5 via-dream-cyan/5 to-dream-cyan/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ filter: "blur(40px)" }} />
        
        <div className="relative space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-dream-cyan" />
              <h3 className="text-xl font-cal text-white">Plan Details</h3>
            </div>
            <span className="px-2.5 py-1 bg-custom-green/10 text-custom-green text-xs rounded-full">
              Pro Plan
            </span>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border border-white/[0.02] bg-white/[0.02]">
              <p className="text-sm text-neutral-400 mb-2">Next Payment</p>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-custom-green" />
                <p className="text-sm text-white">December 1, 2024</p>
              </div>
            </div>

            <div className="p-4 rounded-lg border border-white/[0.02] bg-white/[0.02]">
              <p className="text-sm text-neutral-400 mb-2">Billing Cycle</p>
              <p className="text-sm text-white">Monthly</p>
            </div>
          </div>

          <div className="pt-4 border-t border-white/[0.02]">
            <Link
              href="/settings/billing/cancel"
              className="text-sm text-red-400 hover:text-red-300 transition-colors"
            >
              Cancel Subscription
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}