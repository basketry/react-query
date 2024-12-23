import { camel, pascal } from 'case';
import { ModuleBuilder } from './module-builder';
import { ImportBuilder } from './import-builder';
import { NameFactory } from './name-factory';

export class ContextFile extends ModuleBuilder {
  private readonly nameFactory = new NameFactory(this.service, this.options);
  private readonly react = new ImportBuilder(
    'react',
    this.options?.reactQuery?.reactImport ? 'React' : undefined,
  );
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

    const contextName = this.nameFactory.buildContextName();
    const contextPropsName = pascal(`${contextName}_props`);
    const providerName = this.nameFactory.buildProviderName();

    yield `export interface ${contextPropsName} { fetch: ${FetchLike()}; options: ${OptionsType()}; }`;
    yield `const ${contextName} = ${createContext()}<${contextPropsName} | undefined>( undefined );`;
    yield ``;
    yield `export const ${providerName}: ${FC()}<${PropsWithChildren()}<${contextPropsName}>> = ({ children, fetch, options }) => {`;
    yield `  const value = ${useMemo()}(() => ({ fetch, options }), [fetch, options.mapUnhandledException, options.mapValidationError, options.root]);`;
    yield `  return <${contextName}.Provider value={value}>{children}</${contextName}.Provider>;`;
    yield `};`;
    for (const int of this.service.interfaces) {
      const hookName = this.nameFactory.buildServiceHookName(int);
      const localName = this.nameFactory.buildServiceName(int);
      const interfaceName = pascal(localName);
      const className = pascal(`http_${int.name.value}_service`);

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
