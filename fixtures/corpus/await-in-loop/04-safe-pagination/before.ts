// Cursor-based pagination. Page N+1 depends on the cursor from page N,
// so iterations must run sequentially.
interface Page<T> {
  items: T[];
  next: string | null;
}

interface Customer {
  id: string;
  email: string;
}

async function fetchPage(cursor: string | null): Promise<Page<Customer>> {
  const url = cursor
    ? `https://api.example.com/customers?cursor=${cursor}`
    : "https://api.example.com/customers";
  const res = await fetch(url);
  return res.json() as Promise<Page<Customer>>;
}

export async function loadAllCustomers(): Promise<Customer[]> {
  const results: Customer[] = [];
  let cursor: string | null = null;
  do {
    const page = await fetchPage(cursor);
    results.push(...page.items);
    cursor = page.next;
  } while (cursor);
  return results;
}
