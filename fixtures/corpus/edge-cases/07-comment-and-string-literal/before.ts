import axios from "axios";

// Historical note: we used to call axios.get('/old') here but that endpoint
// was retired in 2024-03. Left the reference for future archaeology.
/*
 * Previously:
 *   const dead = axios.get('/old');
 *   return dead;
 */

const template = "use axios.get(x) inside your handler";
const example = `TODO: replace axios.get(path) with the wrapped helper`;

export function describeMigration(): { summary: string; example: string } {
  return {
    summary: template,
    example,
  };
}

export const PLACEHOLDER = "axios.post(body) is not a real call here";
