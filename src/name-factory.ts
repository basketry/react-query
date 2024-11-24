import { Method } from 'basketry';
import { camel } from 'case';

export function getQueryOptionsName(method: Method): string {
  return camel(`use_${method.name.value}_query_options`);
}
