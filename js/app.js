
/* =====================================
   HEXACART - JAVASCRIPT
===================================== */

// 1. Category data

const categories = [
    { id: 1, name: "Fashion", icon: "👗" },
    { id: 2, name: "Electronics", icon: "💻" },
    { id: 3, name: "Home", icon: "🏠" },
    { id: 4, name: "Accessories", icon: "✨" }
];

// 2. Product data

const products = [
    {
        id: 1,
        cat_id: 1,
        title: "Lavender Handbag",
        des: "A stylish everyday handbag.",
        qty: 10,
        price: 899,
        image: "https://placehold.co/400x300/f2edff/7652c4?text=Handbag"
    },
    {
        id: 2,
        cat_id: 2,
        title: "Wireless Headphones",
        des: "Enjoy music with clear sound.",
        qty: 15,
        price: 1499,
        image: "https://placehold.co/400x300/fce8f2/7652c4?text=Headphones"
    },
    {
        id: 3,
        cat_id: 3,
        title: "Ceramic Flower Vase",
        des: "Add charm to your living space.",
        qty: 8,
        price: 599,
        image: "https://placehold.co/400x300/f2edff/7652c4?text=Flower+Vase"
    },
    {
        id: 4,
        cat_id: 4,
        title: "Pearl Bracelet",
        des: "A delicate accessory for every occasion.",
        qty: 20,
        price: 399,
        image: "https://placehold.co/400x300/fce8f2/7652c4?text=Bracelet"
    },
    {
        id: 5,
        cat_id: 1,
        title: "Casual Sneakers",
        des: "Comfortable shoes for everyday wear.",
        qty: 12,
        price: 1299,
        image: "https://placehold.co/400x300/f2edff/7652c4?text=Sneakers"
    },
    {
        id: 6,
        cat_id: 2,
        title: "Smart Watch",
        des: "Keep track of your daily activities.",
        qty: 7,
        price: 2199,
        image: "https://placehold.co/400x300/fce8f2/7652c4?text=Smart+Watch"
    },
    {
        id: 7,
        cat_id: 3,
        title: "Decorative Lamp",
        des: "Brighten up your favourite corner.",
        qty: 9,
        price: 799,
        image: "https://placehold.co/400x300/f2edff/7652c4?text=Lamp"
    },
    {
        id: 8,
        cat_id: 4,
        title: "Classic Sunglasses",
        des: "A trendy addition to your collection.",
        qty: 18,
        price: 499,
        image: "https://placehold.co/400x300/fce8f2/7652c4?text=Sunglasses"
    }
];

// 3. Shopping cart

let cart = [];

// 4. Pagination settings

const productsPerPage = 4;
let currentPage = 1;

// 5. Store filtered products

let filteredProducts = [...products];

// 6. Display products

function displayProducts(productList) {

    const productContainer = document.getElementById("product-list");

    if (productList.length === 0) {
        productContainer.innerHTML = "<p>No products found.</p>";
        document.getElementById("pagination").innerHTML = "";
        return;
    }

    const startIndex = (currentPage - 1) * productsPerPage;

    const endIndex = startIndex + productsPerPage;

    const currentProducts = productList.slice(startIndex, endIndex);

    productContainer.innerHTML = currentProducts.map(product => `
        <div class="product-card">

            <div class="product-image">
                <img src="${product.image}" alt="${product.title}">
            </div>

            <div class="product-info">

                <h3>${product.title}</h3>

                <p>${product.des}</p>

                <p class="product-price">
                    ₹${product.price.toLocaleString("en-IN")}
                </p>

                <button
    class="add-cart-button"
    onclick="viewProductDetails(${product.id})">
    View Details
</button>

                <button
                    class="add-cart-button"
                    onclick="addToCart(${product.id})"
                    ${product.qty === 0 ? "disabled" : ""}>
                    ${product.qty === 0 ? "Out of Stock" : "Add to Cart"}
                </button>

            </div>

        </div>
    `).join("");

    displayPagination(productList.length);
}

// 7. Display pagination buttons

function displayPagination(totalProducts) {

    const pagination = document.getElementById("pagination");

    const totalPages = Math.ceil(totalProducts / productsPerPage);

    let buttons = "";

    for (let page = 1; page <= totalPages; page++) {

        buttons += `
            <button
                class="${page === currentPage ? "active" : ""}"
                onclick="changePage(${page})">
                ${page}
            </button>
        `;
    }

    pagination.innerHTML = buttons;
}

// 8. Change page

function changePage(page) {

    currentPage = page;

    displayProducts(filteredProducts);
}

// 9. Search and category filtering

function filterProducts() {

    const searchText = document
        .getElementById("search-input")
        .value.toLowerCase()
        .trim();

    const selectedCategory = document
        .getElementById("category-filter")
        .value;

    filteredProducts = products.filter(product => {

        const matchesSearch = product.title
            .toLowerCase()
            .includes(searchText);

        const matchesCategory =
            selectedCategory === "all" ||
            product.cat_id === Number(selectedCategory);

        return matchesSearch && matchesCategory;
    });

    currentPage = 1;

    displayProducts(filteredProducts);
}

// 10. Add product to cart

function addToCart(productId) {

    const product = products.find(item => item.id === productId);

    if (!product || product.qty === 0) {
        alert("This product is unavailable.");
        return;
    }

    const cartItem = cart.find(item => item.id === productId);

    if (cartItem) {

        if (cartItem.quantity >= product.qty) {
            alert("Available stock limit reached.");
            return;
        }

        cartItem.quantity++;

    } else {

        cart.push({
            id: product.id,
            title: product.title,
            price: product.price,
            quantity: 1
        });

    }

    updateCartCount();

    alert(product.title + " added to cart!");
}


// 11. Update cart count

function updateCartCount() {

    const totalItems = cart.reduce(
        (total, item) => total + item.quantity,
        0
    );

    document.querySelector(".cart-link span").textContent = totalItems;

    displayCart();
}

// 12. Initial page loading

document.addEventListener("DOMContentLoaded", function () {

    document
        .getElementById("search-input")
        .addEventListener("input", filterProducts);

    document
        .getElementById("category-filter")
        .addEventListener("change", filterProducts);

    displayProducts(filteredProducts);

    updateCartCount();

});

// 16. Display shopping cart

function displayCart() {

    const cartContainer = document.getElementById("cart-items");

    const cartTotal = document.getElementById("cart-total");

    if (cart.length === 0) {

        cartContainer.innerHTML = `
            <div class="cart-empty">
                <h3>Your cart is empty 🛍️</h3>
                <p>Explore our products and find something you love!</p>
            </div>
        `;

        cartTotal.textContent = "₹0";

        return;
    }

    cartContainer.innerHTML = cart.map(item => `
        <div class="cart-item">

            <div class="cart-item-info">
                <h3>${item.title}</h3>
                <p>₹${item.price.toLocaleString("en-IN")} each</p>
                <p>Subtotal: ₹${(item.price * item.quantity).toLocaleString("en-IN")}</p>
            </div>

            <div class="cart-item-actions">

                <button onclick="changeCartQuantity(${item.id}, -1)">−</button>

                <span>${item.quantity}</span>

                <button onclick="changeCartQuantity(${item.id}, 1)">+</button>

                <button
                    class="remove-button"
                    onclick="removeFromCart(${item.id})">
                    Remove
                </button>

            </div>

        </div>
    `).join("");

    const total = cart.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
    );

    cartTotal.textContent = "₹" + total.toLocaleString("en-IN");
}

// 17. Change cart quantity

function changeCartQuantity(productId, change) {

    const cartItem = cart.find(item => item.id === productId);

    const product = products.find(item => item.id === productId);

    if (!cartItem || !product) {
        return;
    }

    const newQuantity = cartItem.quantity + change;

    if (newQuantity < 1) {
        removeFromCart(productId);
        return;
    }

    if (newQuantity > product.qty) {
        alert("Available stock limit reached.");
        return;
    }

    cartItem.quantity = newQuantity;

    updateCartCount();
}

// 18. Remove product from cart

function removeFromCart(productId) {

    cart = cart.filter(item => item.id !== productId);

    updateCartCount();
}

// 19. Open and close cart

document.getElementById("open-cart").addEventListener("click", function (event) {

    event.preventDefault();

    displayCart();

    document.getElementById("cart-modal").classList.add("show");

});

document.getElementById("close-cart").addEventListener("click", function () {

    document.getElementById("cart-modal").classList.remove("show");

});

document.getElementById("cart-modal").addEventListener("click", function (event) {

    if (event.target === this) {
        this.classList.remove("show");
    }

});

// 20. Temporary checkout action

document.getElementById("checkout-button").addEventListener("click", function () {

    if (cart.length === 0) {
        alert("Your cart is empty!");
        return;
    }

    alert("Your cart is ready! Checkout functionality is coming next.");

});

// 13. View individual product details

function viewProductDetails(productId) {

    const product = products.find(item => item.id === productId);

    if (!product) {
        alert("Product not found.");
        return;
    }

    const modal = document.getElementById("product-modal");

    const modalBody = document.getElementById("modal-body");

    modalBody.innerHTML = `
        <img src="${product.image}" alt="${product.title}">

        <div class="modal-details">

            <h2>${product.title}</h2>

            <p>${product.des}</p>

            <p class="product-price">
                ₹${product.price.toLocaleString("en-IN")}
            </p>

            <p>Product ID: ${product.id}</p>

            <p>Category: ${
                categories.find(cat => cat.id === product.cat_id)?.name
                || "Other"
            }</p>

            <p>Available Stock: ${product.qty}</p>

            <div class="quantity-control">
                <label for="product-quantity">Quantity:</label>

                <input
                    type="number"
                    id="product-quantity"
                    min="1"
                    max="${product.qty}"
                    value="1"
                    ${product.qty === 0 ? "disabled" : ""}
                >
            </div>

            <button
                class="add-cart-button"
                onclick="addSelectedQuantity(${product.id})"
                ${product.qty === 0 ? "disabled" : ""}>
                Add to Cart
            </button>

        </div>
    `;

    modal.classList.add("show");
}

// 14. Add selected quantity to cart

function addSelectedQuantity(productId) {

    const product = products.find(item => item.id === productId);

    const quantityInput = document.getElementById("product-quantity");

    const quantity = Number(quantityInput.value);

    if (!Number.isInteger(quantity) || quantity < 1) {
        alert("Please enter a valid quantity.");
        return;
    }

    const cartItem = cart.find(item => item.id === productId);

    const existingQuantity = cartItem ? cartItem.quantity : 0;

    if (existingQuantity + quantity > product.qty) {
        alert("You have exceeded the available stock.");
        return;
    }

    if (cartItem) {
        cartItem.quantity += quantity;
    } else {
        cart.push({
            id: product.id,
            title: product.title,
            price: product.price,
            quantity: quantity
        });
    }

    updateCartCount();

    document.getElementById("product-modal").classList.remove("show");

    alert(product.title + " added to cart!");
}

// 15. Close product details popup

document.getElementById("close-modal").addEventListener("click", function () {
    document.getElementById("product-modal").classList.remove("show");
});

// Close popup when clicking outside

document.getElementById("product-modal").addEventListener("click", function (event) {

    if (event.target === this) {
        this.classList.remove("show");
    }

});

