export interface DailyMetric {
  id: string;
  user_id: string;

  work_date: string;

  total_calls: number;
  technical_visits: number;
  rescheduled_visits: number;
  installation_visits: number;

  notes: string | null;

  created_at: string;
  updated_at: string;
}

export interface CreateDailyMetric {
  work_date: string;
  total_calls: number;
  technical_visits: number;
  rescheduled_visits: number;
  installation_visits: number;
  notes?: string | null;
}

export interface CallRecord {
  id: string;
  user_id: string;

  work_date: string;

  is_technical_visit: boolean;
  is_rescheduled: boolean;
  is_installation: boolean;

  notes: string | null;

  created_at: string;
  updated_at: string;
}
