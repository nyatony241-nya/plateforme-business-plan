import type { ReactNode } from "react";
import { BrandLink } from "@/components/brand";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="mx-auto w-full max-w-6xl px-5 py-5 sm:px-8">
        <BrandLink />
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 pb-16 pt-4">
        {children}
      </main>
    </div>
  );
}
