import { Interface, Method, Service } from 'basketry';
import { camel, pascal } from 'case';

export function getQueryOptionsName(method: Method): string {
  return camel(`use_${method.name.value}_query_options`);
}

// Helper functions for v0.2.0 code
export function buildServiceGetterName(int: Interface): string {
  return camel(`get_${int.name.value}_service`);
}

export function buildQueryOptionsName(method: Method): string {
  return camel(`${method.name.value}_query_options`);
}

export function buildMutationOptionsName(method: Method): string {
  return camel(`${method.name.value}_mutation_options`);
}

export function buildInfiniteQueryOptionsName(method: Method): string {
  return camel(`${method.name.value}_infinite_query_options`);
}

export function buildServiceHookName(int: Interface): string {
  return camel(`use_${int.name.value}_service`);
}

export function buildContextName(service: Service): string {
  return pascal(`${service.title.value}_context`);
}

export function buildProviderName(service: Service): string {
  return pascal(`${service.title.value}_provider`);
}

export function buildServiceName(int: Interface): string {
  return camel(`${int.name.value}_service`);
}
