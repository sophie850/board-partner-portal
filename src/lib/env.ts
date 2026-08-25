/* ============================================================
   Environment access

   Always read through this, never as `process.env.SOME_NAME`
   directly.

   A static `process.env.SOME_NAME` is replaced by the compiler with
   the literal value at build time. Three consequences, all bad:

     1. Changing a variable needs a full rebuild to take effect.
     2. If a variable is absent at build time, the app behaves as if
        it is unset for ever, even once it is set at runtime.
     3. The value is written into build artifacts, which is how a
        secret ends up sitting in a deploy bundle.

   An indexed lookup on a computed key cannot be statically replaced,
   so the value is resolved per request from the real environment.
   ============================================================ */

export function env(name: string): string | undefined {
  // Assigning to a local first defeats static analysis of the key.
  const key = name;
  return process.env[key];
}

export function envOr(name: string, fallback: string): string {
  return env(name) ?? fallback;
}

export function hasEnv(name: string): boolean {
  return Boolean(env(name));
}
