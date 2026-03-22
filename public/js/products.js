// Products are now loaded exclusively from the database (admin panel).
// No hardcoded placeholder products.

async function getLocalProducts(filters = {}) {
    if (typeof filters === 'string') {
        const params = new URLSearchParams(filters);
        const obj = {};
        for(let [key, val] of params.entries()) {
            if (key === 'categories' || key === 'category') {
                obj.categories = [val];
            } else {
                obj[key] = val;
            }
        }
        filters = obj;
    }

    let products = [];
    if (window.api) {
        try {
            products = await window.api.getProducts() || [];
        } catch (e) {
            console.warn('API getProducts failed', e);
        }
    }



    if (filters.type) {
        products = products.filter(p => p.type === filters.type);
    }

    if (filters.categories && filters.categories.length > 0) {
        products = products.filter(p => filters.categories.includes(p.category));
    }

    if (filters.priceRanges && filters.priceRanges.length > 0) {
        products = products.filter(p => {
            return filters.priceRanges.some(range => {
                if (range === 'Above ₹5000') return p.price > 5000;
                if (range === 'Above ₹1000') return p.price > 1000;
                const [min, max] = range.replace(/₹/g, '').split(' – ').map(v => parseInt(v.trim()));
                return p.price >= min && p.price <= max;
            });
        });
    }

    if (filters.workTypes && filters.workTypes.length > 0) {
        products = products.filter(p => filters.workTypes.includes(p.workType));
    }

    if (filters.fabrics && filters.fabrics.length > 0) {
        products = products.filter(p => filters.fabrics.includes(p.fabric));
    }

    if (filters.neckDesigns && filters.neckDesigns.length > 0) {
        products = products.filter(p => filters.neckDesigns.includes(p.neckDesign));
    }

    if (filters.colors && filters.colors.length > 0) {
        products = products.filter(p => filters.colors.includes(p.color));
    }

    if (filters.serviceTypes && filters.serviceTypes.length > 0) {
        products = products.filter(p => filters.serviceTypes.includes(p.serviceType));
    }

    if (filters.concerns && filters.concerns.length > 0) {
        products = products.filter(p => filters.concerns.includes(p.concern));
    }

    if (filters.durations && filters.durations.length > 0) {
        products = products.filter(p => {
            return filters.durations.some(range => {
                if (range === 'Under 30 Minutes') return p.duration && p.duration.includes('Mins') && parseInt(p.duration) < 30;
                if (range === '30 – 60 Minutes') return p.duration && p.duration.includes('Mins') && parseInt(p.duration) >= 30 && parseInt(p.duration) <= 60;
                if (range === '1 – 2 Hours') return p.duration && p.duration.includes('Hour') && (parseInt(p.duration) === 1 || (parseInt(p.duration) === 2 && !p.duration.includes('.')));
                if (range === 'Above 2 Hours') return p.duration && p.duration.includes('Hour') && parseInt(p.duration) >= 2;
                return false;
            });
        });
    }

    if (filters.materialTypes && filters.materialTypes.length > 0) {
        products = products.filter(p => filters.materialTypes.includes(p.materialType));
    }

    if (filters.sizes && filters.sizes.length > 0) {
        products = products.filter(p => filters.sizes.includes(p.size));
    }

    if (filters.availability && filters.availability.length > 0) {
        products = products.filter(p => {
            const status = p.stock > 0 ? 'In Stock' : 'Out of Stock';
            return filters.availability.includes(status);
        });
    }

    if (filters.keyword) {
        const kw = filters.keyword.toLowerCase();
        products = products.filter(p => p.name.toLowerCase().includes(kw) || p.description.toLowerCase().includes(kw));
    }

    return products;
}

// Sidebar UI Management
window.toggleFilterSidebar = function() {
    const sidebar = document.getElementById('filter-sidebar');
    const overlay = document.getElementById('filter-sidebar-overlay');
    
    if (document.getElementById('sidebar-filter-content')) {
        const activeTab = document.querySelector('.category-toggle-btn.active-toggle') || document.querySelector('.category-toggle-btn.active');
        let type = 'boutique';
        
        // Detect from URL if no active toggle found
        if (window.location.pathname.includes('beauty-parlour')) {
                type = 'beauty-parlour';
            } else if (activeTab) {
                const text = activeTab.innerText;
                if (text.includes('Parlour') || text.includes('Services') || text.includes('Beauty')) {
                    type = 'beauty-parlour';
                }
            }
            updateSidebarContent(type);
        }
        
        if (sidebar) sidebar.classList.toggle('active');
        if (overlay) overlay.classList.toggle('active');
    };
    
    function updateSidebarContent(type) {
        const container = document.getElementById('sidebar-filter-content');
        if (!container) return;
    
        const clearBtn = document.getElementById('sidebar-clear-btn');
        const applyBtn = document.getElementById('sidebar-apply-btn');
        
        if (clearBtn) clearBtn.setAttribute('onclick', `clearFilters('${type}')`);
        if (applyBtn) applyBtn.setAttribute('onclick', `applyFilters('${type}')`);
    
        if (type === 'boutique') {
            container.innerHTML = `
                <!-- Category -->
                <div class="filter-group">
                    <div class="filter-group-title">Category</div>
                    <div class="filter-options">
                        <label class="filter-option"><input type="checkbox" name="category" value="Bridal Aari Blouse"> Bridal Aari Blouse</label>
                        <label class="filter-option"><input type="checkbox" name="category" value="Party Wear Blouse"> Party Wear Blouse</label>
                        <label class="filter-option"><input type="checkbox" name="category" value="Traditional Aari Blouse"> Traditional Aari Blouse</label>
                        <label class="filter-option"><input type="checkbox" name="category" value="Designer Aari Blouse"> Designer Aari Blouse</label>
                        <label class="filter-option"><input type="checkbox" name="category" value="Modern Blouse"> Modern Blouse</label>
                    </div>
                </div>
    
                <!-- Price Range -->
                <div class="filter-group">
                    <div class="filter-group-title">Price Range</div>
                    <div class="filter-options">
                        <label class="filter-option"><input type="checkbox" name="price" value="₹500 – ₹1000"> ₹500 – ₹1000</label>
                        <label class="filter-option"><input type="checkbox" name="price" value="₹1000 – ₹2000"> ₹1000 – ₹2000</label>
                        <label class="filter-option"><input type="checkbox" name="price" value="₹2000 – ₹3000"> ₹2000 – ₹3000</label>
                        <label class="filter-option"><input type="checkbox" name="price" value="₹3000 – ₹5000"> ₹3000 – ₹5000</label>
                        <label class="filter-option"><input type="checkbox" name="price" value="Above ₹5000" data-min="5000"> Above ₹5000</label>
                    </div>
                </div>
    
                <!-- Work Type -->
                <div class="filter-group">
                    <div class="filter-group-title">Work Type</div>
                    <div class="filter-options">
                        <label class="filter-option"><input type="checkbox" name="workType" value="Zardosi Work"> Zardosi Work</label>
                        <label class="filter-option"><input type="checkbox" name="workType" value="Stone Work"> Stone Work</label>
                        <label class="filter-option"><input type="checkbox" name="workType" value="Beads Work"> Beads Work</label>
                        <label class="filter-option"><input type="checkbox" name="workType" value="Mirror Work"> Mirror Work</label>
                        <label class="filter-option"><input type="checkbox" name="workType" value="Pearl Work"> Pearl Work</label>
                    </div>
                </div>
    
                <!-- Fabric -->
                <div class="filter-group">
                    <div class="filter-group-title">Fabric</div>
                    <div class="filter-options">
                        <label class="filter-option"><input type="checkbox" name="fabric" value="Silk"> Silk</label>
                        <label class="filter-option"><input type="checkbox" name="fabric" value="Cotton"> Cotton</label>
                        <label class="filter-option"><input type="checkbox" name="fabric" value="Velvet"> Velvet</label>
                        <label class="filter-option"><input type="checkbox" name="fabric" value="Net"> Net</label>
                        <label class="filter-option"><input type="checkbox" name="fabric" value="Georgette"> Georgette</label>
                    </div>
                </div>
    
                <!-- Neck Design -->
                <div class="filter-group">
                    <div class="filter-group-title">Neck Design</div>
                    <div class="filter-options">
                        <label class="filter-option"><input type="checkbox" name="neckDesign" value="Boat Neck"> Boat Neck</label>
                        <label class="filter-option"><input type="checkbox" name="neckDesign" value="Round Neck"> Round Neck</label>
                        <label class="filter-option"><input type="checkbox" name="neckDesign" value="V Neck"> V Neck</label>
                        <label class="filter-option"><input type="checkbox" name="neckDesign" value="Square Neck"> Square Neck</label>
                        <label class="filter-option"><input type="checkbox" name="neckDesign" value="High Neck"> High Neck</label>
                    </div>
                </div>
    
                <!-- Color -->
                <div class="filter-group">
                    <div class="filter-group-title">Color</div>
                    <div class="filter-options">
                        <label class="filter-option"><input type="checkbox" name="color" value="Red"> Red</label>
                        <label class="filter-option"><input type="checkbox" name="color" value="Green"> Green</label>
                        <label class="filter-option"><input type="checkbox" name="color" value="Blue"> Blue</label>
                        <label class="filter-option"><input type="checkbox" name="color" value="Pink"> Pink</label>
                        <label class="filter-option"><input type="checkbox" name="color" value="Gold"> Gold</label>
                        <label class="filter-option"><input type="checkbox" name="color" value="Black"> Black</label>
                    </div>
                </div>
            `;
        } else if (type === 'beauty-parlour' || type === 'materials') {
            container.innerHTML = `
                <!-- Service Category -->
                <div class="filter-group">
                    <div class="filter-group-title">Service Category</div>
                    <div class="filter-options">
                        <label class="filter-option"><input type="checkbox" name="category" value="Hair Services"> Hair Services</label>
                        <label class="filter-option"><input type="checkbox" name="category" value="Facial & Skin Care"> Facial & Skin Care</label>
                        <label class="filter-option"><input type="checkbox" name="category" value="Makeup Services"> Makeup Services</label>
                        <label class="filter-option"><input type="checkbox" name="category" value="Nail Care"> Nail Care</label>
                        <label class="filter-option"><input type="checkbox" name="category" value="Spa & Massage"> Spa & Massage</label>
                        <label class="filter-option"><input type="checkbox" name="category" value="Bridal Services"> Bridal Services</label>
                    </div>
                </div>
    
                <!-- Filter buttons for Beauty Parlour -->
                <div class="filter-group">
                    <div class="filter-group-title">Quick Filters</div>
                    <div class="filter-options">
                        <button class="filter-btn active" data-filter="all">All Services</button>
                        <button class="filter-btn" data-filter="Hair">Hair</button>
                        <button class="filter-btn" data-filter="Facial">Facial</button>
                        <button class="filter-btn" data-filter="Bridal">Bridal</button>
                        <button class="filter-btn" data-filter="Makeup">Makeup</button>
                    </div>
                </div>
    
                <!-- Price Range -->
                <div class="filter-group">
                    <div class="filter-group-title">Price Range</div>
                    <div class="filter-options">
                        <label class="filter-option"><input type="checkbox" name="price" value="₹0 – ₹500"> ₹0 – ₹500</label>
                        <label class="filter-option"><input type="checkbox" name="price" value="₹500 – ₹1000"> ₹500 – ₹1000</label>
                        <label class="filter-option"><input type="checkbox" name="price" value="₹1000 – ₹2000"> ₹1000 – ₹2000</label>
                        <label class="filter-option"><input type="checkbox" name="price" value="₹2000 – ₹3000"> ₹2000 – ₹3000</label>
                        <label class="filter-option"><input type="checkbox" name="price" value="Above ₹3000"> Above ₹3000</label>
                    </div>
                </div>
    
                <!-- Service Type -->
                <div class="filter-group">
                    <div class="filter-group-title">Service Type</div>
                    <div class="filter-options">
                        <label class="filter-option"><input type="checkbox" name="serviceType" value="Haircut"> Haircut</label>
                        <label class="filter-option"><input type="checkbox" name="serviceType" value="Hair Coloring"> Hair Coloring</label>
                        <label class="filter-option"><input type="checkbox" name="serviceType" value="Facial"> Facial</label>
                        <label class="filter-option"><input type="checkbox" name="serviceType" value="Manicure"> Manicure</label>
                        <label class="filter-option"><input type="checkbox" name="serviceType" value="Pedicure"> Pedicure</label>
                        <label class="filter-option"><input type="checkbox" name="serviceType" value="Bridal Makeup"> Bridal Makeup</label>
                    </div>
                </div>
    
                <!-- Skin / Hair Concern -->
                <div class="filter-group">
                    <div class="filter-group-title">Skin / Hair Concern</div>
                    <div class="filter-options">
                        <label class="filter-option"><input type="checkbox" name="concern" value="Acne Treatment"> Acne Treatment</label>
                        <label class="filter-option"><input type="checkbox" name="concern" value="Anti-Aging"> Anti-Aging</label>
                        <label class="filter-option"><input type="checkbox" name="concern" value="Skin Brightening"> Skin Brightening</label>
                        <label class="filter-option"><input type="checkbox" name="concern" value="Hair Fall Treatment"> Hair Fall Treatment</label>
                        <label class="filter-option"><input type="checkbox" name="concern" value="Dandruff Treatment"> Dandruff Treatment</label>
                    </div>
                </div>
    
                <!-- Duration -->
                <div class="filter-group">
                    <div class="filter-group-title">Duration</div>
                    <div class="filter-options">
                        <label class="filter-option"><input type="checkbox" name="duration" value="Under 30 Minutes"> Under 30 Minutes</label>
                        <label class="filter-option"><input type="checkbox" name="duration" value="30 – 60 Minutes"> 30 – 60 Minutes</label>
                        <label class="filter-option"><input type="checkbox" name="duration" value="1 – 2 Hours"> 1 – 2 Hours</label>
                        <label class="filter-option"><input type="checkbox" name="duration" value="Above 2 Hours"> Above 2 Hours</label>
                    </div>
                </div>
    
                <!-- Availability -->
                <div class="filter-group">
                    <div class="filter-group-title">Availability</div>
                    <div class="filter-options">
                        <label class="filter-option"><input type="checkbox" name="availability" value="Available Today"> Available Today</label>
                        <label class="filter-option"><input type="checkbox" name="availability" value="Available This Week"> Available This Week</label>
                        <label class="filter-option"><input type="checkbox" name="availability" value="Weekend Slots"> Weekend Slots</label>
                    </div>
                </div>
            `;
        }
    }
    
    window.applyFilters = async function(type, containerId = 'product-grid') {
        const filters = {
            type: type,
            categories: Array.from(document.querySelectorAll('input[name="category"]:checked')).map(cb => cb.value),
            priceRanges: Array.from(document.querySelectorAll('input[name="price"]:checked')).map(cb => cb.value),
            workTypes: Array.from(document.querySelectorAll('input[name="workType"]:checked')).map(cb => cb.value),
            fabrics: Array.from(document.querySelectorAll('input[name="fabric"]:checked')).map(cb => cb.value),
            neckDesigns: Array.from(document.querySelectorAll('input[name="neckDesign"]:checked')).map(cb => cb.value),
            colors: Array.from(document.querySelectorAll('input[name="color"]:checked')).map(cb => cb.value),
            serviceTypes: Array.from(document.querySelectorAll('input[name="serviceType"]:checked')).map(cb => cb.value),
            concerns: Array.from(document.querySelectorAll('input[name="concern"]:checked')).map(cb => cb.value),
            durations: Array.from(document.querySelectorAll('input[name="duration"]:checked')).map(cb => cb.value),
            materialTypes: Array.from(document.querySelectorAll('input[name="materialType"]:checked')).map(cb => cb.value),
            sizes: Array.from(document.querySelectorAll('input[name="size"]:checked')).map(cb => cb.value),
            availability: Array.from(document.querySelectorAll('input[name="availability"]:checked')).map(cb => cb.value)
        };
    
        const products = await getLocalProducts(filters);
        const gridId = type === 'boutique' ? 'product-grid' : 'materials-grid';
        renderProductCards(products, gridId);
        toggleFilterSidebar();
    };
    
    window.clearFilters = function(type) {
        document.querySelectorAll('.filter-content input[type="checkbox"]').forEach(cb => cb.checked = false);
        applyFilters(type);
    };
    
    async function getLocalProductById(id) {
        if (!window.api) return defaultProducts.find(p => p._id === id);
        let product = await window.api.getProductById(id);
        if (!product) {
            product = defaultProducts.find(p => p._id === id);
        }
        return product;
    }
    
    // Generate stars HTML based on rating
    function generateStars(rating) {
        let starsHtml = '';
        for (let i = 1; i <= 5; i++) {
            if (i <= rating) {
                starsHtml += '<i class="fas fa-star"></i>';
            } else {
                starsHtml += '<i class="far fa-star"></i>';
            }
        }
        return starsHtml;
    }
    
    // Interactive Rating Functions
    window.hoverStar = function (val, productId) {
        for (let i = 1; i <= 5; i++) {
            const star = document.getElementById(`star-${productId}-${i}`);
            if (star) {
                star.className = i <= val ? 'fas fa-star' : 'far fa-star';
                star.style.transform = i <= val ? 'scale(1.2)' : 'scale(1)';
            }
        }
    };
    
    window.resetStar = function (productId) {
        getLocalProductById(productId).then(product => {
            const rating = product.rating || 5;
            for (let i = 1; i <= 5; i++) {
                const star = document.getElementById(`star-${productId}-${i}`);
                if (star) {
                    star.className = i <= rating ? 'fas fa-star' : 'far fa-star';
                    star.style.transform = 'scale(1)';
                }
            }
        });
    };
    
    window.submitRating = async function (val, productId) {
        let products = JSON.parse(localStorage.getItem('products')) || [];
        let productIndex = products.findIndex(p => p._id === productId);
        if (productIndex !== -1) {
            // Calculate new average
            const currentRating = products[productIndex].rating || 5;
            const currentReviews = products[productIndex].reviews || 0;
    
            const newReviews = currentReviews + 1;
            // Exact decimal rating
            const newRating = parseFloat((((currentRating * currentReviews) + val) / newReviews).toFixed(1));
    
            products[productIndex].rating = newRating;
            products[productIndex].reviews = newReviews;
    
            localStorage.setItem('products', JSON.stringify(products));
    
            // Update UI
            const reviewCountEl = document.getElementById(`review-count-${productId}`);
            if (reviewCountEl) reviewCountEl.innerText = newReviews;
    
            const mainRatingEl = document.getElementById(`main-rating-${productId}`);
            if (mainRatingEl) mainRatingEl.innerHTML = generateInteractiveStars(newRating, productId) + ` <span style="font-size: 1.2rem; font-weight: bold; margin-left: 5px; color: #333;">${newRating}</span>`;
    
            // Flash animation
            for (let i = 1; i <= 5; i++) {
                const star = document.getElementById(`star-${productId}-${i}`);
                if (star) {
                    star.style.color = '#ff9800';
                    setTimeout(() => star.style.color = '#f5c518', 300);
                }
            }
    
            showToast(`Thank you for rating ${val} ⭐ stars!`, 'success');
            resetStar(productId);
        }
    };

function generateInteractiveStars(rating, productId) {
    let starsHtml = '';
    const roundedRating = Math.round(rating);
    for (let i = 1; i <= 5; i++) {
        starsHtml += `<i class="${i <= roundedRating ? 'fas' : 'far'} fa-star" onmouseover="hoverStar(${i}, '${productId}')" onmouseout="resetStar('${productId}')" onclick="submitRating(${i}, '${productId}')" id="star-${productId}-${i}" style="color: #f5c518; transition: transform 0.2s; cursor: pointer;"></i>`;
    }
    return starsHtml;
}

window.shareProduct = async function (name, text, imageUrl) {
    const url = window.location.href;
    
    if (navigator.share) {
        try {
            await navigator.share({
                title: name,
                text: text,
                url: url
            });
            return; // Successfully shared
        } catch (err) {
            console.warn("Sharing failed, falling back to modal", err);
        }
    }

    // Fallback Modal for Desktop or browsers without Web Share API
    const bodyHtml = `
        <div class="share-options">
            <div class="share-opt-btn whatsapp" onclick='window.open("https://wa.me/?text=" + encodeURIComponent("${text} " + "${url}"), "_blank"); closeModal();'>
                <i class="fab fa-whatsapp"></i>
                <span>WhatsApp</span>
            </div>
            <div class="share-opt-btn copy" onclick='navigator.clipboard.writeText("${url}"); showToast("Link copied! 🔗", "info"); closeModal();'>
                <i class="fas fa-link"></i>
                <span>Copy Link</span>
            </div>
            <div class="share-opt-btn more" onclick='if(navigator.share) { navigator.share({title: "${name}", text: "${text}", url: "${url}"}); closeModal(); } else { showToast("Sharing not supported on this browser", "warning"); }'>
                <i class="fas fa-ellipsis-h"></i>
                <span>More</span>
            </div>
        </div>
    `;
    showModal('Share Design', bodyHtml);
};

window.toggleWishlist = function (product) {
    if (!localStorage.getItem('userToken')) {
        window.location.href = 'login.html?msg=login_required&redirect=' + encodeURIComponent(window.location.pathname + window.location.search);
        return;
    }
    let wishlist = JSON.parse(localStorage.getItem('wishlist')) || [];
    const index = wishlist.findIndex(x => x._id === product._id);
    const btn = document.querySelector(`.overlay-btn.wishlist-toggle`);

    if (index === -1) {
        wishlist.push(product);
        if (btn) btn.classList.add('wishlisted');
        showToast('Added to Wishlist! ❤️', 'success');
    } else {
        wishlist.splice(index, 1);
        if (btn) btn.classList.remove('wishlisted');
        showToast('Removed from Wishlist', 'info');
    }
    localStorage.setItem('wishlist', JSON.stringify(wishlist));
    if (typeof syncWithServer === 'function') syncWithServer();
};

function isMediaVideo(url) {
    if (!url) return false;
    return url.match(/\.(mp4|mov|avi|wmv)/i) || url.includes('/video/upload/');
}

function optimizeCloudinary(url, transformations = 'f_auto,q_auto') {
    if (!url || !url.includes('cloudinary.com')) return url;
    if (url.includes('/upload/f_auto')) return url; // Already optimized
    return url.replace('/upload/', `/upload/${transformations}/`);
}

function renderMediaTag(url, className, style = "", alt = "Product") {
    if (isMediaVideo(url)) {
        return `<video src="${optimizeCloudinary(url, 'f_auto,q_auto')}" class="${className}" style="${style}" autoplay loop muted playsinline></video>`;
    }
    // Optimize thumbnails to 400px wide for grid cards
    const optimizedUrl = optimizeCloudinary(url, 'f_auto,q_auto,w_400,c_fill');
    return `<img src="${optimizedUrl}" class="${className}" style="${style}" alt="${alt}" loading="lazy">`;
}

function renderProductCards(products, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = products.map(product => {
        const isBeautyParlour = product.type === 'beauty-parlour';
        const isOutOfStock = !isBeautyParlour && (product.stock === 0 || product.stock === '0');
        const outOfStockBadge = isOutOfStock ? `<div style="position:absolute; top:10px; left:10px; background:#e54c4c; color:white; padding:5px 12px; border-radius:4px; font-size:0.8rem; font-weight:bold; z-index:2;">Out of Stock</div>` : '';
        
        if (isBeautyParlour) {
            return `
                <div class="product-card service-card">
                    <a href="product.html?id=${product._id}">
                        ${renderMediaTag(product.image, "product-img", "", product.name)}
                    </a>
                    <div class="product-info">
                        <a href="product.html?id=${product._id}">
                            <h3 class="product-title">${product.name}</h3>
                        </a>
                        <div class="service-meta">
                            <span><i class="far fa-clock"></i> ${product.duration || 'N/A'}</span>
                            <span><i class="fas fa-tag"></i> ${product.category}</span>
                        </div>
                        <p class="service-desc">
                            ${product.description}
                        </p>
                        <div class="product-rating">
                            ${generateStars(Math.round(product.rating || 5))} 
                            <span style="font-weight: bold; margin-left: 5px; color: #333;">${parseFloat(product.rating || 5).toFixed(1)}</span>
                        </div>
                        <p class="product-price">₹ ${product.price}</p>
                        <div class="card-actions" style="margin-top:auto;">
                            <button onclick="handleServiceBooking('${product.name.replace(/'/g, "\\'")}', '${product.price}', '${product.duration}', '', '${window.location.origin + window.location.pathname.replace(/\/[^/]+$/, '') + '/product.html?id=' + product._id}')" class="btn" style="width: 100%; background-color: #25d366; color: white; padding: 10px 5px; font-size: 0.9rem; display: flex; align-items: center; justify-content: center; gap: 6px;">
                                <i class="fab fa-whatsapp" style="font-size: 1.1rem;"></i> Book via WhatsApp
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }

        return `
            <div class="product-card" style="position:relative;">
                ${outOfStockBadge}
                <a href="product.html?id=${product._id}" ${isOutOfStock ? 'style="opacity:0.6;"' : ''}>
                    ${renderMediaTag(product.image, "product-img", "", product.name)}
                </a>
                <div class="product-info">
                    <a href="product.html?id=${product._id}">
                        <h3 class="product-title">${product.name}</h3>
                    </a>
                    <div class="product-rating">
                        ${generateStars(Math.round(product.rating || 5))} 
                        <span style="font-weight: bold; margin-left: 5px; color: #333;">${parseFloat(product.rating || 5).toFixed(1)}</span>
                        <span style="color: #888; font-size: 0.8rem;">(${product.reviews || 0})</span>
                    </div>
                    <p class="product-price">₹ ${product.price}</p>
                    ${isOutOfStock ? `<p style="color:#e54c4c; font-weight:bold; font-size:0.9rem; margin-bottom:5px;">Out of Stock</p>` : ''}
                    <div class="card-actions" style="margin-top:auto; gap: 4px;">
                        <button class="btn btn-outline" style="flex: 1; padding: 10px 4px; font-size: 0.85rem;" onclick='addToCart(${JSON.stringify(product).replace(/'/g, "&#39;")}, 1, "")' ${isOutOfStock ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''}>Cart</button>
                        <button class="btn" style="flex: 1; background-color: #ff9f00; padding: 10px 4px; font-size: 0.85rem;" onclick='buyNow(${JSON.stringify(product).replace(/'/g, "&#39;")})' ${isOutOfStock ? 'disabled style="background-color:#ff9f00; opacity:0.5; cursor:not-allowed;"' : ''}>Buy</button>
                        <a href="https://wa.me/919688561269?text=${encodeURIComponent(`Hello, I'm interested in:\n*Product:* ${product.name}\n*Price:* ₹${product.price}\n*Link:* ` + window.location.origin + window.location.pathname.replace(/\/[^/]+$/, '') + '/product.html?id=' + product._id)}" target="_blank" class="btn" style="background-color: #25d366; color: white; padding: 10px 8px; flex: 1; font-size: 0.85rem; display: flex; align-items: center; justify-content: center; gap: 4px;" title="Send to WhatsApp">
                            <i class="fab fa-whatsapp" style="font-size: 1rem;"></i> <span>WhatsApp</span>
                        </a>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

async function loadProducts(filters = {}, containerId = 'product-grid') {
    try {
        if (typeof filters === 'string') {
            // Handle legacy query string if any
            const params = new URLSearchParams(filters);
            filters = {
                type: 'boutique',
                keyword: params.get('keyword') || ''
            };
        } else {
            filters.type = filters.type || 'boutique';
        }

        const products = await getLocalProducts(filters);
        renderProductCards(products, containerId);
    } catch (error) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `<p class="error">Failed to load products. ${error.message}</p>`;
        }
    }
}

// Dynamic Filter Function for the Toggle Buttons
window.filterProducts = function (type, element) {
    const btns = document.querySelectorAll('.category-toggle-btn');
    btns.forEach(btn => {
        btn.classList.remove('active-toggle');
        btn.style.backgroundColor = '#f4f6f8';
        btn.style.borderColor = 'transparent';
        btn.style.color = '#666';
        const icon = btn.querySelector('i');
        if (icon) icon.style.color = '#666';
    });

    if (element) {
        element.classList.add('active-toggle');
        element.style.backgroundColor = 'var(--secondary-color)';
        element.style.borderColor = 'var(--primary-color)';
        element.style.color = 'var(--text-dark)';
        const icon = element.querySelector('i');
        if (icon) icon.style.color = 'var(--primary-color)';
        
        // Update sidebar content if it's visible or for next toggle
        if (document.getElementById('sidebar-filter-content')) {
            updateSidebarContent(type);
        }
    }

    loadProducts({ type: type });
};

// Product filtering
function initFilters() {
    const categoryFilter = document.getElementById('category-filter');
    const searchInput = document.getElementById('search-input');

    if (categoryFilter) {
        categoryFilter.addEventListener('change', (e) => {
            const val = e.target.value;
            loadProducts(val ? `?category=${val}` : '');
        });
    }

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const val = e.target.value;
            // debounce simple approach
            setTimeout(() => {
                loadProducts(val ? `?keyword=${val}` : '');
            }, 500);
        });
    }
}

// Product detail page
async function loadProductDetail() {
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');

    if (!productId) return;

    try {
        const product = await getLocalProductById(productId);
        const container = document.getElementById('product-detail-container');

        if (container) {
            if (!product) {
                container.innerHTML = '<p style="padding: 40px; text-align: center;">Product not found.</p>';
                return;
            }
            const wishlist = JSON.parse(localStorage.getItem('wishlist')) || [];
            const isWishlisted = wishlist.some(x => x && x._id === product._id);
            const isBeautyParlour = product.type === 'beauty-parlour';
            
            // --- DYNAMIC SEO UPDATES ---
            const pageTitle = `${product.name} | Sri & Sai Fashion`;
            const pageDesc = product.description.substring(0, 160);
            const pageUrl = window.location.href;
            const pageImg = product.image || (product.images && product.images[0]);

            document.title = pageTitle;
            const metaDesc = document.querySelector('meta[name="description"]');
            if (metaDesc) {
                metaDesc.setAttribute('content', pageDesc);
            } else {
                const newMeta = document.createElement('meta');
                newMeta.name = "description";
                newMeta.content = pageDesc;
                document.head.appendChild(newMeta);
            }

            // Update OG Tags
            const updateMeta = (property, content) => {
                const el = document.querySelector(`meta[property="${property}"]`);
                if (el) el.setAttribute('content', content);
            };
            updateMeta('og:title', pageTitle);
            updateMeta('og:description', pageDesc);
            updateMeta('og:url', pageUrl);
            if (pageImg) updateMeta('og:image', pageImg);

            // Update Canonical
            const canon = document.getElementById('canonical-link');
            if (canon) canon.setAttribute('href', pageUrl);

            // Dynamic Schema (JSON-LD)
            const schemaScript = document.getElementById('product-schema');
            if (schemaScript) {
                const schemaData = {
                    "@context": "https://schema.org",
                    "@type": "Product",
                    "name": product.name,
                    "image": pageImg,
                    "description": product.description,
                    "brand": {
                        "@type": "Brand",
                        "name": "Sri & Sai Fashion"
                    },
                    "offers": {
                        "@type": "Offer",
                        "url": pageUrl,
                        "priceCurrency": "INR",
                        "price": product.price,
                        "priceValidUntil": "2026-12-31",
                        "sku": product._id,
                        "itemCondition": "https://schema.org/NewCondition",
                        "availability": product.stock > 0 || isBeautyParlour ? "https://schema.org/InStock" : "https://schema.org/OutOfStock"
                    },
                    "aggregateRating": {
                        "@type": "AggregateRating",
                        "ratingValue": product.rating || 5,
                        "reviewCount": product.reviews || 1
                    }
                };
                schemaScript.textContent = JSON.stringify(schemaData);
            }
            // --- END DYNAMIC SEO ---

            const images = (product.images && product.images.length > 0) ? product.images : [product.image].filter(Boolean);
            
            // Main Media (Image or Video)
            const mainMedia = images[0] || product.image;
            const mediaTag = isMediaVideo(mainMedia) 
                ? `<video src="${mainMedia}" class="product-detail-img" id="main-product-img" controls autoplay loop muted playsinline style="object-fit:cover; width:100%; border-radius:10px;"></video>`
                : `<img src="${mainMedia}" alt="${product.name}" class="product-detail-img" id="main-product-img" style="object-fit:cover; width:100%; border-radius:10px; transition:opacity 0.25s ease;">`;

            container.innerHTML = `
                <div class="product-detail-img-wrapper" style="position:relative; display:flex;">
                    ${images.length > 1 ? `
                        <div id="thumb-strip" style="display:flex; flex-direction:column; gap:8px; margin-right:15px; overflow-y:auto; max-height:480px;">
                            ${images.map((img, idx) => {
                                const isVid = isMediaVideo(img);
                                return `<div class="thumb-media-wrap" style="position:relative; cursor:pointer;" onclick="changeMainMedia('${img}', this)">
                                            ${isVid 
                                                ? `<div style="width:70px; height:70px; background:#000; display:flex; align-items:center; justify-content:center; border-radius:6px; color:white; border:2px solid transparent;" class="thumb-img ${idx===0 ? 'active-thumb' : ''}">
                                                     <i class="fas fa-video"></i>
                                                   </div>`
                                                : `<img src="${img}" alt="${product.name} thumbnail" class="thumb-img ${idx===0 ? 'active-thumb' : ''}" style="width:70px; height:70px; object-fit:cover; border-radius:6px;">`
                                            }
                                        </div>`;
                            }).join('')}
                        </div>
                    ` : ''}
                    <div style="flex:1; position:relative;">
                        ${mediaTag}
                        <div class="image-overlay-btns">
                            <div class="overlay-btn wishlist-toggle ${isWishlisted ? 'wishlisted' : ''}" onclick='toggleWishlist(${JSON.stringify(product).replace(/'/g, "&#39;")})' title="Add to Wishlist"><i class="fas fa-heart"></i></div>
                            <div class="overlay-btn share-btn" onclick='shareProduct("${product.name}", "Check out this ${isBeautyParlour ? 'service' : 'design'}: ${product.name}", "${images[0] || product.image}")' title="Share"><i class="fas fa-share-nodes"></i></div>
                        </div>
                    </div>
                </div>
                <div class="product-detail-info">
                    <h1>${product.name}</h1>
                    ${isBeautyParlour ? `<p class="service-category-tag" style="background: var(--secondary-color); display: inline-block; padding: 5px 15px; border-radius: 20px; font-size: 0.9rem; color: var(--primary-color); font-weight: bold; margin-bottom: 15px;">${product.category}</p>` : ''}
                    <div class="product-rating" style="font-size: 1.5rem; margin-bottom: 5px;">
                        <span id="main-rating-${product._id}">
                            ${generateInteractiveStars(product.rating || 5, product._id)}
                            <span style="font-size: 1.2rem; font-weight: bold; margin-left: 5px; color: #333;">${parseFloat(product.rating || 5).toFixed(1)}</span>
                        </span>
                        <span style="color: #888; font-size: 1rem; margin-left: 10px;">(<span id="review-count-${product._id}">${product.reviews || 0}</span> reviews)</span>
                        <p style="font-size: 0.8rem; color: #999; margin-top: 5px;">Click stars to rate this ${isBeautyParlour ? 'service' : 'product'}</p>
                    </div>
                    <p class="product-detail-price" style="font-size: 2.2rem; margin-top: 15px;">₹ ${product.price}</p>
                    ${isBeautyParlour ? `
                        <div class="service-details" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; padding: 15px; background: #f9f9f9; border-radius: 8px;">
                            <div>
                                <small style="color: #888; display: block; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 1px;">Duration</small>
                                <strong style="font-size: 1.1rem;"><i class="far fa-clock" style="color: var(--primary-color);"></i> ${product.duration || 'N/A'}</strong>
                            </div>
                            <div>
                                <small style="color: #888; display: block; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 1px;">Availability</small>
                                <strong style="font-size: 1.1rem; color: #20b858;"><i class="fas fa-calendar-check"></i> ${product.availability || 'Available'}</strong>
                            </div>
                        </div>
                    ` : `
                        <p>Status: <strong style="color: ${product.stock > 0 ? '#20b858' : '#e54c4c'};">${product.stock > 0 ? 'In Stock' : 'Out of Stock'}</strong></p>
                    `}
                    <p class="product-detail-desc" style="font-size: 1.1rem; line-height: 1.6; margin-top: 15px;">${product.description}</p>
                    <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-top: 30px;">
                        ${isBeautyParlour ? `
                            <button onclick="handleServiceBooking('${product.name.replace(/'/g, "\\'")}', '${product.price}', '${product.duration}', '${product.image}', '${window.location.href}')" class="btn" style="flex: 1; min-width: 200px; background-color: #25d366; color: white; padding: 15px; font-size: 1.2rem; display: flex; align-items: center; justify-content: center; gap: 10px; border: none; text-decoration: none;">
                                <i class="fab fa-whatsapp" style="font-size: 1.5rem;"></i> Book via WhatsApp
                            </button>
                        ` : `
                            <button class="btn btn-outline" style="flex: 1; padding: 15px; font-size: 1.1rem;" onclick='addToCart(${JSON.stringify(product).replace(/'/g, "&#39;")})' ${product.stock === 0 ? 'disabled' : ''}>
                                Add to Cart
                            </button>
                            <button class="btn" style="flex: 1; padding: 15px; font-size: 1.1rem; background-color: #ff9f00;" onclick='buyNow(${JSON.stringify(product).replace(/'/g, "&#39;")})' ${product.stock === 0 ? 'disabled' : ''}>
                                Buy Now
                            </button>
                            <a href="https://wa.me/919688561269?text=${encodeURIComponent(`Hello, I'm interested in:
*Product:* ${product.name}
*Price:* ₹${product.price}
*Link:* ${window.location.href}`)}" target="_blank" class="btn" style="background-color: #25d366; color: white; padding: 15px; font-size: 1.2rem; display: flex; align-items: center; justify-content: center; border: none; width: auto; flex: 0 0 70px;" title="Send link to WhatsApp">
                                <i class="fab fa-whatsapp"></i>
                            </a>
                        `}
                    </div>
                </div>
            `;

            // Add Similar Products Section
            let similarProducts = await getLocalProducts({ categories: [product.category], type: product.type });
            let otherSimilar = similarProducts.filter(p => p._id !== product._id);

            // If not enough similar products in the same category, fill with other products OF THE SAME TYPE
            if (otherSimilar.length < 4) {
                const allTypedProducts = await getLocalProducts({ type: product.type });
                const remaining = allTypedProducts.filter(p => p._id !== product._id && p.category !== product.category);
                otherSimilar = [...otherSimilar, ...remaining].slice(0, 4);
            } else {
                otherSimilar = otherSimilar.slice(0, 4);
            }

            if (otherSimilar.length > 0) {
                const similarContainer = document.createElement('section');
                similarContainer.className = 'container';
                similarContainer.style.marginTop = '60px';
                similarContainer.style.marginBottom = '60px';
                similarContainer.style.borderTop = '1px solid #eee';
                similarContainer.style.paddingTop = '40px';
                const title = product.type === 'beauty-parlour' ? 'Similar Services' : 'Similar Designs';
                similarContainer.innerHTML = `
                    <h2 class="section-title" style="text-align: left; font-size: 1.8rem; margin-bottom: 30px; color: #212121; border-bottom: 2px solid #ddd; padding-bottom: 10px;">${title}</h2>
                    <div class="product-grid" id="similar-products-grid"></div>
                `;

                // Append taking product-detail as grid scope out
                container.parentNode.insertBefore(similarContainer, container.nextSibling);
                renderProductCards(otherSimilar, 'similar-products-grid');
            }
        }
    } catch (error) {
        console.error('Failed to load product detail', error);
        const container = document.getElementById('product-detail-container');
        if (container) container.innerHTML = '<p>Product not found.</p>';
    }
}


document.addEventListener('DOMContentLoaded', () => {
    // Homepage integration
    if (document.getElementById('boutique-grid') || document.getElementById('beauty-parlour-grid-home')) {
        initHomepage();
    }

    if (document.getElementById('product-grid')) {
        loadProducts();
        initFilters();
    }

    if (document.getElementById('product-detail-container')) {
        loadProductDetail();
    }

    // Beauty Parlour Page integration
    if (document.getElementById('materials-grid') || document.getElementById('product-grid')) {
        // materials-grid might be legacy, but we use product-grid now
        if (window.location.pathname.includes('beauty-parlour')) {
            initBeautyParlorPage();
        }
    }
});

async function initHomepage() {
    try {
        const boutiqueProducts = await getLocalProducts({ type: 'boutique' });
        const beautyProducts = await getLocalProducts({ type: 'beauty-parlour' });
        
        boutiqueProducts.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        beautyProducts.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        
        renderProductCards(boutiqueProducts.slice(0, 4), 'boutique-grid');
        renderProductCards(beautyProducts.slice(0, 4), 'beauty-parlour-grid-home');
    } catch (error) {
        console.error('Failed to load homepage sections', error);
    }
}

async function initBeautyParlorPage() {
    try {
        const products = await getLocalProducts({ type: 'beauty-parlour' });
        renderProductCards(products, 'product-grid');
    } catch (error) {
        const container = document.getElementById('product-grid');
        if (container) {
            container.innerHTML = `<p class="error">Failed to load beauty services. ${error.message}</p>`;
        }
    }
}

// Flipkart-style gallery switch
window.changeMainMedia = function (url, thumbWrap) {
    const mainMediaElement = document.getElementById('main-product-img');
    const container = mainMediaElement.parentElement;
    
    // Remove previous active class
    document.querySelectorAll('.thumb-img').forEach(t => {
        t.classList.remove('active-thumb');
        t.style.borderColor = '#ddd'; // Reset border for images
        if (t.parentElement.classList.contains('thumb-media-wrap')) { // For video divs
            t.style.borderColor = 'transparent';
        }
    });
    const thumb = thumbWrap.querySelector('.thumb-img');
    if (thumb) {
        thumb.classList.add('active-thumb');
        thumb.style.borderColor = 'var(--primary-color)';
    }

    const isVid = isMediaVideo(url);
    let newTag;
    
    if (isVid) {
        newTag = document.createElement('video');
        newTag.src = url;
        newTag.controls = true;
        newTag.autoplay = true;
        newTag.loop = true;
        newTag.muted = true;
        newTag.playsInline = true;
        newTag.className = 'product-detail-img';
        newTag.id = 'main-product-img';
        newTag.style = "object-fit:cover; width:100%; border-radius:10px;";
    } else {
        newTag = document.createElement('img');
        newTag.src = url;
        newTag.className = 'product-detail-img';
        newTag.id = 'main-product-img';
        newTag.style = "object-fit:cover; width:100%; border-radius:10px; transition:opacity 0.25s ease;";
    }

    container.replaceChild(newTag, mainMediaElement);
};
