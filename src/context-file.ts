import { camel, pascal } from 'case';
import { ModuleBuilder } from './module-builder';
import { ImportBuilder } from './import-builder';
import { NameFactory } from './name-factory';

export class ContextFile extends ModuleBuilder {
  private readonly nameFactory = new NameFactory(this.service, this.options);
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

    // Use consistent naming from NameFactory
    const contextName = this.nameFactory.buildContextName();
    const contextPropsName = pascal(`${contextName}_props`);
    const providerName = this.nameFactory.buildProviderName();

    yield `export interface ${contextPropsName} { fetch: ${FetchLike()}; options: ${OptionsType()}; }`;
    yield `const ${contextName} = ${createContext()}<${contextPropsName} | undefined>( undefined );`;
    yield ``;
    
    // Store context for non-hook access
    yield `let currentContext: ${contextPropsName} | undefined;`;
    yield ``;
    
    yield `export const ${providerName}: ${FC()}<${PropsWithChildren()}<${contextPropsName}>> = ({ children, fetch, options }) => {`;
    yield `  const value = ${useMemo()}(() => ({ fetch, options }), [fetch, options.mapUnhandledException, options.mapValidationError, options.root]);`;
    yield `  currentContext = value;`;
    yield `  return <${contextName}.Provider value={value}>{children}</${contextName}.Provider>;`;
    yield `};`;
    
    for (const int of this.service.interfaces) {
      const hookName = this.nameFactory.buildServiceHookName(int);
      const getterName = this.nameFactory.buildServiceGetterName(int);
      const localName = this.nameFactory.buildServiceName(int);
      const interfaceName = pascal(`${int.name.value}_service`);
      const className = pascal(`http_${int.name.value}_service`);

      // Add service getter function (v0.2.0)
      yield ``;
      yield `export const ${getterName} = () => {`;
      yield `  if (!currentContext) { throw new Error('${getterName} called outside of ${providerName}'); }`;
      yield `  const ${localName}: ${this.types.type(
        interfaceName,
      )} = new ${this.client.fn(className)}(currentContext.fetch, currentContext.options);`;
      yield `  return ${localName};`;
      yield `};`;
      
      // Keep legacy hook for backward compatibility (v0.1.0)
      yield ``;
      yield `export const ${hookName} = () => {`;
      yield `  const context = ${useContext()}(${contextName});`;
      yield `  if (!context) { throw new Error('${hookName} must be used within a ${providerName}'); }`;
      yield `  const ${localName}: ${this.types.type(
        interfaceName,
      )} = new ${this.client.fn(className)}(context.fetch, context.options);`;
      yield `  return ${localName};`;
      yield `}`;
    }
  }
}
