// =========================================
// admin.js – API-based Admin Panel
// =========================================

// ---- Auth Helpers ----

function showSection(sectionId) {
    document.querySelectorAll('.auth-section').forEach(s => s.style.display = 'none');
    document.getElementById(sectionId + '-section').style.display = 'block';
    
    const subtitle = document.getElementById('auth-subtitle');
    if (subtitle) {
        if (sectionId === 'login') subtitle.innerText = 'Welcome back! Please login to your account.';
        if (sectionId === 'signup') subtitle.innerText = 'Join us! Create a new account to get started.';
        if (sectionId === 'forgot') subtitle.innerText = 'Forgot your password? No worries.';
    }

    // Hide messages
    const errEl = document.getElementById('auth-error');
    const succEl = document.getElementById('auth-success');
    if (errEl) errEl.style.display = 'none';
    if (succEl) succEl.style.display = 'none';
}

function showAuthMessage(type, message) {
    const errorEl = document.getElementById('auth-error');
    const successEl = document.getElementById('auth-success');
    
    if (errorEl) errorEl.style.display = 'none';
    if (successEl) successEl.style.display = 'none';

    if (type === 'error' && errorEl) {
        errorEl.innerText = message;
        errorEl.style.display = 'block';
    } else if (successEl) {
        successEl.innerText = message;
        successEl.style.display = 'block';
    }
}

// ---- Auth ----

function checkAuth() {
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    const path = window.location.pathname;

    const isLoginPage = path.includes('login.html');

    if (!user || user.role !== 'admin') {
        if (!isLoginPage) {
            window.location.href = '../login.html';
        }
    } else {
        if (isLoginPage) {
            window.location.href = 'dashboard.html';
        }
    }
}

function logout() {
    localStorage.removeItem('user');
    localStorage.removeItem('userToken');
    window.location.href = '../login.html';
}

// ---- Login Handler ----
const loginForm = document.getElementById('admin-login-form');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        try {
            const res = await window.api.login({ email, password });
            if (res.user && res.user.role === 'admin') {
                localStorage.setItem('userToken', 'admin-token-' + Date.now());
                localStorage.setItem('user', JSON.stringify(res.user));
                window.location.href = 'dashboard.html';
            } else if (res.user) {
                showAuthMessage('error', 'Access denied. You do not have admin privileges.');
            } else {
                showAuthMessage('error', res.message || 'Invalid credentials.');
            }
        } catch (err) {
            showAuthMessage('error', 'Server error. Please try again.');
        }
    });
}

// ---- Forgot Password Handler ----
const forgotForm = document.getElementById('admin-forgot-form');
if (forgotForm) {
    forgotForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('forgot-email').value;
        const btn = e.target.querySelector('button');
        const originalText = btn.innerText;

        try {
            btn.innerText = 'Sending...';
            btn.disabled = true;
            const res = await window.api.forgotPassword(email);
            if (res.message.includes('successfully')) {
                showAuthMessage('success', 'Reset link sent! Please check your email.');
            } else {
                showAuthMessage('error', res.message || 'Failed to send reset link');
            }
        } catch (err) {
            showAuthMessage('error', 'Server error. Please try again.');
        } finally {
            btn.innerText = originalText;
            btn.disabled = false;
        }
    });
}

// ---- Dashboard ----
async function loadDashboardData() {
    if (!window.api) return console.error('API helper not loaded');
    const products = await window.api.getProducts();
    const orders = await window.api.getOrders();

    // Stats
    document.getElementById('total-products').innerText = products.length;
    document.getElementById('total-orders').innerText = orders.length;

    const pendingOrders = orders.filter(o => o.orderStatus === 'Pending');
    document.getElementById('pending-orders').innerText = pendingOrders.length;

    // Recent Orders (last 5)
    const recentOrdersBody = document.getElementById('recent-orders-body');
    if (orders.length === 0) {
        recentOrdersBody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#888; padding:30px;">No orders yet.</td></tr>';
        return;
    }

    const recentLimit = orders.slice(0, 5); 
    recentOrdersBody.innerHTML = recentLimit.map(order => `
        <tr>
            <td><strong>${order._id.substring(0, 8)}...</strong></td>
            <td>${order.customerName || 'N/A'}</td>
            <td>₹ ${order.totalAmount || 0}</td>
            <td>
                <span class="badge badge-${order.orderStatus ? order.orderStatus.toLowerCase() : 'pending'}">
                    ${order.orderStatus || 'Pending'}
                </span>
            </td>
            <td>${order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A'}</td>
        </tr>
    `).join('');
}

// ---- Orders Page ----
async function loadAllOrders() {
    if (!window.api) return;
    const orders = await window.api.getOrders();
    const ordersBody = document.getElementById('orders-body');

    if (orders.length === 0) {
        ordersBody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#888; padding:30px;">No orders found.</td></tr>';
        return;
    }

    ordersBody.innerHTML = orders.map(order => `
        <tr>
            <td><strong>${order._id.substring(0, 8)}...</strong></td>
            <td style="font-size: 0.9rem;">
                <strong>${order.customerName || 'N/A'}</strong><br>
                📞 ${order.phone || 'N/A'}<br>
                <small style="color: #666;">${order.address || 'N/A'}</small>
            </td>
            <td style="font-size: 0.85rem;">
                ${order.items ? order.items.map(i => `${i.name} (x${i.qty})`).join('<br>') : 'N/A'}
            </td>
            <td><strong>₹ ${order.totalAmount || 0}</strong></td>
            <td>
                <span style="color: ${order.paymentStatus === 'Completed' ? 'green' : 'orange'}">
                    ${order.paymentStatus || 'Pending'}
                </span>
            </td>
            <td>
                <select onchange="updateOrderStatus('${order._id}', this.value)" style="padding: 5px; border-radius: 4px; border: 1px solid #ddd;"
                        ${order.orderStatus === 'Completed' ? 'disabled' : ''}>
                    <option value="Pending" ${order.orderStatus === 'Pending' ? 'selected' : ''}>Pending</option>
                    <option value="Processing" ${order.orderStatus === 'Processing' ? 'selected' : ''}>Processing</option>
                    <option value="Completed" ${order.orderStatus === 'Completed' ? 'selected' : ''}>Completed</option>
                </select>
            </td>
            <td>
                <button onclick="deleteOrder('${order._id}')" class="btn" style="padding:5px 10px; font-size:0.8rem; background:#e54c4c;">Delete</button>
            </td>
        </tr>
    `).join('');
}

async function updateOrderStatus(orderId, status) {
    if (!confirm(`Change order status to ${status}?`)) return;
    try {
        await window.api.updateOrderStatus(orderId, status);
        if (window.showToast) window.showToast('Order status updated!', 'success');
        else alert('Order status updated!');
        loadAllOrders();
    } catch (err) {
        console.error('Error updating order:', err);
    }
}

async function deleteOrder(orderId) {
    if (!confirm('Are you sure you want to delete this order?')) return;
    try {
        await window.api.deleteOrder(orderId);
        loadAllOrders();
    } catch (err) {
        console.error('Error deleting order:', err);
    }
}

// ---- Image Previews ----
document.addEventListener('change', (e) => {
    if (e.target.id === 'image-file' || e.target.id === 'edit-image-file') {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            const prefix = e.target.id === 'image-file' ? '' : 'edit-';
            const previewDiv = document.getElementById(`${prefix}image-preview`);
            
            previewDiv.innerHTML = '';
            for (let file of files) {
                const img = document.createElement('img');
                img.src = URL.createObjectURL(file);
                img.style = "max-width: 100%; height: 100px; object-fit: contain; background: #f8f9fa; border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);";
                previewDiv.appendChild(img);
            }
            previewDiv.style.display = 'flex';
        }
    }
});

// ---- Add Product ----
const addProductForm = document.getElementById('add-product-form');
if (addProductForm) {
    addProductForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const statusEl = document.getElementById('product-status');
        statusEl.innerText = '⏳ Adding product...';
        statusEl.style.color = 'blue';

        const formData = new FormData();
        formData.append('name', document.getElementById('name').value);
        formData.append('price', document.getElementById('price').value);
        formData.append('type', document.getElementById('section').value);
        formData.append('category', document.getElementById('category').value);
        formData.append('stock', document.getElementById('stock').value);
        formData.append('description', document.getElementById('description').value);
        
        if (document.getElementById('duration')) formData.append('duration', document.getElementById('duration').value);
        if (document.getElementById('concern')) formData.append('concern', document.getElementById('concern').value);
        if (document.getElementById('serviceType')) formData.append('serviceType', document.getElementById('serviceType').value);

        const imageFiles = document.getElementById('image-file').files;
        for (let i = 0; i < imageFiles.length; i++) {
            formData.append('images', imageFiles[i]);
        }

        try {
            await window.api.addProduct(formData);
            statusEl.innerText = '✅ Product added successfully!';
            statusEl.style.color = 'green';
            addProductForm.reset();
            document.getElementById('image-preview').style.display = 'none';
            setTimeout(() => { statusEl.innerText = ''; }, 3000);
        } catch (err) {
            statusEl.innerText = '❌ Error: ' + err.message;
            statusEl.style.color = 'red';
        }
    });
}

// ---- Manage Products ----
async function loadManageProducts(filterType = null) {
    if (!window.api) return;
    let products = await window.api.getProducts();
    
    if (filterType) {
        products = products.filter(p => p.type === filterType);
    }

    const tbody = document.getElementById('manage-products-body');

    if (products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#888; padding:30px;">No products found.</td></tr>';
        return;
    }

    tbody.innerHTML = products.map(product => `
        <tr>
            <td><img src="${product.image}" alt="${product.name}" style="width:60px; height:60px; object-fit:contain; background:#f8f9fa; border-radius:4px;"></td>
            <td><strong>${product.name}</strong></td>
            <td>
                <span style="background:#eee; padding:3px 10px; border-radius:20px; font-size:0.8rem; display:block; margin-bottom:5px;">Section: ${product.type || 'N/A'}</span>
                <span style="background:var(--secondary-color); padding:3px 10px; border-radius:20px; font-size:0.8rem;">Cat: ${product.category}</span>
            </td>
            <td>₹ ${product.price}</td>
            <td>${product.stock}</td>
            <td>⭐ ${parseFloat(product.rating || 5).toFixed(1)} <small style="color:#888">(${product.reviews || 0})</small></td>
            <td>
                <div style="display:flex; gap:5px; flex-wrap:wrap;">
                    <button onclick="openEditModal('${product._id}')" class="btn btn-outline" style="padding:5px 10px; font-size:0.8rem;">Edit</button>
                    <button onclick="deleteProduct('${product._id}')" class="btn" style="padding:5px 10px; font-size:0.8rem; background:#e54c4c;">Delete</button>
                </div>
            </td>
        </tr>
    `).join('');
}

async function deleteProduct(productId) {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
        await window.api.deleteProduct(productId);
        loadManageProducts();
    } catch (err) {
        console.error('Error deleting product:', err);
    }
}

// ---- Edit Product Modal ----
async function openEditModal(productId) {
    try {
        const product = await window.api.getProductById(productId);
        if (!product) return;

        document.getElementById('edit-id').value = product._id;
        document.getElementById('edit-name').value = product.name;
        document.getElementById('edit-price').value = product.price;
        document.getElementById('edit-category').value = product.category;
        document.getElementById('edit-stock').value = product.stock;
        document.getElementById('edit-description').value = product.description;

        const previewDiv = document.getElementById('edit-image-preview');
        previewDiv.innerHTML = '';
        const images = product.images || [product.image].filter(Boolean);
        images.forEach(imgUrl => {
            const img = document.createElement('img');
            img.src = imgUrl;
            img.style = "max-width: 100%; height: 100px; object-fit: contain; background: #f8f9fa; border-radius: 4px;";
            previewDiv.appendChild(img);
        });
        previewDiv.style.display = 'flex';

        const serviceFields = document.getElementById('edit-service-fields');
        const stockField = document.getElementById('edit-stock').closest('.form-group');
        
        if (product.type === 'beauty-parlour') {
            if (serviceFields) serviceFields.style.display = 'block';
            if (stockField) stockField.style.display = 'none';
            if (document.getElementById('edit-duration')) document.getElementById('edit-duration').value = product.duration || '';
            if (document.getElementById('edit-concern')) document.getElementById('edit-concern').value = product.concern || 'Standard';
            if (document.getElementById('edit-serviceType')) document.getElementById('edit-serviceType').value = product.serviceType || 'Standard';
        } else {
            if (serviceFields) serviceFields.style.display = 'none';
            if (stockField) stockField.style.display = 'block';
        }

        document.getElementById('edit-modal').style.display = 'flex';
    } catch (err) {
        console.error('Error opening edit modal:', err);
    }
}

function closeEditModal() {
    document.getElementById('edit-modal').style.display = 'none';
}

const editForm = document.getElementById('edit-product-form');
if (editForm) {
    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const productId = document.getElementById('edit-id').value;
        const formData = new FormData();
        
        formData.append('name', document.getElementById('edit-name').value);
        formData.append('price', document.getElementById('edit-price').value);
        formData.append('category', document.getElementById('edit-category').value);
        formData.append('stock', document.getElementById('edit-stock').value);
        formData.append('description', document.getElementById('edit-description').value);

        if (document.getElementById('edit-duration')) formData.append('duration', document.getElementById('edit-duration').value);
        if (document.getElementById('edit-concern')) formData.append('concern', document.getElementById('edit-concern').value);
        if (document.getElementById('edit-serviceType')) formData.append('serviceType', document.getElementById('edit-serviceType').value);

        const imageFiles = document.getElementById('edit-image-file').files;
        if (imageFiles.length > 0) {
            for (let i = 0; i < imageFiles.length; i++) {
                formData.append('images', imageFiles[i]);
            }
        }

        try {
            await window.api.updateProduct(productId, formData);
            closeEditModal();
            loadManageProducts();
            alert('Product updated successfully!');
        } catch (err) {
            console.error('Error updating product:', err);
        }
    });
}

