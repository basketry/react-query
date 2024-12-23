import { getHttpMethodByName, Interface, Method, Service } from 'basketry';
import { camel, pascal } from 'case';
import { NamespacedReactQueryOptions } from './types';

export class NameFactory {
  constructor(
    private readonly service: Service,
    private readonly options?: NamespacedReactQueryOptions,
  ) {}

  buildContextName(): string {
    return pascal(`${this.service.title.value}_client_context`);
  }

  buildProviderName(): string {
    return pascal(
      `${this.service.title.value}_provider`,
    );
  }

  buildQueryOptionsName(method: Method): string {
    return camel(`use_${method.name.value}_query_options`);
  }

  buildServiceName(int: Interface): string {
    return camel(`${int.name.value}_service`);
  }

  buildServiceHookName(int: Interface): string {
    return camel(`use_${this.buildServiceName(int)}`);
  }

  buildHookName(
    method: Method,
    options?: { infinite?: boolean; suspense?: boolean },
  ): string {
    const name = method.name.value;
    const httpMethod = getHttpMethodByName(this.service, name);

    if (
      httpMethod?.verb.value === 'get' &&
      name.toLocaleLowerCase().startsWith('get')
    ) {
      // Query Hook
      return camel(
        `use_${options?.suspense ? 'suspense_' : ''}${
          options?.infinite ? 'infinite_' : ''
        }${name.slice(3)}`,
      );
    }

    // Mutation Hook
    return camel(`use_${name}`);
  }
}
