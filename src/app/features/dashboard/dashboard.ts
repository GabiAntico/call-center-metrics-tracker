import { Component, OnInit, computed, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { CallRecord } from '../../models/metrics';
import { AuthService } from '../../core/services/auth/auth';
import { MetricsService } from '../../core/services/metrics/metrics';

type DashboardMenu = 'daily-entry' | 'summary' | 'transfers';
type SummaryDataSource = 'daily_metrics' | 'call_records';
type SummaryVisitFilter =
  'total' | 'without-reschedules' | 'without-installations' | 'without-reschedules-installations';
type TransferAreaFilter = 'all' | 'commercial' | 'retention' | 'other';

type SummarySelectedVisitsByFilter = Record<SummaryVisitFilter, number>;
type TransferCountsByArea = Record<TransferAreaFilter, number>;

interface SummaryDataSourceOption {
  value: SummaryDataSource;
  label: string;
}

interface SummaryVisitFilterOption {
  value: SummaryVisitFilter;
  label: string;
}

interface TransferAreaFilterOption {
  value: TransferAreaFilter;
  label: string;
}

interface SummaryMetricInput {
  id: string | null;
  work_date: string;
  total_calls: number;
  technical_visits: number;
  rescheduled_visits: number;
  installation_visits: number;
  selectedVisitsByFilter?: SummarySelectedVisitsByFilter;
  transferCountsByArea?: TransferCountsByArea;
}

interface MonthOption {
  value: number;
  shortLabel: string;
  label: string;
}

interface MetricDateCalendarDay {
  date: string | null;
  day: number | null;
  isFuture: boolean;
}

interface SummaryDay {
  date: string;
  day: number;
  hasMetric: boolean;
  metricId: string | null;
  dailyCalls: number;
  dailyTechnicalVisits: number;
  dailyRescheduledVisits: number;
  dailyInstallationVisits: number;
  dailySelectedVisits: number;
  cumulativeCalls: number;
  cumulativeTechnicalVisits: number;
  cumulativeSelectedVisits: number;
  percentage: number;
  x: number;
  y: number;
}

interface ChartTick {
  value: number;
  y: number;
}

interface SummaryTotals {
  calls: number;
  technicalVisits: number;
  selectedVisits: number;
  percentage: number;
}

@Component({
  selector: 'app-dashboard',
  imports: [ReactiveFormsModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class DashboardComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly metricsService = inject(MetricsService);
  private readonly router = inject(Router);
  private readonly summaryDataSourceStorageKey = 'call-center-metrics.summary-data-source';
  private summaryLoadRequestId = 0;

  readonly userEmail = signal('');
  readonly activeMenu = signal<DashboardMenu>('summary');
  readonly isSavingMetric = signal(false);
  readonly isSigningOut = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');
  readonly editingMetricId = signal<string | null>(null);
  readonly editingMetricDate = signal<string | null>(null);
  readonly pendingDeleteMetricId = signal<string | null>(null);
  readonly deletingMetricId = signal<string | null>(null);
  readonly today = this.getLocalDate();
  readonly selectedMetricDate = signal(this.today);
  readonly isMetricDatePickerOpen = signal(false);
  readonly metricDatePickerMonth = signal(this.today.slice(0, 7));
  readonly chartWidth = 720;
  readonly chartHeight = 300;
  readonly chartTop = 24;
  readonly chartRight = 24;
  readonly chartBottom = 42;
  readonly chartLeft = 54;
  readonly chartTooltipWidth = 176;
  readonly chartTooltipHeight = 72;
  readonly metricDateWeekdays = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'];
  readonly monthOptions: MonthOption[] = [
    { value: 1, shortLabel: 'Ene', label: 'Enero' },
    { value: 2, shortLabel: 'Feb', label: 'Febrero' },
    { value: 3, shortLabel: 'Mar', label: 'Marzo' },
    { value: 4, shortLabel: 'Abr', label: 'Abril' },
    { value: 5, shortLabel: 'May', label: 'Mayo' },
    { value: 6, shortLabel: 'Jun', label: 'Junio' },
    { value: 7, shortLabel: 'Jul', label: 'Julio' },
    { value: 8, shortLabel: 'Ago', label: 'Agosto' },
    { value: 9, shortLabel: 'Sep', label: 'Septiembre' },
    { value: 10, shortLabel: 'Oct', label: 'Octubre' },
    { value: 11, shortLabel: 'Nov', label: 'Noviembre' },
    { value: 12, shortLabel: 'Dic', label: 'Diciembre' },
  ];
  readonly summaryDataSourceOptions: SummaryDataSourceOption[] = [
    { value: 'call_records', label: 'Llamada a llamada' },
    { value: 'daily_metrics', label: 'Carga diaria' },
  ];
  readonly summaryVisitFilters: SummaryVisitFilterOption[] = [
    { value: 'total', label: 'Total visitas' },
    { value: 'without-reschedules', label: 'Sin reagendas' },
    { value: 'without-installations', label: 'Sin instalaciones' },
    { value: 'without-reschedules-installations', label: 'Sin reagendas ni instalaciones' },
  ];
  readonly transferAreaFilters: TransferAreaFilterOption[] = [
    { value: 'all', label: 'Todas' },
    { value: 'commercial', label: 'Comercial' },
    { value: 'retention', label: 'Retención' },
    { value: 'other', label: 'Otras' },
  ];
  readonly selectedSummaryMonth = signal(this.today.slice(0, 7));
  readonly summaryMonthPickerYear = signal(Number(this.today.slice(0, 4)));
  readonly isSummaryMonthPickerOpen = signal(false);
  readonly metricDatePickerLabel = computed(() =>
    this.getSummaryMonthLabel(this.metricDatePickerMonth()),
  );
  readonly metricDateCalendarDays = computed(() =>
    this.buildMetricDateCalendarDays(this.metricDatePickerMonth()),
  );
  readonly isMetricDatePickerNextDisabled = computed(
    () => this.addMonthsToMonthValue(this.metricDatePickerMonth(), 1) > this.today.slice(0, 7),
  );
  readonly selectedSummaryMonthLabel = computed(() =>
    this.getSummaryMonthLabel(this.selectedSummaryMonth()),
  );
  readonly selectedSummaryDataSource = signal<SummaryDataSource>(this.getStoredSummaryDataSource());
  readonly selectedSummaryDataSourceLabel = computed(
    () =>
      this.summaryDataSourceOptions.find(
        (option) => option.value === this.selectedSummaryDataSource(),
      )?.label ?? 'Seleccionar datos',
  );
  readonly isSummaryDataSourcePickerOpen = signal(false);
  readonly selectedSummaryVisitFilter = signal<SummaryVisitFilter>('total');
  readonly selectedTransferAreaFilter = signal<TransferAreaFilter>('all');
  readonly isLoadingSummary = signal(false);
  readonly summaryErrorMessage = signal('');
  readonly monthlySummaryMetrics = signal<SummaryMetricInput[]>([]);
  readonly summaryDays = signal<SummaryDay[]>([]);
  readonly summaryTotals = signal<SummaryTotals>({
    calls: 0,
    technicalVisits: 0,
    selectedVisits: 0,
    percentage: 0,
  });
  readonly chartLinePoints = signal('');
  readonly chartAreaPath = signal('');
  readonly chartTicks = signal<ChartTick[]>([]);
  readonly xAxisTicks = signal<SummaryDay[]>([]);
  readonly monthRangeLabel = signal('');
  readonly hoveredSummaryDay = signal<SummaryDay | null>(null);

  readonly metricsForm = this.formBuilder.group(
    {
      total_calls: [null as number | null, [Validators.required, Validators.min(0)]],
      technical_visits: [null as number | null, [Validators.required, Validators.min(0)]],
      rescheduled_visits: [null as number | null, [Validators.required, Validators.min(0)]],
      installation_visits: [null as number | null, [Validators.required, Validators.min(0)]],
    },
    { validators: this.visitBreakdownValidator },
  );

  async ngOnInit(): Promise<void> {
    const user = await this.authService.getUser();
    this.userEmail.set(user?.email ?? '');
    void this.loadMonthlySummary();
  }

  setActiveMenu(menu: DashboardMenu): void {
    this.activeMenu.set(menu);
    this.isSummaryDataSourcePickerOpen.set(false);
    this.isSummaryMonthPickerOpen.set(false);
    this.clearChartHover();

    if (menu === 'summary' || menu === 'transfers') {
      void this.loadMonthlySummary();
    }
  }

  async saveMetric(): Promise<void> {
    this.errorMessage.set('');
    this.successMessage.set('');

    if (this.metricsForm.invalid) {
      this.metricsForm.markAllAsTouched();
      return;
    }

    const metrics = this.metricsForm.getRawValue();
    const metricDate = this.selectedMetricDate();
    const editingMetricId = this.editingMetricId();

    if (metricDate > this.today) {
      this.errorMessage.set('No podés cargar métricas para una fecha futura.');
      return;
    }

    this.isSavingMetric.set(true);

    try {
      const metricPayload = {
        work_date: metricDate,
        total_calls: Number(metrics.total_calls),
        technical_visits: Number(metrics.technical_visits),
        rescheduled_visits: Number(metrics.rescheduled_visits),
        installation_visits: Number(metrics.installation_visits),
      };

      if (editingMetricId) {
        await this.metricsService.updateMetric(editingMetricId, metricPayload);
        this.successMessage.set('Métricas actualizadas correctamente en Supabase.');
        this.clearMetricEditState();
      } else {
        const existingMetric = await this.metricsService.getMetricByDate(metricDate);

        if (existingMetric) {
          this.errorMessage.set(
            'La fecha seleccionada ya tiene un registro. Si necesitás corregirlo, editalo desde la tabla del resumen.',
          );
          return;
        }

        await this.metricsService.createMetric(metricPayload);
        this.successMessage.set('Métricas guardadas correctamente en Supabase.');
      }

      this.metricsForm.reset();

      if (this.selectedSummaryMonth() === metricDate.slice(0, 7)) {
        await this.loadMonthlySummary();
      }
    } catch (error) {
      this.errorMessage.set(this.getFriendlyError(error));
    } finally {
      this.isSavingMetric.set(false);
    }
  }

  async loadMonthlySummary(): Promise<void> {
    const [year, month] = this.selectedSummaryMonth().split('-').map(Number);

    if (!year || !month) {
      return;
    }

    const requestId = ++this.summaryLoadRequestId;
    const menu = this.activeMenu();
    const dataSource = this.selectedSummaryDataSource();

    this.isLoadingSummary.set(true);
    this.summaryErrorMessage.set('');
    this.summaryMonthPickerYear.set(year);

    try {
      const metrics = await this.getMonthlySummaryMetrics(year, month, menu, dataSource);

      if (requestId !== this.summaryLoadRequestId) {
        return;
      }

      this.monthlySummaryMetrics.set(metrics);
      this.buildMonthlySummary(year, month, metrics);
    } catch (error) {
      if (requestId === this.summaryLoadRequestId) {
        this.summaryErrorMessage.set(this.getFriendlyError(error));
      }
    } finally {
      if (requestId === this.summaryLoadRequestId) {
        this.isLoadingSummary.set(false);
      }
    }
  }

  onSummaryMonthChange(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (!input.value) {
      return;
    }

    this.selectedSummaryMonth.set(input.value);
    void this.loadMonthlySummary();
  }

  toggleSummaryDataSourcePicker(): void {
    if (this.isLoadingSummary()) {
      return;
    }

    this.isSummaryMonthPickerOpen.set(false);
    this.isSummaryDataSourcePickerOpen.update((isOpen) => !isOpen);
  }

  selectSummaryDataSource(source: SummaryDataSource): void {
    this.isSummaryDataSourcePickerOpen.set(false);
    this.setSummaryDataSource(source);
  }

  setSummaryDataSource(source: SummaryDataSource): void {
    if (source === this.selectedSummaryDataSource()) {
      return;
    }

    this.selectedSummaryDataSource.set(source);
    this.storeSummaryDataSource(source);
    void this.loadMonthlySummary();
  }

  toggleSummaryMonthPicker(): void {
    this.isSummaryDataSourcePickerOpen.set(false);
    this.isSummaryMonthPickerOpen.update((isOpen) => !isOpen);
  }

  changeSummaryMonthPickerYear(delta: number): void {
    this.summaryMonthPickerYear.update((year) => year + delta);
  }

  selectSummaryMonth(month: number): void {
    const year = this.summaryMonthPickerYear();
    this.selectedSummaryMonth.set(`${year}-${String(month).padStart(2, '0')}`);
    this.isSummaryMonthPickerOpen.set(false);
    void this.loadMonthlySummary();
  }

  isSelectedSummaryMonth(month: number): boolean {
    return (
      this.selectedSummaryMonth() ===
      `${this.summaryMonthPickerYear()}-${String(month).padStart(2, '0')}`
    );
  }

  setSummaryVisitFilter(filter: SummaryVisitFilter): void {
    this.selectedSummaryVisitFilter.set(filter);
    const [year, month] = this.selectedSummaryMonth().split('-').map(Number);

    if (!year || !month) {
      return;
    }

    this.buildMonthlySummary(year, month, this.monthlySummaryMetrics());
  }

  setTransferAreaFilter(filter: TransferAreaFilter): void {
    this.selectedTransferAreaFilter.set(filter);
    const [year, month] = this.selectedSummaryMonth().split('-').map(Number);

    if (!year || !month) {
      return;
    }

    this.buildMonthlySummary(year, month, this.monthlySummaryMetrics());
  }

  changeMetricDateByDays(days: number): void {
    if (this.editingMetricId()) {
      return;
    }

    this.setSelectedMetricDate(this.addDaysToDate(this.selectedMetricDate(), days));
  }

  toggleMetricDatePicker(): void {
    if (this.editingMetricId()) {
      return;
    }

    this.metricDatePickerMonth.set(this.selectedMetricDate().slice(0, 7));
    this.isMetricDatePickerOpen.update((isOpen) => !isOpen);
  }

  changeMetricDatePickerMonth(delta: number): void {
    const nextMonth = this.addMonthsToMonthValue(this.metricDatePickerMonth(), delta);

    if (nextMonth > this.today.slice(0, 7)) {
      return;
    }

    this.metricDatePickerMonth.set(nextMonth);
  }

  selectMetricDate(dateValue: string | null): void {
    if (!dateValue || dateValue > this.today) {
      return;
    }

    this.setSelectedMetricDate(dateValue);
    this.isMetricDatePickerOpen.set(false);
  }

  isSelectedMetricDate(dateValue: string | null): boolean {
    return dateValue === this.selectedMetricDate();
  }

  handleChartPointerMove(event: MouseEvent): void {
    const hoverLayer = event.currentTarget as SVGElement | null;
    const svg = hoverLayer?.ownerSVGElement;
    const bounds = svg?.getBoundingClientRect();

    if (!bounds || bounds.width === 0 || bounds.height === 0) {
      this.clearChartHover();
      return;
    }

    const pointerX = ((event.clientX - bounds.left) / bounds.width) * this.chartWidth;
    const clampedX = Math.min(
      Math.max(pointerX, this.chartLeft),
      this.chartWidth - this.chartRight,
    );
    this.hoveredSummaryDay.set(this.getNearestSummaryDay(clampedX));
  }

  clearChartHover(): void {
    this.hoveredSummaryDay.set(null);
  }

  getChartTooltipTransform(day: SummaryDay): string {
    return `translate(${this.getChartTooltipX(day)} ${this.getChartTooltipY(day)})`;
  }

  getFormattedSummaryDayDate(dateValue: string): string {
    const [year, month, day] = dateValue.split('-');
    return `${day}/${month}/${year}`;
  }

  startMetricEdit(day: SummaryDay): void {
    if (this.selectedSummaryDataSource() !== 'daily_metrics' || !day.metricId) {
      return;
    }

    this.cancelMetricDelete();
    this.isMetricDatePickerOpen.set(false);
    this.editingMetricId.set(day.metricId);
    this.editingMetricDate.set(day.date);
    this.selectedMetricDate.set(day.date);
    this.metricDatePickerMonth.set(day.date.slice(0, 7));
    this.activeMenu.set('daily-entry');
    this.errorMessage.set('');
    this.successMessage.set('');
    this.metricsForm.setValue({
      total_calls: day.dailyCalls,
      technical_visits: day.dailyTechnicalVisits,
      rescheduled_visits: day.dailyRescheduledVisits,
      installation_visits: day.dailyInstallationVisits,
    });
    this.metricsForm.markAsPristine();
    this.metricsForm.markAsUntouched();
  }

  requestMetricDelete(day: SummaryDay): void {
    if (this.selectedSummaryDataSource() !== 'daily_metrics' || !day.metricId) {
      return;
    }

    this.pendingDeleteMetricId.set(day.metricId);
    this.errorMessage.set('');
    this.successMessage.set('');
  }

  cancelMetricDelete(): void {
    this.pendingDeleteMetricId.set(null);
  }

  async confirmMetricDelete(day: SummaryDay): Promise<void> {
    if (this.selectedSummaryDataSource() !== 'daily_metrics' || !day.metricId) {
      return;
    }

    this.deletingMetricId.set(day.metricId);
    this.errorMessage.set('');
    this.successMessage.set('');

    try {
      await this.metricsService.deleteMetric(day.metricId);

      if (this.editingMetricId() === day.metricId) {
        this.clearMetricEditState();
        this.metricsForm.reset();
      }

      this.pendingDeleteMetricId.set(null);
      this.successMessage.set('Registro eliminado correctamente.');
      await this.loadMonthlySummary();
    } catch (error) {
      this.errorMessage.set(this.getFriendlyError(error));
    } finally {
      this.deletingMetricId.set(null);
    }
  }

  cancelMetricEdit(): void {
    this.clearMetricEditState();
    this.metricsForm.reset();
    this.errorMessage.set('');
    this.successMessage.set('');
  }

  async signOut(): Promise<void> {
    this.isSigningOut.set(true);
    await this.authService.signOut();
    await this.router.navigateByUrl('/auth');
  }

  private buildMonthlySummary(year: number, month: number, metrics: SummaryMetricInput[]): void {
    const daysInMonth = new Date(year, month, 0).getDate();
    const dailyTotals = new Map<
      number,
      {
        metricId: string | null;
        metricCount: number;
        calls: number;
        technicalVisits: number;
        rescheduledVisits: number;
        installationVisits: number;
        selectedVisits: number;
      }
    >();
    const monthValue = String(month).padStart(2, '0');

    for (const metric of metrics) {
      const day = Number(metric.work_date.slice(8, 10));
      const totals = dailyTotals.get(day) ?? {
        metricId: null,
        metricCount: 0,
        calls: 0,
        technicalVisits: 0,
        rescheduledVisits: 0,
        installationVisits: 0,
        selectedVisits: 0,
      };

      totals.metricCount += 1;
      totals.metricId = totals.metricCount === 1 ? metric.id : null;
      totals.calls += metric.total_calls;
      totals.technicalVisits += this.getTotalSummaryCount(metric);
      totals.rescheduledVisits += metric.rescheduled_visits;
      totals.installationVisits += metric.installation_visits;
      totals.selectedVisits += this.getSelectedSummaryCount(metric);
      dailyTotals.set(day, totals);
    }

    let cumulativeCalls = 0;
    let cumulativeTechnicalVisits = 0;
    let cumulativeSelectedVisits = 0;

    const days = Array.from({ length: daysInMonth }, (_, index) => {
      const day = index + 1;
      const totals = dailyTotals.get(day) ?? {
        metricId: null,
        metricCount: 0,
        calls: 0,
        technicalVisits: 0,
        rescheduledVisits: 0,
        installationVisits: 0,
        selectedVisits: 0,
      };
      const selectedVisits = totals.selectedVisits;
      cumulativeCalls += totals.calls;
      cumulativeTechnicalVisits += totals.technicalVisits;
      cumulativeSelectedVisits += selectedVisits;

      return {
        date: `${year}-${monthValue}-${String(day).padStart(2, '0')}`,
        day,
        hasMetric: totals.metricCount > 0,
        metricId: totals.metricId,
        dailyCalls: totals.calls,
        dailyTechnicalVisits: totals.technicalVisits,
        dailyRescheduledVisits: totals.rescheduledVisits,
        dailyInstallationVisits: totals.installationVisits,
        dailySelectedVisits: selectedVisits,
        cumulativeCalls,
        cumulativeTechnicalVisits,
        cumulativeSelectedVisits,
        percentage: cumulativeCalls === 0 ? 0 : (cumulativeSelectedVisits / cumulativeCalls) * 100,
        x: 0,
        y: 0,
      };
    });

    const positionedDays = this.updateChart(days);

    this.summaryDays.set(positionedDays);
    this.clearChartHover();
    this.summaryTotals.set({
      calls: cumulativeCalls,
      technicalVisits: cumulativeTechnicalVisits,
      selectedVisits: cumulativeSelectedVisits,
      percentage: cumulativeCalls === 0 ? 0 : (cumulativeSelectedVisits / cumulativeCalls) * 100,
    });
    this.monthRangeLabel.set(
      `01/${monthValue}/${year} - ${String(daysInMonth).padStart(2, '0')}/${monthValue}/${year}`,
    );
  }

  private async getMonthlySummaryMetrics(
    year: number,
    month: number,
    menu: DashboardMenu,
    dataSource: SummaryDataSource,
  ): Promise<SummaryMetricInput[]> {
    if (menu === 'transfers' || dataSource === 'call_records') {
      const callRecords = await this.metricsService.getCallRecordsByMonth(year, month);

      return this.buildSummaryMetricsFromCallRecords(callRecords);
    }

    return this.metricsService.getMetricsByMonth(year, month);
  }

  private buildSummaryMetricsFromCallRecords(records: CallRecord[]): SummaryMetricInput[] {
    const metricsByDate = new Map<string, SummaryMetricInput>();

    for (const record of records) {
      const metric = metricsByDate.get(record.work_date) ?? {
        id: null,
        work_date: record.work_date,
        total_calls: 0,
        technical_visits: 0,
        rescheduled_visits: 0,
        installation_visits: 0,
        selectedVisitsByFilter: this.getEmptySelectedVisitsByFilter(),
        transferCountsByArea: this.getEmptyTransferCountsByArea(),
      };

      metric.total_calls += 1;

      const technicalVisitCount = this.getSafeVisitCount(record.technical_visit_count);
      const regularVisitCount = this.getSafeVisitCount(record.regular_visit_count);
      const installationVisitCount = this.getSafeVisitCount(record.installation_visit_count);
      const rescheduledVisitCount = this.getSafeVisitCount(record.rescheduled_visit_count);

      metric.technical_visits += technicalVisitCount;
      metric.rescheduled_visits += rescheduledVisitCount;
      metric.installation_visits += installationVisitCount;
      metric.selectedVisitsByFilter!.total += technicalVisitCount;
      metric.selectedVisitsByFilter!['without-reschedules'] +=
        regularVisitCount + installationVisitCount;
      metric.selectedVisitsByFilter!['without-installations'] +=
        regularVisitCount + rescheduledVisitCount;
      metric.selectedVisitsByFilter!['without-reschedules-installations'] += regularVisitCount;

      if (record.is_transferred) {
        metric.transferCountsByArea!.all += 1;

        if (record.transfer_area) {
          metric.transferCountsByArea![record.transfer_area] += 1;
        }
      }

      metricsByDate.set(record.work_date, metric);
    }

    return Array.from(metricsByDate.values()).sort((firstMetric, secondMetric) =>
      firstMetric.work_date.localeCompare(secondMetric.work_date),
    );
  }

  private getEmptySelectedVisitsByFilter(): SummarySelectedVisitsByFilter {
    return {
      total: 0,
      'without-reschedules': 0,
      'without-installations': 0,
      'without-reschedules-installations': 0,
    };
  }

  private getEmptyTransferCountsByArea(): TransferCountsByArea {
    return {
      all: 0,
      commercial: 0,
      retention: 0,
      other: 0,
    };
  }

  private getSelectedSummaryCount(metric: SummaryMetricInput): number {
    if (this.activeMenu() === 'transfers') {
      return metric.transferCountsByArea?.[this.selectedTransferAreaFilter()] ?? 0;
    }

    return this.getSelectedTechnicalVisits(metric, this.selectedSummaryVisitFilter());
  }

  private getTotalSummaryCount(metric: SummaryMetricInput): number {
    return this.activeMenu() === 'transfers'
      ? (metric.transferCountsByArea?.all ?? 0)
      : metric.technical_visits;
  }

  private getSelectedTechnicalVisits(
    metric: SummaryMetricInput,
    filter: SummaryVisitFilter,
  ): number {
    return (
      metric.selectedVisitsByFilter?.[filter] ??
      this.getFilteredTechnicalVisits(
        {
          technicalVisits: metric.technical_visits,
          rescheduledVisits: metric.rescheduled_visits,
          installationVisits: metric.installation_visits,
        },
        filter,
      )
    );
  }

  private getSafeVisitCount(count: number): number {
    return Number.isFinite(count) ? Math.max(0, count) : 0;
  }

  private getStoredSummaryDataSource(): SummaryDataSource {
    try {
      const storedSource = globalThis.localStorage?.getItem(this.summaryDataSourceStorageKey);

      if (this.isSummaryDataSource(storedSource)) {
        return storedSource;
      }
    } catch {
      return 'call_records';
    }

    return 'call_records';
  }

  private storeSummaryDataSource(source: SummaryDataSource): void {
    try {
      globalThis.localStorage?.setItem(this.summaryDataSourceStorageKey, source);
    } catch {
      return;
    }
  }

  private isSummaryDataSource(value: string | null | undefined): value is SummaryDataSource {
    return value === 'daily_metrics' || value === 'call_records';
  }

  private clearMetricEditState(): void {
    this.editingMetricId.set(null);
    this.editingMetricDate.set(null);
  }

  private getFilteredTechnicalVisits(
    totals: { technicalVisits: number; rescheduledVisits: number; installationVisits: number },
    filter: SummaryVisitFilter,
  ): number {
    switch (filter) {
      case 'without-reschedules':
        return Math.max(0, totals.technicalVisits - totals.rescheduledVisits);
      case 'without-installations':
        return Math.max(0, totals.technicalVisits - totals.installationVisits);
      case 'without-reschedules-installations':
        return Math.max(
          0,
          totals.technicalVisits - totals.rescheduledVisits - totals.installationVisits,
        );
      default:
        return totals.technicalVisits;
    }
  }

  private updateChart(days: SummaryDay[]): SummaryDay[] {
    const chartMax = this.getChartMax(days);
    const plotWidth = this.chartWidth - this.chartLeft - this.chartRight;
    const plotHeight = this.chartHeight - this.chartTop - this.chartBottom;
    const lastIndex = Math.max(days.length - 1, 1);
    const positionedDays = days.map((day, index) => ({
      ...day,
      x: this.chartLeft + (plotWidth * index) / lastIndex,
      y: this.chartTop + ((chartMax - day.percentage) / chartMax) * plotHeight,
    }));
    const points = positionedDays.map((day) => `${day.x.toFixed(1)},${day.y.toFixed(1)}`).join(' ');
    const firstPoint = positionedDays[0];
    const lastPoint = positionedDays[positionedDays.length - 1];
    const baseline = this.chartHeight - this.chartBottom;

    this.chartLinePoints.set(points);
    this.chartAreaPath.set(
      firstPoint && lastPoint
        ? `M ${firstPoint.x.toFixed(1)} ${baseline} L ${points} L ${lastPoint.x.toFixed(1)} ${baseline} Z`
        : '',
    );
    this.chartTicks.set(this.buildChartTicks(chartMax));
    this.xAxisTicks.set(this.buildXAxisTicks(positionedDays));

    return positionedDays;
  }

  private getChartMax(days: SummaryDay[]): number {
    const maxPercentage = Math.max(...days.map((day) => day.percentage), 0);
    return Math.max(100, Math.ceil(maxPercentage / 10) * 10);
  }

  private buildChartTicks(chartMax: number): ChartTick[] {
    const plotHeight = this.chartHeight - this.chartTop - this.chartBottom;

    return Array.from({ length: 5 }, (_, index) => {
      const value = (chartMax / 4) * index;

      return {
        value,
        y: this.chartTop + ((chartMax - value) / chartMax) * plotHeight,
      };
    }).reverse();
  }

  private buildXAxisTicks(days: SummaryDay[]): SummaryDay[] {
    const tickIndexes = new Set([0, Math.floor(days.length / 2), days.length - 1]);
    return Array.from(tickIndexes)
      .map((index) => days[index])
      .filter(Boolean);
  }

  private setSelectedMetricDate(dateValue: string): void {
    if (!this.isValidDateValue(dateValue)) {
      return;
    }

    const safeDate = dateValue > this.today ? this.today : dateValue;
    this.selectedMetricDate.set(safeDate);
    this.metricDatePickerMonth.set(safeDate.slice(0, 7));
    this.errorMessage.set('');
    this.successMessage.set('');
  }

  private addDaysToDate(dateValue: string, days: number): string {
    const [year, month, day] = dateValue.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() + days);

    return this.formatDateValue(date);
  }

  private isValidDateValue(dateValue: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
      return false;
    }

    const [year, month, day] = dateValue.split('-').map(Number);
    const date = new Date(year, month - 1, day);

    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  }

  private buildMetricDateCalendarDays(monthValue: string): MetricDateCalendarDay[] {
    if (!/^\d{4}-\d{2}$/.test(monthValue)) {
      return [];
    }

    const [year, month] = monthValue.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const firstDayOfMonth = new Date(year, month - 1, 1).getDay();
    const leadingBlanks = (firstDayOfMonth + 6) % 7;
    const calendarDays: MetricDateCalendarDay[] = Array.from({ length: leadingBlanks }, () => ({
      date: null,
      day: null,
      isFuture: false,
    }));

    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = `${monthValue}-${String(day).padStart(2, '0')}`;
      calendarDays.push({
        date,
        day,
        isFuture: date > this.today,
      });
    }

    while (calendarDays.length % 7 !== 0) {
      calendarDays.push({
        date: null,
        day: null,
        isFuture: false,
      });
    }

    return calendarDays;
  }

  private addMonthsToMonthValue(monthValue: string, months: number): string {
    const [year, month] = monthValue.split('-').map(Number);
    const date = new Date(year, month - 1 + months, 1);

    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  private visitBreakdownValidator(control: AbstractControl): ValidationErrors | null {
    const technicalVisits = Number(control.get('technical_visits')?.value ?? 0);
    const rescheduledVisits = Number(control.get('rescheduled_visits')?.value ?? 0);
    const installationVisits = Number(control.get('installation_visits')?.value ?? 0);

    if (rescheduledVisits + installationVisits > technicalVisits) {
      return { visitBreakdown: true };
    }

    return null;
  }

  private getNearestSummaryDay(pointerX: number): SummaryDay | null {
    const days = this.summaryDays();

    if (days.length === 0) {
      return null;
    }

    return days.reduce((nearest, day) =>
      Math.abs(day.x - pointerX) < Math.abs(nearest.x - pointerX) ? day : nearest,
    );
  }

  private getChartTooltipX(day: SummaryDay): number {
    const spacing = 14;
    const maxX = this.chartWidth - this.chartRight - this.chartTooltipWidth;
    const preferredX =
      day.x + spacing + this.chartTooltipWidth <= this.chartWidth - this.chartRight
        ? day.x + spacing
        : day.x - this.chartTooltipWidth - spacing;

    return Math.min(Math.max(preferredX, this.chartLeft), maxX);
  }

  private getChartTooltipY(day: SummaryDay): number {
    const spacing = 12;
    const minY = this.chartTop + 8;
    const maxY = this.chartHeight - this.chartBottom - this.chartTooltipHeight - 8;
    const preferredY =
      day.y - this.chartTooltipHeight - spacing >= minY
        ? day.y - this.chartTooltipHeight - spacing
        : day.y + spacing;

    return Math.min(Math.max(preferredY, minY), maxY);
  }

  private getFriendlyError(error: unknown): string {
    if (error instanceof Error && error.message) {
      return error.message;
    }

    return 'No pudimos guardar las métricas. Probá nuevamente.';
  }

  private getLocalDate(): string {
    const date = new Date();
    const timezoneOffset = date.getTimezoneOffset() * 60_000;
    return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 10);
  }

  private formatDateValue(date: Date): string {
    const timezoneOffset = date.getTimezoneOffset() * 60_000;
    return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 10);
  }

  private getSummaryMonthLabel(monthValue: string): string {
    const [year, month] = monthValue.split('-').map(Number);
    const monthLabel = this.monthOptions.find((option) => option.value === month)?.label;

    if (!year || !monthLabel) {
      return 'Seleccionar mes';
    }

    return `${monthLabel} de ${year}`;
  }
}
