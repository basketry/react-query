import { Method, Service, getHttpMethodByName } from 'basketry';
import { camel } from 'case';

export function getQueryOptionsName(method: Method, service: Service): string {
  const name = method.name.value;
  const httpMethod = getHttpMethodByName(service, name);

  if (
    httpMethod?.verb.value === 'get' &&
    name.toLocaleLowerCase().startsWith('get')
  ) {
    return camel(`${name.slice(3)}_query_options`);
  }

  return camel(`${name}_query_options`);
}
