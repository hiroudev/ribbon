import { parse } from "acorn";
import { normalizeScript } from "./model";
/** Wrap user code inside the page's MAIN world. No eval or extension-context execution. */
export function executionCode(value: string): string {
  let code = normalizeScript(value);
  const ast = parse(code, {
    ecmaVersion: "latest",
    sourceType: "script",
    allowReturnOutsideFunction: true,
    allowAwaitOutsideFunction: true,
  });
  const last = ast.body.at(-1);
  // Await a bookmarklet's final expression, including an async IIFE.
  if (last?.type === "ExpressionStatement")
    code =
      code.slice(0, last.start) +
      "await (" +
      code.slice(last.expression.start, last.expression.end) +
      ");" +
      code.slice(last.end);
  return `(async () => { try { await (async () => {\n${code}\n})(); return { ribbonOk: true }; } catch (error) { return { ribbonOk: false, error: String(error && error.message || error) }; } })()`;
}
