const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();
const { MongoClient, ObjectId } = require("mongodb");
const Stripe = require("stripe");
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
const client = new MongoClient(process.env.MONGODB_URI);

client.connect().then(() => {
    console.log("✅ Connected to MongoDB");

    const db = client.db("phones"); // Replace with your actual db name
    const collection = db.collection("phonesCollection"); // Replace with your actual collection name

    // Example GET route
    app.get("/", async (req, res) => {
        try {
            const docs = await collection.find({}).toArray();
            res.json(docs);
        } catch (error) {
            console.error("Error fetching data:", error);
            res.status(500).send("Internal Server Error");
        }
    });

    // GET /phone/cart - fetch all items in cart
    app.get("/phone/cart", async (req, res) => {
        try {
            const id = req.query.id;

            if (id) {
                // Find a single item by "id" field
                const item = await collection.findOne({
                    _id: new ObjectId(id),
                });
                if (item) {
                    res.json(item);
                } else {
                    res.status(404).json({ message: "Item not found" });
                }
            } else {
                // No query param - return all items
                const items = await collection.find({}).toArray();
                res.json(items);
            }
        } catch (error) {
            console.error("Failed to fetch cart items:", error);
            res.status(500).json({ message: "Internal Server Error" });
        }
    });

    // POST /phone/cart - Add phone to cart
    app.post("/phone/cart", async (req, res) => {
        try {
            const newItem = {
                id: req.body.id,
                quantity: req.body.quantity,
                name: req.body.name,
                price: req.body.price,
                // Add more fields if you expect them from frontend
            };

            const result = await collection.insertOne(newItem);
            res.status(201).json({
                message: "Item added to cart",
                itemId: result.insertedId,
            });
        } catch (error) {
            console.error("Failed to add item to cart:", error);
            res.status(500).json({ message: "Internal Server Error" });
        }
    });


    // ?Stripe
    app.post("/create-payment-intent", async (req, res) => {
        try {
            const { amount } = req.body;

            // You should validate amount properly here
            if (!amount) {
                return res.status(400).json({ message: "Amount is required" });
            }

            const paymentIntent = await stripe.paymentIntents.create({
                amount: Math.round(amount * 100), // convert to cents
                currency: "usd",
                payment_method_types: ["card"],
            });

            res.send({ clientSecret: paymentIntent.client_secret });
        } catch (error) {
            console.error("Error creating payment intent:", error);
            res.status(500).json({
                message: "Failed to create payment intent",
            });
        }
    });
});

// Start server after successful DB connection
app.listen(port, () => {
    console.log(`🚀 Server is running on port ${port}`);
});
