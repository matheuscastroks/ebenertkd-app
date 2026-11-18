"use client";

import { CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildIcsContent } from "@/features/classes/student-calendar-rules";

export function IcsDownloadButton({
  uid,
  title,
  date,
  startTime,
  endTime,
  location,
  description,
  fileName,
  label = "Adicionar à agenda",
}: {
  uid: string;
  title: string;
  date: string;
  startTime?: string;
  endTime?: string;
  location?: string | null;
  description?: string;
  fileName: string;
  label?: string;
}) {
  const handleDownload = () => {
    const content = buildIcsContent({
      uid,
      title,
      date,
      startTime,
      endTime,
      location,
      description,
    });
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
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="min-h-10"
      onClick={handleDownload}
    >
      <CalendarPlus className="size-3.5" aria-hidden="true" />
      {label}
    </Button>
  );
}
