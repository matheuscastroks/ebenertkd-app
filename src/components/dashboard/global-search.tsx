"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { SearchIcon, XIcon } from "@/components/ui/icons";
import { Spinner } from "@/components/ui/spinner";
import { useSidebar } from "@/components/ui/sidebar";
import type { AppCapability } from "@/lib/auth/auth-utils";
import { NAV_ICONS } from "@/lib/navigation/nav-icons";
import type { SidebarNavItem } from "@/lib/navigation/routes";
import { getSearchScreensForProfile } from "@/lib/search/screen-catalog";
import { searchScreenCatalog } from "@/lib/search/semantic-engine";
import type { RemoteSearchResponse, SearchItemKind, SearchResultItem } from "@/lib/search/types";
import { cn } from "@/lib/utils";

const GROUP_ORDER: SearchItemKind[] = ["screen", "student", "dependent", "class", "event"];

const GROUP_LABELS: Record<SearchItemKind, string> = {
  screen: "Telas",
  student: "Alunos",
  dependent: "Dependentes",
  class: "Turmas",
  event: "Eventos",
};

const emptySubscribe = () => () => {};

function useIsApplePlatform() {
  return useSyncExternalStore(
    emptySubscribe,
    () =>
      typeof navigator !== "undefined" &&
      /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent),
    () => false
  );
}

function GlobalSearchPanel({
  role,
  capabilities,
  navItems,
  onClose,
}: {
  role?: string;
  capabilities?: AppCapability[];
  navItems: SidebarNavItem[];
  onClose: () => void;
}) {
  const router = useRouter();
  const { isMobile, setOpenMobile } = useSidebar();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [remoteState, setRemoteState] = useState<{ query: string; items: SearchResultItem[] }>({
    query: "",
    items: [],
  });
  const [loadingQuery, setLoadingQuery] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();
  const optionPrefixId = useId();

  const screenCatalog = useMemo(
    () => getSearchScreensForProfile({ role, capabilities }, navItems),
    [role, capabilities, navItems]
  );

  const localResults = useMemo(
    () => searchScreenCatalog(screenCatalog, query, 8),
    [screenCatalog, query]
  );

  const trimmedQuery = query.trim();

  useEffect(() => {
    if (trimmedQuery.length < 2) return;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoadingQuery(trimmedQuery);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(trimmedQuery)}`, {
          signal: controller.signal,
        });
        if (!response.ok) return;
        const data = (await response.json()) as RemoteSearchResponse;
        if (!controller.signal.aborted && Array.isArray(data.items)) {
          setRemoteState({ query: trimmedQuery, items: data.items });
        }
      } catch {
        // Falha de rede ou cancelamento: preserva os resultados locais instantâneos.
      } finally {
        if (!controller.signal.aborted) {
          setLoadingQuery((current) => (current === trimmedQuery ? null : current));
        }
      }
    }, 220);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [trimmedQuery]);

  const remoteResults = useMemo(
    () => (trimmedQuery.length >= 2 && remoteState.query === trimmedQuery ? remoteState.items : []),
    [trimmedQuery, remoteState]
  );

  const isLoadingRemote = trimmedQuery.length >= 2 && loadingQuery === trimmedQuery;

  const groupedResults = useMemo(() => {
    const allItems = [...localResults, ...remoteResults];
    return GROUP_ORDER.map((kind) => ({
      kind,
      label: GROUP_LABELS[kind],
      items: allItems.filter((item) => item.kind === kind),
    })).filter((group) => group.items.length > 0);
  }, [localResults, remoteResults]);

  const flatResults = useMemo(
    () => groupedResults.flatMap((group) => group.items),
    [groupedResults]
  );

  const indexByKey = useMemo(
    () => new Map(flatResults.map((item, index) => [`${item.kind}-${item.id}`, index])),
    [flatResults]
  );

  const safeActiveIndex =
    flatResults.length === 0 ? -1 : Math.min(Math.max(activeIndex, 0), flatResults.length - 1);
  const activeItem = safeActiveIndex >= 0 ? flatResults[safeActiveIndex] : undefined;

  const navigateTo = (item: SearchResultItem) => {
    onClose();
    if (isMobile) {
      setOpenMobile(false);
    }
    router.push(item.href);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (flatResults.length === 0) return;
      setActiveIndex((prev) => (prev + 1) % flatResults.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (flatResults.length === 0) return;
      setActiveIndex((prev) => (prev - 1 + flatResults.length) % flatResults.length);
      return;
    }

    if (event.key === "Enter" && activeItem) {
      event.preventDefault();
      navigateTo(activeItem);
    }
  };

  const placeholder =
    role === "admin"
      ? "Buscar tela, aluno, turma ou evento..."
      : role === "guardian"
        ? "Buscar tela, dependente ou evento..."
        : "Buscar tela ou assunto...";

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 border-b border-border px-3.5 py-2.5">
        <SearchIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <input
          ref={inputRef}
          autoFocus
          type="text"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveIndex(0);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label="Buscar no aplicativo"
          role="combobox"
          aria-expanded={true}
          aria-controls={listboxId}
          aria-activedescendant={activeItem ? `${optionPrefixId}-${activeItem.id}` : undefined}
          aria-autocomplete="list"
          className="min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
        {isLoadingRemote ? (
          <Spinner className="size-4 shrink-0 animate-spin text-muted-foreground" aria-label="Buscando registros" />
        ) : null}
        {query ? (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setActiveIndex(0);
              inputRef.current?.focus();
            }}
            aria-label="Limpar busca"
            className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <XIcon className="size-3.5" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <div
        id={listboxId}
        role="listbox"
        aria-label="Resultados da busca"
        className="h-80 overflow-y-auto p-2"
      >
        {flatResults.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-1 px-3 text-center text-sm text-muted-foreground">
            {isLoadingRemote ? (
              <span>Buscando…</span>
            ) : (
              <>
                <span className="font-medium text-foreground">
                  Nenhum resultado para &ldquo;{trimmedQuery}&rdquo;.
                </span>
                <span className="text-xs">Tente outro nome ou palavra parecida.</span>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {groupedResults.map((group) => (
              <div key={group.kind} role="group" aria-label={group.label} className="space-y-0.5">
                <p className="px-2 py-1 text-xs font-medium text-muted-foreground">
                  {group.label}
                </p>
                {group.items.map((item) => {
                  const itemIndex = indexByKey.get(`${item.kind}-${item.id}`) ?? 0;
                  const isActive = itemIndex === safeActiveIndex;
                  const Icon = NAV_ICONS[item.icon ?? "dashboard"];
                  return (
                    <button
                      key={`${item.kind}-${item.id}`}
                      id={`${optionPrefixId}-${item.id}`}
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      onMouseEnter={() => setActiveIndex(itemIndex)}
                      onClick={() => navigateTo(item)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                        isActive
                          ? "bg-accent text-accent-foreground"
                          : "text-foreground hover:bg-accent/60"
                      )}
                    >
                      <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{item.title}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {item.subtitle}
                        </span>
                      </span>
                      {item.badge ? (
                        <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                          {item.badge}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="hidden items-center justify-between border-t border-border bg-muted/40 px-3.5 py-2 text-xs text-muted-foreground sm:flex">
        <span>↑↓ navegar · ↵ abrir · Esc fechar</span>
      </div>
    </div>
  );
}

export function GlobalSearch({
  role,
  capabilities,
  navItems,
}: {
  role?: string;
  capabilities?: AppCapability[];
  navItems: SidebarNavItem[];
}) {
  const [open, setOpen] = useState(false);
  const isApple = useIsApplePlatform();
  const shortcutLabel = isApple ? "⌘K" : "Ctrl K";

  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir busca rápida"
        className="flex w-full items-center gap-2 rounded-lg md:rounded-xl bg-surface-recessed/70 px-2.5 py-1.5 md:h-11 md:px-3.5 md:py-2.5 md:gap-3 text-sm text-muted-foreground shadow-inset-well [box-shadow:var(--shadow-inset-well)] border-0 transition-colors hover:bg-surface-recessed hover:text-sidebar-foreground group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2"
      >
        <SearchIcon className="size-4 shrink-0 md:size-5" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate text-left md:text-sm md:font-medium group-data-[collapsible=icon]:hidden">
          Buscar...
        </span>
        <kbd className="hidden rounded bg-background/80 px-1.5 py-0.5 font-sans text-xs font-medium text-muted-foreground sm:inline-block group-data-[collapsible=icon]:hidden shadow-s">
          {shortcutLabel}
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={false}
          className="top-[12vh] translate-y-0 gap-0 overflow-hidden border-0 p-0 sm:top-[14vh] sm:max-w-xl"
        >
          <DialogTitle className="sr-only">Busca rápida</DialogTitle>
          <DialogDescription className="sr-only">
            Pesquise telas, alunos, turmas e eventos da academia.
          </DialogDescription>
          {open ? (
            <GlobalSearchPanel
              role={role}
              capabilities={capabilities}
              navItems={navItems}
              onClose={() => setOpen(false)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
