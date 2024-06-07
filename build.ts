import { build, BuildOptions, context } from "esbuild";
import { mkdir, readFile, writeFile } from "fs/promises";
import { minify, MinifyOptions } from "uglify-js";

await mkdir("dist").catch(() => {});
await writeFile("dist/anguish.d.ts", `\
export function mount(root?: Element, data?: any): void;
export function html(template: TemplateStringsArray, ...values: any[]): Element;
export function effect(fn: () => void): void;

declare const RefSymbol: unique symbol;
export interface Ref<T> {
  value: T;
  [RefSymbol]: true;
}
export type UnwrapRef<T> = T extends Ref<infer V> ? V : T;
export type MaybeRef<T> = T | Ref<T>;

export function ref<T>(value: T): Ref<UnwrapRef<T>>;
export function ref<T = any>(): Ref<T | undefined>;

export function isRef<T>(ref: Ref<T> | unknown): ref is Ref<T>;
export function unref<T>(value: MaybeRef<T>): T;
`);

const watch = process.argv.includes("--watch");

const options = <BuildOptions> {
  entryPoints: ["src/index.ts"],
  bundle: true,
  minify: true,
  logLevel: "info",
  plugins: [{
    name: "uglify",
    setup(build) {
      const path = build.initialOptions.outfile!;
      const options: MinifyOptions = {
        compress: {
          passes: 8,
          unsafe_comps: true,
        },
      };

      build.onEnd(async () => {
        await writeFile(path, minify(await readFile(path, "utf8"), options).code);
      });
    },
  }],
};

const targets = <BuildOptions[]> [
  { outfile: "dist/anguish.js", define: { BUILD: "'iife'" } },
  { outfile: "dist/anguish.mjs", define: { BUILD: "'esm'" }, format: "esm" },
];

targets.map(t => ({ ...options, ...t }))
  .forEach(watch ? (t) => context(t).then(ctx => ctx.watch()) : build);
