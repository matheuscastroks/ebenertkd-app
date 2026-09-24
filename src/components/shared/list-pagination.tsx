import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

type QueryParams = Record<string, string | undefined>;

export function buildPageHref(basePath: string, params: QueryParams, page: number) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value) query.set(key, value);
  if (page > 1) query.set("page", String(page));
  else query.delete("page");
  const suffix = query.toString();
  return suffix ? `${basePath}?${suffix}` : basePath;
}

export function ListPagination({ basePath, params, page, total, pageSize }: {
  basePath: string;
  params: QueryParams;
  page: number;
  total: number;
  pageSize: number;
}) {
  if (total === 0) return null;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, total);

  return (
    <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
      <p className="text-sm text-muted-foreground">Exibindo {start}–{end} de {total}</p>
      <Pagination className="mx-0 w-auto">
        <PaginationContent>
          {currentPage > 1 ? <PaginationItem><PaginationPrevious href={buildPageHref(basePath, params, currentPage - 1)} text="Anterior" /></PaginationItem> : null}
          <PaginationItem><PaginationLink href={buildPageHref(basePath, params, currentPage)} isActive aria-label={`Página ${currentPage} de ${totalPages}`}>{currentPage}</PaginationLink></PaginationItem>
          {currentPage < totalPages ? <PaginationItem><PaginationNext href={buildPageHref(basePath, params, currentPage + 1)} text="Próxima" /></PaginationItem> : null}
        </PaginationContent>
      </Pagination>
    </div>
  );
}
