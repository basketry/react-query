const { defineTest } = require('jscodeshift/dist/testUtils');

// Basic transformation test
defineTest(
  __dirname,
  '../react-query-v0.2-migration',
  {},
  'react-query-v0.2-migration',
  { parser: 'tsx' }
);

// You can also add more specific tests
describe('react-query-v0.2-migration codemod', () => {
  const jscodeshift = require('jscodeshift');
  const transform = require('../react-query-v0.2-migration');

  const transformOptions = {
    jscodeshift,
    stats: () => {},
    report: () => {}
  };

  it('should transform simple query hooks', () => {
    const input = `
import { useGetWidgets } from '../hooks/widgets';

function Component() {
  const { data } = useGetWidgets({ limit: 10 });
  return <div>{data?.length}</div>;
}
`;

    const expected = `
import { useQuery } from '@tanstack/react-query';
import { getWidgetsQueryOptions } from '../hooks/widgets';

function Component() {
  const { data } = useQuery(getWidgetsQueryOptions({ limit: 10 }));
  return <div>{data?.length}</div>;
}
`;

    const result = transform(
      { path: 'test.tsx', source: input },
      transformOptions
    );

    expect(result).toBe(expected.trim());
  });

  it('should preserve type parameters', () => {
    const input = `
import { useGetWidget } from '../hooks/widgets';

function Component() {
  const { data } = useGetWidget<CustomType>({ id: '123' });
  return <div>{data?.name}</div>;
}
`;

    const expected = `
import { useQuery } from '@tanstack/react-query';
import { getWidgetQueryOptions } from '../hooks/widgets';

function Component() {
  const { data } = useQuery(getWidgetQueryOptions<CustomType>({ id: '123' }));
  return <div>{data?.name}</div>;
}
`;

    const result = transform(
      { path: 'test.tsx', source: input },
      transformOptions
    );

    expect(result).toBe(expected.trim());
  });

  it('should handle multiple hooks from same module', () => {
    const input = `
import { useGetWidgets, useCreateWidget, useUpdateWidget } from '../hooks/widgets';

function Component() {
  const widgets = useGetWidgets();
  const create = useCreateWidget();
  const update = useUpdateWidget();
  
  return <div>Test</div>;
}
`;

    const expected = `
import {
  useQuery,
  useMutation,
} from '@tanstack/react-query';
import { getWidgetsQueryOptions, createWidgetMutationOptions, updateWidgetMutationOptions } from '../hooks/widgets';

function Component() {
  const widgets = useQuery(getWidgetsQueryOptions());
  const create = useMutation(createWidgetMutationOptions());
  const update = useMutation(updateWidgetMutationOptions());
  
  return <div>Test</div>;
}
`;

    const result = transform(
      { path: 'test.tsx', source: input },
      transformOptions
    );

    expect(result).toBe(expected.trim());
  });

  it('should not transform non-generated hooks', () => {
    const input = `
import { useCustomHook } from './custom-hooks';
import { useState } from 'react';

function Component() {
  const custom = useCustomHook();
  const [state, setState] = useState();
  
  return <div>Test</div>;
}
`;

    const result = transform(
      { path: 'test.tsx', source: input },
      transformOptions
    );

    expect(result).toBe(input);
  });

  it('should handle existing React Query imports', () => {
    const input = `
import { useQueryClient } from '@tanstack/react-query';
import { useGetWidgets } from '../hooks/widgets';

function Component() {
  const queryClient = useQueryClient();
  const { data } = useGetWidgets();
  
  return <div>{data?.length}</div>;
}
`;

    const expected = `
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { getWidgetsQueryOptions } from '../hooks/widgets';

function Component() {
  const queryClient = useQueryClient();
  const { data } = useQuery(getWidgetsQueryOptions());
  
  return <div>{data?.length}</div>;
}
`;

    const result = transform(
      { path: 'test.tsx', source: input },
      transformOptions
    );

    expect(result).toBe(expected.trim());
  });
});