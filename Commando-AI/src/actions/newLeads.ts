'use server';

import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

export interface NewLead {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  source: string;
  status: 'new' | 'contacted' | 'qualified' | 'converted';
  notes?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversionStats {
  totalLeads: number;
  contactedLeads: number;
  qualifiedLeads: number;
  convertedLeads: number;
  conversionRate: number;
  creditsEarned: number;
}

/**
 * Get all new leads for the current user
 * @returns Response with leads array or error
 */
export async function getNewLeads() {
  try {
    const { userId } = auth();

    if (!userId) {
      return { status: 403, message: 'Unauthorized' };
    }

    // Verify user exists in database
    const user = await db.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return { status: 403, message: 'User not found' };
    }

    // TODO: Replace with actual database query when NewLead model is added to schema
    // For now, return mock data
    const mockLeads: NewLead[] = [
      {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        company: 'Acme Corp',
        source: 'Website Form',
        status: 'new',
        notes: 'Interested in enterprise plan',
        createdAt: new Date('2026-02-01'),
        updatedAt: new Date('2026-02-01'),
      },
      {
        id: '2',
        name: 'Jane Smith',
        email: 'jane@example.com',
        phone: '+1234567891',
        company: 'Tech Solutions',
        source: 'LinkedIn',
        status: 'contacted',
        notes: 'Follow up next week',
        createdAt: new Date('2026-02-03'),
        updatedAt: new Date('2026-02-04'),
      },
      {
        id: '3',
        name: 'Bob Johnson',
        email: 'bob@example.com',
        company: 'StartupXYZ',
        source: 'Referral',
        status: 'qualified',
        notes: 'Ready for demo',
        createdAt: new Date('2026-02-05'),
        updatedAt: new Date('2026-02-06'),
      },
    ];

    return {
      status: 200,
      leads: mockLeads,
    };
  } catch (error) {
    console.error('[GET_NEW_LEADS]', error);
    return {
      status: 500,
      message: 'Failed to fetch leads',
    };
  }
}

/**
 * Get conversion statistics for new leads
 * @returns Response with stats or error
 */
export async function getConversionStats() {
  try {
    const { userId } = auth();

    if (!userId) {
      return { status: 403, message: 'Unauthorized' };
    }

    // Verify user exists in database
    const user = await db.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return { status: 403, message: 'User not found' };
    }

    // TODO: Replace with actual database query when NewLead model is added to schema
    // For now, return mock data
    const mockStats: ConversionStats = {
      totalLeads: 24,
      contactedLeads: 18,
      qualifiedLeads: 12,
      convertedLeads: 6,
      conversionRate: 25.0, // 6/24 = 25%
      creditsEarned: 150, // Example: 25 credits per conversion
    };

    return {
      status: 200,
      stats: mockStats,
    };
  } catch (error) {
    console.error('[GET_CONVERSION_STATS]', error);
    return {
      status: 500,
      message: 'Failed to fetch stats',
    };
  }
}

/**
 * Update lead status
 * @param leadId - The ID of the lead to update
 * @param status - The new status
 * @returns Response with updated lead or error
 */
export async function updateLeadStatus(
  leadId: string,
  status: NewLead['status'],
) {
  try {
    const { userId } = auth();

    if (!userId) {
      return { status: 403, message: 'Unauthorized' };
    }

    // Verify user exists in database
    const user = await db.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return { status: 403, message: 'User not found' };
    }

    // TODO: Implement actual database update when NewLead model is added
    // For now, return success
    return {
      status: 200,
      message: 'Lead status updated successfully',
    };
  } catch (error) {
    console.error('[UPDATE_LEAD_STATUS]', error);
    return {
      status: 500,
      message: 'Failed to update lead status',
    };
  }
}

/**
 * Create a new lead
 * @param leadData - The lead data to create
 * @returns Response with created lead or error
 */
export async function createNewLead(
  leadData: Omit<NewLead, 'id' | 'createdAt' | 'updatedAt'>,
) {
  try {
    const { userId } = auth();

    if (!userId) {
      return { status: 403, message: 'Unauthorized' };
    }

    // Verify user exists in database
    const user = await db.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return { status: 403, message: 'User not found' };
    }

    // TODO: Implement actual database creation when NewLead model is added
    // For now, return success
    return {
      status: 201,
      message: 'Lead created successfully',
    };
  } catch (error) {
    console.error('[CREATE_NEW_LEAD]', error);
    return {
      status: 500,
      message: 'Failed to create lead',
    };
  }
}
