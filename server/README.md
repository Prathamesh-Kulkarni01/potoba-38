
# Restaurant App Backend API

A RESTful API for the Restaurant Management Application.

## Features

- User authentication (register, login, logout)
- Restaurant management
- Menu items management
- Table management with QR codes
- Order management
- MongoDB database

## Prerequisites

- Node.js
- MongoDB

## Installation

1. Clone the repository
2. Install dependencies
```
cd server
npm install
```

3. Configure environment variables
Create a `.env` file in the root directory with the following variables:
```
PORT=5000
MONGO_URI=mongodb://localhost:27017/restaurant-app
JWT_SECRET=your_jwt_secret
```

4. Start the server
```
npm run dev
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user

### Restaurants
- `GET /api/restaurants` - Get all restaurants for user
- `GET /api/restaurants/:id` - Get a specific restaurant
- `POST /api/restaurants` - Create a new restaurant
- `PUT /api/restaurants/:id` - Update a restaurant
- `DELETE /api/restaurants/:id` - Delete a restaurant

### Menu Items
- `GET /api/restaurants/:restaurantId/menu` - Get all menu items for a restaurant
- `GET /api/restaurants/:restaurantId/menu/:id` - Get a specific menu item
- `POST /api/restaurants/:restaurantId/menu` - Create a new menu item
- `PUT /api/restaurants/:restaurantId/menu/:id` - Update a menu item
- `DELETE /api/restaurants/:restaurantId/menu/:id` - Delete a menu item

### Tables
- `GET /api/restaurants/:restaurantId/tables` - Get all tables for a restaurant
- `GET /api/restaurants/:restaurantId/tables/:id` - Get a specific table
- `POST /api/restaurants/:restaurantId/tables` - Create a new table
- `PUT /api/restaurants/:restaurantId/tables/:id` - Update a table
- `DELETE /api/restaurants/:restaurantId/tables/:id` - Delete a table

### Orders
- `GET /api/restaurants/:restaurantId/orders` - Get all orders for a restaurant
- `GET /api/restaurants/:restaurantId/orders/:id` - Get a specific order
- `POST /api/restaurants/:restaurantId/tables/:tableId/orders` - Create a new order for a table
- `PUT /api/restaurants/:restaurantId/orders/:id` - Update an order
- `PATCH /api/restaurants/:restaurantId/orders/:id/status` - Update order status
- `DELETE /api/restaurants/:restaurantId/orders/:id` - Delete an order
