// This fixture asserts that `risk/fetch-no-abort-signal` only targets the
// global `fetch` builtin. A `fetch` method on a user-defined client object
// (e.g. a GraphQL client, an SDK wrapper) is out of scope and must NOT be
// flagged, even when called with a single argument and no signal.

interface GraphQLRequest<V> {
  query: string;
  variables?: V;
}

interface GraphQLClient {
  endpoint: string;
  fetch<T, V = Record<string, unknown>>(request: GraphQLRequest<V>): Promise<T>;
}

function createClient(endpoint: string): GraphQLClient {
  return {
    endpoint,
    async fetch<T, V = Record<string, unknown>>(request: GraphQLRequest<V>): Promise<T> {
      // Implementation detail omitted; a real client would delegate to an
      // HTTP layer internally. The point of this fixture is the call site.
      return {} as T;
    },
  };
}

const client = createClient("https://api.example.com/graphql");

export async function getViewer() {
  return client.fetch<{ viewer: { id: string; handle: string } }>({
    query: "query Viewer { viewer { id handle } }",
  });
}
