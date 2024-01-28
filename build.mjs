await Bun.build({
  entrypoints: ["./index.ts"],
  outdir: "./dist",
  target: "node",
  minify: true,
});
