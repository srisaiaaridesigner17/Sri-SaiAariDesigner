const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    customerName: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    items: [{
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        name: { type: String },
        price: { type: Number },
        qty: { type: Number },
        image: { type: String },
        isRated: { type: Boolean, default: false }
    }],
    customization: {
        fabric: String,
        neck: String,
        sleeve: String,
        work: String,
        notes: String
    },
    totalAmount: { type: Number, required: true },
    paymentStatus: { type: String, default: 'Pending' },
    orderStatus: { type: String, default: 'Pending' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', orderSchema);
