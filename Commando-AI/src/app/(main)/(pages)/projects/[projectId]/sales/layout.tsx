"use client";

import { DashboardDataProvider } from "./_components/DashboardDataProvider";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardDataProvider>{children}</DashboardDataProvider>;
}

