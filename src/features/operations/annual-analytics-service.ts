import "server-only";

import { toPublicRank } from "@/features/academy/belt-rules";
import { getBeltRanks } from "@/features/academy/config-service";
import type { Charge, Payment } from "@/features/billing/types";
import type { CancellationRequest } from "@/features/contracts/types";
import type { BeltHistory } from "@/features/exams/types";
import {
  availableAnalyticsYears,
  buildAnnualExecutiveReport,
} from "@/features/operations/annual-analytics-rules";
import type { Enrollment, Student } from "@/features/students/types";
import { listAllRows } from "@/lib/appwrite/all-rows";
import { APPWRITE_IDS } from "@/lib/appwrite/ids";
import { cachedRead } from "@/lib/cache/cached-read";
import { CACHE_TAGS } from "@/lib/cache/tags";
import { saoPauloCurrentYear, saoPauloToday } from "@/lib/dates";

function loadAnnualDataset() {
  return cachedRead(
    {
      name: "admin-annual-executive-dataset",
      key: [],
      tags: [
        CACHE_TAGS.enrollments,
        CACHE_TAGS.billingCharges,
        CACHE_TAGS.contracts,
        CACHE_TAGS.cancellations,
        CACHE_TAGS.examEvents,
        CACHE_TAGS.studentsAll,
      ],
      revalidate: 120,
    },
    async () => {
      const [students, enrollments, cancellations, charges, payments, beltHistory] =
        await Promise.all([
          listAllRows<Student>(APPWRITE_IDS.tables.students),
          listAllRows<Enrollment>(APPWRITE_IDS.tables.enrollments),
          listAllRows<CancellationRequest>(APPWRITE_IDS.tables.cancellationRequests),
          listAllRows<Charge>(APPWRITE_IDS.tables.charges),
          listAllRows<Payment>(APPWRITE_IDS.tables.payments),
          listAllRows<BeltHistory>(APPWRITE_IDS.tables.beltHistory),
        ]);
      return { students, enrollments, cancellations, charges, payments, beltHistory };
    }
  );
}

export async function getAnnualExecutiveOverview(requestedYear?: number) {
  const [{ students, enrollments, cancellations, charges, payments, beltHistory }, ranks] = await Promise.all([
    loadAnnualDataset(),
    getBeltRanks(),
  ]);

  const currentYear = saoPauloCurrentYear();
  const years = availableAnalyticsYears(charges, enrollments, currentYear);
  const year =
    requestedYear && Number.isInteger(requestedYear) && years.includes(requestedYear)
      ? requestedYear
      : currentYear;

  const report = buildAnnualExecutiveReport({
    year,
    students,
    enrollments,
    cancellations,
    charges,
    payments,
    beltHistory,
    ranks: ranks.map(toPublicRank),
    referenceDate: saoPauloToday(),
  });

  return { report, years };
}
