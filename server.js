const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const dns = require('dns');

// Force IPv4 preference for network connections (Fixes ENETUNREACH on many cloud providers)
if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
}

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(express.static('public'));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ Connected to MongoDB Atlas'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err));

// Cloudinary Configuration
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Multer storage for Cloudinary
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'aari_project_products',
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
    },
});

const upload = multer({ storage: storage });

// Models
const Product = require('./models/Product');
const Order = require('./models/Order');
const Slider = require('./models/Slider');
const Course = require('./models/Course');
const User = require('./models/User');

// --- API Routes ---

app.get('/api/health', (req, res) => {
    const status = mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected';
    res.json({ status: status, db: mongoose.connection.name });
});

// --- Auth / Users ---
app.post('/api/auth/signup', async (req, res) => {
    try {
        const { name, email, password, phone, role } = req.body;
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ message: 'User already exists' });

        const newUser = new User({ name, email, password, phone, role: role || 'customer' });
        await newUser.save();
        res.status(201).json({ message: 'User created successfully', user: { name, email, phone, role: newUser.role } });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password, firebaseVerified } = req.body;

        let user;
        if (firebaseVerified) {
            // If already verified by Firebase on frontend, just get the profile
            user = await User.findOne({ email });
        } else {
            // Traditional login check
            user = await User.findOne({ email, password });
        }

        if (!user) return res.status(401).json({ message: 'Invalid credentials or account not found' });

        res.json({
            message: 'Login successful',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phone,
                profileImage: user.profileImage,
                cart: user.cart,
                wishlist: user.wishlist
            }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.post('/api/auth/google', async (req, res) => {
    try {
        const { name, email, googleId, profileImage } = req.body;
        let user = await User.findOne({ email });

        if (!user) {
            user = new User({ name, email, googleId, profileImage, role: 'customer' });
            await user.save();
        } else if (!user.googleId) {
            user.googleId = googleId;
            if (profileImage && !user.profileImage) user.profileImage = profileImage;
            await user.save();
        }

        res.json({
            message: 'Login successful',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phone,
                profileImage: user.profileImage,
                cart: user.cart,
                wishlist: user.wishlist
            }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.patch('/api/auth/profile/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const user = await User.findByIdAndUpdate(id, updates, { new: true });
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json({
            message: 'Profile updated',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phone,
                profileImage: user.profileImage,
                cart: user.cart,
                wishlist: user.wishlist
            }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.get('/api/auth/profile/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json({
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phone,
                profileImage: user.profileImage,
                cart: user.cart,
                wishlist: user.wishlist
            }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Sync cart and wishlist
app.patch('/api/auth/sync/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { cart, wishlist } = req.body;
        const user = await User.findByIdAndUpdate(id, { cart, wishlist }, { new: true });
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json({ message: 'Sync successful', cart: user.cart, wishlist: user.wishlist });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// --- Password Reset ---
app.post('/api/auth/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: 'User not found' });

        const token = crypto.randomBytes(20).toString('hex');
        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
        await user.save();

        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false, // false for port 587
            family: 4,     // Force IPv4
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            },
            tls: {
                rejectUnauthorized: false
            }
        });

        const protocol = req.headers['x-forwarded-proto'] || req.protocol;
        const resetUrl = `${protocol}://${req.get('host')}/reset-password.html?token=${token}`;

        const mailOptions = {
            to: user.email,
            from: process.env.EMAIL_USER,
            subject: 'Password Reset | Sri & Sai Aari Fashion',
            text: `You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n` +
                `Please click on the following link, or paste this into your browser to complete the process:\n\n` +
                `${resetUrl}\n\n` +
                `If you did not request this, please ignore this email and your password will remain unchanged.\n`
        };

        await transporter.sendMail(mailOptions);
        res.json({ message: 'Reset email sent successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.post('/api/auth/reset-password', async (req, res) => {
    try {
        const { token, password } = req.body;
        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) return res.status(400).json({ message: 'Password reset token is invalid or has expired' });

        user.password = password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.json({ message: 'Password has been reset successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// --- Sliders ---
app.get('/api/sliders', async (req, res) => {
    try {
        const sliders = await Slider.find().sort({ createdAt: -1 });
        res.json(sliders);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.post('/api/sliders', upload.single('image'), async (req, res) => {
    try {
        const newSlider = new Slider({
            ...req.body,
            image: req.file ? req.file.path : ''
        });
        const savedSlider = await newSlider.save();
        res.status(201).json(savedSlider);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

app.delete('/api/sliders/:id', async (req, res) => {
    try {
        await Slider.findByIdAndDelete(req.params.id);
        res.json({ message: 'Slider deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// --- Courses ---
app.get('/api/courses', async (req, res) => {
    try {
        const courses = await Course.find().sort({ createdAt: -1 });
        res.json(courses);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.post('/api/courses', upload.single('image'), async (req, res) => {
    try {
        const newCourse = new Course({
            ...req.body,
            image: req.file ? req.file.path : ''
        });
        const savedCourse = await newCourse.save();
        res.status(201).json(savedCourse);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

app.delete('/api/courses/:id', async (req, res) => {
    try {
        await Course.findByIdAndDelete(req.params.id);
        res.json({ message: 'Course deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// --- Products ---
app.get('/api/products', async (req, res) => {
    try {
        const products = await Product.find().sort({ createdAt: -1 });
        res.json(products);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.get('/api/products/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ message: 'Product not found' });
        res.json(product);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 2. Add a new product
app.post('/api/products', upload.array('images', 5), async (req, res) => {
    try {
        const imageUrls = req.files ? req.files.map(file => file.path) : [];

        const newProduct = new Product({
            ...req.body,
            image: imageUrls[0] || '',
            images: imageUrls,
            price: parseFloat(req.body.price),
            stock: parseInt(req.body.stock)
        });

        const savedProduct = await newProduct.save();
        res.status(201).json(savedProduct);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// 3. Update a product
app.put('/api/products/:id', upload.array('images', 5), async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ message: 'Product not found' });

        let imageUrls = product.images;
        if (req.files && req.files.length > 0) {
            imageUrls = req.files.map(file => file.path);
        }

        const updatedData = {
            ...req.body,
            image: imageUrls[0] || product.image,
            images: imageUrls
        };

        const updatedProduct = await Product.findByIdAndUpdate(req.params.id, updatedData, { new: true });
        res.json(updatedProduct);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// 4. Delete a product
app.delete('/api/products/:id', async (req, res) => {
    try {
        await Product.findByIdAndDelete(req.params.id);
        res.json({ message: 'Product deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 5. Get all orders
app.get('/api/orders', async (req, res) => {
    try {
        const orders = await Order.find().sort({ createdAt: -1 });
        res.json(orders);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.get('/api/orders/user/:userId', async (req, res) => {
    try {
        const orders = await Order.find({ userId: req.params.userId }).sort({ createdAt: -1 });
        res.json(orders);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 6. Create an order
app.post('/api/orders', async (req, res) => {
    try {
        const newOrder = new Order(req.body);
        const savedOrder = await newOrder.save();
        res.status(201).json(savedOrder);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// 7. Update order status
app.patch('/api/orders/:id', async (req, res) => {
    try {
        const updatedOrder = await Order.findByIdAndUpdate(
            req.params.id,
            { orderStatus: req.body.orderStatus },
            { new: true }
        );
        res.json(updatedOrder);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// 8. Delete an order
app.delete('/api/orders/:id', async (req, res) => {
    try {
        await Order.findByIdAndDelete(req.params.id);
        res.json({ message: 'Order deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
