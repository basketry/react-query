import { NamespacedBasketryOptions } from 'basketry';

export type ReactQueryOptions = {
  eslintDisable?: string[];
  prettierConfig?: string;
  typeImports?: boolean;
  includeVersion?: boolean;
  typesModule?: string;
  clientModule?: string;
};

export type NamespacedReactQueryOptions = NamespacedBasketryOptions & {
  reactQuery?: ReactQueryOptions;
};
