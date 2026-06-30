import { useRef } from 'react';

type DemoExcelUploadButtonProps = {
  onFileSelected: (file: File) => void | Promise<void>;
  loading?: boolean;
};

export function DemoExcelUploadButton({ onFileSelected, loading = false }: DemoExcelUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.xlsm"
        className="hidden"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          if (file) await onFileSelected(file);
          event.target.value = '';
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={loading}
        className="px-3 py-1.5 rounded-soft text-xs font-semibold border border-[#e6c200] bg-[#ffd000] text-[#191c1d] hover:bg-[#f5c400] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? 'Cargando...' : 'Cargar excel'}
      </button>
    </>
  );
}
