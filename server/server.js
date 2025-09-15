// index.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json()); // Parses JSON request bodies
app.use(express.json()); // Built-in middleware for JSON (optional, as bodyParser.json() covers this)

// Connect to MongoDB Atlas
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log('MongoDB connected successfully'))
  .catch(err => console.error('MongoDB connection error:', err));

// Import the Shop model
const Shop = require('./models/Shop');

// Routes
// Get all shops or filter by category
app.get('/api/shops', async (req, res) => {
  try {
    const { category } = req.query;
    const query = category ? { businessCategory: category } : {};
    const shops = await Shop.find(query);
    res.json(shops);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new shop
app.post('/api/shops', async (req, res) => {
  try {
    const shop = new Shop(req.body);
    const savedShop = await shop.save();
    res.status(201).json(savedShop);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update a shop by ID
app.put('/api/shops/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updatedShop = await Shop.findByIdAndUpdate(id, req.body, { new: true });
    if (!updatedShop) {
      return res.status(404).json({ error: 'Shop not found' });
    }
    res.json(updatedShop);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});