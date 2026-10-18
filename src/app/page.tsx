"use client";

import dynamic from "next/dynamic";

const RacingGameRoot = dynamic(() => import("@/components/racing/RacingGame"), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 flex items-center justify-center bg-[#05050c]">
      <div className="text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-2 border-cyan-300/30 border-t-cyan-300" />
        <p className="mt-4 text-sm font-bold text-white/60" dir="rtl">
          در حال روشن کردن موتورها…
        </p>
      </div>
    </div>
  ),
});

export default function Home() {
  return <RacingGameRoot />;
}
