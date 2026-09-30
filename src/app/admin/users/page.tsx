import { desc, ne } from "drizzle-orm";
import { AdminForm } from "@/components/admin/admin-form";
import { SelectField, TextField } from "@/components/admin/fields";
import { AdminHeader } from "@/components/admin/ui";
import { Card } from "@/components/ui/misc";
import { db, schema } from "@/db/client";
import { formatDateTime } from "@/lib/dates";
import { inviteStaff, setUserRole } from "@/server/actions/admin/content";
import { requireRole } from "@/server/auth/session";

export const metadata = { title: "Users & roles" };

const roles = schema.userRole.enumValues.map((r) => ({ value: r, label: r.replace("_", " ") }));

export default async function UsersPage() {
  await requireRole("super_admin");
  const staff = await db.query.profiles.findMany({ where: ne(schema.profiles.role, "participant"), orderBy: [desc(schema.profiles.createdAt)] });
  return (
    <>
      <AdminHeader title="Users & roles" description="Staff: orders, payments, registrations. Admin: plus catalog, content, settings, refunds. Super admin: plus user management." />
      <div className="space-y-3">
        {staff.map((u) => (
          <Card key={u.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-medium text-ink">{u.email}</p>
              <p className="text-xs text-ink-muted">{u.lastSignInAt ? `Last sign-in ${formatDateTime(u.lastSignInAt)}` : "Has not signed in yet"}</p>
            </div>
            <AdminForm action={setUserRole} submitLabel="Update" className="flex items-end gap-3">
              <input type="hidden" name="id" value={u.id} />
              <SelectField name="role" label="Role" defaultValue={u.role} options={roles} />
            </AdminForm>
          </Card>
        ))}
      </div>
      <Card className="mt-8 max-w-xl p-6">
        <h2 className="mb-4 font-sans text-base font-semibold text-ink">Add staff member</h2>
        <AdminForm action={inviteStaff} submitLabel="Grant access" resetOnSuccess>
          <TextField name="email" label="Email" type="email" required hint="They sign in at /login with this email (magic link or Google)." />
          <SelectField name="role" label="Role" defaultValue="staff" options={roles.filter((r) => r.value !== "participant")} />
        </AdminForm>
      </Card>
    </>
  );
}
