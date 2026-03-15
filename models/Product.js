const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    price: { type: Number, required: true },
    type: { type: String, required: true }, // 'boutique' or 'beauty-parlour'
    category: { type: String, required: true },
    stock: { type: Number, default: 0 },
    image: { type: String }, // Primary image URL from Cloudinary
    images: [{ type: String }], // Array of image URLs from Cloudinary
    description: { type: String },
    duration: { type: String }, // For beauty-parlour
    concern: { type: String },  // For beauty-parlour
    serviceType: { type: String }, // For beauty-parlour
    availability: { type: String },
    rating: { type: Number, default: 5 },
    reviews: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Product', productSchema);
