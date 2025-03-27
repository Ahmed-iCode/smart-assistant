# المساعد الذكي - Smart Assistant

مساعد ذكي يتحدث العربية ويستخدم Gemini AI للرد على الأسئلة وتنفيذ الأوامر.

## المميزات

- واجهة مستخدم عربية سهلة الاستخدام
- دعم الأوامر الصوتية
- تنسيق الردود باستخدام Markdown
- حفظ سجل المحادثات
- تنفيذ أوامر النظام البسيطة
- دعم الوقت الفعلي باستخدام Socket.IO

## المتطلبات

- Node.js
- MongoDB
- مفتاح API من Google Gemini

## التثبيت

1. استنساخ المشروع:

```bash
git clone https://github.com/ahmedsamir-dev/smart-assistant.git
cd smart-assistant
```

2. تثبيت المتطلبات:

```bash
npm install
```

3. إنشاء ملف `.env` وإضافة المتغيرات البيئية:

```
GEMINI_API_KEY=your_api_key
MONGODB_URI=your_mongodb_uri
PORT=3000
```

4. تشغيل المشروع:

```bash
npm start
```

## التقنيات المستخدمة

- Node.js
- Express.js
- Socket.IO
- MongoDB
- Google Gemini AI
- HTML/CSS/JavaScript

## المطور

تم تطوير هذا المشروع بواسطة [Ahmed Samir](https://github.com/Ahmed-iCode)

## الترخيص

هذا المشروع مرخص تحت رخصة MIT.
