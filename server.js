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
const https = require('https');
const http = require('http');
const URL = 'https://srisaifashion.shop'; // Updated: removed www (DNS error)

// Force IPv4 preference for network connections (Fixes ENETUNREACH on many cloud providers)
if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
}

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Health check endpoint (At top for reliability)
app.get('/api/ping', (req, res) => {
    console.log(`[${new Date().toISOString()}] Ping received from: ${req.ip}`);
    res.json({ status: 'OK', timestamp: new Date() });
});

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
// express.static moved lower to allow dynamic overrides like sitemap.xml

// Keep-alive logic for Render free tier
// Note: This pinger helps but some Cloud providers ignore "self-requests" for inactivity.
// To wake a sleeping server, use the GitHub Action or an external pinger (like cron-job.org).
const APP_URL = process.env.RENDER_EXTERNAL_URL || 'https://srisaifashion.shop';
if (APP_URL) {
    const pingUrl = APP_URL.endsWith('/') ? `${APP_URL}api/ping` : `${APP_URL}/api/ping`;
    const protocol = pingUrl.startsWith('https') ? https : http;
    
    setInterval(() => {
        protocol.get(pingUrl, (res) => {
            // Consume response data to avoid leaks
            res.on('data', () => {});
            console.log(`[Keep-Alive] Bot pinged ${pingUrl} - Response: ${res.statusCode}`);
        }).on('error', (err) => {
            console.error('[Keep-Alive] Ping Error:', err.message);
        });
    }, 8 * 60 * 1000); // Increased frequency to 8 minutes
}



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
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp', 'mp4', 'mov', 'avi', 'wmv'],
        resource_type: 'auto', // Important for video support
    },
});

const upload = multer({ storage: storage });

// Models
const Product = require('./models/Product');
const Order = require('./models/Order');
const Slider = require('./models/Slider');
const Course = require('./models/Course');
const User = require('./models/User');

// Dynamic Sitemap (XML) - Helps search engines find all products
app.get('/sitemap.xml', async (req, res) => {
    try {
        const products = await Product.find({}, '_id updatedAt');
        // courses could be added too
        
        let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://srisaifashion.shop/</loc>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://srisaifashion.shop/products.html</loc>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://srisaifashion.shop/boutique.html</loc>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://srisaifashion.shop/beauty-parlour.html</loc>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://srisaifashion.shop/training.html</loc>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://srisaifashion.shop/about.html</loc>
    <priority>0.7</priority>
  </url>`;

        // Add Product detail pages
        products.forEach(p => {
            xml += `
  <url>
    <loc>https://srisaifashion.shop/product.html?id=${p._id}</loc>
    <lastmod>${(p.updatedAt || new Date()).toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
        });

        xml += `\n</urlset>`;
        res.header('Content-Type', 'application/xml');
        res.send(xml);
    } catch (err) {
        console.error('Sitemap error:', err);
        res.status(500).end();
    }
});

app.use(express.static('public'));

// --- API Routes ---

app.get('/api/health', (req, res) => {
    const status = mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected';
    res.json({ status: status, db: mongoose.connection.name });
});

// --- Middleware: Admin Auth ---
const isAdmin = async (req, res, next) => {
    try {
        const adminId = req.headers['x-admin-id'];
        if (!adminId) {
            return res.status(401).json({ message: 'Unauthorized: No Admin ID provided' });
        }
        const user = await User.findById(adminId);
        if (user && user.role === 'admin') {
            next();
        } else {
            res.status(403).json({ message: 'Forbidden: Admin access required' });
        }
    } catch (err) {
        res.status(500).json({ message: 'Server authorization error' });
    }
};

// --- Auth / Users ---
app.post('/api/auth/signup', async (req, res) => {
    try {
        const { name, email, password, phone, role } = req.body;
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ message: 'User already exists' });

        const newUser = new User({ name, email, password, phone, role: role || 'customer' });
        await newUser.save();
        res.status(201).json({ 
            message: 'User created successfully', 
            user: { 
                id: newUser._id,
                name: newUser.name, 
                email: newUser.email, 
                phone: newUser.phone, 
                role: newUser.role 
            } 
        });
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
            secure: false,
            // FORCE IPv4 (Important for Render network bypass)
            lookup: (hostname, options, callback) => {
                dns.lookup(hostname, { family: 4 }, callback);
            },
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
            from: `"Sri & Sai Fashion" <${process.env.EMAIL_USER}>`,
            subject: 'Password Reset Request',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #f0f0f0; border-radius: 12px; background-color: #ffffff; overflow: hidden;">
                    <div style="background-color: #d4a373; padding: 30px; text-align: center;">
                        <h1 style="color: white; margin: 0;">Sri & Sai Fashion</h1>
                    </div>
                    <div style="padding: 30px; background-color: #fdfaf7;">
                        <h2 style="color: #333; margin-top: 0;">Reset Your Password</h2>
                        <p style="color: #555; line-height: 1.6;">Hello,</p>
                        <p style="color: #555; line-height: 1.6;">We received a request to reset the password for your account. Click the button below to secure your account:</p>
                        <div style="text-align: center; margin: 35px 0;">
                            <a href="${resetUrl}" style="background-color: #d4a373; color: white; padding: 16px 35px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">Update My Password</a>
                        </div>
                        <p style="color: #888; font-size: 0.9rem;">This link expires in 1 hour. If you didn't request this, no action is needed.</p>
                    </div>
                    <div style="text-align: center; padding: 20px; color: #aaa; font-size: 0.8rem; border-top: 1px solid #f0f0f0;">
                        <p>© 2024 Sri & Sai Fashion & Academy<br>Tamil Nadu, India</p>
                    </div>
                </div>
            `
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

// Helper to delete from Cloudinary
const deleteFromCloudinary = async (url) => {
    if (!url || !url.includes('cloudinary.com')) return;
    try {
        // Extract public ID from URL
        // Format: .../upload/v12345678/folder/public_id.jpg
        const parts = url.split('/');
        const uploadIndex = parts.indexOf('upload');
        if (uploadIndex === -1) return;
        
        // Everything after vXXXXXXXX/ is the public ID + extension
        const publicIdWithExt = parts.slice(uploadIndex + 2).join('/');
        const publicId = publicIdWithExt.split('.')[0];
        
        const resourceType = url.includes('/video/upload/') ? 'video' : 'image';
        
        await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
        console.log(`Successfully deleted ${resourceType} from Cloudinary: ${publicId}`);
    } catch (err) {
        console.error('Error deleting from Cloudinary:', err);
    }
};

// --- Sliders ---
app.get('/api/sliders', async (req, res) => {
    try {
        // Only return necessary fields for the slider
        const sliders = await Slider.find({}, 'image url').sort({ createdAt: -1 });
        res.json(sliders);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.post('/api/sliders', isAdmin, upload.single('image'), async (req, res) => {
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

app.delete('/api/sliders/:id', isAdmin, async (req, res) => {
    try {
        const slider = await Slider.findById(req.params.id);
        if (slider && slider.image) {
            await deleteFromCloudinary(slider.image);
        }
        await Slider.findByIdAndDelete(req.params.id);
        res.json({ message: 'Slider deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// --- Courses ---
app.get('/api/courses', async (req, res) => {
    try {
        // Project only needed fields for grid view
        const courses = await Course.find({}, 'title description image duration price').sort({ createdAt: -1 });
        res.json(courses);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.post('/api/courses', isAdmin, upload.single('image'), async (req, res) => {
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

app.delete('/api/courses/:id', isAdmin, async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);
        if (course && course.image) {
            await deleteFromCloudinary(course.image);
        }
        await Course.findByIdAndDelete(req.params.id);
        res.json({ message: 'Course deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.put('/api/courses/:id', isAdmin, upload.single('image'), async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);
        if (!course) return res.status(404).json({ message: 'Course not found' });

        let imageUrl = course.image;
        if (req.file) {
            // Delete old image from Cloudinary if a new one is uploaded
            if (course.image) {
                await deleteFromCloudinary(course.image);
            }
            imageUrl = req.file.path;
        }

        const updatedData = {
            ...req.body,
            image: imageUrl
        };

        const updatedCourse = await Course.findByIdAndUpdate(req.params.id, updatedData, { new: true });
        res.json(updatedCourse);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// --- Products ---
app.get('/api/products', async (req, res) => {
    try {
        const { type } = req.query;
        let query = {};
        if (type) query.type = type;
        
        // Return only what's needed for the product card to speed up the API
        const products = await Product.find(query, 'name price image rating reviews type category stock duration').sort({ createdAt: -1 });
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
app.post('/api/products', isAdmin, upload.array('images', 5), async (req, res) => {
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
app.put('/api/products/:id', isAdmin, upload.array('images', 5), async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ message: 'Product not found' });

        let imageUrls = product.images;
        if (req.files && req.files.length > 0) {
            // Delete old images from Cloudinary if new ones are uploaded
            if (product.images && product.images.length > 0) {
                for (const oldImg of product.images) {
                    await deleteFromCloudinary(oldImg);
                }
            } else if (product.image) {
                await deleteFromCloudinary(product.image);
            }
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
app.delete('/api/products/:id', isAdmin, async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (product) {
            // Delete all associated images/videos
            if (product.images && product.images.length > 0) {
                for (const imgUrl of product.images) {
                    await deleteFromCloudinary(imgUrl);
                }
            } else if (product.image) {
                await deleteFromCloudinary(product.image);
            }
        }
        await Product.findByIdAndDelete(req.params.id);
        res.json({ message: 'Product deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 5. Get all orders
app.get('/api/orders', isAdmin, async (req, res) => {
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
app.patch('/api/orders/:id', isAdmin, async (req, res) => {
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
app.delete('/api/orders/:id', isAdmin, async (req, res) => {
    try {
        await Order.findByIdAndDelete(req.params.id);
        res.json({ message: 'Order deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 9. Rate an order item
app.post('/api/orders/:orderId/rate-item', async (req, res) => {
    try {
        const { orderId } = req.params;
        const { productId, rating } = req.body;

        const order = await Order.findById(orderId);
        if (!order) return res.status(404).json({ message: 'Order not found' });

        if (order.orderStatus !== 'Completed') {
            return res.status(400).json({ message: 'Ratings can only be given for completed orders' });
        }

        // Find the item within the order
        const item = order.items.find(i => i.productId.toString() === productId);
        if (!item) return res.status(404).json({ message: 'Item not found in order' });

        if (item.isRated) return res.status(400).json({ message: 'Item already rated' });

        // Update Product Rating
        const product = await Product.findById(productId);
        if (!product) return res.status(404).json({ message: 'Product not found' });

        const currentRating = product.rating || 5;
        const currentReviews = product.reviews || 0;

        // Calculate new average
        const newRating = ((currentRating * currentReviews) + parseFloat(rating)) / (currentReviews + 1);
        
        product.rating = newRating;
        product.reviews = currentReviews + 1;
        await product.save();

        // Mark as rated in order
        item.isRated = true;
        await order.save();

        res.json({ message: 'Rating submitted successfully', newRating: product.rating });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
