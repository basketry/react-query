import { File, Generator, Service } from 'basketry';
import { plural } from 'pluralize';

import { buildFilePath } from '@basketry/typescript';
import { format, from } from '@basketry/typescript/lib/utils';
import { header } from '@basketry/typescript/lib/warning';

import { kebab } from 'case';
import { NamespacedReactQueryOptions } from './types';
import { HookFile } from './hook-file';
import { ContextFile } from './context-file';
import { RuntimeFile } from './runtime-file';
import { QueryKeyBuilderFile } from './query-key-builder';

export const generateHooks: Generator = (service, options) => {
  return new HookGenerator(service, options).generate();
};

class HookGenerator {
  constructor(
    private readonly service: Service,
    private readonly options: NamespacedReactQueryOptions,
  ) {}

  generate(): File[] {
    const files: File[] = [];

    files.push({
      path: buildFilePath(['hooks', 'runtime.ts'], this.service, this.options),
      contents: format(
        from(new RuntimeFile(this.service, this.options).build()),
        this.options,
      ),
    });

    files.push({
      path: buildFilePath(['hooks', 'context.tsx'], this.service, this.options),
      contents: format(
        from(new ContextFile(this.service, this.options).build()),
        this.options,
      ),
    });

    files.push({
      path: buildFilePath(['hooks', 'query-key-builder.ts'], this.service, this.options),
      contents: format(
        from(new QueryKeyBuilderFile(this.service, this.options).build()),
        this.options,
      ),
    });

    for (const int of this.service.interfaces) {
      const contents = format(
        from(new HookFile(this.service, this.options, int).build()),
        this.options,
      );
      files.push({
        path: buildFilePath(
          ['hooks', `${kebab(plural(int.name.value))}.ts`],
          this.service,
          this.options,
        ),
        contents,
      });
    }

    return files;
  }
}
