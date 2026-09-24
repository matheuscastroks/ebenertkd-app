import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui/avatar", () => ({
  Avatar: ({ children, ...props }: React.ComponentProps<"div">) => <div {...props}>{children}</div>,
  AvatarImage: ({ src, alt }: { src: string; alt: string }) => <span role="img" aria-label={alt} data-src={src} />,
  AvatarFallback: (props: React.ComponentProps<"span">) => <span {...props} />
}));

import { StudentAvatar } from "@/features/students/components/student-avatar";

describe("StudentAvatar", () => {
  it("uses the authenticated document endpoint when a photo exists", () => {
    render(<StudentAvatar name="Camila Ferreira" photoDocumentId="photo-1" />);
    expect(screen.getByRole("img", { name: "Camila Ferreira" })).toHaveAttribute("data-src", "/api/student-documents/photo-1");
    expect(screen.getByText("CF")).toBeInTheDocument();
  });

  it("renders initials when no photo is available", () => {
    render(<StudentAvatar name="João Pedro Santos" />);
    expect(screen.getByText("JP")).toBeInTheDocument();
  });
});
