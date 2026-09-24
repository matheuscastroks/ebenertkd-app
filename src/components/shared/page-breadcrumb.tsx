import Link from "next/link";
import { Fragment } from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from "@/components/ui/breadcrumb";

export type BreadcrumbEntry = { label: string; href?: string };

export function PageBreadcrumb({ items }: { items: BreadcrumbEntry[] }) {
  if (items.length < 2) return null;
  return (
    <Breadcrumb>
      <BreadcrumbList>
        {items.map((item, index) => {
          const current = index === items.length - 1;
          return <Fragment key={`${item.label}-${index}`}>
            <BreadcrumbItem>
              {current || !item.href ? <BreadcrumbPage>{item.label}</BreadcrumbPage> : <BreadcrumbLink asChild><Link href={item.href}>{item.label}</Link></BreadcrumbLink>}
            </BreadcrumbItem>
            {!current ? <BreadcrumbSeparator /> : null}
          </Fragment>;
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
