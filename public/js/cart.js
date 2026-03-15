function renderCart() {
    const cartItemsContainer = document.getElementById('cart-items');
    const cartTotalContainer = document.getElementById('cart-total');
    
    if (!cartItemsContainer) return;

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 30px;">Your cart is empty. <br><a href="products.html" class="btn" style="margin-top:20px;">Return to Shop</a></td></tr>';
        if(cartTotalContainer) cartTotalContainer.innerText = '₹ 0';
        const checkoutBtn = document.getElementById('checkout-btn');
        if(checkoutBtn) checkoutBtn.disabled = true;
        return;
    }

    cartItemsContainer.innerHTML = cart.map((item, index) => {
        let custHtml = '';
        if (typeof item.customization === 'object' && item.customization !== null) {
            custHtml = `
                <div style="font-size: 0.85rem; color: #666; margin-top: 5px; background: #f9f9f9; padding: 8px; border-radius: 4px; border-left: 3px solid var(--primary-color);">
                    <strong>Customization:</strong><br>
                    • Fabric: ${item.customization.fabric}<br>
                    • Neck: ${item.customization.neck}<br>
                    • Sleeve: ${item.customization.sleeve}<br>
                    • Work: ${item.customization.work}
                    ${item.customization.notes ? `<br>• Notes: ${item.customization.notes}` : ''}
                </div>
            `;
        } else if (item.customization) {
            custHtml = `<p style="font-size: 0.85rem; color: #666; margin-top: 5px;"><em>Custom: ${item.customization}</em></p>`;
        }

        return `
            <tr>
                <td>
                    <div style="display:flex; align-items:flex-start; gap: 15px;">
                        <a href="product.html?id=${item.product}">
                            <img src="${item.image}" alt="${item.name}" class="cart-item-img">
                        </a>
                        <div style="flex: 1;">
                            <p><strong><a href="product.html?id=${item.product}" style="color: inherit; text-decoration: none; cursor: pointer;">${item.name}</a></strong></p>
                            ${custHtml}
                            <button class="btn btn-outline" style="padding: 2px 8px; font-size: 0.75rem; margin-top: 8px;" onclick="editCustomization(${index})">
                                <i class="fas fa-edit"></i> Edit Custom
                            </button>
                        </div>
                    </div>
                </td>
                <td>₹ ${item.price}</td>
                <td>
                    <button class="qty-btn" onclick="updateQty('${item.product}', -1, ${index})">-</button>
                    <span style="padding: 0 10px;">${item.qty}</span>
                    <button class="qty-btn" onclick="updateQty('${item.product}', 1, ${index})">+</button>
                </td>
                <td>
                   <button class="btn btn-outline" style="padding: 5px 10px;" onclick="removeFromCart(${index})">Remove</button>
                </td>
            </tr>
        `;
    }).join('');

    const total = cart.reduce((acc, item) => acc + item.price * item.qty, 0);
    if(cartTotalContainer) cartTotalContainer.innerText = `₹ ${total}`;
    
    const checkoutBtn = document.getElementById('checkout-btn');
    if(checkoutBtn) {
        checkoutBtn.disabled = false;
        checkoutBtn.innerHTML = 'Save and Place Order';
    }
}

window.editCustomization = function(index) {
    const item = cart[index];
    const c = typeof item.customization === 'object' ? item.customization : { fabric: 'Standard', neck: 'Standard', sleeve: 'Short', work: 'Standard', notes: typeof item.customization === 'string' ? item.customization : '' };
    
    const bodyHtml = `
        <div class="customization-section" style="background: var(--secondary-color); padding: 15px; border-radius: 8px; border: 1px dashed var(--primary-color);">
            <div class="cust-form-group">
                <label class="cust-label">Fabric Material</label>
                <select id="edit-cust-fabric">
                    <option value="Standard" ${c.fabric === 'Standard' ? 'selected' : ''}>Standard (As per design)</option>
                    <option value="Raw Silk" ${c.fabric === 'Raw Silk' ? 'selected' : ''}>Raw Silk</option>
                    <option value="Pure Silk" ${c.fabric === 'Pure Silk' ? 'selected' : ''}>Pure Silk (Kanchipuram)</option>
                    <option value="Cotton" ${c.fabric === 'Cotton' ? 'selected' : ''}>Cotton</option>
                    <option value="Georgette" ${c.fabric === 'Georgette' ? 'selected' : ''}>Georgette</option>
                    <option value="Velvet" ${c.fabric === 'Velvet' ? 'selected' : ''}>Velvet</option>
                </select>
            </div>
            <div class="cust-form-group">
                <label class="cust-label">Neck Design</label>
                <select id="edit-cust-neck">
                    <option value="Standard" ${c.neck === 'Standard' ? 'selected' : ''}>Standard Neck</option>
                    <option value="Round Neck" ${c.neck === 'Round Neck' ? 'selected' : ''}>Round Neck</option>
                    <option value="V-Neck" ${c.neck === 'V-Neck' ? 'selected' : ''}>V-Neck</option>
                    <option value="Boat Neck" ${c.neck === 'Boat Neck' ? 'selected' : ''}>Boat Neck</option>
                    <option value="Sweetheart Neck" ${c.neck === 'Sweetheart Neck' ? 'selected' : ''}>Sweetheart Neck</option>
                    <option value="High Neck" ${c.neck === 'High Neck' ? 'selected' : ''}>High Neck / Collar</option>
                </select>
            </div>
            <div class="cust-form-group">
                <label class="cust-label">Sleeve Type</label>
                <select id="edit-cust-sleeve">
                    <option value="Short" ${c.sleeve === 'Short' ? 'selected' : ''}>Short Sleeves</option>
                    <option value="Elbow" ${c.sleeve === 'ElbowLength' || c.sleeve === 'Elbow' ? 'selected' : ''}>Elbow Length</option>
                    <option value="3/4th" ${c.sleeve === '3/4th' ? 'selected' : ''}>3/4th Sleeves</option>
                    <option value="Full" ${c.sleeve === 'Full' ? 'selected' : ''}>Full Sleeves</option>
                    <option value="Sleeveless" ${c.sleeve === 'Sleeveless' ? 'selected' : ''}>Sleeveless</option>
                </select>
            </div>
            <div class="cust-form-group">
                <label class="cust-label">Aari Work Style</label>
                <select id="edit-cust-work">
                    <option value="Standard" ${c.work === 'Standard' ? 'selected' : ''}>Standard Work</option>
                    <option value="Simple" ${c.work === 'Simple' ? 'selected' : ''}>Simple Thread Work</option>
                    <option value="Zardosi" ${c.work === 'Zardosi' ? 'selected' : ''}>Zardosi Heavy Work</option>
                    <option value="Bridal" ${c.work === 'Bridal' ? 'selected' : ''}>Bridal Motif Work</option>
                    <option value="Cut" ${c.work === 'Cut' ? 'selected' : ''}>Cut Work</option>
                </select>
            </div>
            <div class="cust-form-group">
                <label class="cust-label">Special Instructions</label>
                <textarea id="edit-cust-notes" class="cust-textarea" placeholder="Enter height, bust size, or any specific requests...">${c.notes || ''}</textarea>
            </div>
        </div>
    `;
    const footerHtml = `
        <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
        <button class="btn" onclick="saveCustomization(${index})">Save Changes</button>
    `;
    showModal('Edit Customization', bodyHtml, footerHtml);
};

window.saveCustomization = function(index) {
    const newCustomization = {
        fabric: document.getElementById('edit-cust-fabric').value,
        neck: document.getElementById('edit-cust-neck').value,
        sleeve: document.getElementById('edit-cust-sleeve').value,
        work: document.getElementById('edit-cust-work').value,
        notes: document.getElementById('edit-cust-notes').value.trim()
    };
    cart[index].customization = newCustomization;
    localStorage.setItem('cart', JSON.stringify(cart));
    closeModal();
    renderCart();
};

function updateQty(productId, change, index) {
    if (cart[index]) {
        cart[index].qty += change;
        if (cart[index].qty <= 0) {
            removeFromCart(index);
        } else {
            localStorage.setItem('cart', JSON.stringify(cart));
            updateCartCount();
            renderCart();
        }
    }
}

function removeFromCart(index) {
    cart.splice(index, 1);
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
    renderCart();
}


function proceedToCheckout() {
    window.location.href = 'checkout.html';
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('cart-table')) {
        renderCart();
    }
});
