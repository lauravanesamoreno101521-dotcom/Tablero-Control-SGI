import {
  buildMedicinaAlertRecords,
  formatMedicinaCurrency,
  getMedicinaExpiryStyles,
  type MedicinaGroupedStat,
  type MedicinaIndicators,
  type MedicinaMonthlyPoint,
  type MedicinaTrabajoRecord
} from '../medicinaTrabajoDemo.ts';
import { getScaledBarHeight, renderSgiVerticalBar } from '../sgiBarChart.tsx';

type MedicinaTrabajoSectionProps = {
  subIndicator: string;
  indicators: MedicinaIndicators;
  referenceDate: Date;
  monthlyTrend: MedicinaMonthlyPoint[];
  trendYear: number;
  cityStats: MedicinaGroupedStat[];
  linkStats: MedicinaGroupedStat[];
  ipsStats: MedicinaGroupedStat[];
  contractStats: MedicinaGroupedStat[];
  filteredRecords: MedicinaTrabajoRecord[];
  alertFilter: 'all' | 'vencido' | 'este_mes' | 'proximo_mes';
  onAlertFilterChange: (value: 'all' | 'vencido' | 'este_mes' | 'proximo_mes') => void;
};

const renderBarList = (rows: MedicinaGroupedStat[], valueLabel = 'registros') => {
  const maxValue = Math.max(...rows.map((row) => row.total), 1);
  return (
    <div className="space-y-2">
      {rows.slice(0, 10).map((row) => (
        <div key={row.label} className="bg-white border border-[#eaecf0] rounded-soft p-2.5">
          <div className="flex items-center justify-between text-xs gap-2">
            <span className="font-semibold text-[#191c1d] line-clamp-1">{row.label}</span>
            <span className="font-mono shrink-0">
              {row.total} {valueLabel}
            </span>
          </div>
          <div className="text-[10px] text-gray-500 mt-0.5">{formatMedicinaCurrency(row.cost)} invertidos</div>
          <div className="h-2 mt-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-[#006b3d]" style={{ width: `${(row.total / maxValue) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
};

export default function MedicinaTrabajoSection({
  subIndicator,
  indicators,
  referenceDate,
  monthlyTrend,
  trendYear,
  cityStats,
  linkStats,
  ipsStats,
  contractStats,
  filteredRecords,
  alertFilter,
  onAlertFilterChange
}: MedicinaTrabajoSectionProps) {
  const alertRecords = buildMedicinaAlertRecords(filteredRecords, referenceDate);
  const visibleAlerts =
    alertFilter === 'all'
      ? alertRecords
      : alertRecords.filter(({ styles }) => styles.status === alertFilter);

  const complianceStyles =
    indicators.vencidos > 0
      ? getMedicinaExpiryStyles('vencido', referenceDate)
      : indicators.expireThisMonth > 0
        ? getMedicinaExpiryStyles('este_mes', referenceDate)
        : indicators.expireNextMonth > 0
          ? getMedicinaExpiryStyles('proximo_mes', referenceDate)
          : getMedicinaExpiryStyles('vigente', referenceDate);

  const examStatusTotal = Math.max(indicators.ingresoCount + indicators.periodicoCount + indicators.seguimientoCount, 1);

  return (
    <>
      <p className="text-[11px] text-gray-500">
        Referencia de vencimientos: <span className="font-semibold capitalize">{indicators.referencePeriodLabel}</span>
      </p>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <div className="bg-white border border-[#eaecf0] rounded-soft p-3">
          <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Trabajadores en control</p>
          <p className="text-2xl font-bold text-[#191c1d] mt-1">{indicators.totalWorkers}</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-300 rounded-soft p-3">
          <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Vigentes</p>
          <p className="text-2xl font-bold text-[#006b3d] mt-1">{indicators.vigentes}</p>
        </div>
        <div className="bg-orange-50 border border-orange-300 rounded-soft p-3">
          <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Vencen este mes</p>
          <p className="text-2xl font-bold text-orange-700 mt-1">{indicators.expireThisMonth}</p>
          <p className="text-[10px] text-orange-700 mt-1 capitalize">{indicators.currentMonthName}</p>
        </div>
        <div className="bg-yellow-50 border border-[#ffd000] rounded-soft p-3">
          <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Vencen próximo mes</p>
          <p className="text-2xl font-bold text-[#9a7b00] mt-1">{indicators.expireNextMonth}</p>
          <p className="text-[10px] text-[#7a6200] mt-1 capitalize">{indicators.nextMonthName}</p>
        </div>
        <div className="bg-red-50 border border-red-300 rounded-soft p-3">
          <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Vencidos</p>
          <p className="text-2xl font-bold text-[#ba1a1a] mt-1">{indicators.vencidos}</p>
        </div>
        <div className="bg-white border border-[#eaecf0] rounded-soft p-3">
          <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Inversión total</p>
          <p className="text-lg font-bold text-[#191c1d] mt-1">{formatMedicinaCurrency(indicators.totalCost)}</p>
          <p className="text-[10px] text-gray-500 mt-1">Prom. {formatMedicinaCurrency(indicators.averageCost)}</p>
        </div>
      </div>

      <div className={`rounded-soft border p-4 ${complianceStyles.bg} ${complianceStyles.border}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-wide font-semibold text-gray-600">
              Cumplimiento exámenes ocupacionales
            </p>
            <p className={`text-2xl font-bold mt-1 ${complianceStyles.text}`}>
              {indicators.complianceRate.toFixed(1)}%
              <span className="text-sm font-semibold text-gray-600 ml-2">
                sin vencidos ({indicators.totalWorkers - indicators.vencidos}/{indicators.totalWorkers})
              </span>
            </p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-bold border ${complianceStyles.badge}`}>
            {complianceStyles.label}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-3 text-[10px] text-gray-600">
          <span>Vencidos · antes de {indicators.currentMonthName}</span>
          <span>Vencen este mes · {indicators.currentMonthName}</span>
          <span>Vencen próximo mes · {indicators.nextMonthName}</span>
          <span>Vigentes · posterior a {indicators.nextMonthName}</span>
        </div>
      </div>

      {subIndicator === '1' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white border border-[#eaecf0] rounded-soft p-3">
              <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Examen ingreso</p>
              <p className="text-2xl font-bold text-[#00502c] mt-1">{indicators.ingresoCount}</p>
            </div>
            <div className="bg-white border border-[#eaecf0] rounded-soft p-3">
              <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Examen periódico</p>
              <p className="text-2xl font-bold text-[#00502c] mt-1">{indicators.periodicoCount}</p>
            </div>
            <div className="bg-white border border-[#eaecf0] rounded-soft p-3">
              <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Seguimiento / post-incap.</p>
              <p className="text-2xl font-bold text-[#00502c] mt-1">{indicators.seguimientoCount + indicators.postIncapCount}</p>
            </div>
            <div className="bg-white border border-[#eaecf0] rounded-soft p-3">
              <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Periodicidad 1 / 3 años</p>
              <p className="text-2xl font-bold text-[#191c1d] mt-1">
                {indicators.periodicOneYear} / {indicators.periodicThreeYears}
              </p>
            </div>
          </div>

          <div className="bg-[#f8f9fa] border border-[#eaecf0] rounded-soft p-4 w-full">
            <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-3">Estado del examen</p>
            <div className="bg-white border border-[#eaecf0] rounded-soft p-4 space-y-3 w-full">
              {[
                { label: 'Ingreso', value: indicators.ingresoCount, color: '#006b3d' },
                { label: 'Periódico', value: indicators.periodicoCount, color: '#00502c' },
                { label: 'Seguimiento / otros', value: indicators.seguimientoCount, color: '#9a7b00' }
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">{item.label}</span>
                    <span className="font-mono" style={{ color: item.color }}>
                      {((item.value / examStatusTotal) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden mt-1">
                    <div className="h-full" style={{ width: `${(item.value / examStatusTotal) * 100}%`, backgroundColor: item.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {subIndicator === '2' && (
        <div className="space-y-4">
          <p className="text-[11px] text-gray-500">Tendencia {trendYear}: exámenes realizados y vencimientos programados por mes.</p>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {[
              { title: 'Exámenes realizados', key: 'exams' as const, color: '#006b3d' },
              { title: 'Vencimientos programados', key: 'expiries' as const, color: '#ba1a1a' }
            ].map((chart) => {
              const maxValue = Math.max(...monthlyTrend.map((month) => month[chart.key]), 1);
              return (
                <div key={chart.title} className="bg-[#f8f9fa] border border-[#eaecf0] rounded-soft p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-3">{chart.title}</p>
                  <div className="bg-white border border-[#eaecf0] rounded-soft p-3">
                    <div className="overflow-x-auto overflow-y-visible py-2">
                      <div className="flex gap-2 justify-between min-w-max px-1">
                        {monthlyTrend.map((month) => {
                          const value = month[chart.key];
                          return (
                            <div key={`${chart.key}-${month.label}`} className="flex flex-col items-center min-w-[36px]">
                              {renderSgiVerticalBar(
                                value > 0 ? String(value) : '0',
                                getScaledBarHeight(value, maxValue),
                                chart.color,
                                {
                                  barWidthClass: 'w-[24px]',
                                  title: `${month.label}: ${value}`
                                }
                              )}
                              <span className="text-[10px] text-gray-500 mt-2">{month.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {subIndicator === '3' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="bg-[#f8f9fa] border border-[#eaecf0] rounded-soft p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-3">Por ciudad</p>
            {renderBarList(cityStats)}
          </div>
          <div className="bg-[#f8f9fa] border border-[#eaecf0] rounded-soft p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-3">Por vinculación</p>
            {renderBarList(linkStats)}
          </div>
          <div className="bg-[#f8f9fa] border border-[#eaecf0] rounded-soft p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-3">Por IPS</p>
            {renderBarList(ipsStats)}
          </div>
          <div className="bg-[#f8f9fa] border border-[#eaecf0] rounded-soft p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-3">Por contrato / cliente</p>
            {renderBarList(contractStats)}
          </div>
        </div>
      )}

      {subIndicator === '4' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'all' as const, label: 'Todos los alertados' },
              { id: 'vencido' as const, label: 'Vencidos' },
              { id: 'este_mes' as const, label: `Vencen este mes (${indicators.currentMonthName})` },
              { id: 'proximo_mes' as const, label: `Vencen próximo mes (${indicators.nextMonthName})` }
            ].map((filter) => (
              <button
                key={filter.id}
                type="button"
                onClick={() => onAlertFilterChange(filter.id)}
                className={`px-3 py-1.5 rounded-soft text-xs font-semibold border transition-colors ${
                  alertFilter === filter.id
                    ? 'bg-[#00502c] text-white border-[#00502c]'
                    : 'bg-white text-gray-700 border-[#d6dce5] hover:bg-gray-50'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div className="border border-[#eaecf0] rounded-soft overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead className="bg-[#f8f9fa] border-b border-[#eaecf0] text-left text-gray-600">
                  <tr>
                    <th className="px-3 py-2">Documento</th>
                    <th className="px-3 py-2">Nombre</th>
                    <th className="px-3 py-2">Ciudad</th>
                    <th className="px-3 py-2">Contrato</th>
                    <th className="px-3 py-2">Estado examen</th>
                    <th className="px-3 py-2">Fecha examen</th>
                    <th className="px-3 py-2">Vencimiento</th>
                    <th className="px-3 py-2">Días</th>
                    <th className="px-3 py-2">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eef1f5]">
                  {visibleAlerts.slice(0, 50).map(({ record, daysToExpiry, styles }) => (
                    <tr key={record.id} className={styles.bg}>
                      <td className="px-3 py-2 font-mono">{record.documento}</td>
                      <td className="px-3 py-2">{record.employeeName}</td>
                      <td className="px-3 py-2">{record.city}</td>
                      <td className="px-3 py-2 max-w-[160px] truncate" title={record.contract}>{record.contract}</td>
                      <td className="px-3 py-2">{record.examStatus}</td>
                      <td className="px-3 py-2">{record.examDateLabel}</td>
                      <td className="px-3 py-2">{record.expiryDateLabel}</td>
                      <td className="px-3 py-2 font-mono">{daysToExpiry ?? '—'}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${styles.badge}`}>
                          {styles.label}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {visibleAlerts.length === 0 && (
              <p className="text-sm text-gray-500 p-4 text-center">No hay registros en alerta con el filtro seleccionado.</p>
            )}
            {visibleAlerts.length > 50 && (
              <p className="text-[11px] text-gray-500 p-3 border-t border-[#eaecf0]">
                Mostrando 50 de {visibleAlerts.length} registros en alerta.
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
