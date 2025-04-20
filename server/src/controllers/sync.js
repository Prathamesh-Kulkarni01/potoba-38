
const mongoose = require('mongoose');
const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');
const Table = require('../models/Table');
const Order = require('../models/Order');
const User = require('../models/User');

// Helper to connect to a specific MongoDB instance
const connectToDatabase = async (connectionString) => {
  try {
    const connection = await mongoose.createConnection(connectionString, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    return connection;
  } catch (error) {
    throw new Error(`Failed to connect to database: ${error.message}`);
  }
};

// Helper to get all documents from a collection
const getAllDocuments = async (connection, modelName, schema) => {
  const Model = connection.model(modelName, schema);
  return await Model.find({}).lean();
};

// Helper to insert or update documents in a collection
const syncDocuments = async (sourceDocuments, targetConnection, modelName, schema) => {
  const Model = targetConnection.model(modelName, schema);
  
  const results = {
    created: 0,
    updated: 0,
    errors: 0
  };
  
  for (const doc of sourceDocuments) {
    try {
      // Remove mongoose-specific fields
      const cleanDoc = { ...doc };
      delete cleanDoc.__v;
      
      // Try to update first, if it doesn't exist, create it
      const result = await Model.updateOne(
        { _id: doc._id }, 
        cleanDoc, 
        { upsert: true }
      );
      
      if (result.upsertedCount > 0) {
        results.created++;
      } else if (result.modifiedCount > 0) {
        results.updated++;
      }
    } catch (error) {
      console.error(`Error syncing document ${doc._id}:`, error);
      results.errors++;
    }
  }
  
  return results;
};

// Sync databases controller
exports.syncDatabases = async (req, res) => {
  const { localMongoUrl, remoteMongoUrl } = req.body;
  
  if (!localMongoUrl || !remoteMongoUrl) {
    return res.status(400).json({ 
      success: false, 
      error: 'Both local and remote MongoDB URLs are required' 
    });
  }
  
  try {
    // Connect to both databases
    const localDb = await connectToDatabase(localMongoUrl);
    const remoteDb = await connectToDatabase(remoteMongoUrl);
    
    // Get all documents from both databases
    const localRestaurants = await getAllDocuments(localDb, 'Restaurant', Restaurant.schema);
    const localMenuItems = await getAllDocuments(localDb, 'MenuItem', MenuItem.schema);
    const localTables = await getAllDocuments(localDb, 'Table', Table.schema);
    const localOrders = await getAllDocuments(localDb, 'Order', Order.schema);
    const localUsers = await getAllDocuments(localDb, 'User', User.schema);
    
    const remoteRestaurants = await getAllDocuments(remoteDb, 'Restaurant', Restaurant.schema);
    const remoteMenuItems = await getAllDocuments(remoteDb, 'MenuItem', MenuItem.schema);
    const remoteTables = await getAllDocuments(remoteDb, 'Table', Table.schema);
    const remoteOrders = await getAllDocuments(remoteDb, 'Order', Order.schema);
    const remoteUsers = await getAllDocuments(remoteDb, 'User', User.schema);
    
    // Sync local to remote
    const localToRemoteResults = {
      restaurants: await syncDocuments(localRestaurants, remoteDb, 'Restaurant', Restaurant.schema),
      menuItems: await syncDocuments(localMenuItems, remoteDb, 'MenuItem', MenuItem.schema),
      tables: await syncDocuments(localTables, remoteDb, 'Table', Table.schema),
      orders: await syncDocuments(localOrders, remoteDb, 'Order', Order.schema),
      users: await syncDocuments(localUsers, remoteDb, 'User', User.schema)
    };
    
    // Sync remote to local
    const remoteToLocalResults = {
      restaurants: await syncDocuments(remoteRestaurants, localDb, 'Restaurant', Restaurant.schema),
      menuItems: await syncDocuments(remoteMenuItems, localDb, 'MenuItem', MenuItem.schema),
      tables: await syncDocuments(remoteTables, localDb, 'Table', Table.schema),
      orders: await syncDocuments(remoteOrders, localDb, 'Order', Order.schema),
      users: await syncDocuments(remoteUsers, localDb, 'User', User.schema)
    };
    
    // Close connections
    await localDb.close();
    await remoteDb.close();
    
    return res.status(200).json({
      success: true,
      data: {
        localToRemote: localToRemoteResults,
        remoteToLocal: remoteToLocalResults
      }
    });
  } catch (error) {
    console.error('Database sync error:', error);
    return res.status(500).json({
      success: false,
      error: `Failed to sync databases: ${error.message}`
    });
  }
};
