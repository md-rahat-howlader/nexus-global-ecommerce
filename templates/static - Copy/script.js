let currentCategory = "All";
let currentPage = 1;
let cart = JSON.parse(localStorage.getItem("nexus_cart")) || [];
let deliveryCharge = 80;

document.addEventListener("DOMContentLoaded", () => {
    fetchProducts();
    updateCartUI();

    document.querySelectorAll(".tab").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".tab").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            currentCategory = btn.dataset.cat;
            currentPage = 1;
            fetchProducts();
        });
    });

    document.getElementById("searchInput").addEventListener("keyup", (e) => {
        if (e.key === "Enter") applyFilters();
    });
});

function applyFilters() {
    currentPage = 1;
    fetchProducts();
}

async function fetchProducts() {
    const search = document.getElementById("searchInput").value;
    const sort = document.getElementById("sortSelect").value;
    const grid = document.getElementById("productGrid");
    
    grid.innerHTML = "<p>Loading products from MongoDB Cloud...</p>";

    const res = await fetch(`/api/products?category=${currentCategory}&search=${encodeURIComponent(search)}&sort=${sort}&page=${currentPage}`);
    const data = await res.json();

    document.getElementById("resultCount").innerText = `Showing ${data.products.length} of ${data.total_items} items`;
    renderProducts(data.products);
    renderPagination(data.total_pages, data.current_page);
}

function renderProducts(products) {
    const grid = document.getElementById("productGrid");
    if (!products.length) {
        grid.innerHTML = "<p>No products matched your search.</p>";
        return;
    }

    grid.innerHTML = products.map(p => `
        <div class="product-card">
            <div class="img-wrap">
                ${p.badge ? `<span class="badge-tag">${p.badge}</span>` : ""}
                <span class="sku-tag">${p.sku}</span>
                <img src="${p.image}" alt="${p.name}" loading="lazy">
            </div>
            <div class="card-body">
                <span class="cat-label">${p.category}</span>
                <h4 class="card-title">${p.name}</h4>
                <div class="rating">
                    <i class="fa-solid fa-star"></i> ${p.rating} <span>(${p.reviews} reviews)</span>
                </div>
                <div class="price-row">
                    <span class="price">৳${p.price}</span>
                    <span class="old-price">৳${p.old_price}</span>
                </div>
                <select class="size-select" id="size-${p.sku}">
                    ${p.sizes.map(s => `<option value="${s}">Size: ${s}</option>`).join("")}
                </select>
                <button class="add-btn" onclick='addToCart(${JSON.stringify(p)})'>
                    <i class="fa-solid fa-cart-plus"></i> Add to Bag
                </button>
            </div>
        </div>
    `).join("");
}

function renderPagination(totalPages, activePage) {
    const container = document.getElementById("pagination");
    let html = "";
    
    const start = Math.max(1, activePage - 2);
    const end = Math.min(totalPages, activePage + 2);

    if (activePage > 1) {
        html += `<button class="page-btn" onclick="goToPage(${activePage - 1})">Prev</button>`;
    }
    for (let i = start; i <= end; i++) {
        html += `<button class="page-btn ${i === activePage ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
    }
    if (activePage < totalPages) {
        html += `<button class="page-btn" onclick="goToPage(${activePage + 1})">Next</button>`;
    }
    container.innerHTML = html;
}

function goToPage(page) {
    currentPage = page;
    fetchProducts();
    document.getElementById("catalog").scrollIntoView({ behavior: "smooth" });
}

function addToCart(product) {
    const size = document.getElementById(`size-${product.sku}`).value;
    const key = `${product.sku}-${size}`;
    const existing = cart.find(item => item.key === key);

    if (existing) {
        existing.qty += 1;
    } else {
        cart.push({
            key,
            sku: product.sku,
            name: product.name,
            price: product.price,
            image: product.image,
            size,
            qty: 1
        });
    }
    saveCart();
    toggleCart(true);
}

function updateQty(key, delta) {
    const item = cart.find(i => i.key === key);
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) {
        cart = cart.filter(i => i.key !== key);
    }
    saveCart();
}

function saveCart() {
    localStorage.setItem("nexus_cart", JSON.stringify(cart));
    updateCartUI();
}

function updateCartUI() {
    const totalQty = cart.reduce((sum, i) => sum + i.qty, 0);
    document.getElementById("cartCount").innerText = totalQty;

    const container = document.getElementById("cartItems");
    if (!cart.length) {
        container.innerHTML = `<p class="empty-msg">Your bag is currently empty.</p>`;
        document.getElementById("cartSubtotal").innerText = "৳0";
        document.getElementById("cartTotal").innerText = "৳0";
        return;
    }

    let subtotal = 0;
    container.innerHTML = cart.map(item => {
        subtotal += item.price * item.qty;
        return `
            <div class="cart-item">
                <img src="${item.image}" alt="${item.name}">
                <div style="flex:1;">
                    <h5 style="font-size:13px;">${item.name}</h5>
                    <small style="color:#64748b;">Size: ${item.size} | ৳${item.price}</small>
                    <div style="margin-top:6px; display:flex; align-items:center; gap:8px;">
                        <button onclick="updateQty('${item.key}', -1)" style="padding:2px 8px;">-</button>
                        <span>${item.qty}</span>
                        <button onclick="updateQty('${item.key}', 1)" style="padding:2px 8px;">+</button>
                    </div>
                </div>
            </div>
        `;
    }).join("");

    document.getElementById("cartSubtotal").innerText = `৳${subtotal}`;
    document.getElementById("cartDelivery").innerText = `৳${deliveryCharge}`;
    document.getElementById("cartTotal").innerText = `৳${subtotal + deliveryCharge}`;
}

function toggleCart(forceOpen = null) {
    const drawer = document.getElementById("cartDrawer");
    const overlay = document.getElementById("cartOverlay");
    const shouldOpen = forceOpen !== null ? forceOpen : !drawer.classList.contains("open");
    drawer.classList.toggle("open", shouldOpen);
    overlay.classList.toggle("open", shouldOpen);
}

function openCheckoutModal() {
    if (!cart.length) return alert("Please add items to your cart first!");
    toggleCart(false);
    document.getElementById("checkoutModal").classList.add("open");
}

function closeCheckoutModal() {
    document.getElementById("checkoutModal").classList.remove("open");
}

function updateDeliveryZone() {
    const city = document.getElementById("custCity").value;
    deliveryCharge = city === "Dhaka" ? 80 : 130;
    updateCartUI();
}

async function submitOrder(e) {
    e.preventDefault();
    const btn = document.getElementById("submitOrderBtn");
    btn.innerText = "Processing Order...";
    btn.disabled = true;

    const subtotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
    const payload = {
        name: document.getElementById("custName").value,
        phone: document.getElementById("custPhone").value,
        city: document.getElementById("custCity").value,
        address: document.getElementById("custAddress").value,
        items: cart,
        subtotal: subtotal,
        delivery_charge: deliveryCharge,
        total: subtotal + deliveryCharge
    };

    const res = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });
    const result = await res.json();

    if (result.status === "success") {
        alert(`🎉 Order Confirmed! Your Order ID is ${result.order_id}. View it anytime in the Admin Portal!`);
        cart = [];
        saveCart();
        closeCheckoutModal();
        document.getElementById("checkoutForm").reset();
    } else {
        alert("Something went wrong. Please try again.");
    }

    btn.innerText = "Confirm Order (Cash on Delivery)";
    btn.disabled = false;
}

function orderViaWhatsApp() {
    if (!cart.length) return alert("Add items to your cart first!");
    let text = "Hello NEXUS GLOBAL! I want to order:\n\n";
    let total = 0;
    cart.forEach((item, idx) => {
        text += `${idx + 1}. ${item.name} (${item.sku}) - Size: ${item.size} x${item.qty} = ৳${item.price * item.qty}\n`;
        total += item.price * item.qty;
    });
    text += `\nTotal: ৳${total + deliveryCharge}`;
    window.open(`https://wa.me/8801700000000?text=${encodeURIComponent(text)}`, "_blank");
}
