const API_URL = window.location.origin.includes('localhost') ? 'http://localhost:5000/api' : '/api';

// Initialize cart from localStorage
let cart = JSON.parse(localStorage.getItem('cart')) || [];

// Update cart count in navbar
function updateCartCount() {
    const cartCountEl = document.getElementById('cart-count');
    if (cartCountEl) {
        cartCountEl.innerText = cart.length;
    }
    syncWithServer();
}

async function syncWithServer() {
    const user = JSON.parse(localStorage.getItem('user'));
    const token = localStorage.getItem('userToken');
    if (user && user.id && token && window.api) {
        try {
            const wishlist = JSON.parse(localStorage.getItem('wishlist')) || [];
            await window.api.syncUserData(user.id, { cart, wishlist });
        } catch (e) {
            console.warn('Silent sync failed', e);
        }
    }
}

function getInitials(name) {
    if (!name) return '?';
    const names = name.split(' ');
    let initials = names[0].substring(0, 1).toUpperCase();
    if (names.length > 1) {
        initials += names[names.length - 1].substring(0, 1).toUpperCase();
    }
    return initials;
}

function updateNavProfile() {
    const userStr = localStorage.getItem('user');
    const navLinks = document.querySelector('nav.nav-links');
    const accountLink = document.querySelector('nav.nav-links a[href="account.html"]');
    
    // Remove existing admin link if any to avoid duplicates
    const existingAdminLink = document.getElementById('nav-admin-panel');
    if (existingAdminLink) existingAdminLink.remove();

    if (userStr) {
        const user = JSON.parse(userStr);
        
        // Add Admin Panel link if user is an admin
        if (user.role && user.role.toLowerCase() === 'admin') {
            const adminLink = document.createElement('a');
            adminLink.href = 'admin/dashboard.html';
            adminLink.id = 'nav-admin-panel';
            adminLink.title = 'Admin Panel';
            adminLink.innerHTML = `
                <i class="fas fa-user-shield"></i>
                <span class="nav-text">Admin Panel</span>
            `;
            // Insert before account link if it exists, otherwise append
            if (accountLink) {
                navLinks.insertBefore(adminLink, accountLink);
            } else {
                navLinks.appendChild(adminLink);
            }
        }

        if (accountLink) {
            const nameToShow = user.name ? user.name.split(' ')[0] : 'Account';
            accountLink.innerHTML = `
                <i class="fas fa-user"></i>
                <span class="nav-text">${nameToShow}</span>
            `;
        }
    }
}

// Toast notification (replaces all alert() calls)
function showToast(message, type = 'success', duration = 3000) {
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.style.cssText = 'position:fixed; bottom:30px; right:30px; z-index:99999; display:flex; flex-direction:column; gap:10px; max-width:340px;';
        document.body.appendChild(toastContainer);
    }

    const toast = document.createElement('div');
    const colors = { success: '#20b858', error: '#e54c4c', info: '#1a73e8', warning: '#ff9f00' };
    const icons = { success: 'fa-check-circle', error: 'fa-times-circle', info: 'fa-info-circle', warning: 'fa-exclamation-circle' };
    toast.style.cssText = `background:${colors[type] || colors.success}; color:white; padding:14px 20px; border-radius:8px; font-size:0.95rem; font-weight:500; display:flex; align-items:center; gap:12px; box-shadow:0 4px 15px rgba(0,0,0,0.15); animation:toastIn 0.35s ease; min-width:260px; cursor:pointer;`;
    toast.innerHTML = `<i class="fas ${icons[type] || icons.success}" style="font-size:1.2rem;"></i><span>${message}</span>`;
    toast.onclick = () => toast.style.opacity = '0';
    toastContainer.appendChild(toast);

    if (!document.getElementById('toast-style')) {
        const style = document.createElement('style');
        style.id = 'toast-style';
        style.textContent = '@keyframes toastIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}} @keyframes toastOut{from{opacity:1}to{opacity:0;transform:translateY(10px)}}';
        document.head.appendChild(style);
    }

    setTimeout(() => {
        toast.style.animation = 'toastOut 0.4s ease forwards';
        setTimeout(() => toast.remove(), 400);
    }, duration);
}

window.showToast = showToast;

// Modal System
function showModal(title, bodyHtml, footerHtml = '') {
    let modalOverlay = document.getElementById('universal-modal');
    if (!modalOverlay) {
        modalOverlay = document.createElement('div');
        modalOverlay.id = 'universal-modal';
        modalOverlay.className = 'modal-overlay';
        document.body.appendChild(modalOverlay);
    }

    modalOverlay.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>${title}</h2>
                <button class="modal-close" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body">${bodyHtml}</div>
            ${footerHtml ? `<div class="modal-footer">${footerHtml}</div>` : ''}
        </div>
    `;

    setTimeout(() => modalOverlay.classList.add('active'), 10);
}

function closeModal() {
    const modalOverlay = document.getElementById('universal-modal');
    if (modalOverlay) {
        modalOverlay.classList.remove('active');
        setTimeout(() => {
            modalOverlay.innerHTML = '';
        }, 300);
    }
}

window.closeModal = closeModal;

// Add item to cart
function addToCart(product, qty = 1, customization = null) {
    if (!localStorage.getItem('userToken')) {
        window.location.href = 'login.html?msg=login_required&redirect=' + encodeURIComponent(window.location.pathname + window.location.search);
        return;
    }

    // If called without customization, prompt the user
    // If customization is empty string (Directly add), we treat it as no customization
    if (customization === null) {
        promptAddOption(product, qty);
        return;
    }

    // customization is either an object or an empty string
    const custString = typeof customization === 'object' ? JSON.stringify(customization) : customization;

    const existItemIndex = cart.findIndex(x => x.product === product._id && (typeof x.customization === 'object' ? JSON.stringify(x.customization) : x.customization) === custString);
    
    if (existItemIndex !== -1) {
        cart[existItemIndex].qty += qty;
    } else {
        cart.push({
            product: product._id,
            name: product.name,
            image: product.image,
            price: product.price,
            qty: qty,
            customization: customization
        });
    }
    
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
    closeModal();
    showToast('Added to cart! 🛒', 'success');
}

function buyNow(product, qty = 1, customization = "") {
    if (!localStorage.getItem('userToken')) {
        window.location.href = 'login.html?msg=login_required&redirect=checkout.html';
        return;
    }

    // Direct Buy: Save to a separate key so we don't interfere with the permanent cart
    const buyItem = {
        product: product._id,
        name: product.name,
        image: product.image,
        price: product.price,
        qty: qty,
        customization: customization
    };
    
    localStorage.setItem('buyNowItem', JSON.stringify(buyItem));
    window.location.href = 'checkout.html?direct=true';
}

function promptAddOption(product, qty = 1) {
    const bodyHtml = `
        <div class="customization-prompt">
            <p style="margin-bottom: 20px; font-size: 1.1rem;">How would you like to add <strong>${product.name}</strong> to your cart?</p>
            <div class="cust-options-grid">
                <button class="btn" style="padding: 15px;" onclick='openCustomizationModal(${JSON.stringify(product).replace(/'/g, "&#39;")}, ${qty})'>
                    <i class="fas fa-magic" style="margin-right: 8px;"></i> Customize Product
                </button>
                <button class="btn btn-outline" style="padding: 15px;" onclick='addToCart(${JSON.stringify(product).replace(/'/g, "&#39;")}, ${qty}, "")'>
                    <i class="fas fa-cart-plus" style="margin-right: 8px;"></i> Directly Add to Cart
                </button>
            </div>
        </div>
    `;
    showModal('Add to Cart', bodyHtml);
}

function openCustomizationModal(product, qty = 1) {
    const bodyHtml = `
        <div class="customization-section" style="background: var(--secondary-color); padding: 15px; border-radius: 8px; border: 1px dashed var(--primary-color);">
            <div class="cust-form-group">
                <label class="cust-label">Fabric Material</label>
                <select id="cust-fabric">
                    <option value="Standard">Standard (As per design)</option>
                    <option value="Raw Silk">Raw Silk</option>
                    <option value="Pure Silk">Pure Silk (Kanchipuram)</option>
                    <option value="Cotton">Cotton</option>
                    <option value="Georgette">Georgette</option>
                    <option value="Velvet">Velvet</option>
                </select>
            </div>
            <div class="cust-form-group">
                <label class="cust-label">Neck Design</label>
                <select id="cust-neck">
                    <option value="Standard">Standard Neck</option>
                    <option value="Round Neck">Round Neck</option>
                    <option value="V-Neck">V-Neck</option>
                    <option value="Boat Neck">Boat Neck</option>
                    <option value="Sweetheart Neck">Sweetheart Neck</option>
                    <option value="High Neck">High Neck / Collar</option>
                </select>
            </div>
            <div class="cust-form-group">
                <label class="cust-label">Sleeve Type</label>
                <select id="cust-sleeve">
                    <option value="Short">Short Sleeves</option>
                    <option value="Elbow">Elbow Length</option>
                    <option value="3/4th">3/4th Sleeves</option>
                    <option value="Full">Full Sleeves</option>
                    <option value="Sleeveless">Sleeveless</option>
                </select>
            </div>
            <div class="cust-form-group">
                <label class="cust-label">Aari Work Style</label>
                <select id="cust-work">
                    <option value="Standard">Standard Work</option>
                    <option value="Simple">Simple Thread Work</option>
                    <option value="Zardosi">Zardosi Heavy Work</option>
                    <option value="Bridal">Bridal Motif Work</option>
                    <option value="Cut">Cut Work</option>
                </select>
            </div>
            <div class="cust-form-group">
                <label class="cust-label">Special Instructions</label>
                <textarea id="cust-notes" class="cust-textarea" placeholder="Enter height, bust size, or any specific requests..."></textarea>
            </div>
        </div>
    `;
    const footerHtml = `
        <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
        <button class="btn" onclick='submitCustomization(${JSON.stringify(product).replace(/'/g, "&#39;")}, ${qty})'>Add with Customization</button>
    `;
    showModal('Customize Your Order', bodyHtml, footerHtml);
}

window.openCustomizationModal = openCustomizationModal;

window.submitCustomization = function(product, qty) {
    const customization = {
        fabric: document.getElementById('cust-fabric').value,
        neck: document.getElementById('cust-neck').value,
        sleeve: document.getElementById('cust-sleeve').value,
        work: document.getElementById('cust-work').value,
        notes: document.getElementById('cust-notes').value.trim()
    };
    addToCart(product, qty, customization);
};


// Generic Fetch function
async function fetchData(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_URL}${endpoint}`, options);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Something went wrong');
        }
        
        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// On document load
document.addEventListener('DOMContentLoaded', async () => {
    updateCartCount();
    updateNavProfile();
    
    // Cross-device sync: Refresh profile on every page load if logged in
    const user = JSON.parse(localStorage.getItem('user'));
    if (user && user.id && window.api) {
        try {
            const res = await window.api.getProfile(user.id);
            if (res.user) {
                // If cloud data exists, update local storage
                localStorage.setItem('user', JSON.stringify(res.user));
                if (res.user.cart) localStorage.setItem('cart', JSON.stringify(res.user.cart));
                if (res.user.wishlist) localStorage.setItem('wishlist', JSON.stringify(res.user.wishlist));
                
                // Refresh UI
                updateNavProfile();
                const cartCountEl = document.getElementById('cart-count');
                if (cartCountEl) cartCountEl.innerText = (res.user.cart || []).length;
            }
        } catch (e) {
            console.warn("Profile sync failed", e);
        }
    }

    // Hamburger menu toggle
    const hamburger = document.getElementById('hamburger');
    const navLinks = document.querySelector('.nav-links');
    
    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!hamburger.contains(e.target) && !navLinks.contains(e.target) && navLinks.classList.contains('active')) {
                navLinks.classList.remove('active');
            }
        });
    }

    // Dynamic Hero Slider
    const slider = document.getElementById('home-slider');
    const dotsContainer = document.getElementById('slider-dots');
    if (slider && dotsContainer) {
        initHomeSlider(slider, dotsContainer);
    }

    // Aari Courses Section
    if (document.getElementById('courses-section')) {
        initCourses();
    }
});

async function initHomeSlider(slider, dotsContainer) {
    if (!window.api) return;
    
    try {
        const slidesData = await window.api.getSliders();
        
        if (!slidesData || slidesData.length === 0) {
            // Default images if none in DB
            const defaultSlides = [
                { image: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?ixlib=rb-1.2.1&auto=format&fit=crop&w=1200&q=80' },
                { image: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?ixlib=rb-1.2.1&auto=format&fit=crop&w=1200&q=80' }
            ];
            renderSlides(slider, dotsContainer, defaultSlides);
        } else {
            renderSlides(slider, dotsContainer, slidesData);
        }
    } catch (err) {
        console.error('Slider error:', err);
    }
}

function renderSlides(slider, dotsContainer, slides) {
    slider.innerHTML = slides.map(slide => {
        const url = slide.image || slide.url;
        const isVideo = url && (url.match(/\.(mp4|mov|avi|wmv)/i) || url.includes('/video/upload/'));
        if (isVideo) {
            // Note: REMOVED 'loop' so we can catch the 'ended' event
            return `<video src="${url}" style="width:100%; height:100%; object-fit:cover; flex-shrink:0;" autoplay muted playsinline></video>`;
        }
        return `<img src="${url}" alt="Promotion" style="width:100%; height:100%; object-fit:cover; flex-shrink:0;">`;
    }).join('');

    const slideCount = slides.length;
    let currentSlide = 0;
    let slideTimeout = null;
    dotsContainer.innerHTML = '';

    if (slideCount <= 1) return;

    for (let i = 0; i < slideCount; i++) {
        const dot = document.createElement('div');
        dot.classList.add('dot');
        if (i === 0) dot.classList.add('active');
        dot.addEventListener('click', () => {
            goToSlide(i);
        });
        dotsContainer.appendChild(dot);
    }

    const dots = dotsContainer.querySelectorAll('.dot');
    const mediaElements = Array.from(slider.children);

    function goToSlide(n) {
        // Clear previous timers and listeners
        if (slideTimeout) clearTimeout(slideTimeout);
        mediaElements.forEach(el => {
            if (el.tagName === 'VIDEO') el.onended = null;
        });

        currentSlide = (n + slideCount) % slideCount;
        slider.style.transition = 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
        slider.style.transform = `translateX(-${currentSlide * 100}%)`;
        dots.forEach(d => d.classList.remove('active'));
        if (dots[currentSlide]) dots[currentSlide].classList.add('active');

        // Logic based on media type
        const currentMedia = mediaElements[currentSlide];
        if (currentMedia.tagName === 'VIDEO') {
            currentMedia.currentTime = 0;
            currentMedia.play().catch(() => {});
            currentMedia.onended = () => {
                goToSlide(currentSlide + 1);
            };
        } else {
            // Images stay for 3 seconds
            slideTimeout = setTimeout(() => {
                goToSlide(currentSlide + 1);
            }, 3000);
        }
    }

    // Initialize first slide
    goToSlide(0);
}

async function initCourses() {
    if (!window.api) return;
    try {
        const courses = await window.api.getCourses();
        const coursesGrid = document.querySelector('.courses-grid'); // Assuming there's a grid container
        
        if (coursesGrid && courses.length > 0) {
            coursesGrid.innerHTML = courses.map(course => `
                <div class="course-card">
                    <img src="${course.image}" alt="${course.title}" class="course-img">
                    <div class="course-content">
                        <h3>${course.title}</h3>
                        <p>${course.description}</p>
                        <div class="course-meta">
                            <span><i class="far fa-clock"></i> ${course.duration}</span>
                            <span class="price">₹${course.price}</span>
                        </div>
                        <button class="btn btn-primary" onclick="window.location.href='contact.html'">Enquire Now</button>
                    </div>
                </div>
            `).join('');
        }
    } catch (err) {
        console.error('Courses error:', err);
    }
}

