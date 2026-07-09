import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth/auth';
import { MetricsService } from '../../core/services/metrics/metrics';
import { DashboardComponent } from './dashboard';

describe('DashboardComponent', () => {
  let authService: { getUser: ReturnType<typeof vi.fn>; signOut: ReturnType<typeof vi.fn> };
  let metricsService: {
    createMetric: ReturnType<typeof vi.fn>;
    getMetricByDate: ReturnType<typeof vi.fn>;
    getMetricsByMonth: ReturnType<typeof vi.fn>;
    updateMetric: ReturnType<typeof vi.fn>;
    deleteMetric: ReturnType<typeof vi.fn>;
  };
  let router: { navigateByUrl: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    authService = {
      getUser: vi.fn().mockResolvedValue({ email: 'agent@test.com' }),
      signOut: vi.fn().mockResolvedValue(undefined),
    };
    metricsService = {
      createMetric: vi.fn().mockResolvedValue({}),
      getMetricByDate: vi.fn().mockResolvedValue(null),
      getMetricsByMonth: vi.fn().mockResolvedValue([]),
      updateMetric: vi.fn().mockResolvedValue({}),
      deleteMetric: vi.fn().mockResolvedValue(undefined),
    };
    router = {
      navigateByUrl: vi.fn().mockResolvedValue(true),
    };

    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: MetricsService, useValue: metricsService },
        { provide: Router, useValue: router },
      ],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    const component = fixture.componentInstance;

    expect(component).toBeTruthy();
  });

  it('should save daily metrics with the current work date', async () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    const component = fixture.componentInstance;

    expect(component.selectedMetricDate()).toBe(component.today);

    component.metricsForm.setValue({
      total_calls: 42,
      technical_visits: 12,
      rescheduled_visits: 5,
      installation_visits: 7,
    });

    await component.saveMetric();

    expect(metricsService.getMetricByDate).toHaveBeenCalledWith(component.today);
    expect(metricsService.createMetric).toHaveBeenCalledWith({
      work_date: component.today,
      total_calls: 42,
      technical_visits: 12,
      rescheduled_visits: 5,
      installation_visits: 7,
    });
    expect(component.successMessage()).toContain('Supabase');
  });

  it('should save daily metrics with the selected past work date', async () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    const component = fixture.componentInstance;

    component.changeMetricDateByDays(-1);
    const selectedDate = component.selectedMetricDate();
    component.metricsForm.setValue({
      total_calls: 28,
      technical_visits: 6,
      rescheduled_visits: 2,
      installation_visits: 3,
    });

    await component.saveMetric();

    expect(selectedDate).not.toBe(component.today);
    expect(metricsService.getMetricByDate).toHaveBeenCalledWith(selectedDate);
    expect(metricsService.createMetric).toHaveBeenCalledWith({
      work_date: selectedDate,
      total_calls: 28,
      technical_visits: 6,
      rescheduled_visits: 2,
      installation_visits: 3,
    });
  });

  it('should not allow selecting a future metric date', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    const component = fixture.componentInstance;

    component.changeMetricDateByDays(1);

    expect(component.selectedMetricDate()).toBe(component.today);

    component.toggleMetricDatePicker();
    const currentMonth = component.metricDatePickerMonth();
    component.changeMetricDatePickerMonth(1);
    component.selectMetricDate('2999-01-01');

    expect(component.isMetricDatePickerNextDisabled()).toBe(true);
    expect(component.metricDatePickerMonth()).toBe(currentMonth);
    expect(component.selectedMetricDate()).toBe(component.today);
  });

  it('should select a past metric date from the custom calendar picker', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    const component = fixture.componentInstance;

    component.toggleMetricDatePicker();
    component.changeMetricDatePickerMonth(-1);
    const pastDay = component.metricDateCalendarDays().find((day) => day.date && !day.isFuture);

    if (!pastDay?.date) {
      throw new Error('Expected the calendar to expose a selectable past date.');
    }

    component.selectMetricDate(pastDay.date);

    expect(component.selectedMetricDate()).toBe(pastDay.date);
    expect(component.metricDatePickerMonth()).toBe(pastDay.date.slice(0, 7));
    expect(component.isMetricDatePickerOpen()).toBe(false);
  });

  it('should reject a second metric for the current day', async () => {
    metricsService.getMetricByDate.mockResolvedValue({
      id: 'metric-today',
      user_id: 'user-1',
      work_date: '2026-07-09',
      total_calls: 10,
      technical_visits: 2,
      rescheduled_visits: 1,
      installation_visits: 0,
      notes: null,
      created_at: '2026-07-09T00:00:00Z',
      updated_at: '2026-07-09T00:00:00Z',
    });
    const fixture = TestBed.createComponent(DashboardComponent);
    const component = fixture.componentInstance;

    component.metricsForm.setValue({
      total_calls: 42,
      technical_visits: 12,
      rescheduled_visits: 5,
      installation_visits: 7,
    });

    await component.saveMetric();

    expect(metricsService.createMetric).not.toHaveBeenCalled();
    expect(component.errorMessage()).toContain('La fecha seleccionada ya tiene un registro');
  });

  it('should reject visit breakdowns greater than total technical visits', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    const component = fixture.componentInstance;

    component.metricsForm.setValue({
      total_calls: 10,
      technical_visits: 3,
      rescheduled_visits: 2,
      installation_visits: 2,
    });

    expect(component.metricsForm.hasError('visitBreakdown')).toBe(true);
  });

  it('should calculate cumulative visit percentage across the selected month', async () => {
    metricsService.getMetricsByMonth.mockResolvedValue([
      {
        id: 'metric-1',
        user_id: 'user-1',
        work_date: '2026-07-01',
        total_calls: 20,
        technical_visits: 5,
        rescheduled_visits: 0,
        installation_visits: 0,
        notes: null,
        created_at: '2026-07-01T00:00:00Z',
        updated_at: '2026-07-01T00:00:00Z',
      },
      {
        id: 'metric-2',
        user_id: 'user-1',
        work_date: '2026-07-02',
        total_calls: 30,
        technical_visits: 0,
        rescheduled_visits: 0,
        installation_visits: 0,
        notes: null,
        created_at: '2026-07-02T00:00:00Z',
        updated_at: '2026-07-02T00:00:00Z',
      },
    ]);
    const fixture = TestBed.createComponent(DashboardComponent);
    const component = fixture.componentInstance;

    component.selectedSummaryMonth.set('2026-07');
    await component.loadMonthlySummary();

    expect(metricsService.getMetricsByMonth).toHaveBeenCalledWith(2026, 7);
    expect(component.summaryDays()).toHaveLength(31);
    expect(component.summaryDays()[0].percentage).toBeCloseTo(25);
    expect(component.summaryDays()[1].percentage).toBeCloseTo(10);
    expect(component.summaryDays()[30].percentage).toBeCloseTo(10);
    expect(component.summaryTotals()).toEqual({
      calls: 50,
      technicalVisits: 5,
      selectedVisits: 5,
      percentage: 10,
    });
  });

  it('should recalculate cumulative percentage when changing visit filters', async () => {
    metricsService.getMetricsByMonth.mockResolvedValue([
      {
        id: 'metric-1',
        user_id: 'user-1',
        work_date: '2026-07-01',
        total_calls: 100,
        technical_visits: 20,
        rescheduled_visits: 5,
        installation_visits: 3,
        notes: null,
        created_at: '2026-07-01T00:00:00Z',
        updated_at: '2026-07-01T00:00:00Z',
      },
    ]);
    const fixture = TestBed.createComponent(DashboardComponent);
    const component = fixture.componentInstance;

    component.selectedSummaryMonth.set('2026-07');
    await component.loadMonthlySummary();

    expect(component.summaryTotals().selectedVisits).toBe(20);
    expect(component.summaryTotals().percentage).toBeCloseTo(20);

    component.setSummaryVisitFilter('without-reschedules');

    expect(component.summaryTotals().selectedVisits).toBe(15);
    expect(component.summaryDays()[0].percentage).toBeCloseTo(15);

    component.setSummaryVisitFilter('without-installations');

    expect(component.summaryTotals().selectedVisits).toBe(17);
    expect(component.summaryDays()[0].percentage).toBeCloseTo(17);

    component.setSummaryVisitFilter('without-reschedules-installations');

    expect(component.summaryTotals().selectedVisits).toBe(12);
    expect(component.summaryDays()[0].percentage).toBeCloseTo(12);
  });

  it('should show the nearest chart point tooltip while hovering the chart', async () => {
    metricsService.getMetricsByMonth.mockResolvedValue([
      {
        id: 'metric-1',
        user_id: 'user-1',
        work_date: '2026-07-09',
        total_calls: 25,
        technical_visits: 4,
        rescheduled_visits: 0,
        installation_visits: 0,
        notes: null,
        created_at: '2026-07-09T00:00:00Z',
        updated_at: '2026-07-09T00:00:00Z',
      },
    ]);
    const fixture = TestBed.createComponent(DashboardComponent);
    const component = fixture.componentInstance;

    component.selectedSummaryMonth.set('2026-07');
    await component.loadMonthlySummary();
    component.activeMenu.set('summary');
    fixture.detectChanges();

    const svg = fixture.nativeElement.querySelector('.summary-chart') as SVGSVGElement;
    const hoverLayer = fixture.nativeElement.querySelector('.chart-hover-layer') as SVGRectElement;
    vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue({
      bottom: component.chartHeight,
      height: component.chartHeight,
      left: 0,
      right: component.chartWidth,
      toJSON: () => ({}),
      top: 0,
      width: component.chartWidth,
      x: 0,
      y: 0,
    } as DOMRect);

    hoverLayer.dispatchEvent(
      new MouseEvent('mousemove', {
        bubbles: true,
        clientX: component.summaryDays()[8].x,
        clientY: component.summaryDays()[8].y,
      }),
    );
    fixture.detectChanges();

    expect(component.hoveredSummaryDay()?.day).toBe(9);
    expect(fixture.nativeElement.querySelector('.chart-hover-line')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('09/07/2026');
    expect(fixture.nativeElement.textContent).toContain('16.00%');

    hoverLayer.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
    fixture.detectChanges();

    expect(component.hoveredSummaryDay()).toBeNull();
    expect(fixture.nativeElement.querySelector('.chart-hover-line')).toBeNull();
  });

  it('should edit a metric selected from the summary table', async () => {
    metricsService.getMetricsByMonth.mockResolvedValue([
      {
        id: 'metric-1',
        user_id: 'user-1',
        work_date: '2026-07-09',
        total_calls: 25,
        technical_visits: 4,
        rescheduled_visits: 1,
        installation_visits: 2,
        notes: null,
        created_at: '2026-07-09T00:00:00Z',
        updated_at: '2026-07-09T00:00:00Z',
      },
    ]);
    const fixture = TestBed.createComponent(DashboardComponent);
    const component = fixture.componentInstance;

    component.selectedSummaryMonth.set('2026-07');
    await component.loadMonthlySummary();
    component.startMetricEdit(component.summaryDays()[8]);
    component.metricsForm.setValue({
      total_calls: 30,
      technical_visits: 5,
      rescheduled_visits: 1,
      installation_visits: 2,
    });

    await component.saveMetric();

    expect(metricsService.updateMetric).toHaveBeenCalledWith('metric-1', {
      work_date: '2026-07-09',
      total_calls: 30,
      technical_visits: 5,
      rescheduled_visits: 1,
      installation_visits: 2,
    });
    expect(metricsService.getMetricByDate).not.toHaveBeenCalled();
    expect(component.editingMetricId()).toBeNull();
  });

  it('should delete a metric selected from the summary table after confirmation', async () => {
    metricsService.getMetricsByMonth
      .mockResolvedValueOnce([
        {
          id: 'metric-1',
          user_id: 'user-1',
          work_date: '2026-07-09',
          total_calls: 25,
          technical_visits: 4,
          rescheduled_visits: 1,
          installation_visits: 2,
          notes: null,
          created_at: '2026-07-09T00:00:00Z',
          updated_at: '2026-07-09T00:00:00Z',
        },
      ])
      .mockResolvedValueOnce([]);
    const fixture = TestBed.createComponent(DashboardComponent);
    const component = fixture.componentInstance;

    component.selectedSummaryMonth.set('2026-07');
    await component.loadMonthlySummary();
    component.requestMetricDelete(component.summaryDays()[8]);

    expect(component.pendingDeleteMetricId()).toBe('metric-1');

    await component.confirmMetricDelete(component.summaryDays()[8]);

    expect(metricsService.deleteMetric).toHaveBeenCalledWith('metric-1');
    expect(component.pendingDeleteMetricId()).toBeNull();
    expect(component.deletingMetricId()).toBeNull();
    expect(component.successMessage()).toContain('Registro eliminado');
    expect(component.summaryDays()[8].hasMetric).toBe(false);
    expect(component.summaryTotals()).toEqual({
      calls: 0,
      technicalVisits: 0,
      selectedVisits: 0,
      percentage: 0,
    });
  });
});
