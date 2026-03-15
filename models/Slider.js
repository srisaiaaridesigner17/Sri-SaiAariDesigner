const mongoose = require('mongoose');

const sliderSchema = new mongoose.Schema({
    title: { type: String },
    subtitle: { type: String },
    image: { type: String, required: true },
    link: { type: String },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Slider', sliderSchema);
