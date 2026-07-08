import {
  AUDITORIA_MONTH_LABELS,
  buildAuditoriaComplianceByAudit,
  buildAuditoriaCompliancePareto,
  buildAuditoriaEntityStats,
  buildAuditoriaMonthlyTrend,
  buildAuditoriaProcessStats,
  buildAuditoriaYearlyComplianceTrend,
  resolveAuditoriaParetoReferenceYear,
  formatAuditoriaScore,
  getAuditoriaComplianceColor,
  getAuditoriaComplianceStyles,
  getAuditoriaScoreStyles,
  type AuditoriaExternaRecord,
  type AuditoriaIndicators,
  type AuditoriaInternaRecord
} from '../auditoriasDemo.ts';
import { getScaledBarHeight, renderSgiGroupedVerticalBars, renderSgiVerticalBar } from '../sgiBarChart.tsx';

export type AuditoriaBdPanel = 'interna' | 'externa' | 'informe';

type AuditoriaInternaForm = {
  eventDate: string;
  entity: string;
  process: string;
  actionType: string;
  openActions: string;
  closedActions: string;
};

type AuditoriaExternaForm = {
  eventDate: string;
  entity: string;
  totalFindings: string;
  closedFindings: string;
  score: string;
};

type AuditoriasSectionProps = {
  subIndicator: string;
  indicators: AuditoriaIndicators;
  internaRecords: AuditoriaInternaRecord[];
  externaRecords: AuditoriaExternaRecord[];
  trendInternaRecords?: AuditoriaInternaRecord[];
  trendExternaRecords?: AuditoriaExternaRecord[];
  trendYear: number;
  yearFilter?: string;
  showDbDetailPanel: boolean;
  demoPanel: AuditoriaBdPanel;
  canEdit: boolean;
  internaForm: AuditoriaInternaForm;
  externaForm: AuditoriaExternaForm;
  editingInternaId: string | null;
  editingExternaId: string | null;
  onInternaFormChange: (patch: Partial<AuditoriaInternaForm>) => void;
  onExternaFormChange: (patch: Partial<AuditoriaExternaForm>) => void;
  onSubmitInterna: () => void;
  onSubmitExterna: () => void;
  onResetInternaForm: () => void;
  onResetExternaForm: () => void;
  onEditInterna: (row: AuditoriaInternaRecord) => void;
  onEditExterna: (row: AuditoriaExternaRecord) => void;
  onDeleteInterna: (id: string) => void;
  onDeleteExterna: (id: string) => void;
  onRestoreInitial: () => void;
  internaFilterOptions: {
    process: string[];
    actionType: string[];
    entity: string[];
    eventDate: string[];
  };
  externaFilterOptions: {
    entity: string[];
    eventDate: string[];
  };
};

const inputClass = 'w-full border border-[#d6dce5] rounded-soft px-2 py-1 text-xs';

export default function AuditoriasSection({
  subIndicator,
  indicators,
  internaRecords,
  externaRecords,
  trendInternaRecords,
  trendExternaRecords,
  trendYear,
  yearFilter = '',
  showDbDetailPanel,
  demoPanel,
  canEdit,
  internaForm,
  externaForm,
  editingInternaId,
  editingExternaId,
  onInternaFormChange,
  onExternaFormChange,
  onSubmitInterna,
  onSubmitExterna,
  onResetInternaForm,
  onResetExternaForm,
  onEditInterna,
  onEditExterna,
  onDeleteInterna,
  onDeleteExterna,
  onRestoreInitial,
  internaFilterOptions,
  externaFilterOptions
}: AuditoriasSectionProps) {
  const trendInterna = trendInternaRecords ?? internaRecords;
  const trendExterna = trendExternaRecords ?? externaRecords;
  const processStats = buildAuditoriaProcessStats(internaRecords);
  const entityStats = buildAuditoriaEntityStats(externaRecords);
  const monthlyTrend = buildAuditoriaMonthlyTrend(internaRecords, externaRecords, trendYear);
  const yearlyComplianceTrend = buildAuditoriaYearlyComplianceTrend(trendInterna, trendExterna);
  const complianceByAudit = buildAuditoriaComplianceByAudit(trendInterna, trendExterna);
  const paretoReferenceYear = resolveAuditoriaParetoReferenceYear(trendInterna, trendExterna, yearFilter);
  const compliancePareto = buildAuditoriaCompliancePareto(complianceByAudit, paretoReferenceYear);
  const trendYears = yearlyComplianceTrend.map((point) => point.year);
  const yearBarPalette = ['#00502c', '#006b3d', '#3d8f5f', '#7ab892', '#ffd000', '#d4a900'];
  const closureMet = indicators.closureRate >= 95;
  const scoreMet = indicators.avgExternalScore >= 0.9;
  const auditCountReferenceLabel = yearFilter
    ? `Año de referencia ${yearFilter}`
    : 'Consolidado histórico';
  const paretoReferenceLabel = yearFilter
    ? `el año ${yearFilter}`
    : `el último año registrado (${paretoReferenceYear})`;

  if (showDbDetailPanel && demoPanel === 'interna' && canEdit) {
    return (
      <div className="bg-white border border-[#eaecf0] rounded-soft overflow-hidden">
        <div className="px-3 py-2 border-b border-[#eaecf0] bg-[#f8f9fa] flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs font-bold text-[#00502c]">INGRESO BASE DE DATOS · AUDITORÍA INTERNA</div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onRestoreInitial} className="text-[11px] px-2 py-1 border border-[#d6dce5] rounded-soft bg-white hover:bg-gray-50">
              Restaurar BD inicial
            </button>
            <span className="text-[11px] text-gray-500">{internaRecords.length} registro(s)</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[900px]">
            <thead className="bg-white border-b border-[#eaecf0]">
              <tr className="text-[10px] uppercase tracking-wide text-gray-600">
                <th className="px-2 py-2 text-left">Fecha</th>
                <th className="px-2 py-2 text-left">Entidad</th>
                <th className="px-2 py-2 text-left">Proceso</th>
                <th className="px-2 py-2 text-left">Acción</th>
                <th className="px-2 py-2 text-right">Abiertas</th>
                <th className="px-2 py-2 text-right">Cerradas</th>
                <th className="px-2 py-2 text-center">Acciones</th>
              </tr>
              <tr className="border-t border-[#eef1f5] bg-[#f8f9fa]">
                <th className="px-2 py-2"><input type="date" list="aud-int-date-options" value={internaForm.eventDate} onChange={(e) => onInternaFormChange({ eventDate: e.target.value })} className={inputClass} /></th>
                <th className="px-2 py-2"><input list="aud-int-entity-options" value={internaForm.entity} onChange={(e) => onInternaFormChange({ entity: e.target.value })} className={inputClass} placeholder="Entidad" /></th>
                <th className="px-2 py-2"><input list="aud-int-process-options" value={internaForm.process} onChange={(e) => onInternaFormChange({ process: e.target.value })} className={inputClass} placeholder="Proceso" /></th>
                <th className="px-2 py-2"><input list="aud-int-action-options" value={internaForm.actionType} onChange={(e) => onInternaFormChange({ actionType: e.target.value })} className={inputClass} placeholder="Acción" /></th>
                <th className="px-2 py-2"><input type="number" min={0} value={internaForm.openActions} onChange={(e) => onInternaFormChange({ openActions: e.target.value })} className={`${inputClass} text-right`} /></th>
                <th className="px-2 py-2"><input type="number" min={0} value={internaForm.closedActions} onChange={(e) => onInternaFormChange({ closedActions: e.target.value })} className={`${inputClass} text-right`} /></th>
                <th className="px-2 py-2">
                  <div className="flex items-center justify-center gap-1">
                    <button type="button" onClick={onSubmitInterna} className="px-2 py-1 rounded-soft bg-[#00502c] text-white text-[10px] font-semibold">{editingInternaId ? 'Guardar' : 'Agregar'}</button>
                    <button type="button" onClick={onResetInternaForm} className="px-2 py-1 rounded-soft border border-[#d6dce5] text-[10px]">Cancelar</button>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eef1f5]">
              {internaRecords.map((row) => (
                <tr key={row.id}>
                  <td className="px-2 py-2 whitespace-nowrap">{row.eventDateLabel || row.eventDate}</td>
                  <td className="px-2 py-2">{row.entity}</td>
                  <td className="px-2 py-2">{row.process}</td>
                  <td className="px-2 py-2">{row.actionType}</td>
                  <td className="px-2 py-2 text-right font-mono">{row.openActions}</td>
                  <td className="px-2 py-2 text-right font-mono">{row.closedActions}</td>
                  <td className="px-2 py-2 text-center">
                    <button type="button" onClick={() => onEditInterna(row)} className="text-[#006b3d] font-semibold mr-2">Editar</button>
                    <button type="button" onClick={() => onDeleteInterna(row.id)} className="text-red-600 font-semibold">Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <datalist id="aud-int-date-options">{internaFilterOptions.eventDate.map((v) => <option key={`int-date-${v}`} value={v} />)}</datalist>
        <datalist id="aud-int-entity-options">{internaFilterOptions.entity.map((v) => <option key={`int-entity-${v}`} value={v} />)}</datalist>
        <datalist id="aud-int-process-options">{internaFilterOptions.process.map((v) => <option key={`int-process-${v}`} value={v} />)}</datalist>
        <datalist id="aud-int-action-options">{internaFilterOptions.actionType.map((v) => <option key={`int-action-${v}`} value={v} />)}</datalist>
      </div>
    );
  }

  if (showDbDetailPanel && demoPanel === 'externa' && canEdit) {
    return (
      <div className="bg-white border border-[#eaecf0] rounded-soft overflow-hidden">
        <div className="px-3 py-2 border-b border-[#eaecf0] bg-[#f8f9fa] flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs font-bold text-[#00502c]">INGRESO BASE DE DATOS · AUDITORÍA EXTERNA</div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onRestoreInitial} className="text-[11px] px-2 py-1 border border-[#d6dce5] rounded-soft bg-white hover:bg-gray-50">
              Restaurar BD inicial
            </button>
            <span className="text-[11px] text-gray-500">{externaRecords.length} registro(s)</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[820px]">
            <thead className="bg-white border-b border-[#eaecf0]">
              <tr className="text-[10px] uppercase tracking-wide text-gray-600">
                <th className="px-2 py-2 text-left">Fecha</th>
                <th className="px-2 py-2 text-left">Entidad</th>
                <th className="px-2 py-2 text-right">Hallazgos</th>
                <th className="px-2 py-2 text-right">Cerrados</th>
                <th className="px-2 py-2 text-right">Puntaje</th>
                <th className="px-2 py-2 text-center">Acciones</th>
              </tr>
              <tr className="border-t border-[#eef1f5] bg-[#f8f9fa]">
                <th className="px-2 py-2"><input type="date" list="aud-ext-date-options" value={externaForm.eventDate} onChange={(e) => onExternaFormChange({ eventDate: e.target.value })} className={inputClass} /></th>
                <th className="px-2 py-2"><input list="aud-ext-entity-options" value={externaForm.entity} onChange={(e) => onExternaFormChange({ entity: e.target.value })} className={inputClass} placeholder="Entidad" /></th>
                <th className="px-2 py-2"><input type="number" min={0} value={externaForm.totalFindings} onChange={(e) => onExternaFormChange({ totalFindings: e.target.value })} className={`${inputClass} text-right`} /></th>
                <th className="px-2 py-2"><input type="number" min={0} value={externaForm.closedFindings} onChange={(e) => onExternaFormChange({ closedFindings: e.target.value })} className={`${inputClass} text-right`} /></th>
                <th className="px-2 py-2"><input type="number" min={0} max={1} step={0.01} value={externaForm.score} onChange={(e) => onExternaFormChange({ score: e.target.value })} className={`${inputClass} text-right`} /></th>
                <th className="px-2 py-2">
                  <div className="flex items-center justify-center gap-1">
                    <button type="button" onClick={onSubmitExterna} className="px-2 py-1 rounded-soft bg-[#00502c] text-white text-[10px] font-semibold">{editingExternaId ? 'Guardar' : 'Agregar'}</button>
                    <button type="button" onClick={onResetExternaForm} className="px-2 py-1 rounded-soft border border-[#d6dce5] text-[10px]">Cancelar</button>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eef1f5]">
              {externaRecords.map((row) => (
                <tr key={row.id}>
                  <td className="px-2 py-2 whitespace-nowrap">{row.eventDateLabel || row.eventDate}</td>
                  <td className="px-2 py-2">{row.entity}</td>
                  <td className="px-2 py-2 text-right font-mono">{row.totalFindings}</td>
                  <td className="px-2 py-2 text-right font-mono">{row.closedFindings}</td>
                  <td className="px-2 py-2 text-right font-mono">{formatAuditoriaScore(row.score)}</td>
                  <td className="px-2 py-2 text-center">
                    <button type="button" onClick={() => onEditExterna(row)} className="text-[#006b3d] font-semibold mr-2">Editar</button>
                    <button type="button" onClick={() => onDeleteExterna(row.id)} className="text-red-600 font-semibold">Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <datalist id="aud-ext-date-options">{externaFilterOptions.eventDate.map((v) => <option key={`ext-date-${v}`} value={v} />)}</datalist>
        <datalist id="aud-ext-entity-options">{externaFilterOptions.entity.map((v) => <option key={`ext-entity-${v}`} value={v} />)}</datalist>
      </div>
    );
  }

  if (showDbDetailPanel && demoPanel === 'informe') {
    return (
      <div className="bg-white border border-[#eaecf0] rounded-soft p-4 space-y-4">
        <h3 className="text-sm font-bold text-[#00502c]">Informe consolidado de auditorías</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border border-[#eaecf0]">
            <thead className="bg-[#f8f9fa]">
              <tr>
                <th className="px-2 py-2 text-left sticky left-0 bg-[#f8f9fa]">Descripción</th>
                {AUDITORIA_MONTH_LABELS.map((label) => (
                  <th key={label} className="px-2 py-2 text-right min-w-[52px]">{label}</th>
                ))}
                <th className="px-2 py-2 text-right">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: 'Acciones internas abiertas', values: monthlyTrend.map((m) => m.internaOpen) },
                { label: 'Acciones internas cerradas', values: monthlyTrend.map((m) => m.internaClosed) },
                { label: 'Hallazgos externos', values: monthlyTrend.map((m) => m.externaFindings) },
                { label: 'Hallazgos externos cerrados', values: monthlyTrend.map((m) => m.externaClosed) }
              ].map((row) => (
                <tr key={row.label} className="border-t border-[#eef1f5]">
                  <td className="px-2 py-2 font-semibold sticky left-0 bg-white">{row.label}</td>
                  {row.values.map((value, index) => (
                    <td key={`${row.label}-${index}`} className="px-2 py-2 text-right font-mono">{value}</td>
                  ))}
                  <td className="px-2 py-2 text-right font-mono font-bold">{row.values.reduce((sum, value) => sum + value, 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <div className="bg-white border border-[#eaecf0] rounded-soft p-3">
          <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Auditorías registradas</p>
          <p className="text-2xl font-bold text-[#00502c] mt-1">{indicators.auditEvents}</p>
        </div>
        <div className="bg-white border border-[#eaecf0] rounded-soft p-3">
          <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Acciones / hallazgos</p>
          <p className="text-2xl font-bold text-[#191c1d] mt-1">{indicators.openActions}</p>
        </div>
        <div className="bg-white border border-[#eaecf0] rounded-soft p-3">
          <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Cerradas</p>
          <p className="text-2xl font-bold text-[#006b3d] mt-1">{indicators.closedActions}</p>
        </div>
        <div className={`rounded-soft p-3 border ${closureMet ? 'bg-emerald-50 border-emerald-300' : 'bg-red-50 border-red-300'}`}>
          <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">% cierre global</p>
          <p className={`text-2xl font-bold mt-1 ${closureMet ? 'text-[#006b3d]' : 'text-[#ba1a1a]'}`}>{indicators.closureRate.toFixed(1)}%</p>
        </div>
        <div className={`rounded-soft p-3 border ${scoreMet ? 'bg-emerald-50 border-emerald-300' : 'bg-amber-50 border-amber-300'}`}>
          <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Puntaje prom. externas</p>
          <p className={`text-2xl font-bold mt-1 ${scoreMet ? 'text-[#006b3d]' : 'text-amber-800'}`}>{formatAuditoriaScore(indicators.avgExternalScore)}</p>
        </div>
        <div className="bg-white border border-[#eaecf0] rounded-soft p-3">
          <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Procesos / entidades</p>
          <p className="text-2xl font-bold text-[#191c1d] mt-1">{indicators.auditedProcesses} / {indicators.auditedEntities}</p>
        </div>
      </div>

      {subIndicator === '1' && (
        <div className="space-y-4">
          <div className="bg-[#f8f9fa] border border-[#eaecf0] rounded-soft p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-3">Tendencia mensual {trendYear}</p>
            <div className="bg-white border border-[#eaecf0] rounded-soft p-3">
              <div className="overflow-x-auto overflow-y-visible py-2">
                <div className="flex gap-3 justify-between min-w-max px-1">
                  {monthlyTrend.map((month) => {
                    const maxValue = Math.max(
                      ...monthlyTrend.map((item) => Math.max(item.internaClosed, item.externaClosed)),
                      1
                    );
                    return (
                      <div key={month.label} className="min-w-[90px] flex flex-col items-center">
                        {renderSgiGroupedVerticalBars(
                          [
                            {
                              value: month.internaClosed,
                              color: '#006b3d',
                              title: `Internas cerradas: ${month.internaClosed}`
                            },
                            {
                              value: month.externaClosed,
                              color: '#ffd000',
                              title: `Externas cerradas: ${month.externaClosed}`
                            }
                          ],
                          maxValue,
                          { barWidthClass: 'w-[22px]', columnWidthClass: 'w-[28px]' }
                        )}
                        <div className="text-[11px] uppercase font-semibold text-gray-600 mt-2">{month.label}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="bg-[#f8f9fa] border border-[#eaecf0] rounded-soft p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-3">Detalle auditoría interna</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-gray-500">
                      <th className="py-1 pr-2">Fecha</th>
                      <th className="py-1 pr-2">Proceso</th>
                      <th className="py-1 pr-2">Acción</th>
                      <th className="py-1 text-right">Ab.</th>
                      <th className="py-1 text-right">Ce.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#eef1f5]">
                    {internaRecords.slice(0, 12).map((row) => (
                      <tr key={row.id}>
                        <td className="py-1.5 pr-2 whitespace-nowrap">{row.eventDateLabel}</td>
                        <td className="py-1.5 pr-2">{row.process}</td>
                        <td className="py-1.5 pr-2">{row.actionType}</td>
                        <td className="py-1.5 text-right font-mono">{row.openActions}</td>
                        <td className="py-1.5 text-right font-mono">{row.closedActions}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="bg-[#f8f9fa] border border-[#eaecf0] rounded-soft p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-3">Detalle auditoría externa</p>
              <div className="space-y-2">
                {externaRecords.slice(0, 12).map((row) => {
                  const styles = getAuditoriaScoreStyles(row.score);
                  return (
                    <div key={row.id} className="bg-white border border-[#eaecf0] rounded-soft p-2.5 text-xs flex items-center justify-between gap-2">
                      <div>
                        <div className="font-semibold text-[#191c1d]">{row.entity}</div>
                        <div className="text-gray-500 mt-0.5">{row.eventDateLabel} · {row.closedFindings}/{row.totalFindings} cerrados</div>
                      </div>
                      <span className={`px-2 py-1 rounded-soft border text-[10px] font-bold ${styles.className}`}>{formatAuditoriaScore(row.score)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {subIndicator === '2' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="bg-[#f8f9fa] border border-[#eaecf0] rounded-soft p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-3">Por proceso (interna)</p>
            <div className="space-y-2">
              {processStats.slice(0, 8).map((row) => (
                <div key={row.label} className="bg-white border border-[#eaecf0] rounded-soft p-2.5 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold">{row.label}</span>
                    <span className="font-mono">{row.closedTotal}/{row.total}</span>
                  </div>
                  <div className="h-2 mt-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-[#006b3d]" style={{ width: `${row.total ? (row.closedTotal / row.total) * 100 : 0}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-[#f8f9fa] border border-[#eaecf0] rounded-soft p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-3">Por entidad (externa)</p>
            <div className="flex gap-3 overflow-x-auto py-2">
              {entityStats.map((row) => {
                const maxValue = Math.max(...entityStats.map((item) => item.total), 1);
                return (
                  <div key={row.label} className="min-w-[92px] flex flex-col items-center">
                    {renderSgiVerticalBar(String(row.total), getScaledBarHeight(row.total, maxValue), '#006b3d')}
                    <div className="mt-2 text-[10px] text-center text-gray-700 leading-tight">{row.label}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {subIndicator === '3' && (
        <div className="space-y-4">
          <div className="bg-[#f8f9fa] border border-[#eaecf0] rounded-soft p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Consolidado y seguimiento</p>
              <span className="text-[10px] text-gray-500">Cumplimiento interno = % cierre acciones · Externo = puntaje auditoría</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-white border border-[#eaecf0] rounded-soft p-3 text-xs">
                <div className="font-semibold text-[#191c1d]">Auditorías internas realizadas</div>
                <div className="text-2xl font-bold text-[#00502c] mt-1">{internaRecords.length}</div>
                <p className="text-[10px] text-gray-500 mt-1">{auditCountReferenceLabel}</p>
              </div>
              <div className="bg-white border border-[#eaecf0] rounded-soft p-3 text-xs">
                <div className="font-semibold text-[#191c1d]">Auditorías externas recibidas</div>
                <div className="text-2xl font-bold text-[#00502c] mt-1">{externaRecords.length}</div>
                <p className="text-[10px] text-gray-500 mt-1">{auditCountReferenceLabel}</p>
              </div>
              <div className="bg-white border border-[#eaecf0] rounded-soft p-3 text-xs">
                <div className="font-semibold text-[#191c1d]">Entidades auditadas</div>
                <div className="text-2xl font-bold text-[#00502c] mt-1">{indicators.auditedEntities}</div>
              </div>
            </div>
          </div>

          {yearlyComplianceTrend.length > 0 && (
            <div className="bg-gradient-to-br from-[#f0f7f3] via-white to-[#fffbea] border border-[#cfe3d6] rounded-soft p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                <div>
                  <p className="text-sm font-bold text-[#00502c]">Tendencia año a año del cumplimiento</p>
                  <p className="text-[11px] text-gray-600 mt-1">
                    Comparación histórica del cumplimiento global, interno y externo por año calendario.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3 text-[10px]">
                  <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-[#00502c]" /> Global</span>
                  <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-[#006b3d]" /> Interna</span>
                  <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-[#ffd000]" /> Externa</span>
                  <span className="inline-flex items-center gap-1"><span className="w-8 h-0.5 border-t-2 border-dashed border-[#ba1a1a]" /> Meta 95%</span>
                </div>
              </div>
              <div className="bg-white/90 border border-[#eaecf0] rounded-soft p-4">
                <div className="overflow-x-auto overflow-y-visible py-2">
                  <div className="flex gap-4 justify-between min-w-max px-1">
                    {yearlyComplianceTrend.map((point) => {
                      const globalStyles = getAuditoriaComplianceStyles(point.globalCompliance);
                      return (
                        <div key={`year-trend-${point.year}`} className="min-w-[108px] flex flex-col items-center">
                          <div className="text-[11px] font-bold text-[#00502c] mb-1">{point.globalCompliance.toFixed(1)}%</div>
                          <div className="relative h-44 w-full flex items-end justify-center">
                            <div
                              className="absolute left-0 right-0 border-t-2 border-dashed border-[#ba1a1a]/70 pointer-events-none"
                              style={{ bottom: '95%' }}
                              title="Meta 95%"
                            />
                            {renderSgiGroupedVerticalBars(
                              [
                                {
                                  value: point.globalCompliance,
                                  color: '#00502c',
                                  title: `Cumplimiento global ${point.year}: ${point.globalCompliance.toFixed(1)}%`
                                },
                                {
                                  value: point.internaEvents > 0 ? point.internaCompliance : 0,
                                  color: '#006b3d',
                                  title: `Interna ${point.year}: ${point.internaCompliance.toFixed(1)}% (${point.internaEvents} reg.)`
                                },
                                {
                                  value: point.externaEvents > 0 ? point.externaCompliance : 0,
                                  color: '#ffd000',
                                  title: `Externa ${point.year}: ${point.externaCompliance.toFixed(1)}% (${point.externaEvents} reg.)`
                                }
                              ],
                              100,
                              {
                                barWidthClass: 'w-[20px]',
                                columnWidthClass: 'w-[24px]',
                                barAreaHeightClass: 'h-40',
                                valueFormatter: (value) => (value > 0 ? `${value.toFixed(0)}%` : '—')
                              }
                            )}
                          </div>
                          <div className={`mt-2 px-2 py-1 rounded-soft border text-[11px] font-bold ${globalStyles.bg} ${globalStyles.border} ${globalStyles.text}`}>
                            {point.year}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {complianceByAudit.length > 0 && trendYears.length > 0 && (
            <div className="bg-[#f8f9fa] border border-[#eaecf0] rounded-soft p-4">
              <p className="text-sm font-bold text-[#00502c] mb-1">Cumplimiento por auditoría · comparación año a año</p>
              <p className="text-[11px] text-gray-600 mb-4">
                Cada fila muestra la evolución del cumplimiento de una auditoría (proceso interno o entidad externa).
              </p>
              <div className="space-y-3">
                {complianceByAudit.slice(0, 10).map((audit) => {
                  const trendUp = audit.trendDelta > 0.5;
                  const trendDown = audit.trendDelta < -0.5;
                  return (
                    <div key={`${audit.auditKind}-${audit.label}`} className="bg-white border border-[#eaecf0] rounded-soft p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                        <div>
                          <div className="text-xs font-bold text-[#191c1d]">{audit.label}</div>
                          <div className="text-[10px] text-gray-500 mt-0.5">
                            {audit.auditKind} · Promedio histórico {audit.avgCompliance.toFixed(1)}%
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-full text-[10px] font-bold border ${getAuditoriaComplianceStyles(audit.latestCompliance).bg} ${getAuditoriaComplianceStyles(audit.latestCompliance).border} ${getAuditoriaComplianceStyles(audit.latestCompliance).text}`}>
                            Último año {audit.latestYear}: {audit.latestCompliance.toFixed(1)}%
                          </span>
                          <span className={`text-[10px] font-bold ${trendUp ? 'text-emerald-700' : trendDown ? 'text-red-700' : 'text-gray-500'}`}>
                            {trendUp ? '▲' : trendDown ? '▼' : '■'} {audit.trendDelta >= 0 ? '+' : ''}{audit.trendDelta.toFixed(1)} pts
                          </span>
                        </div>
                      </div>
                      <div className="overflow-x-auto">
                        <div className="flex gap-2 min-w-max items-end">
                          {trendYears.map((year, yearIndex) => {
                            const yearPoint = audit.years.find((item) => item.year === year);
                            const compliance = yearPoint?.compliance ?? 0;
                            const hasData = Boolean(yearPoint);
                            const barColor = hasData ? getAuditoriaComplianceColor(compliance) : '#d6dce5';
                            return (
                              <div key={`${audit.label}-${year}`} className="min-w-[56px] flex flex-col items-center">
                                <div className="text-[10px] font-mono font-semibold mb-1" style={{ color: barColor }}>
                                  {hasData ? `${compliance.toFixed(0)}%` : '—'}
                                </div>
                                <div className="h-24 w-full flex items-end justify-center">
                                  <div
                                    className="w-10 rounded-t-md transition-all"
                                    style={{
                                      height: hasData ? `${Math.max(compliance, 8)}%` : '4px',
                                      backgroundColor: barColor,
                                      opacity: hasData ? 1 : 0.35
                                    }}
                                    title={hasData ? `${audit.label} ${year}: ${compliance.toFixed(1)}%` : `${year}: sin registro`}
                                  />
                                </div>
                                <div
                                  className="mt-1 text-[10px] font-semibold"
                                  style={{ color: yearBarPalette[yearIndex % yearBarPalette.length] }}
                                >
                                  {year}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {compliancePareto.length > 0 ? (
            <div className="bg-white border border-[#eaecf0] rounded-soft p-4 shadow-sm">
              <p className="text-sm font-bold text-[#00502c] mb-1">Pareto de brechas de cumplimiento</p>
              <p className="text-[11px] text-gray-600 mb-4">
                Auditorías con mayor distancia a la meta del 100% en {paretoReferenceLabel}. La línea muestra el acumulado.
              </p>
              <div className="overflow-x-auto">
                <div className="min-w-[720px] relative pt-8 pb-2">
                  <div className="flex items-end gap-3 h-52 border-b border-[#d6dce5] px-2">
                    {compliancePareto.slice(0, 8).map((row) => {
                      const maxGap = Math.max(...compliancePareto.map((item) => item.gapPercent), 1);
                      const barHeight = Math.max((row.gapPercent / maxGap) * 100, 10);
                      return (
                        <div key={`pareto-${row.auditKind}-${row.label}`} className="flex-1 min-w-[72px] flex flex-col items-center">
                          <div className="text-[10px] font-mono font-bold text-[#ba1a1a] mb-1">{row.gapPercent.toFixed(1)}%</div>
                          <div className="h-40 w-full flex items-end justify-center">
                            <div
                              className="w-full max-w-[56px] rounded-t-lg bg-gradient-to-t from-[#ba1a1a] to-[#f97066] shadow-sm"
                              style={{ height: `${barHeight}%` }}
                              title={`${row.label}: brecha ${row.gapPercent.toFixed(1)}% (cumplimiento ${row.compliance.toFixed(1)}%)`}
                            />
                          </div>
                          <div className="mt-2 text-[10px] text-center leading-tight text-gray-700 font-semibold min-h-[2.5rem]">
                            {row.label}
                          </div>
                          <div className="text-[9px] text-gray-500">{row.auditKind}</div>
                        </div>
                      );
                    })}
                  </div>
                  <svg className="absolute inset-x-2 top-8 h-52 pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <polyline
                      fill="none"
                      stroke="#00502c"
                      strokeWidth="1.5"
                      strokeDasharray="4 3"
                      vectorEffect="non-scaling-stroke"
                      points={compliancePareto.slice(0, 8).map((row, index, list) => {
                        const x = list.length <= 1 ? 50 : (index / (list.length - 1)) * 100;
                        const y = 100 - row.cumulativePercent;
                        return `${x},${y}`;
                      }).join(' ')}
                    />
                  </svg>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
                    {compliancePareto.slice(0, 4).map((row) => (
                      <div key={`pareto-card-${row.label}`} className="bg-[#fff4f3] border border-red-200 rounded-soft p-2 text-[10px]">
                        <div className="font-semibold text-[#191c1d] truncate">{row.label}</div>
                        <div className="text-red-700 font-mono mt-1">Brecha {row.gapPercent.toFixed(1)}%</div>
                        <div className="text-gray-500">Acumulado {row.cumulativePercent.toFixed(0)}%</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-[#eaecf0] rounded-soft p-4 text-xs text-gray-600">
              <p className="text-sm font-bold text-[#00502c] mb-1">Pareto de brechas de cumplimiento</p>
              <p className="mt-1">
                No hay brechas de cumplimiento registradas para {paretoReferenceLabel}.
              </p>
            </div>
          )}
        </div>
      )}
    </>
  );
}
