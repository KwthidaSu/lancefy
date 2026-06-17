import RouterProvider from '@/router';
import ErrorBoundary from '@/components/ErrorBoundary';

export default function App() {
  return (
    <ErrorBoundary>
      <RouterProvider />
    </ErrorBoundary>
  );
}
