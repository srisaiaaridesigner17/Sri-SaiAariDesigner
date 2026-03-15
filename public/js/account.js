function showTab(tabName) {
    // Update buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.innerText.toLowerCase().includes(tabName)) {
            btn.classList.add('active');
        }
    });

    // Update content
    document.getElementById('orders-tab').style.display = tabName === 'orders' ? 'block' : 'none';
    document.getElementById('wishlist-tab').style.display = tabName === 'wishlist' ? 'block' : 'none';
    
    if (tabName === 'wishlist') {
        loadWishlist();
    } else {
        loadOrders();
    }
}

function loadWishlist() {
    const wishlist = JSON.parse(localStorage.getItem('wishlist')) || [];
    const container = document.getElementById('wishlist-grid');
    
    if (wishlist.length === 0) {
        container.innerHTML = '<p style="color: #666; margin-top: 20px;">You haven\'t placed any orders yet.</p>';
        return;
    }

    container.innerHTML = wishlist.map(item => `
        <div class="wishlist-item" id="wish-item-${item._id}">
            <i class="fas fa-trash remove-wishlist" onclick="removeFromWishlist('${item._id}')"></i>
            <img src="${item.image}" alt="${item.name}">
            <h4>${item.name}</h4>
            <p style="color: var(--primary-color); font-weight: bold;">₹${item.price}</p>
            <a href="product.html?id=${item._id}" class="btn" style="padding: 5px 10px; font-size: 0.8rem; margin-top: 10px;">View</a>
        </div>
    `).join('');
}

function removeFromWishlist(id) {
    let wishlist = JSON.parse(localStorage.getItem('wishlist')) || [];
    wishlist = wishlist.filter(x => x._id !== id);
    localStorage.setItem('wishlist', JSON.stringify(wishlist));
    if (typeof syncWithServer === 'function') syncWithServer();
    loadWishlist();
}

async function loadOrders() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || !user.id || !window.api) return;

    const container = document.getElementById('orders-list');
    container.innerHTML = '<p style="color: #666; margin-top: 20px;">Loading orders...</p>';

    try {
        const orders = await window.api.getUserOrders(user.id);
        
        if (!orders || orders.length === 0) {
            container.innerHTML = '<p style="color: #666; margin-top: 20px;">You haven\'t placed any orders yet.</p>';
            return;
        }

        container.innerHTML = orders.map(order => `
            <div class="order-item" style="display: flex; justify-content: space-between; align-items: center; padding: 15px; border-bottom: 1px solid #eee; margin-bottom: 10px; background: #fff; border-radius: 8px;">
                <div>
                    <strong>Order #${(order._id || "").substring(0, 8).toUpperCase()}</strong>
                    <p style="font-size: 0.9rem; color: #666;">Date: ${new Date(order.createdAt).toLocaleDateString()}</p>
                    <p style="font-size: 0.85rem; color: #888;">Items: ${order.items?.length || 0}</p>
                </div>
                <div style="text-align: right;">
                    <p style="font-weight: bold; color: var(--primary-color);">₹${order.totalAmount}</p>
                    <span class="status-badge" style="background: ${order.orderStatus === 'Completed' ? '#e8f5e9' : '#fff3e0'}; color: ${order.orderStatus === 'Completed' ? '#2e7d32' : '#e65100'}; padding: 4px 10px; border-radius: 4px; font-size: 0.8rem; font-weight: 500;">
                        ${order.orderStatus}
                    </span>
                </div>
            </div>
        `).join('');
    } catch (e) {
        console.error('Fetch orders error:', e);
        container.innerHTML = '<p style="color: #e54c4c; margin-top: 20px;">Error loading orders.</p>';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (!localStorage.getItem('userToken')) {
        window.location.href = 'login.html';
        return;
    }
    loadOrders();
});
