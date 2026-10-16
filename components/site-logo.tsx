import { cn } from "@/lib/utils";

export function SiteLogo({ className }: { className?: string }) {
  return (
    <svg
      role="img"
      aria-label="تأهيل المربي 5"
      viewBox="84 583 1782 827"
      className={cn("h-auto w-36 shrink-0", className)}
    >
      <title>تأهيل المربي 5</title>
      <image href="/brand-logo.webp" width="2034" height="2048" />
    </svg>
  );
}
