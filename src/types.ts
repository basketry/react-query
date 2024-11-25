import { NamespacedBasketryOptions } from 'basketry';

export type ReactQueryOptions = {
  eslintDisable?: string[];
  prettierConfig?: string;
  typeImports?: boolean;
  includeVersion?: boolean;
  typesModule?: string;
  clientModule?: string;
  reactImport?: boolean;
};

export type NamespacedReactQueryOptions = NamespacedBasketryOptions & {
  reactQuery?: ReactQueryOptions;
};
