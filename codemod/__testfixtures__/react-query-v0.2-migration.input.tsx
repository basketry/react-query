import React from 'react';
import { 
  useGetWidgets, 
  useGetWidget, 
  useCreateWidget,
  useUpdateWidget,
  useDeleteWidget,
  useGetWidgetsInfinite,
  useSuspenseGetWidgets,
  useSuspenseGetWidgetsInfinite
} from '../hooks/widgets';
import { useGetGizmos, useCreateGizmo } from '../hooks/gizmos';
import { SomeOtherExport } from '../hooks/widgets';

// Simple query hook usage
export function WidgetList() {
  const { data, isLoading } = useGetWidgets({ status: 'active' });
  
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
  const { data } = useGetWidget<CustomWidget>({ id });
  return <div>{data?.customField}</div>;
}

// Mutation hook usage
export function CreateWidgetForm() {
  const createWidget = useCreateWidget({
    onSuccess: (data) => {
      console.log('Created widget:', data);
    },
    onError: (error) => {
      console.error('Failed to create widget:', error);
    }
  });
  
  const updateWidget = useUpdateWidget();
  const deleteWidget = useDeleteWidget();
  
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
  } = useGetWidgetsInfinite({ limit: 20 });
  
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
  const { data } = useSuspenseGetWidgets({ status: 'active' });
  
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
  const { data, fetchNextPage } = useSuspenseGetWidgetsInfinite({ 
    limit: 10,
    sort: 'name' 
  });
  
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
  const widgets = useGetWidgets();
  const gizmos = useGetGizmos({ type: 'advanced' });
  const createGizmo = useCreateGizmo();
  
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
    const result = useGetWidgets({ limit: 5 });
    return result;
  }, []);
  
  return <div>Callback component</div>;
}

// Custom type definitions for testing
interface CustomWidget extends Widget {
  customField: string;
}