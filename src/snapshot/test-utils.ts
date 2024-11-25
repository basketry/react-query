import { generateHooks } from '../hook-generator';
import { Engine, File } from 'basketry';
import { NamespacedReactQueryOptions } from '../types';

const pkg = require('../../package.json');
const withVersion = `${pkg.name}@${pkg.version}`;
const withoutVersion = `${pkg.name}@{{version}}`;

export async function* generateFiles(): AsyncIterable<File> {
  const service = require('basketry/lib/example-ir.json');

  const options: NamespacedReactQueryOptions = {};

  const { engines } = await Engine.load({
    sourcePath: 'source/path.ext',
    sourceContent: JSON.stringify(service),
    parser: (x) => ({ service: JSON.parse(x), violations: [] }),
    generators: [generateHooks],
    options,
  });

  for (const engine of engines) {
    engine.runParser();
    engine.runGenerators();

    for (const file of engine.output.files) {
      if (file.path[0] !== '.gitattributes') {
        yield {
          path: [process.cwd(), 'src', 'snapshot', ...file.path],
          contents: file.contents.replace(withVersion, withoutVersion),
        };
      }
    }
  }
}