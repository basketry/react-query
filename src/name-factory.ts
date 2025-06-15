import { Method } from 'basketry';
import { camel } from 'case';

export function getQueryOptionsName(method: Method): string {
  const name = method.name.value;

  return camel(`${name}_query_options`);
}
