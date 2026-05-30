# আমার ব্যবসা — সেটআপ গাইড

## ধাপ ১: প্রয়োজনীয় সফটওয়্যার ইনস্টল করুন

### Node.js ইনস্টল করুন
1. https://nodejs.org এ যান
2. "LTS" ভার্সনটি ডাউনলোড করুন
3. ইনস্টল করুন (Next > Next > Finish)
4. কমান্ড প্রম্পট খুলুন এবং টাইপ করুন: `node --version`

### VS Code ইনস্টল করুন (ঐচ্ছিক কিন্তু সহায়ক)
1. https://code.visualstudio.com ডাউনলোড করুন
2. ইনস্টল করুন

---

## ধাপ ২: Supabase সেটআপ করুন (ফ্রি)

1. **https://supabase.com** এ যান
2. "Start your project" বাটনে ক্লিক করুন
3. GitHub দিয়ে সাইন আপ করুন
4. **"New Project"** বাটনে ক্লিক করুন
5. প্রজেক্টের নাম দিন: `amar-byabsha`
6. একটি শক্তিশালী পাসওয়ার্ড দিন (মনে রাখুন)
7. Region: **Southeast Asia (Singapore)** বেছে নিন
8. "Create Project" ক্লিক করুন (৩০ সেকেন্ড অপেক্ষা করুন)

### ডেটাবেস তৈরি করুন
1. বাম মেনুতে **"SQL Editor"** ক্লিক করুন
2. `database/schema.sql` ফাইলের সব কোড কপি করুন
3. SQL Editor এ পেস্ট করুন
4. **"Run"** বাটনে ক্লিক করুন
5. "Success" দেখলে ঠিকমতো হয়েছে

### API Key সংগ্রহ করুন
1. বাম মেনুতে **Settings → API** এ যান
2. **"Project URL"** কপি করুন
3. **"anon public"** key কপি করুন

---

## ধাপ ৩: প্রজেক্ট সেটআপ করুন

### ব্যাকএন্ড সেটআপ
কমান্ড প্রম্পট খুলুন এবং এই কমান্ডগুলো রান করুন:

```
cd backend
npm install
copy .env.example .env
```

এখন `.env` ফাইলটি Notepad দিয়ে খুলুন:
```
SUPABASE_URL=https://আপনার-প্রজেক্ট-আইডি.supabase.co
SUPABASE_ANON_KEY=আপনার-anon-key-এখানে
PORT=3000
```

### আপনার ব্যবসা রেজিস্ট্রেশন করুন
সার্ভার চালু করুন:
```
npm start
```

এরপর ব্রাউজারে যান:
```
http://localhost:3000/api/setup
```

বা PowerShell এ রান করুন:
```powershell
Invoke-WebRequest -Uri http://localhost:3000/api/setup `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"name":"আপনার দোকানের নাম","owner_name":"আপনার নাম","phone":"০১৭XX-XXXXXX","address":"ঢাকা"}'
```

Response এ একটি UUID আসবে। সেটি `.env` ফাইলে যোগ করুন:
```
BUSINESS_ID=আপনার-uuid-এখানে
```

সার্ভার আবার চালু করুন:
```
npm start
```

---

## ধাপ ৪: ওয়েবসাইট খুলুন

ব্রাউজারে যান: **http://localhost:3000**

🎉 আপনার ব্যবসার ড্যাশবোর্ড চালু হয়েছে!

---

## ধাপ ৫: ইন্টারনেটে লাইভ করুন (Vercel)

### Vercel সেটআপ
1. https://vercel.com এ ফ্রি অ্যাকাউন্ট খুলুন
2. GitHub এ কোড আপলোড করুন
3. Vercel এ "Import Project" করুন
4. Environment Variables যোগ করুন (`.env` ফাইলের মতো)
5. Deploy করুন → আপনার ওয়েবসাইট লাইভ!

---

## সমস্যা হলে

| সমস্যা | সমাধান |
|--------|--------|
| `node: command not found` | Node.js পুনরায় ইনস্টল করুন |
| `SUPABASE_URL not set` | `.env` ফাইল চেক করুন |
| ডেমো মোডে চলছে | backend সার্ভার চালু করুন |
| চার্ট দেখা যাচ্ছে না | ব্রাউজার রিফ্রেশ করুন |

---

## যোগাযোগ ও সহায়তা

আরও সাহায্যের জন্য Claude এ ফিরে আসুন!
