"use client";

import { useState, type ComponentProps } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { usePwaInstall } from "./use-pwa-install";
import { InstallModal } from "./install-modal";

type InstallButtonProps = ComponentProps<typeof Button> & {
  label?: string;
  showWhenInstalled?: boolean;
};

export function InstallButton({
  label = "Instalar Aplicativo",
  showWhenInstalled = false,
  variant = "outline",
  size = "default",
  className,
  ...props
}: InstallButtonProps) {
  const { isMounted, isStandalone, hasNativePrompt, promptInstall } = usePwaInstall();
  const [modalOpen, setModalOpen] = useState(false);

  if (!isMounted) return null;
  if (isStandalone && !showWhenInstalled) return null;

  const handleClick = async () => {
    if (hasNativePrompt) {
      const outcome = await promptInstall();
      if (outcome === "ios_instructions" || outcome === "unavailable") {
        setModalOpen(true);
      }
    } else {
      setModalOpen(true);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        onClick={handleClick}
        {...props}
      >
        <Download className="mr-2 size-4" />
        {label}
      </Button>
      <InstallModal open={modalOpen} onOpenChange={setModalOpen} />
    </>
  );
}

export function InstallMenuItem() {
  const { isMounted, isStandalone, hasNativePrompt, promptInstall } = usePwaInstall();
  const [modalOpen, setModalOpen] = useState(false);

  if (!isMounted || isStandalone) return null;

  const handleClick = async () => {
    if (hasNativePrompt) {
      const outcome = await promptInstall();
      if (outcome === "ios_instructions" || outcome === "unavailable") {
        setModalOpen(true);
      }
    } else {
      setModalOpen(true);
    }
  };

  return (
    <>
      <DropdownMenuItem
        onSelect={(event) => {
          event.preventDefault();
          void handleClick();
        }}
        className="cursor-pointer"
      >
        <Download className="size-4" aria-hidden="true" />
        <span>Instalar aplicativo</span>
      </DropdownMenuItem>
      <InstallModal open={modalOpen} onOpenChange={setModalOpen} />
    </>
  );
}
