// components/home/TopBanner.tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Crown, ArrowRight } from "lucide-react";

export default function TopBanner() {
  return (
    <div className="rounded-xl border border-orange-200 bg-gradient-to-r from-orange-50 to-orange-100 p-4 mb-6">
      <div className="flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center">
            <Crown className="w-4 h-4 text-white" />
          </div>
          <div className="text-sm">
            <strong className="text-orange-900">Upgrade to Premium</strong> — unlock advanced import, AI remixes, and more.
          </div>
        </div>
        <Button asChild size="sm" className="bg-orange-600 hover:bg-orange-700 text-white">
          <Link href="/pricing" className="flex items-center gap-2">
            View Plans
            <ArrowRight className="w-4 h-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
