import { createFileRoute } from "@tanstack/react-router";
import { EntityPage } from "@/components/crm/EntityPage";
import { useDB, getDB, setDB } from "@/lib/crm-store";
import { nextId, type Employee } from "@/lib/crm-logic";

export const Route = createFileRoute("/employees")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Employees — Ordo CRM" },
      { name: "description", content: "Manage your team, positions and contacts." },
      { property: "og:title", content: "Employees — Ordo CRM" },
      { property: "og:description", content: "Manage your team, positions and contacts." },
    ],
  }),
  component: EmployeesPage,
});

function EmployeesPage() {
  const db = useDB();
  const positions = [...new Set(db.employees.map((e) => e.position))].sort();
  return (
    <EntityPage<Employee>
      title="Employees"
      singular="Employee"
      rows={db.employees}
      idKey="employee_id"
      searchText={(e) => `${e.employee_id} ${e.full_name} ${e.position} ${e.email}`}
      filter={{ label: "Position", options: positions.map((p) => ({ value: p, label: p })), match: (r, v) => r.position === v }}
      columns={[
        { label: "ID", render: (e) => <span className="text-muted-foreground">#{e.employee_id}</span> },
        { label: "Full name", render: (e) => <span className="font-semibold">{e.full_name}</span> },
        { label: "Position", render: (e) => e.position },
        { label: "Email", render: (e) => e.email },
      ]}
      fields={[
        { key: "full_name", label: "Full name" },
        { key: "position", label: "Position" },
        { key: "email", label: "Email", type: "email" },
      ]}
      onSave={(v, id) => {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) return "Enter a valid email";
        const d = getDB();
        const row = { full_name: v.full_name.trim(), position: v.position.trim(), email: v.email.trim() };
        setDB({
          ...d,
          employees: id
            ? d.employees.map((e) => (e.employee_id === id ? { ...e, ...row } : e))
            : [...d.employees, { employee_id: nextId(d.employees, "employee_id"), ...row }],
        });
        return null;
      }}
      onDelete={(id) => {
        const d = getDB();
        if (d.orders.some((o) => o.employee_id === id)) return "Employee is assigned to orders — reassign them first";
        setDB({ ...d, employees: d.employees.filter((e) => e.employee_id !== id) });
        return null;
      }}
    />
  );
}
