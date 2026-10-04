// @vitest-environment node
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { isReexportOnly, prismicBarrel, PRISMIC_SVELTE_BARREL } from "./prismic-barrel.ts";

const require = createRequire(import.meta.url);
const barrelPath = join(
  dirname(require.resolve("@prismicio/svelte/package.json")),
  "dist/index.js",
);

describe("prismicBarrel", () => {
  it("matches the installed @prismicio/svelte barrel, and it is re-exports only", () => {
    expect(PRISMIC_SVELTE_BARREL.test(barrelPath)).toBe(true);
    expect(isReexportOnly(readFileSync(barrelPath, "utf8"))).toBe(true);
  });

  it("declares only that module side-effect-free", () => {
    const transform = prismicBarrel().transform as (code: string, id: string) => unknown;
    const code = 'export { default as SliceZone } from "./SliceZone/SliceZone.svelte";';
    expect(transform.call({}, code, barrelPath)).toMatchObject({ moduleSideEffects: false });
    expect(
      transform.call({}, code, barrelPath.replace("index.js", "SliceSimulator.svelte")),
    ).toBeNull();
    expect(transform.call({}, code, "/app/src/lib/index.js")).toBeNull();
  });

  it("refuses a barrel that has gained code with side effects", () => {
    const transform = prismicBarrel().transform as (code: string, id: string) => unknown;
    const ctx = {
      error: (message: string) => {
        throw new Error(message);
      },
    };
    expect(() =>
      transform.call(ctx, 'export { a } from "./a.js";\nwindow.x = 1;', barrelPath),
    ).toThrow(/no longer re-exports only/);
  });

  it("accepts every re-export form, comments and blank lines", () => {
    expect(
      isReexportOnly(
        '/* c */\nexport { default as A } from "./A.svelte";\n// c\n\nexport * from "./b.js";\nexport * as c from \'./c.js\'\nexport type { D } from "./d.js";\nexport {\n  e,\n  f,\n} from "./e.js";\n',
      ),
    ).toBe(true);
    expect(isReexportOnly('import "./side-effect.js";')).toBe(false);
    expect(isReexportOnly("export const a = 1;")).toBe(false);
  });
});

const client = ".svelte-kit/output/client";
const manifestPath = join(client, ".vite/manifest.json");
const appPath = ".svelte-kit/generated/client-optimized/app.js";
const SIMULATOR_MARKERS = ["slice-simulator--root", "sliceSimulatorAccessedDirectly"];

type Chunk = { file: string; imports?: string[]; isEntry?: boolean };

describe.skipIf(!existsSync(manifestPath) || !existsSync(appPath))("the built client", () => {
  const read = (path: string) => (existsSync(path) ? readFileSync(path, "utf8") : "");
  const manifest: Record<string, Chunk> = JSON.parse(read(manifestPath) || "{}");
  const simulatorNode = read(appPath).match(/"\/slice-simulator":\s*\[~?(\d+)/)?.[1];
  const entries = Object.keys(manifest).filter((key) => manifest[key].isEntry);
  const staticClosure = (key: string, seen = new Set<string>()): Set<string> => {
    if (seen.has(key)) return seen;
    seen.add(key);
    for (const next of manifest[key]?.imports ?? []) staticClosure(next, seen);
    return seen;
  };
  const simulatorFiles = (entry: string) =>
    [...staticClosure(entry)]
      .map((key) => manifest[key].file)
      .filter((file) => {
        const source = readFileSync(join(client, file), "utf8");
        return SIMULATOR_MARKERS.some((marker) => source.includes(marker));
      });
  const isSimulatorNode = (key: string) => key.endsWith(`/nodes/${simulatorNode}.js`);

  it("loads the slice simulator on /slice-simulator", () => {
    expect(simulatorNode).toBeDefined();
    const node = entries.find(isSimulatorNode);
    expect(node).toBeDefined();
    expect(simulatorFiles(node!).length).toBeGreaterThan(0);
  });

  it("keeps it out of every other entry's static imports", () => {
    const others = entries.filter((key) => !isSimulatorNode(key));
    expect(others.length).toBeGreaterThan(2);
    for (const key of others) expect(simulatorFiles(key), key).toEqual([]);
  });
});
