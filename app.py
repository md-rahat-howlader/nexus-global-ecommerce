from flask import Flask, render_template, jsonify, request
from pymongo import MongoClient
import datetime
import random

app = Flask(__name__)

# MongoDB Atlas Cloud Connection
MONGO_URI = "mongodb+srv://rahatislam6777_db_user:WCmn0W6b8HE85asL@cluster0.6fopie7.mongodb.net/?retryWrites=true&w=majority"
client = MongoClient(MONGO_URI)
db = client["nexus_global_enterprise"]
products_collection = db["products"]
orders_collection = db["orders"]

def seed_500_products():
    # যদি ডেটাবেজে ৫০০টির কম প্রোডাক্ট থাকে, তবে নতুন করে ৫০০টি প্রোডাক্ট তৈরি করবে
    if products_collection.count_documents({}) < 500:
        products_collection.delete_many({})
        
        categories = {
            "Men": [
                ("Premium Oxford Formal Shirt", "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600&q=80", 1450),
                ("Slim Fit Selvedge Denim Jeans", "https://images.unsplash.com/photo-1542272604-787c3835535d?w=600&q=80", 1890),
                ("Heavyweight Cotton Polo T-Shirt", "https://images.unsplash.com/photo-1586363104862-3a5e2ab60d99?w=600&q=80", 950),
                ("Tailored Chino Trousers", "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=600&q=80", 1550),
                ("Essential Crewneck Tee", "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&q=80", 650)
            ],
            "Women": [
                ("Silk Blend Pleated Midi Dress", "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=600&q=80", 2450),
                ("Tailored Linen Blazer", "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=600&q=80", 2850),
                ("High-Waist Wide Leg Trousers", "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=600&q=80", 1750),
                ("Artisan Embroidered Kurti", "https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=600&q=80", 1650),
                ("Cashmere Touch Knit Top", "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=600&q=80", 1350)
            ],
            "Winter": [
                ("Quilted Puffer Bomber Jacket", "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&q=80", 3200),
                ("French Terry Oversized Hoodie", "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=600&q=80", 1690),
                ("Merino Wool Turtleneck Sweater", "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=600&q=80", 2150),
                ("Classic Trench Overcoat", "https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=600&q=80", 3850)
            ],
            "Kids": [
                ("Organic Cotton Kids Co-ord Set", "https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=600&q=80", 1150),
                ("Junior Denim Dungaree", "https://images.unsplash.com/photo-1503919545889-aef636e10ad4?w=600&q=80", 1390),
                ("Soft Fleece Kids Sweatshirt", "https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?w=600&q=80", 980)
            ],
            "Accessories": [
                ("Full-Grain Leather Belt", "https://images.unsplash.com/photo-1624222247344-550fb60583dc?w=600&q=80", 890),
                ("Minimalist Canvas Tote Bag", "https://images.unsplash.com/photo-1544816155-12df9643f363?w=600&q=80", 750),
                ("Polarized Aviator Sunglasses", "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=600&q=80", 1250)
            ]
        }

        colors = ["Obsidian Black", "Navy Blue", "Olive Green", "Ivory White", "Charcoal Grey", "Burgundy", "Sand Beige", "Royal Blue"]
        fits = ["Regular Fit", "Slim Fit", "Relaxed Fit", "Export Edition", "Signature Series"]
        badges = ["NEW ARRIVAL", "BESTSELLER", "EXPORT QUALITY", "LIMITED", ""]

        bulk_products = []
        product_id = 1001

        while len(bulk_products) < 500:
            cat_name = random.choice(list(categories.keys()))
            base_name, img_url, base_price = random.choice(categories[cat_name])
            color = random.choice(colors)
            fit = random.choice(fits)
            
            price_variation = random.choice([-150, -50, 0, 100, 200, 350])
            final_price = max(490, base_price + price_variation)
            old_price = final_price + random.choice([250, 400, 500])

            bulk_products.append({
                "sku": f"NXG-{product_id}",
                "name": f"{color} {base_name} ({fit})",
                "category": cat_name,
                "price": final_price,
                "old_price": old_price,
                "image": img_url,
                "badge": random.choice(badges),
                "rating": round(random.uniform(4.3, 5.0), 1),
                "reviews": random.randint(14, 240),
                "stock": random.randint(15, 120),
                "sizes": ["S", "M", "L", "XL", "XXL"] if cat_name != "Accessories" else ["Free Size"]
            })
            product_id += 1

        products_collection.insert_many(bulk_products)
        print("✅ 500 Professional Products Seeded to MongoDB Atlas!")

# সার্ভার স্টার্ট হওয়ার সময় ৫০০ প্রোডাক্ট চেক ও আপলোড করবে
seed_500_products()

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/api/products")
def get_products():
    category = request.args.get("category", "All")
    search = request.args.get("search", "").strip()
    sort_by = request.args.get("sort", "default")
    page = int(request.args.get("page", 1))
    per_page = 20  # প্রতি পেজে ২০টি করে প্রোডাক্ট দেখাবে (৫০০টি = ২৫ পেজ)

    query = {}
    if category != "All":
        query["category"] = category
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"sku": {"$regex": search, "$options": "i"}},
            {"category": {"$regex": search, "$options": "i"}}
        ]

    sort_criteria = [("_id", 1)]
    if sort_by == "price_low":
        sort_criteria = [("price", 1)]
    elif sort_by == "price_high":
        sort_criteria = [("price", -1)]
    elif sort_by == "rating":
        sort_criteria = [("rating", -1)]

    total_items = products_collection.count_documents(query)
    total_pages = max(1, (total_items + per_page - 1) // per_page)
    
    cursor = products_collection.find(query, {"_id": 0}).sort(sort_criteria).skip((page - 1) * per_page).limit(per_page)
    products = list(cursor)

    return jsonify({
        "products": products,
        "total_items": total_items,
        "total_pages": total_pages,
        "current_page": page
    })

@app.route("/api/order", methods=["POST"])
def create_order():
    data = request.json
    if not data or not data.get("items"):
        return jsonify({"status": "error", "message": "Cart is empty"}), 400

    order_id = f"ORD-{random.randint(100000, 999999)}"
    order_doc = {
        "order_id": order_id,
        "customer_name": data.get("name"),
        "phone": data.get("phone"),
        "address": data.get("address"),
        "city": data.get("city", "Dhaka"),
        "items": data.get("items"),
        "subtotal": data.get("subtotal"),
        "delivery_charge": data.get("delivery_charge"),
        "total": data.get("total"),
        "status": "Confirmed",
        "created_at": datetime.datetime.now().strftime("%Y-%m-%d %I:%M %p")
    }
    orders_collection.insert_one(order_doc)
    return jsonify({"status": "success", "order_id": order_id})

@app.route("/admin")
def admin_panel():
    orders = list(orders_collection.find({}, {"_id": 0}).sort("_id", -1))
    total_products = products_collection.count_documents({})
    total_revenue = sum(o.get("total", 0) for o in orders)
    return render_template("admin.html", orders=orders, total_products=total_products, total_revenue=total_revenue)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)