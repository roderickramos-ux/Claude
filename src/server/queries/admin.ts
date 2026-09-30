import "server-only";
import { and, asc, desc, eq, type SQL } from "drizzle-orm";
import { db, schema } from "@/db/client";

export async function listRegistrations(filter: { runId?: string; status?: string }) {
  const where: SQL[] = [];
  if (filter.runId) where.push(eq(schema.registrations.runId, filter.runId));
  if (filter.status && (schema.registrationStatus.enumValues as readonly string[]).includes(filter.status)) {
    where.push(eq(schema.registrations.status, filter.status as (typeof schema.registrationStatus.enumValues)[number]));
  }
  return db
    .select({
      id: schema.registrations.id,
      status: schema.registrations.status,
      createdAt: schema.registrations.createdAt,
      attendee: schema.attendees,
      orderId: schema.orders.id,
      orderNumber: schema.orders.orderNumber,
      orderStatus: schema.orders.status,
      buyerName: schema.orders.buyerName,
      company: schema.orders.billing,
      runCode: schema.courseRuns.code,
      courseTitle: schema.courses.title,
    })
    .from(schema.registrations)
    .innerJoin(schema.attendees, eq(schema.registrations.attendeeId, schema.attendees.id))
    .innerJoin(schema.orders, eq(schema.registrations.orderId, schema.orders.id))
    .innerJoin(schema.courseRuns, eq(schema.registrations.runId, schema.courseRuns.id))
    .innerJoin(schema.courses, eq(schema.courseRuns.courseId, schema.courses.id))
    .where(where.length ? and(...where) : undefined)
    .orderBy(desc(schema.registrations.createdAt), asc(schema.attendees.fullName))
    .limit(2000);
}

export async function listRunsForSelect() {
  return db
    .select({ id: schema.courseRuns.id, code: schema.courseRuns.code, title: schema.courses.title, startDate: schema.courseRuns.startDate })
    .from(schema.courseRuns)
    .innerJoin(schema.courses, eq(schema.courseRuns.courseId, schema.courses.id))
    .orderBy(desc(schema.courseRuns.startDate));
}

/** RFC 4180 CSV with a BOM so Excel opens UTF-8 correctly. Guards against formula injection. */
export function toCsv(rows: (string | number | null | undefined)[][]): string {
  const cell = (v: string | number | null | undefined) => {
    let s = v === null || v === undefined ? "" : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "﻿" + rows.map((r) => r.map(cell).join(",")).join("\r\n");
}
