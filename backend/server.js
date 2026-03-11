import express from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// MongoDB connect
const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017";
const client = new MongoClient(uri);

let db;
let expensesCollection;

async function connectDB() {
  try {
    await client.connect();
    db = client.db('smartExpenseTracker');
    expensesCollection = db.collection('expenses');
    console.log("🟢 Connected successfully to MongoDB native driver");
  } catch (error) {
    console.error("🔴 MongoDB connection error:", error);
  }
}
connectDB();

// Setup Google Gen AI SDK
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);


app.get('/api/expenses', async (req, res) => {
  try {
    const expenses = await expensesCollection.find({})
      .sort({ date: -1 })
      .toArray();
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/expenses', async (req, res) => {
  try {
    const { sentence } = req.body;
    
    if (!sentence) {
      return res.status(400).json({ error: "Sentence is required" });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(400).json({ error: "GEMINI_API_KEY missing in backend/.env" });
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    const prompt = `
You are an intelligent expense categorizer. 
Extract the expense details from the following sentence and return them strictly as a JSON object.
Use the exact keys: "merchant" (String), "amount" (Number), "category" (String), and "item" (String).
For the "item" key, extract what was actually purchased (e.g., "coffee and sandwich", "shoes", "electricity bill").
Choose the most appropriate category from: Food, Transport, Utilities, Entertainment, Health, Shopping, Housing, Travel, Other.

Sentence: "${sentence}"
`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    let structuredData;
    try {
      structuredData = JSON.parse(responseText);
    } catch (parseError) {
      return res.status(500).json({ error: "Failed to parse LLM response", raw: responseText });
    }

    // Prepare document for Native MongoDB insertions
    const expenseDocument = {
      originalSentence: sentence,
      merchant: structuredData.merchant || "Unknown",
      item: structuredData.item || "Unknown Item",
      amount: structuredData.amount || 0,
      category: structuredData.category || "Other",
      date: new Date()
    };

    const insertResult = await expensesCollection.insertOne(expenseDocument);
    
    res.status(201).json({
      ...expenseDocument,
      _id: insertResult.insertedId
    });

  } catch (error) {
    console.error("Error processing expense:", error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`🚀 Server listening on port ${port}`);
});
