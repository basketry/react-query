import { Service } from 'basketry';

import { header } from '@basketry/typescript/lib/warning';

import { NamespacedReactQueryOptions } from './types';
import { ImportBuilder } from './import-builder';

export abstract class ModuleBuilder {
  constructor(
    protected readonly service: Service,
    protected readonly options: NamespacedReactQueryOptions | undefined,
  ) {}

  protected abstract readonly importBuilders: ImportBuilder[];

  *build(): Iterable<string> {
    const body = Array.from(this.body());
    yield* this.preable(...this.importBuilders);
    yield '';
    yield* body;
  }

  *preable(...importBuilders: ImportBuilder[]): Iterable<string> {
    yield header(this.service, require('../package.json'), this.options);

    let hasWrittenSpaceAfterHeader = false;
    for (const builder of ImportBuilder.sort(
      ImportBuilder.combine(importBuilders),
    )) {
      const importStatement = builder.build();
      if (importStatement) {
        if (!hasWrittenSpaceAfterHeader) {
          hasWrittenSpaceAfterHeader = true;
          yield '';
        }
        yield importStatement;
      }
    }
  }

  abstract body(): Iterable<string>;
}
