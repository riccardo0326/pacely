import type { ReactNode } from "react";
import { DashboardNav } from "@/components/dashboard-nav";
import { getUnreadNotificationCount } from "@/server/actions/notifications";

export default async function DashboardGroupLayout({
  children,
}: {
  children: ReactNode;
}) {
  const unreadCount = await getUnreadNotificationCount();

  return (
    <div className="flex min-h-full flex-col">
      <DashboardNav unreadCount={unreadCount} />
      {children}
    </div>
  );
}
