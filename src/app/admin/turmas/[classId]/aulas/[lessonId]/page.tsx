import { notFound } from "next/navigation";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { AttendanceSheet } from "@/features/classes/components/attendance-sheet";
import { getAttendanceSheet } from "@/features/classes/attendance-service";
import { getTrainingClass } from "@/features/classes/service";
import { requireProfile } from "@/lib/auth/session";
import { adminClassPath, ROUTES } from "@/lib/navigation/routes";

export default async function LessonAttendancePage({
  params,
  searchParams
}: {
  params: Promise<{ classId: string; lessonId: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const [admin, { classId, lessonId }, query] = await Promise.all([
    requireProfile("admin"),
    params,
    searchParams
  ]);

  const [trainingClass, sheet] = await Promise.all([
    getTrainingClass(classId),
    getAttendanceSheet(lessonId)
  ]);

  if (sheet.lesson.training_class_id !== classId) notFound();

  const date = new Date(sheet.lesson.lesson_date).toLocaleDateString("pt-BR", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long"
  });

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
      activePath={ROUTES.adminClasses}
      breadcrumbs={[
        { label: "Turmas", href: ROUTES.adminClasses },
        { label: trainingClass.name, href: adminClassPath(classId) },
        { label: "Chamada" }
      ]}
      title={`Chamada · ${trainingClass.name}`}
      subtitle={`${date} · ${sheet.lesson.start_time} às ${sheet.lesson.end_time}`}
    >
      <div className="w-full min-w-0 space-y-4">
        <AttendanceSheet
          classId={classId}
          lessonId={lessonId}
          lessonCompleted={sheet.lesson.status === "completed"}
          notice={notice}
          rows={sheet.rows.map((row) => ({
            classEnrollmentId: row.classEnrollment.$id,
            studentName: row.student!.full_name,
            belt: row.student!.current_belt,
            gub: row.student!.gub,
            photoDocumentId: row.photoDocumentId,
            status: row.attendance?.status
          }))}
        />
      </div>
    </PortalShell>
  );
}
