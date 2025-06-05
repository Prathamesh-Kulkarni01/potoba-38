
# AI Context for Firebase Studio (Potoba Project)

This document outlines the Firebase Firestore data structure used in the Potoba project. It is intended as a reference for AI-assisted development to ensure consistency and leverage existing schemas and data access patterns.

⚠️ **All AI-generated code MUST use existing schema/types and CRUD functions referenced below. Do NOT invent new collection paths or data structures unless explicitly instructed to refactor them.**

## Core Data Model & Type Definitions

All primary data types and interfaces are defined in:
- **`src/types/index.ts`**

This file contains definitions for `UserProfile`, `RestaurantProfile`, `MenuCategory`, `MenuItem`, `OrderItem`, `Order`, `Table`, `InventoryItem`, `StaffInvitation`, etc.

## Firebase Collections & Associated Logic

### 1. Users Collection

*   **Path**: `users/{userId}`
*   **Primary Schema/Type**: `UserProfile` (from `src/types/index.ts`)
*   **CRUD Logic**:
    *   `src/lib/firebase/firestore.ts` (functions like `createUserProfile`, `getUserProfile`, `updateUserProfile`)
    *   Authentication handled by Firebase Auth, with user profile documents stored in Firestore.

### 2. Restaurants Collection

*   **Path**: `restaurants/{restaurantId}`
*   **Primary Schema/Type**: `RestaurantProfile` (from `src/types/index.ts`)
*   **CRUD Logic**:
    *   `src/lib/firebase/firestore.ts` (functions like `createRestaurant`, `getRestaurant`, `updateRestaurantProfile`, `getRestaurantsByOwner`)

### 3. Menu System (Subcollections under a Restaurant)

#### a. Menu Categories

*   **Path**: `restaurants/{restaurantId}/menuCategories/{categoryId}`
*   **Primary Schema/Type**: `MenuCategory` (from `src/types/index.ts`)
*   **CRUD Logic**: `src/lib/firebase/menu.ts` (functions like `getMenuCategories`, `addMenuCategory`, `updateMenuCategory`, `deleteMenuCategory`)

#### b. Menu Subcategories

*   **Path**: `restaurants/{restaurantId}/menuCategories/{categoryId}/menuSubcategories/{subcategoryId}`
*   **Primary Schema/Type**: `MenuSubcategory` (from `src/types/index.ts`)
*   **CRUD Logic**: `src/lib/firebase/menu.ts` (functions like `getMenuSubcategories`, `addMenuSubcategory`, `updateMenuSubcategory`, `deleteMenuSubcategory`)

#### c. Menu Items

*   **Path (Directly under Category)**: `restaurants/{restaurantId}/menuCategories/{categoryId}/menuItems/{itemId}`
*   **Path (Under Subcategory)**: `restaurants/{restaurantId}/menuCategories/{categoryId}/menuSubcategories/{subcategoryId}/menuItems/{itemId}`
    *   *Note*: Menu items can exist directly under a category or nested under a subcategory. Each `MenuItem` document ID is also stored as `itemIdString` within the document for collection group queries.
*   **Primary Schema/Type**: `MenuItem` (from `src/types/index.ts`)
*   **CRUD Logic**: `src/lib/firebase/menu.ts` (functions like `getMenuItems`, `addMenuItem`, `updateMenuItem`, `deleteMenuItem`, `getMenuItemByIdFromGroup`)
*   **Collection Group Query Note**: `getMenuItemByIdFromGroup` uses a collection group query on `menuItems` using the `itemIdString` field.

### 4. Orders Collection

*   **Path**: `restaurants/{restaurantId}/orders/{orderId}`
*   **Primary Schema/Type**: `Order` / `ClientOrder` (from `src/types/index.ts`)
*   **CRUD Logic**: `src/lib/firebase/orders.ts` (functions like `createOrder`, `getOrder`, `updateOrder`, `cancelOrder`, `getOrdersByRestaurant`, `getOrdersByTable`, dashboard-specific summaries, `updateOrderItemStatusInFirestore`, `deriveOverallOrderStatus`)
*   **Utility Path Function**: `getOrdersCollectionPath(restaurantId)` in `src/lib/firebase/utils.ts`
*   **Key Feature - `items` array**:
    *   The `items` field within an `Order` document is an array of `OrderItem` objects.
    *   **Each `OrderItem` has its own `uniqueId`, `status`, `notes`, `instructions`, `createdAt`, and `updatedAt` fields.** This allows for granular tracking and management of individual items within a single order.
    *   `uniqueId`: A client-generated unique identifier for each line item instance, crucial for updating specific items.
    *   `status` (`OrderItemStatus`): `'pending'` (waiter app local), `'sent_to_kitchen'`, `'confirmed_by_kitchen'`, `'preparing'`, `'ready_for_pickup'`, `'served'`, `'cancelled_by_kitchen'`, `'cancelled_by_customer'`.
    *   `notes`: Internal staff notes about the item (can be used for kitchen remarks).
    *   `instructions`: Customer-provided special instructions for the item.
    *   `createdAt` (on `OrderItem`): Timestamp (number) for when the item was added to the order locally.
    *   `updatedAt` (on `OrderItem`): Timestamp (number) for when the individual item was last updated (e.g., status change).
*   **Overall Order Status (`Order.status`)**: This status is **derived automatically** based on the collective statuses of all `OrderItem`s within that order. The logic for this derivation is primarily in `deriveOverallOrderStatus` function in `src/lib/firebase/orders.ts` and is applied before any Firestore write operation that might affect item statuses or item composition. Do not manually set the top-level order status; rely on the derivation logic.

### 5. Kitchen Display System (KDS) / Kitchen Order Ticket (KOT) Module

*   **Primary Data Source**: Real-time listener on `restaurants/{restaurantId}/orders/{orderId}` for orders with overall statuses relevant to kitchen operations (e.g., `pending_kitchen`, `confirmed_by_kitchen`, `preparing`, `ready_for_pickup`). Individual item statuses are displayed within each KOT.
*   **Core Logic**:
    *   `src/app/dashboard/restaurant/[restaurantId]/kitchen/page.tsx`: Main client component for KDS display and interaction.
    *   `src/lib/firebase/orders.ts` (specifically `updateOrderItemStatusInFirestore`): Used by KDS to update the status of individual `OrderItem`s within an `Order` document. This function also triggers the re-derivation of the overall order status.
*   **Functionality**: Allows kitchen staff to view incoming order items, manage their preparation status individually (e.g., confirm, prepare, mark as ready), and see relevant details like table number, item instructions, and elapsed time.

### 6. Tables Collection

*   **Path**: `restaurants/{restaurantId}/tables/{tableId}` (where `tableId` is the Firestore document ID, and this is also stored as `tableDocId` within the document for collection group queries).
*   **Primary Schema/Type**: `Table` (from `src/types/index.ts`)
*   **CRUD Logic**: `src/lib/firebase/tables.ts` (functions like `addTable`, `getTables`, `updateTable`, `deleteTable`, `getTableByDocIdFromGroup`)
*   **Utility Path Function**: `getTablesCollectionPath(restaurantId)` in `src/lib/firebase/utils.ts`

#### a. Table Areas (Subcollection under Restaurant)

*   **Path**: `restaurants/{restaurantId}/tableAreas/{areaId}`
*   **Primary Schema/Type**: `TableArea` (from `src/types/index.ts`)
*   **CRUD Logic**: `src/lib/firebase/tables.ts` (functions like `addTableArea`, `getTableAreas`, `updateTableArea`, `deleteTableArea`)

### 7. Table Groups Collection (for group ordering at a table)

*   **Path**: `restaurants/{restaurantId}/tableGroups/{groupCode}`
*   **Primary Schema/Type**: `TableGroup` / `ClientTableGroup` (from `src/types/index.ts`)
*   **CRUD Logic**: `src/lib/firebase/groups.ts` (functions like `createTableGroup`, `joinTableGroup`, `getTableGroup`, `addItemToGroupCart`)
*   **Note**: `GroupCartItem` within `TableGroup.cartItems` also has its own `addedByUid` and `addedByName`.

### 8. Inventory Items Collection

*   **Path**: `restaurants/{restaurantId}/inventoryItems/{itemId}`
*   **Primary Schema/Type**: `InventoryItem` (from `src/types/index.ts`)
*   **CRUD Logic**: `src/lib/firebase/inventory.ts` (functions like `addInventoryItem`, `getInventoryItems`, `updateInventoryItem`, `deleteInventoryItem`)

### 9. Stock Transactions Collection

*   **Path**: `restaurants/{restaurantId}/stockTransactions/{transactionId}`
*   **Primary Schema/Type**: `StockTransaction` (from `src/types/index.ts`)
*   **CRUD Logic**: `src/lib/firebase/inventory.ts` (functions like `recordPurchase`, `recordStockOutflow`, `deductStockForSoldItems`, `getStockTransactions`)

### 10. Staff Invitations (Subcollection under a Restaurant)

*   **Path**: `restaurants/{restaurantId}/staffInvitations/{invitationId}`
*   **Primary Schema/Type**: `StaffInvitation` (from `src/types/index.ts`)
*   **CRUD Logic**: `src/lib/firebase/firestore.ts` (functions like `inviteStaffMember`, `getPendingStaffInvitations`)

## General Guidelines for AI

*   **Schema Adherence**: Strictly follow the types defined in `src/types/index.ts`.
*   **Use Existing Functions**: Prioritize using the CRUD functions in the `src/lib/firebase/` directory.
*   **Server Timestamps**: Use `serverTimestamp()` for `createdAt` and `updatedAt` fields on main documents when creating or updating documents. Individual `OrderItem` timestamps are client-generated `Date.now()` and are persisted as numbers.
*   **Data Sanitization**: Ensure that any optional fields that are `undefined` are explicitly set to `null` before writing to Firestore (see utility functions in `src/lib/firebase/orders.ts` for examples of sanitization, especially `sanitizeOrderItem`).
*   **Collection Group Queries**: Be mindful of fields needed for collection group queries (e.g., `itemIdString` on `menuItems`, `tableDocId` on `tables`) and ensure they are correctly populated and indexed.
*   **Firebase Configuration**: Firestore is initialized in `src/lib/firebase/config.ts`.

**If changes to this data structure or these CRUD functions are made, this `README.ai.md` file MUST be updated to reflect those changes.**

    