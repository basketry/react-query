import { Interface, Method, Service } from 'basketry';
import { camel, pascal } from 'case';
import { NamespacedReactQueryOptions } from './types';

export class NameFactory {
  constructor(
    private readonly service: Service,
    private readonly options?: NamespacedReactQueryOptions,
  ) {}

  buildContextName(): string {
    return pascal(`${this.service.title.value}_context`);
  }

  buildProviderName(): string {
    return pascal(`${this.service.title.value}_provider`);
  }

  buildQueryOptionsName(method: Method): string {
    return camel(`${method.name.value}_query_options`);
  }

  buildServiceName(int: Interface): string {
    return camel(`${int.name.value}_service`);
  }

  buildServiceHookName(int: Interface): string {
    return camel(`use_${this.buildServiceName(int)}`);
  }

  getHookName(method: Method): string {
    return camel(`use_${method.name.value}`);
  }

  getSuspenseHookName(method: Method): string {
    return camel(`use_suspense_${method.name.value}`);
  }

  getInfiniteHookName(method: Method): string {
    return camel(`use_${method.name.value}_infinite`);
  }

  getSuspenseInfiniteHookName(method: Method): string {
    return camel(`use_suspense_${method.name.value}_infinite`);
  }
}
