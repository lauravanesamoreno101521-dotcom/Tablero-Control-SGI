// Componente reutilizable de paginación para las tablas de "Ingreso base de datos" del
// tablero SGI (Primero / Anterior / números de página / Siguiente / Último), usado en todos
// los módulos para poder navegar la base de datos completa cuando no hay filtro de mes.
import React from 'react';

export const SGI_PAGE_SIZE = 250;

type SgiPaginationProps = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  startIndex: number;
  endIndex: number;
  total: number;
  itemLabel?: string;
};

const buildPageRange = (page: number, totalPages: number): (number | 'ellipsis')[] => {
  const delta = 1;
  const left = Math.max(2, page - delta);
  const right = Math.min(totalPages - 1, page + delta);
  const pages: (number | 'ellipsis')[] = [1];
  if (left > 2) pages.push('ellipsis');
  for (let i = left; i <= right; i += 1) pages.push(i);
  if (right < totalPages - 1) pages.push('ellipsis');
  if (totalPages > 1) pages.push(totalPages);
  return pages;
};

export const SgiPagination: React.FC<SgiPaginationProps> = ({
  page,
  totalPages,
  onPageChange,
  startIndex,
  endIndex,
  total,
  itemLabel = 'registros'
}) => {
  if (total === 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-t border-[#eaecf0]">
      <p className="text-[11px] text-gray-500">
        Mostrando {startIndex}–{endIndex} de {total} {itemLabel}
      </p>
      {totalPages > 1 && (
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => onPageChange(1)}
            disabled={page === 1}
            className="px-2 py-1 rounded-soft text-[11px] font-semibold border border-[#d6dce5] bg-white text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Primero
          </button>
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-2 py-1 rounded-soft text-[11px] font-semibold border border-[#d6dce5] bg-white text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Anterior
          </button>
          {buildPageRange(page, totalPages).map((p, index) =>
            p === 'ellipsis' ? (
              <span key={`sgi-page-ellipsis-${index}`} className="px-1.5 text-[11px] text-gray-400">
                …
              </span>
            ) : (
              <button
                key={`sgi-page-${p}`}
                type="button"
                onClick={() => onPageChange(p)}
                className={`px-2.5 py-1 rounded-soft text-[11px] font-semibold border transition-colors ${
                  p === page
                    ? 'border-[#00502c] bg-[#00502c] text-white'
                    : 'border-[#d6dce5] bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {p}
              </button>
            )
          )}
          <button
            type="button"
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="px-2 py-1 rounded-soft text-[11px] font-semibold border border-[#d6dce5] bg-white text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Siguiente
          </button>
          <button
            type="button"
            onClick={() => onPageChange(totalPages)}
            disabled={page === totalPages}
            className="px-2 py-1 rounded-soft text-[11px] font-semibold border border-[#d6dce5] bg-white text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Último
          </button>
        </div>
      )}
    </div>
  );
};
