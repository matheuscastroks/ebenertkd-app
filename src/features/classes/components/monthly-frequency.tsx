"use client";

import { AttendanceEvolutionAreaChart, StudentAttendanceChart, type AttendanceEvolutionPoint } from "./attendance-chart";

export type MonthlyFrequencyData = {
  attended: number;
  total: number;
  rate: number;
  absent: number;
  excused: number;
  points: AttendanceEvolutionPoint[];
};

export function MonthlyFrequency({ data, scheduled }: { data: MonthlyFrequencyData; scheduled: number }) {
  return (
    <section id="frequencia" className="space-y-3" aria-labelledby="monthly-frequency-heading">
      <h2 id="monthly-frequency-heading" className="text-base font-semibold">Frequência do mês</h2>
      {data.total ? (
        <>
          <p className="text-sm text-muted-foreground"><span className="font-medium text-foreground tabular-nums">{data.attended} de {data.total} chamadas</span> com presença · {data.rate}%</p>
          <details className="text-sm">
            <summary className="min-h-11 cursor-pointer py-3 font-medium focus-visible:outline-2 focus-visible:outline-ring">Ver análise de frequência</summary>
            <div className="grid gap-6 pt-3 xl:grid-cols-2">
              {data.points.length >= 2 ? <div className="min-w-0 space-y-3"><h3 className="font-medium">Evolução nas chamadas</h3><AttendanceEvolutionAreaChart points={data.points} /></div> : null}
              <div className="min-w-0 space-y-3"><h3 className="font-medium">Presenças, faltas e treinos previstos</h3><StudentAttendanceChart present={data.attended} absent={data.absent} excused={data.excused} scheduled={scheduled} rate={data.rate} /></div>
            </div>
          </details>
        </>
      ) : <p className="text-sm leading-relaxed text-muted-foreground">Ainda não há chamadas registradas neste mês. A frequência aparece quando o professor registrar a aula.</p>}
    </section>
  );
}
