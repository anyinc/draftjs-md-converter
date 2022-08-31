const esbuild = require('esbuild');
const pkg = require('./package.json');
const fs = require('fs');
const jsdomPatch = {
  name: 'jsdom-patch',
  setup(build) {
    build.onLoad({ filter: /jsdom\/living\/xhr\/XMLHttpRequest-impl\.js$/ }, async args => {
      let contents = await fs.promises.readFile(args.path, 'utf8');

      contents = contents.replace(
        'const syncWorkerFile = require.resolve ? require.resolve("./xhr-sync-worker.js") : null;',
        `const syncWorkerFile = "${require.resolve(
          'jsdom/lib/jsdom/living/xhr/xhr-sync-worker.js'
        )}";`
      );

      return { contents, loader: 'js' };
    });
  }
};

const options = {
  entryPoints: ['src/index.js'],
  bundle: true,
  minify: true,
  sourcemap: true,
  external: ['path', 'canvas'],
  target: 'es2021',
  platform: 'node',
  plugins: [jsdomPatch]
};
(async () => {
  await esbuild
    .build({ ...options, outfile: pkg.main, format: 'cjs' })
    .catch(() => process.exit(1));

  await esbuild
    .build({ ...options, outfile: pkg.module, format: 'esm' })
    .catch(() => process.exit(1));
})();
