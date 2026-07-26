/**
 * Resolver hook for `node --test`.
 *
 * Application source uses extensionless relative imports ("./supabase/server"),
 * which bundlers resolve but Node's ESM loader does not. Rather than rewriting
 * app code to suit the test runner, this hook retries a failed resolution with
 * the TypeScript extensions appended.
 */
const CANDIDATE_SUFFIXES = [".ts", ".tsx", "/index.ts", "/index.tsx"];

export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (error) {
    const isRelative = specifier.startsWith("./") || specifier.startsWith("../");
    if (!isRelative) throw error;

    for (const suffix of CANDIDATE_SUFFIXES) {
      try {
        return await nextResolve(`${specifier}${suffix}`, context);
      } catch {
        // Try the next candidate.
      }
    }
    throw error;
  }
}
