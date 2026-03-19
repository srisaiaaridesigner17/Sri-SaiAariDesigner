// =========================================
// admin.js – API-based Admin Panel
// =========================================

let cropper;
let currentCropImg = null;
let croppedImagesMap = new Map(); // Store cropped blobs by original filename/index

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

    const completedOrders = orders.filter(o => o.orderStatus === 'Completed');
    document.getElementById('completed-orders').innerText = completedOrders.length;

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

window.filterOrdersByStatus = function(status) {
    loadAllOrders(status);
};

// ---- Orders Page ----
async function loadAllOrders(statusFilter = 'All') {
    if (!window.api) return;
    let orders = await window.api.getOrders();
    const ordersBody = document.getElementById('orders-body');

    if (statusFilter !== 'All') {
        orders = orders.filter(o => (o.orderStatus || 'Pending') === statusFilter);
    }

    if (orders.length === 0) {
        ordersBody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#888; padding:30px;">No ${statusFilter === 'All' ? '' : statusFilter.toLowerCase()} orders found.</td></tr>`;
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
                ${order.items ? order.items.map(i => `• ${i.name} (x${i.qty})`).join('<br>') : 'N/A'}
                ${order.customization && (order.customization.fabric || order.customization.notes) ? `
                    <div style="margin-top: 8px; padding-top: 5px; border-top: 1px dashed #eee; font-size: 0.8rem; color: #555;">
                        <strong>Customizations:</strong><br>
                        ${order.customization.fabric ? `Fabric: ${order.customization.fabric}<br>` : ''}
                        ${order.customization.neck ? `Neck: ${order.customization.neck}<br>` : ''}
                        ${order.customization.sleeve ? `Sleeve: ${order.customization.sleeve}<br>` : ''}
                        ${order.customization.work ? `Work: ${order.customization.work}<br>` : ''}
                        ${order.customization.notes ? `Notes: <em>${order.customization.notes}</em>` : ''}
                    </div>
                ` : ''}
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

// ---- Image Previews & Cropping ----
window.closeCropper = function() {
    document.getElementById('cropper-modal').style.display = 'none';
    if (cropper) {
        cropper.destroy();
        cropper = null;
    }
};

window.openCropper = function(imgSrc, fileName, ratio = 1) {
    const modal = document.getElementById('cropper-modal');
    const image = document.getElementById('cropper-image');
    image.src = imgSrc;
    currentCropImg = { src: imgSrc, name: fileName, ratio: ratio };
    
    modal.style.display = 'flex';
    
    if (cropper) cropper.destroy();
    
    cropper = new Cropper(image, {
        aspectRatio: ratio,
        viewMode: 2,
        autoCropArea: 1,
    });
};

document.getElementById('crop-save-btn')?.addEventListener('click', () => {
    if (!cropper) return;
    
    cropper.getCroppedCanvas().toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        croppedImagesMap.set(currentCropImg.name, blob);
        
        // Update the preview
        const previews = document.querySelectorAll('.image-preview-wrapper img');
        previews.forEach(img => {
            if (img.getAttribute('data-name') === currentCropImg.name) {
                img.src = url;
            }
        });
        
        // Also update course preview if it matches
        const coursePreview = document.querySelector('#course-preview-container img');
        if (coursePreview && coursePreview.getAttribute('data-name') === currentCropImg.name) {
            coursePreview.src = url;
        }

        // Also update slider preview if it exists
        const sliderStatus = document.getElementById('upload-status');
        if (sliderStatus && currentCropImg.name.startsWith('slide-file')) {
            sliderStatus.innerHTML = `<div class="image-preview-wrapper" style="margin: 10px 0;"><img src="${url}" style="max-height: 150px; border-radius: 8px;"><p style="color: green; margin-top: 5px;">Photo Cropped! Ready to upload.</p></div>`;
        }

        closeCropper();
    }, 'image/jpeg');
});

document.addEventListener('change', (e) => {
    if (e.target.id === 'image-file' || e.target.id === 'edit-image-file' || e.target.id === 'course-file' || e.target.id === 'slide-file') {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            const isAddProduct = e.target.id === 'image-file';
            const isEditProduct = e.target.id === 'edit-image-file';
            const isCourse = e.target.id === 'course-file';
            const isSlide = e.target.id === 'slide-file';
            
            let previewDiv;
            if (isAddProduct) previewDiv = document.getElementById('image-preview');
            else if (isEditProduct) previewDiv = document.getElementById('edit-image-preview');
            else if (isCourse) previewDiv = document.getElementById('course-preview-container');
            else if (isSlide) previewDiv = document.getElementById('upload-status');
            
            if (previewDiv) previewDiv.innerHTML = '';

            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const fileName = `${e.target.id}-${i}-${file.name}`; // Unique key
                const fileUrl = URL.createObjectURL(file);
                
                const wrapper = document.createElement('div');
                wrapper.className = 'image-preview-wrapper';
                wrapper.style = "margin: 5px; display: inline-flex; flex-direction: column; align-items: center; background: #fff; padding: 10px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);";

                let media;
                if (file.type.startsWith('video/')) {
                    media = document.createElement('video');
                    media.src = fileUrl;
                    media.controls = true;
                    media.style = isCourse ? "width: 100%; height: 100%; object-fit: cover;" : "max-width: 100%; height: 120px; border-radius: 4px; background: #000;";
                    wrapper.appendChild(media);
                } else {
                    const imgContainer = document.createElement('div');
                    imgContainer.style = isCourse ? "width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; overflow: hidden;" : "width: 100px; height: 100px; display: flex; align-items: center; justify-content: center; overflow: hidden; border-radius: 4px; margin-bottom: 8px;";
                    
                    media = document.createElement('img');
                    media.src = fileUrl;
                    media.setAttribute('data-name', fileName);
                    media.style = "max-width: 100%; max-height: 100%; object-fit: contain;";
                    imgContainer.appendChild(media);
                    wrapper.appendChild(imgContainer);

                    const editBtn = document.createElement('button');
                    editBtn.type = 'button';
                    editBtn.className = 'edit-image-btn';
                    editBtn.innerHTML = '<i class="fas fa-edit"></i> Edit Photo';
                    
                    let ratio = 1;
                    if (isSlide) ratio = 16/9;
                    if (isCourse) ratio = 16/9;

                    editBtn.onclick = () => openCropper(fileUrl, fileName, ratio);
                    wrapper.appendChild(editBtn);
                }
                
                if (previewDiv) previewDiv.appendChild(wrapper);
            }
            if (previewDiv) previewDiv.style.display = 'flex';
        }
    }
});

// ---- Add Product ----
let currentUploadController = null;

window.cancelUpload = function() {
    if (currentUploadController) {
        currentUploadController.abort();
        const statusEl = document.getElementById('product-status');
        if (statusEl) {
            statusEl.innerText = '❌ Upload cancelled.';
            statusEl.style.color = 'orange';
        }
        currentUploadController = null;
    }
};

const addProductForm = document.getElementById('add-product-form');
if (addProductForm) {
    addProductForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const statusEl = document.getElementById('product-status');
        statusEl.innerHTML = `⏳ Adding product... <button type="button" onclick="cancelUpload()" style="margin-left:10px; padding:2px 8px; font-size:0.8rem; background:#f44336; color:white; border:none; border-radius:4px; cursor:pointer;">Stop Upload</button>`;
        statusEl.style.color = 'blue';

        currentUploadController = new AbortController();

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
            const file = imageFiles[i];
            const fileName = `image-file-${i}-${file.name}`;
            if (croppedImagesMap.has(fileName)) {
                formData.append('images', croppedImagesMap.get(fileName), file.name);
            } else {
                formData.append('images', file);
            }
        }

        try {
            await window.api.addProduct(formData, currentUploadController.signal);
            statusEl.innerText = '✅ Product added successfully!';
            statusEl.style.color = 'green';
            addProductForm.reset();
            croppedImagesMap.clear();
            document.getElementById('image-preview').style.display = 'none';
            setTimeout(() => { if (statusEl.innerText.includes('successfully')) statusEl.innerText = ''; }, 3000);
        } catch (err) {
            if (err.name === 'AbortError') {
                console.log('Upload aborted by user');
            } else {
                statusEl.innerText = '❌ Error: ' + err.message;
                statusEl.style.color = 'red';
            }
        } finally {
            currentUploadController = null;
        }
    });
}

// ---- Manage Products ----
function renderMediaThumbnail(url) {
    if (!url) return '';
    const isVideo = url.match(/\.(mp4|mov|avi|wmv)/i) || url.includes('/video/upload/');
    if (isVideo) {
        return `<div style="width:60px; height:60px; background:#000; display:flex; align-items:center; justify-content:center; border-radius:4px; color:white; font-size:1.5rem;">
                    <i class="fas fa-video"></i>
                </div>`;
    }
    return `<img src="${url}" alt="Product" style="width:60px; height:60px; object-fit:contain; background:#f8f9fa; border-radius:4px;">`;
}

let currentManageFilterType = null;

async function loadManageProducts(filterType = null) {
    if (filterType) currentManageFilterType = filterType;
    if (!window.api) return;
    let products = await window.api.getProducts();
    
    if (currentManageFilterType) {
        products = products.filter(p => p.type === currentManageFilterType);
    }

    const tbody = document.getElementById('manage-products-body');

    if (products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#888; padding:30px;">No products found.</td></tr>';
        return;
    }

    tbody.innerHTML = products.map(product => `
        <tr>
            <td>${renderMediaThumbnail(product.image)}</td>
            <td><strong>${product.name}</strong></td>
            <td>
                <span style="background:#eee; padding:3px 10px; border-radius:20px; font-size:0.8rem; display:block; margin-bottom:5px;">Section: ${product.type || 'N/A'}</span>
                <span style="background:var(--secondary-color); padding:3px 10px; border-radius:20px; font-size:0.8rem;">Cat: ${product.category}</span>
            </td>
            <td>₹ ${product.price}</td>
            <td>${(currentManageFilterType === 'beauty-parlour' || product.type === 'beauty-parlour') ? (product.duration || 'N/A') : product.stock}</td>
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
        
        const isBeautyParlour = product.type === 'beauty-parlour' || currentManageFilterType === 'beauty-parlour';
        
        if (isBeautyParlour) {
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
                const file = imageFiles[i];
                const fileName = `edit-image-file-${i}-${file.name}`;
                if (croppedImagesMap.has(fileName)) {
                    formData.append('images', croppedImagesMap.get(fileName), file.name);
                } else {
                    formData.append('images', file);
                }
            }
        }

        try {
            await window.api.updateProduct(productId, formData);
            closeEditModal();
            loadManageProducts();
            croppedImagesMap.clear();
            alert('Product updated successfully!');
        } catch (err) {
            console.error('Error updating product:', err);
        }
    });
}

