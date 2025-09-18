const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
  street: { type: String, required: true },
  pincode: { type: String, required: true },
  village: { type: String },
  taluka: { type: String },
  district: { type: String },
  state: { type: String, required: true },
  country: { type: String, default: 'India' }
});

const shopSchema = new mongoose.Schema({
  businessCategory: { type: String, required: true },
  ownerName: { type: String, required: true },
  shopName: { type: String, required: true },
  shopPhone: { type: String, required: true },
  email: { type: String, required: true },
  website: { type: String },
  address: addressSchema
}, { timestamps: true });

module.exports = mongoose.model('Shop', shopSchema);