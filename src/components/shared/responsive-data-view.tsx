import type { ReactNode } from "react";

export function ResponsiveDataView({ desktop, mobile }: { desktop: ReactNode; mobile: ReactNode }) {
  return <><div className="hidden md:block">{desktop}</div><div className="grid grid-cols-1 gap-3 md:hidden">{mobile}</div></>;
}
