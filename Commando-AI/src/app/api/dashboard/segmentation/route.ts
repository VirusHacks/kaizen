import { NextRequest, NextResponse } from 'next/server';
import { onAuthenticateUser } from '@/actions/auth';
import { setSegmentationCache } from '@/lib/segmentationCache';

const SEGMENTATION_SERVICE_URL =
  process.env.FORECAST_SERVICE_URL || 'http://localhost:4000';

/**
 * POST /api/dashboard/segmentation
 *
 * Upload a CSV file for customer segmentation using fuzzy logic and K-means clustering
 *
 * Request: multipart/form-data with 'file' field containing CSV
 * Response: Array of customer records with segmentation results
 */
export async function POST(request: NextRequest) {
  try {
    const user = await onAuthenticateUser();
    if (!user.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided. Please upload a CSV file.' },
        { status: 400 },
      );
    }

    if (!file.name.endsWith('.csv')) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload a CSV file.' },
        { status: 400 },
      );
    }

    console.log(
      `[Segmentation API] Processing file: ${file.name} (${file.size} bytes)`,
    );

    // Forward the file to the segmentation service
    const serviceFormData = new FormData();
    serviceFormData.append('file', file);

    const response = await fetch(`${SEGMENTATION_SERVICE_URL}/segmentation`, {
      method: 'POST',
      body: serviceFormData,
    });

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ error: 'Unknown error' }));
      console.error('[Segmentation API] Service error:', errorData);
      return NextResponse.json(
        { error: errorData.error || 'Segmentation service error' },
        { status: response.status },
      );
    }

    const result = await response.json();

    console.log(
      `[Segmentation API] Successfully segmented ${result.length} customers`,
    );

    // Store results in memory cache (simple approach - no database)
    setSegmentationCache(String(user.user.id), result);

    console.log(
      `[Segmentation API] Cached ${result.length} customers in memory for user ${user.user.id}`,
    );

    // Log sample of cached data structure
    if (result.length > 0) {
      console.log('[Segmentation API] Sample customer data:', {
        cluster_label: result[0].cluster_label,
        promotional_segment_category: result[0].promotional_segment_category,
        total_spent: result[0].total_spent,
        recency: result[0].recency,
      });
    }

    return NextResponse.json({
      success: true,
      data: result,
      count: result.length,
    });
  } catch (error: any) {
    console.error('[Segmentation API] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to process segmentation',
        details: error.message || 'Unknown error',
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/dashboard/segmentation
 *
 * Health check for segmentation service
 */
export async function GET(request: NextRequest) {
  try {
    const user = await onAuthenticateUser();
    if (!user.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const response = await fetch(`${SEGMENTATION_SERVICE_URL}/health`, {
      method: 'GET',
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Segmentation service unavailable' },
        { status: 503 },
      );
    }

    const health = await response.json();
    return NextResponse.json({
      success: true,
      service: health,
    });
  } catch (error: any) {
    console.error('[Segmentation API] Health check error:', error);
    return NextResponse.json(
      {
        error: 'Segmentation service unavailable',
        details: error.message,
      },
      { status: 503 },
    );
  }
}
