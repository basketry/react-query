import { pascal } from 'case';
import { ModuleBuilder } from './module-builder';
import { ImportBuilder } from './import-builder';
import {
  buildContextName,
  buildProviderName,
  buildServiceHookName,
  buildServiceGetterName,
  buildServiceName,
} from './name-helpers';

export class ContextFile extends ModuleBuilder {
  private readonly react = new ImportBuilder('react');
  private readonly client = new ImportBuilder(
    this.options?.reactQuery?.clientModule ?? '../http-client',
  );
  private readonly types = new ImportBuilder(
    this.options?.reactQuery?.typesModule ?? '../types',
  );
  protected readonly importBuilders = [this.react, this.client, this.types];

  *body(): Iterable<string> {
    const optionsName = pascal(`${this.service.title.value}_options`);

    const createContext = () => this.react.fn('createContext');
    const useMemo = () => this.react.fn('useMemo');
    const useContext = () => this.react.fn('useContext');
    const FC = () => this.react.type('FC');
    const PropsWithChildren = () => this.react.type('PropsWithChildren');
    const FetchLike = () => this.client.type('FetchLike');
    const OptionsType = () => this.client.type(optionsName);

    const contextName = buildContextName(this.service);
    const contextPropsName = pascal(`${contextName}_props`);
    const providerName = buildProviderName(this.service);

    yield `export interface ${contextPropsName} extends ${OptionsType()} { fetch?: ${FetchLike()}; }`;
    yield `export type ${pascal(
      this.service.title.value,
    )}ServiceConfig = ${contextPropsName};`;
    yield `const ${contextName} = ${createContext()}<${contextPropsName} | undefined>( undefined );`;
    yield ``;

    // Store context for non-hook access
    // In SSR environments, this needs to be handled carefully to avoid sharing state across requests.
    // The getCurrentContext function provides SSR-safe access.
    yield `let currentContext: ${contextPropsName} | undefined;`;
    yield ``;
    yield `// SSR-safe getter for current context`;
    yield `export const getCurrentContext = (): ${contextPropsName} | undefined => {`;
    yield `  if (typeof window === 'undefined' && !currentContext) {`;
    yield `    // SSR/RSC: No context available unless explicitly set`;
    yield `    return undefined;`;
    yield `  }`;
    yield `  return currentContext;`;
    yield `};`;
    yield ``;

    yield `export const ${providerName}: ${FC()}<${PropsWithChildren()}<${contextPropsName}>> = ({ children, ...props }) => {`;
    yield `  const value = ${useMemo()}(() => ({ ...props }), [props.fetch, props.mapUnhandledException, props.mapValidationError, props.root]);`;
    yield `  currentContext = value;`;
    yield `  return <${contextName}.Provider value={value}>{children}</${contextName}.Provider>;`;
    yield `};`;

    const sortedInterfaces = [...this.service.interfaces].sort((a, b) =>
      a.name.value.localeCompare(b.name.value),
    );
    for (const int of sortedInterfaces) {
      const hookName = buildServiceHookName(int);
      const getterName = buildServiceGetterName(int);
      const localName = buildServiceName(int);
      const interfaceName = pascal(`${int.name.value}_service`);
      const className = pascal(`http_${int.name.value}_service`);

      // Add service getter function (v0.3.0)
      yield ``;
      yield `export const ${getterName} = (config?: ${contextPropsName}) => {`;
      yield `  const serviceConfig = config ?? getCurrentContext();`;
      yield `  if (!serviceConfig) {`;
      yield `    throw new Error('${getterName}: Configuration required. Either pass config parameter or wrap component in ${providerName}.');`;
      yield `  }`;
      yield `  const ${localName}: ${this.types.type(
        interfaceName,
      )} = new ${this.client.fn(
        className,
      )}(serviceConfig.fetch ?? (typeof window !== 'undefined' ? window.fetch.bind(window) : globalThis.fetch), serviceConfig);`;
      yield `  return ${localName};`;
      yield `};`;

      // Keep legacy hook for backward compatibility (v0.2.0)
      yield ``;
      yield `export const ${hookName} = () => {`;
      yield `  const context = ${useContext()}(${contextName});`;
      yield `  if (!context) { throw new Error('${hookName} must be used within a ${providerName}'); }`;
      yield `  const ${localName}: ${this.types.type(
        interfaceName,
      )} = new ${this.client.fn(
        className,
      )}(context.fetch ?? window.fetch.bind(window), context);`;
      yield `  return ${localName};`;
      yield `}`;
    }
  }
}
