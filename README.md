# Manasik Foundation - Islamic Services Platform

A modern Next.js web application for Manasik Foundation, providing Islamic religious and charitable services including Umrah, Hajj, Aqiqah, sacrifices, vows, charity, and well drilling services.

## 🌟 Features

### Public Features

- **Multilingual Support**: Arabic and English languages
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Islamic Services**: Umrah, Hajj, Aqiqah, sacrifices, vows, charity, and well drilling
- **Product Catalog**: Browse and order Islamic services
- **Aqiqah Calculator**: Calculate costs for naming ceremonies
- **Testimonials**: Customer reviews and feedback
- **FAQ Section**: Common questions and answers
- **Currency Support**: Multi-currency pricing with real-time rates
- **Theme Support**: Light and dark mode

### Admin Dashboard

- **Authentication**: JWT-based admin login with role-based access
- **User Management**: Create and manage admin users (`admin` and `super_admin` roles)
- **Product Management**: Add, edit, and manage Islamic services with image upload
- **Image Upload**: Direct upload to Cloudinary with automatic optimization
- **Order Management**: View and process customer orders
- **Country Management**: Manage supported countries and currencies
- **Activity Logging**: Complete audit trail of all admin actions
- **Payment Integration**: Paymob payment gateway integration

## 🛠️ Tech Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT with bcrypt password hashing
- **Styling**: Tailwind CSS v4
- **Internationalization**: next-intl
- **Payment**: Paymob Payment Gateway
- **Image Upload**: Cloudinary
- **Icons**: Lucide React
- **Theme**: next-themes
- **Forms**: React Hook Form (planned)

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- MongoDB (local or cloud instance)
- Cloudinary account (for image uploads)
- Paymob account (for payment features)

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd manasik-v2
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   Create a `.env.local` file in the root directory:

   ```env
   # Authentication
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-make-it-long

   # Database
   DATA_BASE_URL=mongodb://localhost:27017/manasik

   # Application
   BASE_URL=http://localhost:3000
   NODE_ENV=development

   # Cloudinary Image Upload
   CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_API_KEY=your-api-key
   CLOUDINARY_API_SECRET=your-api-secret

   # Paymob Payment Gateway (optional for basic functionality)
   PAYMOB_SECRET_KEY=your-paymob-secret-key
   PAYMOB_PUBLIC_KEY=your-paymob-public-key
   PAYMOB_INTEGRATION_ID=your-integration-id
   PAYMOB_HMAC_SECRET=your-hmac-secret
   PAYMOB_BASE_URL=https://accept.paymob.com
   ```

4. **Seed countries data**

   ```bash
   npm run seed:countries
   ```

5. **Create your first admin user**

   ```bash
   npx tsx scripts/create-admin.ts
   ```

6. **Start the development server**

   ```bash
   npm run dev
   ```

7. **Access the application**
   - Public site: [http://localhost:3000](http://localhost:3000)
   - Admin login: [http://localhost:3000/admin/login](http://localhost:3000/admin/login)

## 📁 Project Structure

```
manasik-v2/
├── app/                    # Next.js App Router pages
│   ├── admin/             # Admin dashboard pages
│   ├── api/               # API routes
│   ├── products/          # Product pages
│   └── payment/           # Payment status pages
├── components/            # React components
│   ├── landing/          # Landing page components
│   ├── layout/           # Layout components
│   ├── shared/           # Shared components
│   └── ui/               # UI components
├── docs/                  # Documentation
├── lib/                   # Utility libraries
├── models/               # MongoDB models
├── types/                # TypeScript type definitions
├── messages/             # Internationalization files
├── public/               # Static assets
└── scripts/              # Utility scripts
```

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run seed:countries` - Seed countries data

## 📚 Documentation

- [Quick Start Guide](./docs/QUICK_START.md)
- [Admin Setup](./docs/ADMIN_SETUP.md)
- [Cloudinary Image Upload](./docs/CLOUDINARY.md)
- [Paymob Integration](./docs/PAYMOB.md)

## 🔐 Security Features

- JWT authentication with HTTP-only cookies
- Password hashing with bcrypt
- Role-based access control
- Activity logging for audit trails
- HMAC verification for payment webhooks
- Input validation and sanitization

## 🌍 Internationalization

The application supports Arabic and English languages with:

- RTL/LTR text direction support
- Localized content and messages
- Currency formatting
- Date formatting

## 💳 Payment Integration

Integrated with Paymob payment gateway featuring:

- Secure payment processing
- Multiple payment methods
- Webhook verification
- Order status tracking
- Transaction logging

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## 📄 License

This project is private and proprietary to Manasik Foundation.

## 📞 Support

For support or questions, please contact the development team.

---

**Manasik Foundation** - We perform on your behalf with legal proxy, bringing Islamic services to your fingertips with trust and professionalism.
