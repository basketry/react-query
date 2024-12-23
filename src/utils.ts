import { getTypeByName, Method, Service } from 'basketry';
import { camel } from 'case';

export function isRelayPaginaged(method: Method, service: Service): boolean {
  if (!method.returnType || method.returnType.isPrimitive) return false;

  const returnType = getTypeByName(service, method.returnType.typeName.value);
  if (!returnType) return false;

  // TODO: Check if the return type has a `pageInfo` property
  if (
    !returnType.properties.some((prop) => camel(prop.name.value) === 'pageInfo')
  ) {
    return false;
  }

  if (
    !method.parameters.some(
      (param) =>
        camel(param.name.value) === 'first' &&
        param.isPrimitive &&
        param.typeName.value === 'integer',
    )
  ) {
    return false;
  }

  if (
    !method.parameters.some(
      (param) =>
        camel(param.name.value) === 'after' &&
        param.isPrimitive &&
        param.typeName.value === 'string',
    )
  ) {
    return false;
  }

  if (
    !method.parameters.some(
      (param) =>
        camel(param.name.value) === 'last' &&
        param.isPrimitive &&
        param.typeName.value === 'integer',
    )
  ) {
    return false;
  }

  if (
    !method.parameters.some(
      (param) =>
        camel(param.name.value) === 'before' &&
        param.isPrimitive &&
        param.typeName.value === 'string',
    )
  ) {
    return false;
  }

  return true;
}
