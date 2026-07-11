import { Injectable } from '@angular/core';
import { CallRecord, CreateDailyMetric, DailyMetric } from '../../../models/metrics';
import { Supabase } from '../supabase/supabase';

@Injectable({
  providedIn: 'root',
})
export class MetricsService {
  constructor(private supabase: Supabase) {}

  private async getCurrentUserId(): Promise<string> {
    const { data, error } = await this.supabase.client.auth.getUser();

    if (error || !data.user) {
      throw new Error('Usuario no autenticado');
    }

    return data.user.id;
  }

  async createMetric(metric: CreateDailyMetric): Promise<DailyMetric> {
    const userId = await this.getCurrentUserId();

    const { data, error } = await this.supabase.client
      .from('daily_metrics')
      .insert({
        ...metric,
        user_id: userId,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data as DailyMetric;
  }

  async getMetricsByMonth(year: number, month: number): Promise<DailyMetric[]> {
    const { start, end } = this.getMonthRange(year, month);

    const { data, error } = await this.supabase.client
      .from('daily_metrics')
      .select('*')
      .gte('work_date', start)
      .lt('work_date', end)
      .order('work_date', { ascending: true });

    if (error) {
      throw error;
    }

    return data as DailyMetric[];
  }

  async getCallRecordsByMonth(year: number, month: number): Promise<CallRecord[]> {
    const { start, end } = this.getMonthRange(year, month);
    const records: CallRecord[] = [];
    const pageSize = 1000;

    for (let from = 0; ; from += pageSize) {
      const { data, error } = await this.supabase.client
        .from('call_records')
        .select(
          'id,user_id,work_date,is_technical_visit,is_rescheduled,is_installation,notes,created_at,updated_at',
        )
        .gte('work_date', start)
        .lt('work_date', end)
        .order('work_date', { ascending: true })
        .order('created_at', { ascending: true })
        .order('id', { ascending: true })
        .range(from, from + pageSize - 1);

      if (error) {
        throw error;
      }

      if (!data || data.length === 0) {
        return records;
      }

      records.push(...(data as CallRecord[]));

      if (data.length < pageSize) {
        return records;
      }
    }
  }

  async getMetricByDate(workDate: string): Promise<DailyMetric | null> {
    const { data, error } = await this.supabase.client
      .from('daily_metrics')
      .select('*')
      .eq('work_date', workDate)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      throw error;
    }

    return (data?.[0] as DailyMetric | undefined) ?? null;
  }

  async updateMetric(id: string, metric: Partial<CreateDailyMetric>): Promise<DailyMetric> {
    const { data, error } = await this.supabase.client
      .from('daily_metrics')
      .update(metric)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data as DailyMetric;
  }

  async deleteMetric(id: string): Promise<void> {
    const { error } = await this.supabase.client.from('daily_metrics').delete().eq('id', id);

    if (error) {
      throw error;
    }
  }

  private getMonthRange(year: number, month: number): { start: string; end: string } {
    const start = `${year}-${String(month).padStart(2, '0')}-01`;
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const end = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;

    return { start, end };
  }
}
