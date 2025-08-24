import { generateHooks } from '../hook-generator';
import { NodeEngine, File } from 'basketry';
import { NamespacedReactQueryOptions } from '../types';

const pkg = require('../../package.json');
const withVersion = `${pkg.name}@${pkg.version}`;
const withoutVersion = `${pkg.name}@{{version}}`;

export async function* generateFiles(): AsyncIterable<File> {
  const service = require('@basketry/ir/lib/example.json');

  const options: NamespacedReactQueryOptions = {};

  const { engines } = await NodeEngine.load({
    sourcePath: 'source/path.ext',
    sourceContent: JSON.stringify(service),
    parser: (x) => ({ service: JSON.parse(x), violations: [] }),
    generators: [generateHooks],
    options,
  });

  for (const engine of engines) {
    await engine.runParser();
    await engine.runGenerators();

    for (const file of engine.files) {
      if (file.path[0] !== '.gitattributes') {
        yield {
          path: [process.cwd(), 'src', 'snapshot', ...file.path],
          contents: (await file.contents).replace(withVersion, withoutVersion),
        };
      }
    }
  }
}
