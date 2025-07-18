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

  getHookName(method: Method, httpVerb?: string): string {
    const name = method.name.value;

    // If it's a GET method and the name starts with "get", remove the "Get" prefix
    if (httpVerb === 'get' && name.toLowerCase().startsWith('get')) {
      return camel(`use_${name.slice(3)}`);
    }

    return camel(`use_${name}`);
  }

  getSuspenseHookName(method: Method, httpVerb?: string): string {
    const name = method.name.value;

    // If it's a GET method and the name starts with "get", remove the "Get" prefix
    if (httpVerb === 'get' && name.toLowerCase().startsWith('get')) {
      return camel(`use_suspense_${name.slice(3)}`);
    }

    return camel(`use_suspense_${name}`);
  }

  getInfiniteHookName(method: Method, httpVerb?: string): string {
    const name = method.name.value;

    // If it's a GET method and the name starts with "get", remove the "Get" prefix
    if (httpVerb === 'get' && name.toLowerCase().startsWith('get')) {
      return camel(`use_${name.slice(3)}_infinite`);
    }

    return camel(`use_${name}_infinite`);
  }

  getSuspenseInfiniteHookName(method: Method, httpVerb?: string): string {
    const name = method.name.value;

    // If it's a GET method and the name starts with "get", remove the "Get" prefix
    if (httpVerb === 'get' && name.toLowerCase().startsWith('get')) {
      return camel(`use_suspense_${name.slice(3)}_infinite`);
    }

    return camel(`use_suspense_${name}_infinite`);
  }
}
