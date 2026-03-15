document.addEventListener('DOMContentLoaded', () => {
    // Check Authentication First
    if (!localStorage.getItem('userToken')) {
        window.location.href = 'login.html?msg=login_required&redirect=' + encodeURIComponent(window.location.pathname + window.location.search);
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const isDirect = urlParams.get('direct') === 'true';
    let checkoutItems = [];

    if (isDirect) {
        const itemStr = localStorage.getItem('buyNowItem');
        if (itemStr) {
            checkoutItems = [JSON.parse(itemStr)];
        } else {
            window.location.href = 'products.html';
            return;
        }
    } else {
        checkoutItems = JSON.parse(localStorage.getItem('cart')) || [];
    }

    const form = document.getElementById('checkout-form');
    if (!form) return;

    if (checkoutItems.length === 0) {
        alert('Your cart is empty. Please add items to cart before proceeding.');
        window.location.href = 'products.html';
        return;
    }

    // Load saved info if available but don't show the saved address selection UI
    const currentUserStr = localStorage.getItem('currentUser');
    if (currentUserStr) {
        const currentUser = JSON.parse(currentUserStr);
        document.getElementById('name').value = currentUser.name || '';
        document.getElementById('phone').value = currentUser.phone || '';
        // We don't auto-fill address to ensure they check it, or we could if requested.
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        let finalName = document.getElementById('name').value.trim();
        let finalPhone = document.getElementById('phone').value.trim();
        let finalAddress = document.getElementById('address').value.trim();

        if (!finalName || !finalPhone || !finalAddress) {
            alert('Please fill in all shipping details.');
            return;
        }

        // Save/Update address to profile silently
        if (currentUserStr) {
            const currentUser = JSON.parse(currentUserStr);
            const newAddressObj = { name: finalName, phone: finalPhone, address: finalAddress };
            
            currentUser.addresses = currentUser.addresses || [];
            
            // Check if this exact address already exists to prevent duplicates
            const exists = currentUser.addresses.some(a => 
                a.name.toLowerCase() === finalName.toLowerCase() && 
                a.phone === finalPhone && 
                a.address.toLowerCase() === finalAddress.toLowerCase()
            );
            if (!exists) {
                currentUser.addresses.push(newAddressObj);
            }

            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            // Update the global customers array
            let customers = JSON.parse(localStorage.getItem('customers')) || [];
            const idx = customers.findIndex(c => c.email === currentUser.email);
            if (idx !== -1) {
                customers[idx] = currentUser;
                localStorage.setItem('customers', JSON.stringify(customers));
            }
        }

        // Customization Data
        const customization = {
            fabric: document.getElementById('cust-fabric').value,
            neck: document.getElementById('cust-neck').value,
            sleeve: document.getElementById('cust-sleeve').value,
            work: document.getElementById('cust-work').value,
            notes: document.getElementById('cust-notes').value.trim()
        };

        // Calculate total
        const totalAmount = checkoutItems.reduce((acc, item) => acc + item.price * item.qty, 0);

        try {
            // Build the WhatsApp message
            let message = `*New Order Details*\n`;
            message += `*Customer Name:* ${finalName}\n`;
            message += `*Phone:* ${finalPhone}\n`;
            message += `*Address:* ${finalAddress}\n\n`;

            if (customization.fabric !== 'Standard' || customization.neck !== 'Standard' || customization.sleeve !== 'Short' || customization.work !== 'Standard' || customization.notes) {
                message += `*Customizations:*\n`;
                if (customization.fabric) message += `- Fabric: ${customization.fabric}\n`;
                if (customization.neck) message += `- Neck: ${customization.neck}\n`;
                if (customization.sleeve) message += `- Sleeve: ${customization.sleeve}\n`;
                if (customization.work) message += `- Work: ${customization.work}\n`;
                if (customization.notes) message += `- Notes: ${customization.notes}\n`;
                message += `\n`;
            }

            message += `*Order Items:*\n`;
            checkoutItems.forEach((item, index) => {
                message += `${index + 1}. ${item.name} x${item.qty} (₹${item.price})\n`;
                if (item.customization) {
                     if (typeof item.customization === 'object') {
                         message += `   Custom: Fabric: ${item.customization.fabric || 'N/A'}, Neck: ${item.customization.neck || 'N/A'}, Sleeve: ${item.customization.sleeve || 'N/A'}, Work: ${item.customization.work || 'N/A'}\n`;
                     } else if (item.customization !== "") {
                         message += `   Custom: ${item.customization}\n`;
                     }
                }
            });

            message += `\n*Total Amount:* ₹${totalAmount}\n`;
            
            // Add image link only at the end to trigger a clean preview
            if (checkoutItems.length > 0 && checkoutItems[0].image) {
                message += `\n*View Product:* ${checkoutItems[0].image}`;
            }

            // Save order to Database for Persistence and Admin Panel
            const user = JSON.parse(localStorage.getItem('user'));
            const newOrder = {
                customerName: finalName,
                userId: user ? user.id : null,
                phone: finalPhone,
                address: finalAddress,
                customization: customization,
                items: checkoutItems.map(item => ({
                    productId: item.product,
                    name: item.name,
                    price: item.price,
                    qty: item.qty,
                    image: item.image
                })),
                totalAmount: totalAmount,
                orderStatus: 'Pending',
                paymentStatus: 'Pending (WhatsApp)',
                createdAt: new Date().toISOString()
            };

            if (window.api) {
                await window.api.createOrder(newOrder);
            }

            // Sync cart update: If we just ordered, cart is cleared
            if (user && user.id && window.api && !isDirect) {
                await window.api.syncUserData(user.id, { cart: [], wishlist: JSON.parse(localStorage.getItem('wishlist')) || [] });
            }

            // Redirect to WhatsApp
            const whatsappUrl = `https://wa.me/919688561269?text=${encodeURIComponent(message)}`;
            
            // Cleanup and Redirect
            if (isDirect) {
                localStorage.removeItem('buyNowItem');
            } else {
                localStorage.removeItem('cart');
            }
            window.location.href = whatsappUrl;

        } catch (error) {
            console.error('Checkout Error:', error);
            alert('Failed to place order via WhatsApp. Please try again.');
        }
    });
});
