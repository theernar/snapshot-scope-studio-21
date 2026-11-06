import { withTotals, type DB } from "./crm-logic";
import imgChair from "@/assets/products/office-chair.jpg";
import imgDesk from "@/assets/products/standing-desk.jpg";
import imgLaptop from "@/assets/products/laptop.jpg";
import imgMouse from "@/assets/products/mouse.jpg";
import imgPaper from "@/assets/products/paper.jpg";
import imgMonitor from "@/assets/products/monitor.jpg";

export const seed: DB = withTotals({
  customers: [
    { customer_id: 1, company_name: "Nomad Logistics", email: "hello@nomadlog.kz", city: "Almaty" },
    { customer_id: 2, company_name: "Steppe Foods LLP", email: "orders@steppefoods.kz", city: "Astana" },
    { customer_id: 3, company_name: "Caspian Build", email: "info@caspianbuild.kz", city: "Aktau" },
    { customer_id: 4, company_name: "Altyn Retail", email: "buy@altynretail.kz", city: "Shymkent" },
    { customer_id: 5, company_name: "Syr Darya Agro", email: "contact@syragro.kz", city: "Kyzylorda" },
  ],
  employees: [
    { employee_id: 1, full_name: "Aigerim Sadykova", position: "Sales Manager", email: "aigerim@company.kz", seller_code: "24B032169" },
    { employee_id: 2, full_name: "Daniyar Omarov", position: "Account Executive", email: "daniyar@company.kz" },
    { employee_id: 3, full_name: "Madina Akhmetova", position: "Warehouse Lead", email: "madina@company.kz" },
    { employee_id: 4, full_name: "Yerlan Bekov", position: "Sales Representative", email: "yerlan@company.kz" },
  ],
  products: [
    {
      product_id: 1, name: "Office Chair Pro", category: "Furniture", price: 94500, stock_qty: 42,
      image_url: imgChair, supplier_name: "Almaty Furniture Wholesale", cost_price: 62000,
      description: "Ergonomic office chair with breathable mesh back, adjustable armrests and lumbar support. Suitable for long working hours.",
    },
    {
      product_id: 2, name: "Standing Desk", category: "Furniture", price: 210000, stock_qty: 8,
      image_url: imgDesk, supplier_name: "Almaty Furniture Wholesale", cost_price: 148000,
      description: "Electric height-adjustable standing desk with wooden top, memory presets and quiet dual-motor lift. 140 × 70 cm.",
    },
    {
      product_id: 3, name: "Laptop 14\"", category: "Electronics", price: 575000, stock_qty: 15,
      image_url: imgLaptop, supplier_name: "TechDistrib KZ", cost_price: 460000,
      description: "Lightweight 14-inch laptop with Full HD display, 16 GB RAM and 512 GB SSD. Ideal for office work and travel.",
    },
    {
      product_id: 4, name: "Wireless Mouse", category: "Electronics", price: 14500, stock_qty: 120,
      image_url: imgMouse, supplier_name: "TechDistrib KZ", cost_price: 8200,
      description: "Compact wireless mouse with silent clicks, ergonomic grip and up to 12 months of battery life.",
    },
    {
      product_id: 5, name: "A4 Paper (box)", category: "Supplies", price: 12000, stock_qty: 5,
      image_url: imgPaper, supplier_name: "OfficeSnab Astana", cost_price: 8400,
      description: "Box of 5 reams of A4 office paper, 80 g/m², 500 sheets per ream. Suitable for copy, print, fax and laser.",
    },
    {
      product_id: 6, name: "Monitor 27\"", category: "Electronics", price: 155000, stock_qty: 22,
      image_url: imgMonitor, supplier_name: "TechDistrib KZ", cost_price: 112000,
      description: "27-inch Full HD monitor with thin bezels, height-adjustable stand and low-blue-light mode.",
    },
  ],
  orders: [
    { order_id: 1, order_date: "2026-10-20", status: "Paid", customer_id: 1, employee_id: 1, payment_method: "Kaspi", total_amount: 0 },
    { order_id: 2, order_date: "2026-10-24", status: "Processing", customer_id: 2, employee_id: 2, payment_method: null, total_amount: 0 },
    { order_id: 3, order_date: "2026-10-27", status: "New", customer_id: 3, employee_id: 1, payment_method: null, total_amount: 0 },
    { order_id: 4, order_date: "2026-10-28", status: "Cancelled", customer_id: 4, employee_id: 4, payment_method: null, total_amount: 0 },
    { order_id: 5, order_date: "2026-10-29", status: "New", customer_id: 5, employee_id: 2, payment_method: null, total_amount: 0 },
  ],
  order_items: [
    { order_item_id: 1, order_id: 1, product_id: 1, quantity: 10, unit_price: 94500 },
    { order_item_id: 2, order_id: 1, product_id: 4, quantity: 10, unit_price: 14500 },
    { order_item_id: 3, order_id: 2, product_id: 3, quantity: 3, unit_price: 575000 },
    { order_item_id: 4, order_id: 2, product_id: 6, quantity: 3, unit_price: 155000 },
    { order_item_id: 5, order_id: 3, product_id: 2, quantity: 2, unit_price: 210000 },
    { order_item_id: 6, order_id: 4, product_id: 5, quantity: 4, unit_price: 12000 },
    { order_item_id: 7, order_id: 5, product_id: 4, quantity: 25, unit_price: 14500 },
    { order_item_id: 8, order_id: 5, product_id: 1, quantity: 5, unit_price: 94500 },
  ],
  defects: [],
});
