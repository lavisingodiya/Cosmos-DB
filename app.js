const express = require("express");
const { CosmosClient } = require("@azure/cosmos");
const config = require("./config");  // Make sure your config has your Cosmos DB credentials
const app = express();

// Middleware
app.use(express.json());

// Initialize CosmosClient
const { endpoint, key, databaseId, containerId } = config;
const client = new CosmosClient({ endpoint, key });
const database = client.database(databaseId);
const container = database.container(containerId);

// 1. Create Item
app.post("/items", async (req, res) => {
  const newItem = req.body;

  try {
    // Create a new item in the container
    const { resource: createdItem } = await container.items.create(newItem);
    res.status(201).json(createdItem);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Get Item by ID
app.get("/items/:id", async (req, res) => {
  const { id } = req.params;

  try {
    // Read item by ID and Partition Key (assuming categoryId is partition key)
    const { resource: item } = await container.item(id, req.query.categoryId).read();
    if (!item) {
      res.status(404).json({ error: "Item not found" });
    } else {
      res.status(200).json(item);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Get All Items
app.get("/items", async (req, res) => {
  try {
    // Query to return all items
    const querySpec = { query: "SELECT * from c" };
    const { resources: items } = await container.items.query(querySpec).fetchAll();
    res.status(200).json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Update Item by ID
app.put("/items/:id", async (req, res) => {
  const { id } = req.params;
  const updatedItem = req.body;

  try {
    // Get the existing item using the provided id and partition key
    const { resource: existingItem } = await container.item(id, updatedItem.categoryId).read();

    if (!existingItem) {
      res.status(404).json({ error: "Item not found" });
      return;
    }

    // Merge existing item with updated data
    const mergedItem = { ...existingItem, ...updatedItem };

    // Replace the existing item with the merged item
    const { resource: updatedItemFromDB } = await container.item(id, updatedItem.categoryId).replace(mergedItem);
    res.status(200).json(updatedItemFromDB);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Delete Item by ID
app.delete("/items/:id", async (req, res) => {
  const { id } = req.params;

  try {
    // Delete the item by id and partition key
    const { resource: result } = await container.item(id, req.query.categoryId).delete();
    res.status(200).json({ message: `Item with id ${id} deleted successfully` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Handle any 404 Errors
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
