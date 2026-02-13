# Admin Authentication & Activity Logging Setup

## Overview

The admin dashboard now has complete authentication and activity logging features:

- **Authentication**: Login/logout with JWT tokens stored in HTTP-only cookies
- **Activity Logging**: Tracks all admin actions (create, update, delete) for products and users
- **Protected Routes**: All admin API routes are protected with authentication middleware
- **Role-Based Access**: Support for `admin` and `super_admin` roles

## Required Dependencies

Install the following packages:

```bash
npm install jsonwebtoken bcryptjs
npm install --save-dev @types/jsonwebtoken @types/bcryptjs
```

## Environment Variables

Add to your `.env` file:

```env
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
DATA_BASE_URL=mongodb://localhost:27017/manasik
BASE_URL=http://localhost:3000
```

**Important**: Change `JWT_SECRET` to a strong random string in production!

## Database Models

The following models have been created:

1. **User** - Updated with password field and authentication methods
2. **ActivityLog** - Tracks all admin activities
3. **Auth APIs** - Login, logout, and session management

## Initial Setup

### 1. Create Your First Admin User

You need to create an initial admin user in the database. You can do this via MongoDB shell or a script:

#### Option A: MongoDB Shell

```javascript
use manasik

db.users.insertOne({
  name: "Admin User",
  email: "admin@manasik.com",
  password: "$2a$10$YourHashedPasswordHere", // Hash with bcrypt
  role: "super_admin",
  createdAt: new Date(),
  updatedAt: new Date()
})
```

#### Option B: Create a Script

Create a file `scripts/create-admin.ts`:

```typescript
import dbConnect from '../lib/db';
import User from '../models/User';

async function createAdmin() {
  await dbConnect();

  const admin = await User.create({
    name: 'Super Admin',
    email: 'admin@manasik.com',
    password: 'admin123', // Will be auto-hashed
    role: 'super_admin',
  });

  console.log('Admin created:', admin.email);
  process.exit(0);
}

createAdmin();
```

Run with: `tsx scripts/create-admin.ts`

## Features

### 🔐 Authentication

- **Login Page**: `/admin/login`
- **Protected Dashboard**: All `/admin/*` routes require authentication
- **Auto-redirect**: Unauthenticated users are redirected to login
- **Persistent Sessions**: JWT tokens stored in HTTP-only cookies (7 days)
- **Logout**: Clears session and redirects to login

### 📝 Activity Logging

All admin actions are automatically logged with:

- User information (ID, name, email)
- Action type (create, update, delete, login, logout)
- Resource type (product, user, auth)
- Detailed description
- Timestamp
- Optional metadata

### 📊 Activity Logs Page

- View all admin activities at `/admin/logs`
- Filter by action type or resource
- Real-time refresh
- Detailed information about each action

### 🔧 API Protection

All sensitive API routes are protected:

**Products:**

- `POST /api/products` - Create product (requires auth)
- `PUT /api/products/[id]` - Update product (requires auth)
- `DELETE /api/products/[id]` - Delete product (requires auth)
- `GET /api/products` & `GET /api/products/[id]` - Public (no auth)

**Users:**

- `POST /api/users` - Create user (requires auth)
- `DELETE /api/users/[id]` - Delete user (requires auth)
- `GET /api/users` & `GET /api/users/[id]` - Public for admin UI

**Logs:**

- `GET /api/logs` - View activity logs (requires auth)

**Auth:**

- `POST /api/auth/login` - Login (public)
- `POST /api/auth/logout` - Logout (public)
- `GET /api/auth/me` - Get current user (requires auth)

## User Roles

### Admin

- Can manage products (create, update, delete)
- Can view activity logs
- Cannot manage users

### Super Admin

- All admin permissions
- Can create and delete admin users
- Full access to all features

## Security Features

✅ Passwords hashed with bcrypt (salt rounds: 10)
✅ JWT tokens with expiration (7 days)
✅ HTTP-only cookies (XSS protection)
✅ Secure cookies in production
✅ Protected API routes with middleware
✅ Input validation on all forms
✅ Activity logging for audit trail

## Usage

### Login

1. Navigate to `/admin/login`
2. Enter email and password
3. Click "Login"
4. Redirected to dashboard on success

### Manage Products

1. Go to `/admin/products`
2. Click "Add Product" to create new
3. Click edit icon to update existing
4. Click delete icon to remove
5. All actions are logged automatically

### Manage Users

1. Go to `/admin/users`
2. Click "Add User" to create new admin
3. Enter name, email, password, and role
4. Click delete icon to remove user
5. All actions are logged automatically

### View Activity Logs

1. Go to `/admin/logs`
2. Use filters to narrow results
3. See who did what and when
4. Click refresh to update

## UI Components

New components created:

- `AuthProvider` - Context provider for authentication state
- `Login Page` - Admin login form
- `Activity Logs Page` - View and filter logs
- Updated `Admin Layout` - Shows user info and logout button

## File Structure

```
app/
  admin/
    layout.tsx          # Updated with auth
    login/
      page.tsx          # Login form
    logs/
      page.tsx          # Activity logs
    page.tsx            # Dashboard
    products/page.tsx   # Products management
    users/page.tsx      # Users management (updated with password)
  api/
    auth/
      login/route.ts    # Login endpoint
      logout/route.ts   # Logout endpoint
      me/route.ts       # Current user endpoint
    logs/route.ts       # Activity logs endpoint
    products/...        # Updated with auth & logging
    users/...           # Updated with auth & logging

components/
  providers/
    auth-provider.tsx   # Auth context provider

lib/
  jwt.ts               # JWT utilities
  logger.ts            # Activity logging utility
  auth-middleware.ts   # Route protection middleware

models/
  User.ts              # Updated with password & methods
  ActivityLog.ts       # Activity log model

types/
  User.ts              # Updated user type
  ActivityLog.ts       # Activity log type
```

## Testing

1. **Create an admin user** using the script or MongoDB shell
2. **Test login** at `/admin/login`
3. **Test protected routes** - try accessing `/admin` without login
4. **Test CRUD operations** on products and users
5. **Check activity logs** at `/admin/logs`
6. **Test logout** using the logout button

## Troubleshooting

**Can't login?**

- Check that user exists in database
- Verify password is correctly hashed
- Check JWT_SECRET is set in .env

**Activity logs not showing?**

- Check database connection
- Verify ActivityLog model is working
- Check browser console for errors

**TypeScript errors?**

- Run `npm install @types/jsonwebtoken @types/bcryptjs`
- Run `npm install jsonwebtoken bcryptjs`

## Next Steps

Consider adding:

- Password reset functionality
- Two-factor authentication
- Session expiry warnings
- More granular permissions
- Email notifications for important actions
- Export logs to CSV
- Advanced filtering and search

## Support

For issues or questions, check:

- MongoDB connection is working
- All environment variables are set
- Dependencies are installed
- First admin user is created
