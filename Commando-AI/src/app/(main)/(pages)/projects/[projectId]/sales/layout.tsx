'use client';

import React from 'react';
import { DashboardDataProvider } from './_components/DashboardDataProvider';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardDataProvider>{children}</DashboardDataProvider>;
}
