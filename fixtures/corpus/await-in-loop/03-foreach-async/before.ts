// Double-trouble: Array.prototype.forEach does NOT await async callbacks.
// The outer function resolves immediately, before any save() completes,
// which usually isn't what the author intended. Also, even if forEach
// did await, the callbacks would still be serialized per-iteration here.
// Use `for..of` + await, or Promise.all(items.map(save)), depending on intent.
interface Record {
  id: string;
  data: unknown;
}

async function save(record: Record): Promise<void> {
  await fetch("https://db.internal/records", {
    method: "POST",
    body: JSON.stringify(record),
  });
}

export function persistAll(items: Record[]): void {
  items.forEach(async (item) => {
    await save(item);
  });
}
