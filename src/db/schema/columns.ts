import { bigint, timestamp, uuid } from "drizzle-orm/pg-core";

export const id = () => uuid("id").primaryKey().defaultRandom();

export const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

/** Money is always stored as integer centavos. */
export const centavos = (name: string) => bigint(name, { mode: "number" });

export const tstz = (name: string) => timestamp(name, { withTimezone: true });
