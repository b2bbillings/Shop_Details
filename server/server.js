const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');
const path = require('path');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const _dirname = path.resolve();

// CORS Options
const corsOptions = {
     origin: process.env.NODE_ENV === 'production' 
       ? ["https://shop-details.onrender.com"]
       : ["http://localhost:5173", "https://shop-details.onrender.com"],
     credentials: true,
   };

app.use(cors(corsOptions));

app.use(bodyParser.json());
app.use(express.json());

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
// Get all shops or filter by category, state, district, taluka, village
app.get('/api/shops', async (req, res) => {
  try {
    const { category, state, district, taluka, village } = req.query;
    const query = {};
    if (category) query.businessCategory = category;
    if (state) query['address.state'] = state;
    if (district) query['address.district'] = district;
    if (taluka) query['address.taluka'] = taluka;
    if (village) query['address.village'] = village;
    const shops = await Shop.find(query);
    res.json(shops);
  } catch (err) {
    console.error('Error fetching shops:', err);
    res.status(500).json({ error: 'Failed to fetch shops: ' + err.message });
  }
});

// Create a new shop
app.post('/api/shops', async (req, res) => {
  try {
    const shop = new Shop(req.body);
    const savedShop = await shop.save();
    res.status(201).json(savedShop);
  } catch (err) {
    console.error('Error creating shop:', err);
    res.status(400).json({ error: 'Failed to create shop: ' + err.message });
  }
});

// Update a shop by ID
app.put('/api/shops/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid shop ID' });
    }
    const updatedShop = await Shop.findByIdAndUpdate(id, req.body, { new: true });
    if (!updatedShop) {
      return res.status(404).json({ error: 'Shop not found' });
    }
    res.json(updatedShop);
  } catch (err) {
    console.error('Error updating shop:', err);
    res.status(400).json({ error: 'Failed to update shop: ' + err.message });
  }
});

// Delete a shop by ID
app.delete('/api/shops/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid shop ID' });
    }
    const deletedShop = await Shop.findByIdAndDelete(id);
    if (!deletedShop) {
      return res.status(404).json({ error: 'Shop not found' });
    }
    res.json({ message: 'Shop deleted successfully' });
  } catch (err) {
    console.error('Error deleting shop:', err);
    res.status(500).json({ error: 'Failed to delete shop: ' + err.message });
  }
});

// Get unique states
app.get('/api/states', async (req, res) => {
  try {
    const states = await Shop.distinct('address.state');
    res.json(states.filter(state => state));
  } catch (err) {
    console.error('Error fetching states:', err);
    res.status(500).json({ error: 'Failed to fetch states: ' + err.message });
  }
});

// Get unique districts
app.get('/api/districts', async (req, res) => {
  try {
    const districts = await Shop.distinct('address.district');
    res.json(districts.filter(district => district));
  } catch (err) {
    console.error('Error fetching districts:', err);
    res.status(500).json({ error: 'Failed to fetch districts: ' + err.message });
  }
});

// Get unique talukas
app.get('/api/talukas', async (req, res) => {
  try {
    const talukas = await Shop.distinct('address.taluka');
    res.json(talukas.filter(taluka => taluka));
  } catch (err) {
    console.error('Error fetching talukas:', err);
    res.status(500).json({ error: 'Failed to fetch talukas: ' + err.message });
  }
});

// Get unique villages
app.get('/api/villages', async (req, res) => {
  try {
    const villages = await Shop.distinct('address.village');
    res.json(villages.filter(village => village));
  } catch (err) {
    console.error('Error fetching villages:', err);
    res.status(500).json({ error: 'Failed to fetch villages: ' + err.message });
  }
});

// Serve frontend (React build)
app.use(express.static(path.join(_dirname, '/Client/dist')));
app.get('*', (req, res) => {
  res.sendFile(path.resolve(_dirname, "Client", "dist", "index.html"));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
