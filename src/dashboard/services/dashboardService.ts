import { supabase } from '../../shared/lib/supabase';
import type { ApiResponse } from '../../shared/types';
import {
  getCustomerVisitDashboardMetrics,
  type CustomerVisitDashboardMetrics,
} from '../../crm/services/customerVisitsService';

export interface DashboardSummary {
  restaurantName: string | null;
  plan: string | null;
  loggedInUser: string | null;
  totalUsers: number;
  totalCustomers: number;
  totalCampaigns: number;
  customerVisitMetrics: CustomerVisitDashboardMetrics;
}

export async function getDashboardSummary(): Promise<ApiResponse<DashboardSummary>> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { data: null, error: userError?.message ?? 'No authenticated user' };
    }

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      return { data: null, error: profileError.message };
    }

    const { data: membershipData, error: membershipError } = await supabase
      .from('restaurant_memberships')
      .select('restaurant_id')
      .eq('profile_id', user.id)
      .maybeSingle();

    if (membershipError) {
      return { data: null, error: membershipError.message };
    }

    if (!membershipData?.restaurant_id) {
      return {
        data: {
          restaurantName: null,
          plan: null,
          loggedInUser: profileData?.full_name ?? user.email ?? null,
          totalUsers: 0,
          totalCustomers: 0,
          totalCampaigns: 0,
          customerVisitMetrics: {
            totalCustomersVisited: 0,
            totalVisits: 0,
            averageTicket: 0,
            lifetimeValue: 0,
            repeatCustomerRate: 0,
          },
        },
        error: null,
      };
    }

    const { data: restaurantData, error: restaurantError } = await supabase
      .from('restaurants')
      .select('id, organization_id, name, plan')
      .eq('id', membershipData.restaurant_id)
      .maybeSingle();

    if (restaurantError) {
      return { data: null, error: restaurantError.message };
    }

    const { count, error: memberCountError } = await supabase
      .from('restaurant_memberships')
      .select('*', { count: 'exact', head: true })
      .eq('restaurant_id', membershipData.restaurant_id);

    if (memberCountError) {
      return { data: null, error: memberCountError.message };
    }

    const organizationId = restaurantData?.organization_id;
    const visitMetricsResult = organizationId
      ? await getCustomerVisitDashboardMetrics(organizationId)
      : {
          data: {
            totalCustomersVisited: 0,
            totalVisits: 0,
            averageTicket: 0,
            lifetimeValue: 0,
            repeatCustomerRate: 0,
          },
          error: null,
        };

    if (visitMetricsResult.error || !visitMetricsResult.data) {
      return { data: null, error: visitMetricsResult.error ?? 'Unable to load customer visit metrics' };
    }

    return {
      data: {
        restaurantName: restaurantData?.name ?? null,
        plan: restaurantData?.plan ?? null,
        loggedInUser: profileData?.full_name ?? user.email ?? null,
        totalUsers: count ?? 0,
        totalCustomers: visitMetricsResult.data.totalCustomersVisited,
        totalCampaigns: 0,
        customerVisitMetrics: visitMetricsResult.data,
      },
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Unable to load dashboard data',
    };
  }
}
