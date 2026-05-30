import { ReactNode } from "react";

export function MobileShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen w-full bg-gradient-warm flex items-center justify-center sm:p-6">
      <div className="relative w-full sm:max-w-[440px] sm:rounded-[2.5rem] sm:shadow-elevated sm:border sm:border-border/60 bg-background overflow-hidden h-screen sm:h-[900px] sm:max-h-[92vh] flex flex-col">
        {children}
      </div>
    </div>
  );
}
