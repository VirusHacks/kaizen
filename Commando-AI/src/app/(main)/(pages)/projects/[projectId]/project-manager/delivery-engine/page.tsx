/**
 * Predictive Delivery Engine Dashboard
 * 
 * Main UI for sales/PMs to:
 * - View delivery predictions with confidence intervals
 * - Run what-if scenarios
 * - Track commitments
 * - Analyze dependency impacts
 */

import { Suspense } from 'react';
import DeliveryEngineDashboardClient from './_components/delivery-engine-client';

type Props = {
  params: { projectId: string }
}

export default async function DeliveryEnginePage({ params }: Props) {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64">Loading...</div>}>
      <DeliveryEngineDashboardClient projectId={params.projectId} />
    </Suspense>
  );
}
