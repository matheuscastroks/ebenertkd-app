"use client";

import { Calendar, CalendarPlus, ChevronDown, ExternalLink } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  buildGoogleCalendarUrl,
  buildIcsContent,
  buildOutlookCalendarUrl,
  type CalendarEventInput,
} from "@/features/classes/student-calendar-rules";

export type AddToCalendarButtonProps = CalendarEventInput & {
  fileName: string;
  label?: string;
  variant?: "outline" | "default" | "secondary";
  align?: "start" | "end";
};

export function AddToCalendarButton({
  uid,
  title,
  date,
  startTime,
  endTime,
  location,
  description,
  recurrenceWeekdays,
  fileName,
  label = "Adicionar à agenda",
  variant = "outline",
  align = "end",
}: AddToCalendarButtonProps) {
  const event: CalendarEventInput = {
    uid,
    title,
    date,
    startTime,
    endTime,
    location,
    description,
    recurrenceWeekdays,
  };

  const googleUrl = buildGoogleCalendarUrl(event);
  const outlookUrl = buildOutlookCalendarUrl(event);

  const handleDownloadIcs = () => {
    const content = buildIcsContent(event);
    const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${fileName}.ics`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant={variant} size="sm" className="min-h-10 gap-1.5">
          <CalendarPlus className="size-3.5" aria-hidden="true" />
          <span>{label}</span>
          <ChevronDown className="size-3.5 opacity-60" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-56">
        <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
          Escolha sua agenda
        </DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <a
            href={googleUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between gap-2"
          >
            <span className="inline-flex items-center gap-2">
              <Calendar className="size-4 text-muted-foreground" aria-hidden="true" />
              Google Agenda
            </span>
            <ExternalLink className="size-3.5 text-muted-foreground" aria-hidden="true" />
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a
            href={outlookUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between gap-2"
          >
            <span className="inline-flex items-center gap-2">
              <Calendar className="size-4 text-muted-foreground" aria-hidden="true" />
              Outlook
            </span>
            <ExternalLink className="size-3.5 text-muted-foreground" aria-hidden="true" />
          </a>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={handleDownloadIcs}>
          <CalendarPlus className="size-4 text-muted-foreground" aria-hidden="true" />
          Apple Calendar / Outro (.ics)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
