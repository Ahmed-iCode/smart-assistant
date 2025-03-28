import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { exec } from "child_process";
import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";
import { MongoClient, ServerApiVersion } from "mongodb";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// إعداد Gemini AI مع إعدادات الأمان
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
  generationConfig: {
    maxOutputTokens: 1000,
    temperature: 0.7,
    topP: 0.8,
    topK: 40,
  },
  safetySettings: [
    {
      category: HarmCategory.HARM_CATEGORY_HARASSMENT,
      threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
    },
    {
      category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
  ],
});

// إعداد MongoDB
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let db;

// الاتصال بقاعدة البيانات
async function connectDB() {
  try {
    await client.connect();
    db = client.db("ai-assistant");
    console.log("تم الاتصال بقاعدة البيانات بنجاح!");
  } catch (error) {
    console.error("خطأ في الاتصال بقاعدة البيانات:", error);
  }
}

connectDB();

// إعداد الملفات الثابتة
app.use(express.static(path.join(__dirname, "public")));
app.use(cors());
app.use(express.json());

// مسار الصفحة الرئيسية
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// دالة لمعالجة الردود من Gemini
async function processGeminiResponse(prompt) {
  try {
    // إضافة تعليمات للتنسيق والسياق
    const formattedPrompt = `أنت مساعد ذكي وودي يتحدث العربية. يجب أن تكون:
    1. ودياً ومهذباً في الردود
    2. ذكياً ومطلعاً على المعلومات الحالية
    3. قادراً على فهم السياق والرد بشكل مناسب
    4. منظماً في الردود باستخدام Markdown
    5. قادراً على تقديم معلومات مفيدة ومحدثة

    قواعد الرد:
    - استخدم العناوين (#) للعناوين الرئيسية
    - استخدم القوائم النقطية (*) للنقاط
    - استخدم الخط العريض (**) للنص المهم
    - استخدم المسافات البادئة للقوائم الفرعية
    - استخدم الأسطر الفاصلة (---) للفصل بين الأقسام
    - استخدم علامات الاقتباس (>) للنصائح المهمة
    
    معلومات مهمة:
    - التاريخ الحالي: ${new Date().toLocaleDateString("ar-SA")}
    - الوقت الحالي: ${new Date().toLocaleTimeString("ar-SA")}
    - اليوم: ${new Date().toLocaleDateString("ar-SA", { weekday: "long" })}
    
    السؤال: ${prompt}`;

    const result = await model.generateContent(formattedPrompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("خطأ في معالجة الرد من Gemini:", error);
    throw error;
  }
}

// API للتنفيذ
app.post("/execute", async (req, res) => {
  const { command } = req.body;

  try {
    // معالجة الأمر باستخدام Gemini
    const aiResponse = await processGeminiResponse(command);

    // حفظ المحادثة
    await db.collection("conversations").insertOne({
      message: command,
      response: aiResponse,
      timestamp: new Date(),
    });

    // تنفيذ الأوامر البسيطة
    if (command.includes("فتح")) {
      if (command.includes("المفكرة")) {
        exec("notepad.exe", (err) => {
          if (err) {
            res.json({ success: false, message: "حدث خطأ في فتح المفكرة" });
          } else {
            res.json({ success: true, message: "تم فتح المفكرة بنجاح" });
          }
        });
      } else if (command.includes("المتصفح")) {
        exec("start chrome", (err) => {
          if (err) {
            res.json({ success: false, message: "حدث خطأ في فتح المتصفح" });
          } else {
            res.json({ success: true, message: "تم فتح المتصفح بنجاح" });
          }
        });
      }
    } else {
      res.json({ success: true, message: aiResponse });
    }
  } catch (error) {
    console.error("خطأ في معالجة الأمر:", error);
    res
      .status(500)
      .json({ success: false, message: "حدث خطأ في معالجة الأمر" });
  }
});

// API لجلب سجل المحادثات
app.get("/conversations", async (req, res) => {
  try {
    const conversations = await db
      .collection("conversations")
      .find()
      .sort({ timestamp: -1 })
      .toArray();
    res.json(conversations);
  } catch (error) {
    res.status(500).json({ message: "حدث خطأ في جلب المحادثات" });
  }
});

// إعداد Socket.IO
io.on("connection", (socket) => {
  console.log("New User Connected");

  socket.on("message", async (data) => {
    try {
      const aiResponse = await processGeminiResponse(data.message);
      socket.emit("response", { message: aiResponse });
    } catch (error) {
      console.error("خطأ في معالجة الرسالة:", error);
      socket.emit("error", { message: "حدث خطأ في معالجة الرسالة" });
    }
  });

  socket.on("disconnect", () => {
    console.log("  User Not Connected ");
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server On${PORT}`);
});

// إغلاق الاتصال عند إيقاف الخادم
process.on("SIGINT", async () => {
  await client.close();
  process.exit();
});
