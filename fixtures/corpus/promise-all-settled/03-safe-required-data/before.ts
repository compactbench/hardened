// Required-data load: all three results are destructured and used to
// render the billing page. If getOrders rejects, there is no meaningful
// fallback - the caller cannot render a half-populated invoice. Short-
// circuiting on first failure is the correct behavior here, so
// Promise.all (NOT allSettled) is the right shape.
interface User {
  id: string;
  email: string;
}

interface Order {
  id: string;
  total: number;
}

interface Invoice {
  id: string;
  dueDate: string;
  lineItems: Array<{ sku: string; price: number }>;
}

declare function getUser(id: string): Promise<User>;
declare function getOrders(userId: string): Promise<Order[]>;
declare function getInvoice(userId: string): Promise<Invoice>;

export interface BillingView {
  email: string;
  orderCount: number;
  dueDate: string;
  total: number;
}

export async function loadBillingView(userId: string): Promise<BillingView> {
  const [user, orders, invoice] = await Promise.all([
    getUser(userId),
    getOrders(userId),
    getInvoice(userId),
  ]);

  return {
    email: user.email,
    orderCount: orders.length,
    dueDate: invoice.dueDate,
    total: invoice.lineItems.reduce((sum, li) => sum + li.price, 0),
  };
}
