declare function syncNextPage(): Promise<void>;

export async function drainPages(remaining: () => boolean) {
  do {
    await syncNextPage();
  } while (remaining());
}
