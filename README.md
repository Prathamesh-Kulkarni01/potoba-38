# Potoba - Restaurant Management Platform

Potoba is a modern, AI-powered restaurant management platform designed to streamline operations, enhance customer experiences, and optimize workflows for restaurant owners and staff.

## 🌟 Features

- **AI-Powered Menu Management**: Generate and manage menu items with AI recommendations.
- **Table Management**: Organize and monitor table statuses in real-time.
- **Order Management**: Track and manage customer orders with ease.
- **Group Ordering**: Enable customers to place group orders seamlessly.
- **Customizable Themes**: Tailor the platform's appearance to match your brand.
- **QR Code Integration**: Allow customers to scan QR codes for digital menus and ordering.
- **Marketing Tools**: Run campaigns, manage promotions, and engage with customers.
- **Loyalty Programs**: Reward loyal customers with promotions and rewards.
- **API Documentation**: Easily integrate with external systems using the provided API.

## 🚀 Use Cases

1. **Restaurant Owners**: Manage menus, tables, and orders efficiently.
2. **Customers**: Enjoy a seamless dining experience with QR code-based ordering and group orders.
3. **Marketing Teams**: Run targeted campaigns and promotions to boost customer engagement.
4. **Developers**: Extend the platform's functionality using the provided API.

## 📂 Project Structure

Here is the detailed folder structure of the project:

```
/workspaces/potoba-38
├── src
│   ├── App.tsx                # Root component of the application
│   ├── index.css              # Global CSS styles
│   ├── components             # Reusable components organized by feature
│   │   ├── auth               # Components related to authentication
│   │   ├── customer           # Components for customer-facing features
│   │   ├── dashboard          # Components for the admin dashboard
│   │   ├── landing            # Components for the landing page
│   │   ├── menu               # Components for menu management
│   │   ├── order              # Components for order management
│   │   ├── settings           # Components for settings pages
│   │   ├── table              # Components for table management
│   │   ├── theme              # Components for theme customization
│   │   └── ui                 # Reusable UI components (buttons, cards, etc.)
│   ├── contexts               # React context providers for global state
│   │   └── AuthContext.tsx    # Authentication context
│   ├── hooks                  # Custom React hooks
│   │   └── use-toast.tsx      # Hook for toast notifications
│   ├── pages                  # Page components organized by route
│   │   ├── auth               # Authentication pages (Login, Signup, etc.)
│   │   ├── customer           # Customer-facing pages
│   │   ├── dashboard          # Admin dashboard pages
│   │   ├── landing            # Landing page
│   │   ├── menu               # Menu management pages
│   │   ├── onboarding         # Onboarding pages
│   │   ├── settings           # Settings pages
│   │   ├── table              # Table management pages
│   │   └── NotFound.tsx       # Fallback page for undefined routes
│   ├── services               # API service files
│   │   ├── aiService.ts       # AI-related API calls
│   │   ├── api.ts             # General API methods
│   │   └── authService.ts     # Authentication-related API calls
│   └── types                  # TypeScript type definitions
│       ├── api.ts             # Types for API responses and entities
│       └── auth.ts            # Types related to authentication
├── public                     # Static assets
│   ├── images                 # Image assets
│   │   ├── food-doodle-1.svg
│   │   ├── food-doodle-2.svg
│   │   └── potoba-logo.svg
│   └── placeholder.svg        # Placeholder image for menu items
└── package.json               # Project dependencies and scripts
```

## 🛠️ Technologies Used

- **Vite**: Fast and modern build tool.
- **TypeScript**: Strongly typed programming language for JavaScript.
- **React**: Component-based UI library.
- **shadcn-ui**: Pre-built UI components for React.
- **Tailwind CSS**: Utility-first CSS framework.

## 🖥️ How to Run Locally

Follow these steps to set up the project locally:

1. **Clone the repository**:
   ```sh
   git clone <YOUR_GIT_URL>
   cd <YOUR_PROJECT_NAME>
   ```

2. **Install dependencies**:
   ```sh
   npm install
   ```

3. **Start the development server**:
   ```sh
   npm run dev
   ```

4. **Open in your browser**:
   Visit `http://localhost:3000` to view the application.

## 🌐 Deployment

To deploy the project, visit [Potoba] and click on **Share -> Publish**.

## 📖 Documentation

- **API Documentation**: Refer to the in-app API documentation for details on available endpoints.
- **Custom Domain Setup**: [Guide to setting up a custom domain]

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository.
2. Create a new branch for your feature or bug fix.
3. Commit your changes and push the branch.
4. Open a pull request.

## 📧 Support

For support, please contact us at [support@potoba.com](mailto:support@potoba.com).
