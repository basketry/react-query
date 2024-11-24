import { ImportBuilder } from './import-builder';
import { ModuleBuilder } from './module-builder';

export class RuntimeFile extends ModuleBuilder {
  protected importBuilders: ImportBuilder[] = [];

  *body(): Iterable<string> {
    yield `import type {
        GetNextPageParamFunction,
        GetPreviousPageParamFunction,
      } from '@tanstack/react-query';

      export type PageParam = { pageParam?: string };
    
      export class CompositeError extends Error {
        constructor(readonly errors: { title: string }[]) {
          super(errors.map((e) => e.title).join(', '));
          if (Error.captureStackTrace) Error.captureStackTrace(this, CompositeError);
        }
      }
      
      export type RelayParams = {
        first?: number;
        after?: string;
        last?: number;
        before?: string;
      };
      
      export type Response = {
        pageInfo?: {
          startCursor?: string;
          hasPreviousPage: boolean;
          hasNextPage: boolean;
          endCursor?: string;
        };
      };
      
      export const getNextPageParam: GetNextPageParamFunction<
        string | undefined,
        Response
      > = (lastPage) => {
        return lastPage.pageInfo?.hasNextPage
          ? \`after:\${lastPage.pageInfo.endCursor}\`
          : undefined;
      };
      
      export const getPreviousPageParam: GetPreviousPageParamFunction<
        string | undefined,
        Response
      > = (lastPage) => {
        return lastPage.pageInfo?.hasPreviousPage
          ? \`before:\${lastPage.pageInfo.startCursor}\`
          : undefined;
      };
      
      export function applyPageParam<T extends RelayParams>(
        params: T,
        pageParam: string | undefined,
      ): T {
        const { first, after, last, before, ...rest } = params;
        const syntheticParams: T = rest as T;
      
        if (pageParam) {
          const [key, value] = pageParam.split(':');
      
          if (key === 'after') {
            syntheticParams.first = first ?? last;
            syntheticParams.after = value;
          } else if (key === 'before') {
            syntheticParams.last = last ?? first;
            syntheticParams.before = value;
          }
        } else {
          if (first) syntheticParams.first = first;
          if (after) syntheticParams.after = after;
          if (last) syntheticParams.last = last;
          if (before) syntheticParams.before = before;
        }
      
        return syntheticParams;
      }
      
      export function getInitialPageParam(params: {
        after?: string;
        before?: string;
      }): string | undefined {
        if (params.after) return \`after:\${params.after}\`;
        if (params.before) return \`before:\${params.before}\`;
        return;
      }
        
      export function compact(
        params: Record<string, string | number | boolean | null | undefined>,
      ): Record<string, string | number | boolean> | undefined {
        const result: Record<string, string | number | boolean> = Object.fromEntries(
          Object.entries(params).filter(
            ([, value]) => value !== null && value !== undefined,
          ),
        ) as any;

        return Object.keys(result).length ? result : undefined;
      }`;
  }
}
