# 🍽️ Restaurant App Backend API

Welcome to the **Restaurant App Backend API**, a robust and scalable backend solution for managing restaurant operations. This API is built with **Express** and **MongoDB**, providing endpoints for user authentication, restaurant management, menu items, tables, and orders.

---

## ✨ Features

- **User Authentication**: Register, login, logout, and manage user roles.
- **Restaurant Management**: Create, update, and delete restaurants.
- **Menu Management**: Add, update, and delete menu items.
- **Table Management**: Organize tables with QR code integration.
- **Order Management**: Track and manage customer orders.
- **Database**: Powered by MongoDB for efficient data storage.

---

## 🛠️ Prerequisites

Ensure you have the following installed:

- **Node.js** (v14 or higher)
- **MongoDB** (local or cloud instance)

---

## 🚀 Installation

Follow these steps to set up the backend locally:

1. **Clone the repository**:
   ```bash
   git clone <REPOSITORY_URL>
   cd server
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   Create a `.env` file in the root directory with the following variables:
   ```env
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/restaurant-app
   JWT_SECRET=your_jwt_secret
   ```

4. **Start the development server**:
   ```bash
   npm run dev
   ```

---

## 📖 API Endpoints

### 🔑 Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user details

### 🏢 Restaurants
- `GET /api/restaurants` - Get all restaurants for the logged-in user
- `GET /api/restaurants/:id` - Get a specific restaurant
- `POST /api/restaurants` - Create a new restaurant
- `PUT /api/restaurants/:id` - Update a restaurant
- `DELETE /api/restaurants/:id` - Delete a restaurant

### 🍴 Menu Items
- `GET /api/restaurants/:restaurantId/menu` - Get all menu items for a restaurant
- `GET /api/restaurants/:restaurantId/menu/:id` - Get a specific menu item
- `POST /api/restaurants/:restaurantId/menu` - Create a new menu item
- `PUT /api/restaurants/:restaurantId/menu/:id` - Update a menu item
- `DELETE /api/restaurants/:restaurantId/menu/:id` - Delete a menu item

### 🪑 Tables
- `GET /api/restaurants/:restaurantId/tables` - Get all tables for a restaurant
- `GET /api/restaurants/:restaurantId/tables/:id` - Get a specific table
- `POST /api/restaurants/:restaurantId/tables` - Create a new table
- `PUT /api/restaurants/:restaurantId/tables/:id` - Update a table
- `DELETE /api/restaurants/:restaurantId/tables/:id` - Delete a table

### 🛒 Orders
- `GET /api/restaurants/:restaurantId/orders` - Get all orders for a restaurant
- `GET /api/restaurants/:restaurantId/orders/:id` - Get a specific order
- `POST /api/restaurants/:restaurantId/tables/:tableId/orders` - Create a new order for a table
- `PUT /api/restaurants/:restaurantId/orders/:id` - Update an order
- `PATCH /api/restaurants/:restaurantId/orders/:id/status` - Update order status
- `DELETE /api/restaurants/:restaurantId/orders/:id` - Delete an order

---

## 📂 Project Structure

```
/server
├── src
│   ├── controllers       # API logic for various resources
│   ├── middleware        # Authentication and other middleware
│   ├── models            # Mongoose schemas and models
│   ├── routes            # API route definitions
│   ├── config            # Database and environment configurations
│   └── server.js         # Entry point of the application
├── package.json          # Project dependencies and scripts
└── README.md             # Documentation
```

---

## 🛡️ Security

- Ensure the `JWT_SECRET` is kept secure and not exposed.
- Use HTTPS in production to secure API communication.

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository.
2. Create a new branch for your feature or bug fix.
3. Commit your changes and push the branch.
4. Open a pull request.

---

## 📧 Support

For support, please contact us at [support@potoba.com](mailto:support@potoba.com).

---

## 📜 License

This project is licensed under the MIT License. See the LICENSE file for details.
