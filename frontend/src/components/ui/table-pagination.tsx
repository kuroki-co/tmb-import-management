import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./button";

export function TablePagination({
  page,
  pageSize,
  totalItems,
  onPageChange,
  label,
}: {
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  label: string;
}) {
  const totalPages = Math.ceil(totalItems / pageSize);
  if (totalPages <= 1) return null;

  const firstItem = (page - 1) * pageSize + 1;
  const lastItem = Math.min(page * pageSize, totalItems);

  return (
    <nav
      aria-label={`Paginación de ${label}`}
      className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3"
    >
      <p className="text-xs text-muted" aria-live="polite">
        Mostrando <span className="font-medium text-foreground">{firstItem}–{lastItem}</span> de {totalItems}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          className="min-h-10 px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-50"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft size={15} aria-hidden />
          Anterior
        </Button>
        <span className="min-w-20 text-center text-xs tabular-nums text-muted">
          Página {page} de {totalPages}
        </span>
        <Button
          variant="secondary"
          className="min-h-10 px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-50"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Siguiente
          <ChevronRight size={15} aria-hidden />
        </Button>
      </div>
    </nav>
  );
}
