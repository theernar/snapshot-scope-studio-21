import { createFileRoute } from "@tanstack/react-router";
import { EntityPage } from "@/components/crm/EntityPage";
import { useDB, getDB, setDB } from "@/lib/crm-store";
import { nextId, type Customer } from "@/lib/crm-logic";

export const Route = createFileRoute("/customers")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Customers — Ordo CRM" },
      { name: "description", content: "Manage customer companies, contacts and cities." },
      { property: "og:title", content: "Customers — Ordo CRM" },
      { property: "og:description", content: "Manage customer companies, contacts and cities." },
    ],
  }),
  component: CustomersPage,
});

const emailOk = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

function CustomersPage() {
  const db = useDB();
  const cities = [...new Set(db.customers.map((c) => c.city))].sort();
  return (
    <EntityPage<Customer>
      title="Customers"
      singular="Customer"
      rows={db.customers}
      idKey="customer_id"
      searchText={(c) => `${c.customer_id} ${c.company_name} ${c.email} ${c.city}`}
      filter={{ label: "City", options: cities.map((c) => ({ value: c, label: c })), match: (r, v) => r.city === v }}
      columns={[
        { label: "ID", render: (c) => <span className="text-muted-foreground">#{c.customer_id}</span> },
        { label: "Company", render: (c) => <span className="font-semibold">{c.company_name}</span> },
        { label: "Email", render: (c) => c.email },
        { label: "City", render: (c) => c.city },
      ]}
      fields={[
        { key: "company_name", label: "Company name" },
        { key: "email", label: "Email", type: "email" },
        { key: "city", label: "City" },
      ]}
      onSave={(v, id) => {
        if (!emailOk(v.email)) return "Enter a valid email";
        const d = getDB();
        const row = { company_name: v.company_name.trim(), email: v.email.trim(), city: v.city.trim() };
        setDB({
          ...d,
          customers: id
            ? d.customers.map((c) => (c.customer_id === id ? { ...c, ...row } : c))
            : [...d.customers, { customer_id: nextId(d.customers, "customer_id"), ...row }],
        });
        return null;
      }}
      onDelete={(id) => {
        const d = getDB();
        if (d.orders.some((o) => o.customer_id === id)) return "Customer has orders — delete those first";
        setDB({ ...d, customers: d.customers.filter((c) => c.customer_id !== id) });
        return null;
      }}
    />
  );
}
