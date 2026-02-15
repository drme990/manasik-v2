'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Package,
  Users,
  Menu,
  X,
  FileText,
  ShoppingCart,
  Globe,
  Ticket,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import Logo from '@/components/shared/logo';
import UserMenu from '@/components/shared/user-menu';
import { AuthProvider, useAuth } from '@/components/providers/auth-provider';
import { useLocale, useTranslations } from 'next-intl';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { PageLoading } from '@/components/ui/loading';

const navItems = [
  {
    key: 'dashboard',
    href: '/admin',
    icon: LayoutDashboard,
  },
  {
    key: 'products',
    href: '/admin/products',
    icon: Package,
  },
  {
    key: 'orders',
    href: '/admin/orders',
    icon: ShoppingCart,
  },
  {
    key: 'coupons',
    href: '/admin/coupons',
    icon: Ticket,
  },
  {
    key: 'countries',
    href: '/admin/countries',
    icon: Globe,
  },
  {
    key: 'users',
    href: '/admin/users',
    icon: Users,
  },
  {
    key: 'activityLogs',
    href: '/admin/logs',
    icon: FileText,
  },
];

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, loading } = useAuth();
  const locale = useLocale();
  const isRTL = locale === 'ar';
  const t = useTranslations('admin');

  // Handle authentication redirect
  useEffect(() => {
    if (!loading && !user && pathname !== '/admin/login') {
      router.push('/admin/login');
    }
  }, [user, loading, pathname, router]);

  // Show login page without admin layout chrome
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  // Show loading state while fetching user data
  if (loading) {
    return <PageLoading text={t('loading')} className="bg-background" />;
  }

  // Show redirecting state if not authenticated
  if (!user) {
    return <PageLoading text={t('redirecting')} className="bg-background" />;
  }

  return (
    <div className="min-h-screen bg-background">
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={isRTL}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-card-bg border-b border-stroke px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg hover:bg-background transition-colors"
        >
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        <Logo />
      </div>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 h-screen w-64 bg-card-bg border-stroke z-40 transition-all duration-300 hover:text-success hover:shadow-lg',
          isRTL ? 'right-0 border-l' : 'left-0 border-r',
          isRTL
            ? sidebarOpen
              ? 'translate-x-0'
              : 'translate-x-full'
            : sidebarOpen
              ? 'translate-x-0'
              : '-translate-x-full',
          isRTL ? 'lg:translate-x-0' : 'lg:translate-x-0',
        )}
      >
        <div className="flex flex-col h-full">
          <div className="hidden lg:flex items-center justify-center p-6 border-b border-stroke">
            <Logo />
          </div>

          <nav className="flex-1 p-4 space-y-2 mt-16 lg:mt-0">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200',
                    isActive
                      ? 'bg-success text-white'
                      : 'hover:bg-background hover:text-success text-foreground',
                  )}
                >
                  <Icon size={20} />
                  <span className="font-medium">
                    {t(`navigation.${item.key}`)}
                  </span>
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-stroke text-foreground">
            <UserMenu />
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main
        className={cn(
          'min-h-screen pt-16 lg:pt-0',
          isRTL ? 'lg:mr-64' : 'lg:ml-64',
        )}
      >
        <div className="p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </AuthProvider>
  );
}
