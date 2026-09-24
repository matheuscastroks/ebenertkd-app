"use client";

import { useRef } from "react";
import { setTrainingClassStatusAction } from "@/app/actions/training-classes";
import { Switch } from "@/components/ui/switch";

export function ClassStatusToggle({ classId, active }: { classId: string; active: boolean }) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={setTrainingClassStatusAction}>
      <input type="hidden" name="class_id" value={classId} />
      <input type="hidden" name="status" value={active ? "inactive" : "active"} />
      <Switch
        defaultChecked={active}
        aria-label={active ? "Desativar turma" : "Ativar turma"}
        onCheckedChange={() => formRef.current?.requestSubmit()}
      />
    </form>
  );
}
