"use client";

import type { HeatmapDayCell } from "@/features/students/achievements-rules";
import { formatBusinessDateBr } from "@/lib/dates";

const DAY_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"] as const;

export function ConsistencyHeatmap({
  weeks,
}: {
  weeks: HeatmapDayCell[][];
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>Mapa de presença das últimas 20 semanas</span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="size-3 rounded-xs bg-muted" aria-hidden="true" />
            Sem treino
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-3 rounded-xs bg-warning" aria-hidden="true" />
            Abonada
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-3 rounded-xs bg-success" aria-hidden="true" />
            Presença
          </span>
        </div>
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="inline-flex items-start gap-2">
          <div className="grid grid-rows-7 gap-1 pt-0.5 text-xs text-muted-foreground">
            {DAY_LABELS.map((label, idx) => (
              <span
                key={label}
                className={idx % 2 === 0 ? "flex h-3.5 items-center leading-none" : "h-3.5 opacity-0"}
              >
                {label}
              </span>
            ))}
          </div>

          <div className="flex gap-1" role="grid" aria-label="Mapa de constância de treinos">
            {weeks.map((week, wIdx) => (
              <div key={week[0]?.date ?? wIdx} className="grid grid-rows-7 gap-1" role="row">
                {week.map((cell) => {
                  const statusText =
                    cell.status === "present"
                      ? "Presença registrada"
                      : cell.status === "excused"
                        ? "Ausência justificada"
                        : "Sem aula registrada";
                  return (
                    <span
                      key={cell.date}
                      role="gridcell"
                      title={`${formatBusinessDateBr(cell.date)} · ${statusText}`}
                      aria-label={`${formatBusinessDateBr(cell.date)}: ${statusText}`}
                      className={
                        cell.status === "present"
                          ? "size-3.5 rounded-xs bg-success"
                          : cell.status === "excused"
                            ? "size-3.5 rounded-xs bg-warning"
                            : "size-3.5 rounded-xs bg-muted"
                      }
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
