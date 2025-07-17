import React from 'react';
import {
  useQuery,
  useMutation,
  useInfiniteQuery,
  useSuspenseQuery,
  useSuspenseInfiniteQuery,
} from '@tanstack/react-query';
import { 
  getWidgetsQueryOptions, 
  getWidgetQueryOptions, 
  createWidgetMutationOptions,
  updateWidgetMutationOptions,
  deleteWidgetMutationOptions,
  getWidgetsInfiniteQueryOptions,
  SomeOtherExport
} from '../hooks/widgets';
import { getGizmosQueryOptions, createGizmoMutationOptions } from '../hooks/gizmos';

// Simple query hook usage
export function WidgetList() {
  const { data, isLoading } = useQuery(getWidgetsQueryOptions({ status: 'active' }));
  
  if (isLoading) return <div>Loading...</div>;
  
  return (
    <ul>
      {data?.items.map(widget => (
        <li key={widget.id}>{widget.name}</li>
      ))}
    </ul>
  );
}

// Query with type parameters
export function TypedWidgetDetail({ id }: { id: string }) {
  const { data } = useQuery(getWidgetQueryOptions<CustomWidget>({ id }));
  return <div>{data?.customField}</div>;
}

// Mutation hook usage
export function CreateWidgetForm() {
  const createWidget = useMutation(createWidgetMutationOptions({
    onSuccess: (data) => {
      console.log('Created widget:', data);
    },
    onError: (error) => {
      console.error('Failed to create widget:', error);
    }
  }));
  
  const updateWidget = useMutation(updateWidgetMutationOptions());
  const deleteWidget = useMutation(deleteWidgetMutationOptions());
  
  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      createWidget.mutate({ name: 'New Widget' });
    }}>
      <button type="submit">Create</button>
    </form>
  );
}

// Infinite query usage
export function InfiniteWidgetList() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useInfiniteQuery(getWidgetsInfiniteQueryOptions({ limit: 20 }));
  
  return (
    <div>
      {data?.pages.map((page, i) => (
        <div key={i}>
          {page.items.map(widget => (
            <div key={widget.id}>{widget.name}</div>
          ))}
        </div>
      ))}
      <button
        onClick={() => fetchNextPage()}
        disabled={!hasNextPage || isFetchingNextPage}
      >
        Load More
      </button>
    </div>
  );
}

// Suspense query usage
export function SuspenseWidgetList() {
  const { data } = useSuspenseQuery(getWidgetsQueryOptions({ status: 'active' }));
  
  return (
    <ul>
      {data.items.map(widget => (
        <li key={widget.id}>{widget.name}</li>
      ))}
    </ul>
  );
}

// Suspense infinite query usage
export function SuspenseInfiniteWidgets() {
  const { data, fetchNextPage } = useSuspenseInfiniteQuery(getWidgetsInfiniteQueryOptions({ 
    limit: 10,
    sort: 'name' 
  }));
  
  return (
    <div>
      {data.pages.map((page, i) => (
        <React.Fragment key={i}>
          {page.items.map(widget => (
            <div key={widget.id}>{widget.name}</div>
          ))}
        </React.Fragment>
      ))}
      <button onClick={() => fetchNextPage()}>Next</button>
    </div>
  );
}

// Multiple hooks from different services
export function MultiServiceComponent() {
  const widgets = useQuery(getWidgetsQueryOptions());
  const gizmos = useQuery(getGizmosQueryOptions({ type: 'advanced' }));
  const createGizmo = useMutation(createGizmoMutationOptions());
  
  return (
    <div>
      <h2>Widgets: {widgets.data?.items.length || 0}</h2>
      <h2>Gizmos: {gizmos.data?.items.length || 0}</h2>
      <button onClick={() => createGizmo.mutate({ name: 'New Gizmo' })}>
        Create Gizmo
      </button>
    </div>
  );
}

// Edge case: hook in a callback
export function CallbackComponent() {
  const fetchData = React.useCallback(() => {
    const result = useQuery(getWidgetsQueryOptions({ limit: 5 }));
    return result;
  }, []);
  
  return <div>Callback component</div>;
}

// Custom type definitions for testing
interface CustomWidget extends Widget {
  customField: string;
}