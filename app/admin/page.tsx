import { Package, Users, ShoppingCart, Globe } from 'lucide-react';
import Link from 'next/link';
import dbConnect from '@/lib/db';
import ProductModel from '@/models/Product';
import UserModel from '@/models/User';
import OrderModel from '@/models/Order';
import CountryModel from '@/models/Country';

async function getStats() {
  try {
    await dbConnect();

    const [totalProducts, totalUsers, totalOrders, totalCountries] =
      await Promise.all([
        ProductModel.countDocuments(),
        UserModel.countDocuments(),
        OrderModel.countDocuments(),
        CountryModel.countDocuments(),
      ]);

    return {
      totalProducts,
      totalUsers,
      totalOrders,
      totalCountries,
    };
  } catch (error) {
    console.error('Error fetching stats:', error);
    return {
      totalProducts: 0,
      totalUsers: 0,
      totalOrders: 0,
      totalCountries: 0,
    };
  }
}

function StatCard({
  title,
  value,
  icon: Icon,
  href,
  color,
}: {
  title: string;
  value: number | string;
  icon: React.ElementType;
  href?: string;
  color: string;
}) {
  const content = (
    <div className="bg-card-bg border border-stroke rounded-site p-6 hover:border-success/30 transition-all duration-200">
      <div className="flex items-center justify-between mb-4">
        <div
          className={`w-12 h-12 rounded-lg flex items-center justify-center ${color}`}
        >
          <Icon size={24} className="text-white" />
        </div>
      </div>
      <h3 className="text-2xl font-bold text-foreground mb-1">{value}</h3>
      <p className="text-secondary text-sm">{title}</p>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}

export default async function AdminPage() {
  const stats = await getStats();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
        <p className="text-secondary">Welcome to the admin dashboard</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Products"
          value={stats.totalProducts}
          icon={Package}
          href="/admin/products"
          color="bg-success"
        />
        <StatCard
          title="Total Users"
          value={stats.totalUsers}
          icon={Users}
          href="/admin/users"
          color="bg-blue-500"
        />
        <StatCard
          title="Orders"
          value={stats.totalOrders}
          icon={ShoppingCart}
          href="/admin/orders"
          color="bg-purple-500"
        />
        <StatCard
          title="Countries"
          value={stats.totalCountries}
          icon={Globe}
          href="/admin/countries"
          color="bg-teal-500"
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-card-bg border border-stroke rounded-site p-6">
        <h2 className="text-xl font-bold text-foreground mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Link
            href="/admin/products"
            className="flex items-center gap-3 p-4 rounded-lg bg-background hover:bg-success hover:text-white transition-all duration-200 border border-stroke"
          >
            <Package size={20} />
            <span className="font-medium">Manage Products</span>
          </Link>
          <Link
            href="/admin/orders"
            className="flex items-center gap-3 p-4 rounded-lg bg-background hover:bg-success hover:text-white transition-all duration-200 border border-stroke"
          >
            <ShoppingCart size={20} />
            <span className="font-medium">Manage Orders</span>
          </Link>
          <Link
            href="/admin/countries"
            className="flex items-center gap-3 p-4 rounded-lg bg-background hover:bg-success hover:text-white transition-all duration-200 border border-stroke"
          >
            <Globe size={20} />
            <span className="font-medium">Manage Countries</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
