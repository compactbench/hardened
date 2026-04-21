declare function saveItem(item: string): Promise<void>;

export async function saveInOrder(items: string[]) {
  for (const item of items) {
    // hardened-ignore-next-line
    await saveItem(item);
  }
}
