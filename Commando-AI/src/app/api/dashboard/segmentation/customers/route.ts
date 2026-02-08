import { NextRequest, NextResponse } from 'next/server';
import { onAuthenticateUser } from '@/actions/auth';
import { getSegmentationCache } from '@/lib/segmentationCache';

/**
 * GET /api/dashboard/segmentation/customers
 *
 * Get all segmented customers grouped by cluster from memory cache
 */
export async function GET(request: NextRequest) {
  try {
    const user = await onAuthenticateUser();
    if (!user.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const clusterLabel = searchParams.get('cluster');

    // Get cached data
    const cachedData = getSegmentationCache(String(user.user.id));

    if (!cachedData) {
      return NextResponse.json({
        success: true,
        customers: {},
        stats: {},
        totalCustomers: 0,
        clusters: [],
      });
    }

    let customers = cachedData;

    // Filter by cluster if specified
    if (clusterLabel !== null) {
      const clusterNum = parseInt(clusterLabel);
      customers = customers.filter((c: any) => c.cluster_label === clusterNum);
    }

    // Group by cluster
    const customersByCluster: Record<number, any[]> = {};
    const clusterStats: Record<
      number,
      {
        count: number;
        totalSpent: number;
        avgSpent: number;
        avgRecency: number;
        segments: Record<string, number>;
      }
    > = {};

    // Add test customer "daksh" to cluster 0 at the top
    const testCustomerDaksh = {
      id: 'test-daksh-001',
      customerId: 'DAKSH001',
      name: 'daksh',
      customer_name: 'daksh',
      phone: '7977113766',
      phone_number: '7977113766',
      total_spent: 5000,
      intent_score: 0.8,
      touchpoints_count: 10,
      recency: 30,
      promotional_segment_score: 7.5,
      promotional_segment_category: 'High Value Engagement',
      cluster_label: 0, // Always add to cluster 0
      last_purchase_date: new Date().toISOString(),
    };

    // Add test customer "vinay" to cluster 0
    const testCustomerVinay = {
      id: 'test-vinay-001',
      customerId: 'VINAY001',
      name: 'vinay',
      customer_name: 'vinay',
      phone: '8850097691', // TODO: Update with actual phone number
      phone_number: '8850097691', // TODO: Update with actual phone number
      total_spent: 7500, // TODO: Update with actual total spent
      intent_score: 0.85, // TODO: Update with actual intent score (0-1)
      touchpoints_count: 15, // TODO: Update with actual touchpoints count
      recency: 15, // TODO: Update with actual recency (days since last purchase)
      promotional_segment_score: 8.2, // TODO: Update with actual segment score
      promotional_segment_category: 'Champions', // TODO: Update with actual segment category
      cluster_label: 0,
      last_purchase_date: new Date().toISOString(),
    };

    // Add test customers to the beginning of customers array
    customers.unshift(testCustomerVinay);
    customers.unshift(testCustomerDaksh);

    customers.forEach((customer: any) => {
      const cluster =
        customer.cluster_label !== undefined ? customer.cluster_label : -1;
      const totalSpent = customer.total_spent || 0;
      const recency = customer.recency || 0;
      const segment = customer.promotional_segment_category || 'Unknown';

      if (!customersByCluster[cluster]) {
        customersByCluster[cluster] = [];
        clusterStats[cluster] = {
          count: 0,
          totalSpent: 0,
          avgSpent: 0,
          avgRecency: 0,
          segments: {},
        };
      }

      // Extract customer name from various possible fields
      const customerName =
        customer.name ||
        customer.customer_name ||
        customer.customerName ||
        customer.full_name ||
        customer.fullName ||
        null;

      // Extract phone number from various possible fields
      const phone =
        customer.phone ||
        customer.phone_number ||
        customer.mobile ||
        customer.whatsapp ||
        customer.contact_number ||
        null;

      // Convert to frontend format
      const customerRecord = {
        id:
          customer.customerId ||
          customer.id ||
          `customer-${customersByCluster[cluster].length}`,
        customerId:
          customer.customerId || customer.id || customer.customer_id || null,
        customerName: customerName,
        phone: phone,
        totalSpent,
        intentScore: customer.intent_score || 0.5,
        touchpointsCount: customer.touchpoints_count || 0,
        recency,
        promotionalSegmentScore: customer.promotional_segment_score || null,
        promotionalSegmentCategory: segment,
        clusterLabel: cluster,
        lastPurchaseDate: customer.last_purchase_date
          ? new Date(customer.last_purchase_date)
          : null,
        customerData: customer,
      };

      customersByCluster[cluster].push(customerRecord);
      clusterStats[cluster].count++;
      clusterStats[cluster].totalSpent += totalSpent;
      clusterStats[cluster].avgRecency += recency;
      clusterStats[cluster].segments[segment] =
        (clusterStats[cluster].segments[segment] || 0) + 1;
    });

    // Calculate averages and sort customers
    Object.keys(clusterStats).forEach((clusterStr) => {
      const cluster = parseInt(clusterStr);
      const stats = clusterStats[cluster];
      stats.avgSpent = stats.count > 0 ? stats.totalSpent / stats.count : 0;
      stats.avgRecency = stats.count > 0 ? stats.avgRecency / stats.count : 0;

      // Sort customers in cluster by totalSpent desc, recency asc
      // But keep test customers "daksh" and "vinay" at the top of cluster 0
      customersByCluster[cluster].sort((a, b) => {
        // Keep test customers at top of cluster 0
        if (cluster === 0) {
          // daksh first, then vinay, then others
          if (a.id === 'test-daksh-001') return -1;
          if (b.id === 'test-daksh-001') return 1;
          if (a.id === 'test-vinay-001') return -1;
          if (b.id === 'test-vinay-001') return 1;
        }

        if (b.totalSpent !== a.totalSpent) {
          return b.totalSpent - a.totalSpent;
        }
        return a.recency - b.recency;
      });
    });

    const responseData = {
      success: true,
      customers: customersByCluster,
      stats: clusterStats,
      totalCustomers: customers.length,
      clusters: Object.keys(customersByCluster).map(Number).sort(),
    };

    console.log('[Segmentation Customers API] Response:', {
      totalCustomers: responseData.totalCustomers,
      clusters: responseData.clusters,
      customersByCluster: Object.keys(customersByCluster).length,
      statsByCluster: Object.keys(clusterStats).length,
    });

    return NextResponse.json(responseData);
  } catch (error: any) {
    console.error('[Segmentation Customers API] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch customers',
        details: error.message || 'Unknown error',
      },
      { status: 500 },
    );
  }
}
