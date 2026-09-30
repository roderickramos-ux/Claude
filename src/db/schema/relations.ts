import { relations } from "drizzle-orm";
import { categories, courseFaculty, courseRuns, courses, faculty, runFaculty } from "./catalog";
import {
  attendees,
  orderItems,
  orders,
  payments,
  referralCodes,
  referralRewards,
  refunds,
  registrations,
} from "./commerce";

export const categoriesRelations = relations(categories, ({ many }) => ({ courses: many(courses) }));

export const coursesRelations = relations(courses, ({ one, many }) => ({
  category: one(categories, { fields: [courses.categoryId], references: [categories.id] }),
  runs: many(courseRuns),
  faculty: many(courseFaculty),
}));

export const facultyRelations = relations(faculty, ({ many }) => ({
  courses: many(courseFaculty),
  runs: many(runFaculty),
}));

export const courseFacultyRelations = relations(courseFaculty, ({ one }) => ({
  course: one(courses, { fields: [courseFaculty.courseId], references: [courses.id] }),
  faculty: one(faculty, { fields: [courseFaculty.facultyId], references: [faculty.id] }),
}));

export const courseRunsRelations = relations(courseRuns, ({ one, many }) => ({
  course: one(courses, { fields: [courseRuns.courseId], references: [courses.id] }),
  faculty: many(runFaculty),
  registrations: many(registrations),
}));

export const runFacultyRelations = relations(runFaculty, ({ one }) => ({
  run: one(courseRuns, { fields: [runFaculty.runId], references: [courseRuns.id] }),
  faculty: one(faculty, { fields: [runFaculty.facultyId], references: [faculty.id] }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  items: many(orderItems),
  attendees: many(attendees),
  registrations: many(registrations),
  payments: many(payments),
  refunds: many(refunds),
  referral: one(referralCodes, { fields: [orders.referralCodeId], references: [referralCodes.id] }),
}));

export const orderItemsRelations = relations(orderItems, ({ one, many }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  run: one(courseRuns, { fields: [orderItems.runId], references: [courseRuns.id] }),
  attendees: many(attendees),
}));

export const attendeesRelations = relations(attendees, ({ one }) => ({
  order: one(orders, { fields: [attendees.orderId], references: [orders.id] }),
  item: one(orderItems, { fields: [attendees.orderItemId], references: [orderItems.id] }),
  registration: one(registrations),
}));

export const registrationsRelations = relations(registrations, ({ one }) => ({
  run: one(courseRuns, { fields: [registrations.runId], references: [courseRuns.id] }),
  attendee: one(attendees, { fields: [registrations.attendeeId], references: [attendees.id] }),
  order: one(orders, { fields: [registrations.orderId], references: [orders.id] }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  order: one(orders, { fields: [payments.orderId], references: [orders.id] }),
}));

export const refundsRelations = relations(refunds, ({ one }) => ({
  order: one(orders, { fields: [refunds.orderId], references: [orders.id] }),
}));

export const referralCodesRelations = relations(referralCodes, ({ many }) => ({
  orders: many(orders),
  rewards: many(referralRewards),
}));

export const referralRewardsRelations = relations(referralRewards, ({ one }) => ({
  code: one(referralCodes, {
    fields: [referralRewards.referralCodeId],
    references: [referralCodes.id],
  }),
  order: one(orders, { fields: [referralRewards.orderId], references: [orders.id] }),
}));
