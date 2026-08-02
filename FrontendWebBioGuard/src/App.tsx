import { RouterProvider } from 'react-router-dom';
import { AuthProvider, ThemeProvider } from './context';
import { router } from './routes';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ThemeProvider>
  );
}
