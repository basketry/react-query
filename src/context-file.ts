import { camel, pascal } from 'case';
import { ModuleBuilder } from './module-builder';
import { ImportBuilder } from './import-builder';

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

    yield `export interface ClientContextProps { fetch: ${FetchLike()}; options: ${OptionsType()}; }`;
    yield `const ClientContext = ${createContext()}<ClientContextProps | undefined>( undefined );`;
    yield ``;
    // Store context for non-hook access
    yield `let currentContext: ClientContextProps | undefined;`;
    yield ``;
    yield `export const ClientProvider: ${FC()}<${PropsWithChildren()}<ClientContextProps>> = ({ children, fetch, options }) => {`;
    yield `  const value = ${useMemo()}(() => ({ fetch, options }), [fetch, options.mapUnhandledException, options.mapValidationError, options.root]);`;
    yield `  currentContext = value;`;
    yield `  return <ClientContext.Provider value={value}>{children}</ClientContext.Provider>;`;
    yield `};`;
    for (const int of this.service.interfaces) {
      const hookName = camel(`use_${int.name.value}_service`);
      const localName = camel(`${int.name.value}_service`);
      const interfaceName = pascal(`${int.name.value}_service`);
      const className = pascal(`http_${int.name.value}_service`);

      const getterName = camel(`get_${int.name.value}_service`);

      yield ``;
      yield `export const ${getterName} = () => {`;
      yield `  if (!currentContext) { throw new Error('${getterName} called outside of ClientProvider'); }`;
      yield `  const ${localName}: ${this.types.type(
        interfaceName,
      )} = new ${this.client.fn(
        className,
      )}(currentContext.fetch, currentContext.options);`;
      yield `  return ${localName};`;
      yield `}`;
      yield ``;
      yield `export const ${hookName} = () => {`;
      yield `  const context = ${useContext()}(ClientContext);`;
      yield `  if (!context) { throw new Error('${hookName} must be used within a ClientProvider'); }`;
      yield `  const ${localName}: ${this.types.type(
        interfaceName,
      )} = new ${this.client.fn(className)}(context.fetch, context.options);`;
      yield `  return ${localName};`;
      yield `}`;
    }
  }
}
