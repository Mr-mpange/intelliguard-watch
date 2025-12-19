import { ChevronRight, Home } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const routeLabels: Record<string, string> = {
  '': 'Overview',
  'analyze': 'Analyze',
  'results': 'Results',
  'threat': 'Threat Investigation',
  'alerts': 'Alerts',
  'monitoring': 'Monitoring',
  'settings': 'Settings',
  'admin': 'Admin Dashboard',
  'profile': 'Profile',
};

const Breadcrumb = () => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  // Build breadcrumb items
  const breadcrumbItems = pathnames.map((value, index) => {
    const to = `/${pathnames.slice(0, index + 1).join('/')}`;
    const isLast = index === pathnames.length - 1;
    const label = routeLabels[value] || value.charAt(0).toUpperCase() + value.slice(1);

    return {
      to,
      label,
      isLast,
    };
  });

  return (
    <nav className="flex items-center text-sm text-muted-foreground mb-6">
      <Link
        to="/"
        className="flex items-center gap-1 hover:text-foreground transition-colors"
      >
        <Home className="w-4 h-4" />
        <span className="hidden sm:inline">Home</span>
      </Link>

      {breadcrumbItems.map((item, index) => (
        <div key={item.to} className="flex items-center">
          <ChevronRight className="w-4 h-4 mx-2 text-muted-foreground/50" />
          {item.isLast ? (
            <span className="text-foreground font-medium">{item.label}</span>
          ) : (
            <Link
              to={item.to}
              className="hover:text-foreground transition-colors"
            >
              {item.label}
            </Link>
          )}
        </div>
      ))}

      {pathnames.length === 0 && (
        <>
          <ChevronRight className="w-4 h-4 mx-2 text-muted-foreground/50" />
          <span className="text-foreground font-medium">Overview</span>
        </>
      )}
    </nav>
  );
};

export default Breadcrumb;
