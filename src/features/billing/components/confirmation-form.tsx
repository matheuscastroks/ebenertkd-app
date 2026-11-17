"use client";

import type { ComponentProps } from "react";

/** Keeps implicit keyboard submissions behind the same review step as button clicks. */
export function ConfirmationForm(props: ComponentProps<"form">) {
  return <form {...props} onSubmit={(event) => {
    if (event.target !== event.currentTarget) return;
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    if (submitter?.getAttribute("name") === "intent" && submitter.getAttribute("value") === "save") return;
    event.preventDefault();
    event.currentTarget.querySelector<HTMLButtonElement>("[data-confirmation-trigger]")?.click();
  }} />;
}
