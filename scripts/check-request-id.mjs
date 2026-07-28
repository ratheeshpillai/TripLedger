import assert from "node:assert/strict";

const originalCrypto = globalThis.crypto;
Object.defineProperty(globalThis, "crypto", {
  configurable: true,
  value: { getRandomValues: (bytes) => bytes.fill(0xab) }
});

const { createRequestId } = await import("../src/utils/requestId.ts");
const id = createRequestId();

assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
Object.defineProperty(globalThis, "crypto", { configurable: true, value: originalCrypto });
console.log(`valid UUID fallback: ${id}`);
