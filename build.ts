import { build, BuildOptions, context } from "esbuild";
import { readFileSync, writeFileSync } from "fs";
import { minify, MinifyOptions } from "uglify-js";

const watch = process.argv.includes("--watch");

const options: BuildOptions = {
  entryPoints: ["src/index.ts"],
  outfile: "dist/anguish.js",
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

      build.onEnd(() => {
        writeFileSync(path, minify(readFileSync(path, "utf8"), options).code);
      });
    },
  }],
};

if (watch) {
  context(options).then(ctx => ctx.watch());
} else {
  build(options);
}
