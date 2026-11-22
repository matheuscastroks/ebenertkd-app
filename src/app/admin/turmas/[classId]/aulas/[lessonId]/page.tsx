import { cache, Suspense } from "react";
import { notFound } from "next/navigation";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { InlineRowsSkeleton, InlineValueSkeleton } from "@/components/skeletons";
import { AttendanceSheet } from "@/features/classes/components/attendance-sheet";
import { attendanceSourceNote } from "@/features/classes/check-in-labels";
import { getAttendanceSheet } from "@/features/classes/attendance-service";
import { getTrainingClass } from "@/features/classes/service";
import { requireProfile } from "@/lib/auth/session";
import { adminClassPath } from "@/lib/navigation/routes";

const loadClass = cache((classId: string) => getTrainingClass(classId));
const loadSheet = cache((lessonId: string) => getAttendanceSheet(lessonId));

async function LessonTitle({ classId }: { classId: string }) {
  const trainingClass = await loadClass(classId);
  return <>Chamada · {trainingClass.name}</>;
}

async function LessonSubtitle({ lessonId }: { lessonId: string }) {
  const sheet = await loadSheet(lessonId);
  const date = new Date(sheet.lesson.lesson_date).toLocaleDateString("pt-BR", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return <>{date} · {sheet.lesson.start_time} às {sheet.lesson.end_time}</>;
}

async function LessonAttendanceBody({
  classId,
  lessonId,
  notice,
}: {
  classId: string;
  lessonId: string;
  notice?: "saved" | "reason" | "error";
}) {
  const sheet = await loadSheet(lessonId);
  if (sheet.lesson.training_class_id !== classId) notFound();

  return (
    <div className="w-full min-w-0 space-y-4">
      <AttendanceSheet
        classId={classId}
        lessonId={lessonId}
        lessonCompleted={sheet.lesson.status === "completed"}
        notice={notice}
        rows={sheet.rows.map((row) => ({
          classEnrollmentId: row.classEnrollment.$id,
          studentName: row.student!.full_name,
          rankKey: row.student!.rank_key,
          photoDocumentId: row.photoDocumentId,
          status: row.attendance?.status,
          note: attendanceSourceNote(row.attendance),
        }))}
      />
    </div>
  );
}

export default async function LessonAttendancePage({
  params,
  searchParams,
}: {
  params: Promise<{ classId: string; lessonId: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const [admin, { classId, lessonId }, query] = await Promise.all([
    requireProfile("admin"),
    params,
    searchParams,
  ]);

  const notice = query.saved
    ? "saved"
    : query.error === "reason"
      ? "reason"
      : query.error
        ? "error"
        : undefined;

  return (
    <PortalShell
      profile={admin}
      back={{ label: "Turma", href: adminClassPath(classId) }}
      title={
        <Suspense fallback={<InlineValueSkeleton className="h-7 w-52" />}>
          <LessonTitle classId={classId} />
        </Suspense>
      }
      subtitle={
        <Suspense fallback={<InlineValueSkeleton className="h-4 w-56" />}>
          <LessonSubtitle lessonId={lessonId} />
        </Suspense>
      }
    >
      <Suspense fallback={<InlineRowsSkeleton rows={6} label="Carregando lista de chamada…" />}>
        <LessonAttendanceBody classId={classId} lessonId={lessonId} notice={notice} />
      </Suspense>
    </PortalShell>
  );
}
