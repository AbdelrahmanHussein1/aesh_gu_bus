# 🚌 منظومة النقل الذكي لباصات جامعة الجلالة — Bus Aesh Transit (v1.1)

[![Release](https://img.shields.io/badge/Release-v1.1-38bdf8?style=for-the-badge&logo=github)](https://github.com/AbdelrahmanHussein1/aesh_gu_bus/releases/tag/v1.1)
[![Android APK](https://img.shields.io/badge/Android-APK%20Ready-22c55e?style=for-the-badge&logo=android)](https://github.com/AbdelrahmanHussein1/aesh_gu_bus/releases/tag/v1.1)
[![Docker](https://img.shields.io/badge/Docker-Production%20Ready-2563eb?style=for-the-badge&logo=docker)](https://github.com/AbdelrahmanHussein1/aesh_gu_bus)
[![Fastify](https://img.shields.io/badge/Fastify-Backend%20API-000000?style=for-the-badge&logo=fastify)](https://github.com/AbdelrahmanHussein1/aesh_gu_bus)
[![Next.js](https://img.shields.io/badge/Next.js%2015-Portal%20Frontend-black?style=for-the-badge&logo=next.js)](https://github.com/AbdelrahmanHussein1/aesh_gu_bus)

**منظومة النقل الذكي لجامعة الجلالة (Bus Aesh)** هي منصة متكاملة عالية الكفاءة لإدارة وحجز وتفويج باصات الجامعة لطلاب وأعضاء هيئة التدريس ومشرفي الخطوط، مبنية وفق أعلى معايير الأمان والتزامن اللحظي (Real-Time Concurrency).

---

## 🌟 أبرز مميزات التحديث الجديد (Release 1.1)

### 1. 📧 تفعيل وتسجيل الطلاب عبر بريد Outlook الرسمي (@gu.edu.eg)
- إرسال كود التحقق الأكاديمي (OTP) مباشرة عبر خوادم **Microsoft 365 / Outlook** الرسمية (`smtp.office365.com`).
- زر مدمج بضغطة واحدة لفتح صندوق بريد الجامعة الأكاديمي على الويب (`https://outlook.office.com/mail/`).
- التحقق الفوري من القيد الأكاديمي للجامعة (Academic ID & Faculty Validation).

### 2. 🛡️ سياسة إلغاء المشرف الدقيقة (حل مشكلة 7 سبتمبر 2026 وما بعدها)
- تصحيح دقيق لمعادلة حساب موعد انطلاق الرحلة (`getTripDepartureDateTime`) بدمج تاريخ الرحلة الفعلي (`YYYY-MM-DD`) مع ساعات الانطلاق المجدولة.
- إمكانية إلغاء المشرف للتذاكر قبل موعد الرحلة بأكثر من 5 ساعات مع **إصدار استرداد فوري وتلقائي لكامل المبلغ (160 ج.م)**.
- قفل الإلغاء الصارم في حال كان الراكب قد صعد للحافلة بالفعل منعاً للتلاعب.

### 3. 🔒 قفل الجلسات الصارم (نافذة واحدة وجهاز واحد فقط لكل مستخدم)
- **Single-Tab Guard**: منع فتح أكثر من علامة تبويب (Tab) واحدة لنفس الحساب في المتصفح باستخدام تقنية `BroadcastChannel` الفورية مع شاشة تحذير باللغتين العربية والإنجليزية.
- **Single-Device Enforcement**: إنهاء فوري لأي جلسة قديمة على أي جهاز آخر عند تسجيل الدخول من جهاز جديد لحماية مقاعد الحجز ومنع الازدواجية.

### 4. 🌐 دعم النطاقات الثابتة المجانية 100% (Permanent Free Stable Domain)
- دعم كامل لأنفاق **Cloudflare Zero Trust Named Tunnel** الدائمة عبر المتغير (`CLOUDFLARE_TUNNEL_TOKEN`) بحيث لا يتغير الرابط نهائياً عند إعادة التشغيل.
- دعم بديل مجاني فوري دون تسجيل عبر **Localtunnel** برابط مخصص دائم.
- دليل تفصيلي خطوة بخطوة في ملف [`STABLE_DOMAIN_GUIDE.md`](./STABLE_DOMAIN_GUIDE.md).

### 5. 📱 تطبيق أندرويد مستقل (Play Store Grade Mobile App)
- تطبيق React Native متصل كلياً بالـ APIs الحقيقية:
  - تسجيل حسابات الطلاب وتأكيد بريد Outlook بالـ OTP.
  - استعراض الخطوط الحية وحجز المقاعد ودفع التذاكر.
  - إظهار كود الصعود اليدوي البارز (`GU-XXXX`) بجانب كود الـ QR.
  - استقبال إشعارات هاتفية لحظية (Push Notifications) عند قيام المشرف بالإلغاء، أو عند صعود الباص، أو **عند إضافة وإعلان باص جديد (`NEW_TRIP_ANNOUNCED`)**.

---

## 🏗️ هيكلية المشروع (Monorepo Architecture)

```
aesh_gu_bus/
├── apps/
│   ├── api/          # Fastify Backend API (PostgreSQL + Redis + WebSockets)
│   ├── web/          # Next.js 15 Web Portal (Student, Supervisor, Admin)
│   └── mobile/       # React Native / Expo Mobile App with Camera Scanner
├── packages/
│   └── shared/       # Shared Zod Schemas & QR Codec Module
├── .github/
│   └── workflows/    # Automated Standalone APK Build & Release Workflow
├── docker-compose.yml# Production Multi-Service Container Stack
├── start.sh          # 1-Click Server Launch Script (Linux / VirtualBox)
└── STABLE_DOMAIN_GUIDE.md # 100% Free Permanent Domain Guide
```

---

## 🚀 التشغيل بضغطة زر واحدة (Linux / Ubuntu / VirtualBox)

إذا كنت تستخدم نظام Ubuntu أو جهاز VirtualBox، يمكنك تشغيل المنظومة بالكامل بضغطة واحدة:

```bash
# 1. الدخول لمجلد المشروع
cd aesh_gu_bus

# 2. تشغيل السكربت الموحد (يقوم بالبناء والتجهيز والإطلاق تلقائياً)
bash start.sh
```

سيعرض السكربت فور انتهائه:
- 🌐 **رابط بوابة الويب المحلية**: `http://localhost:3001`
- ⚡ **رابط الـ API وسجلات الفحص**: `http://localhost:3000/health`
- 🌍 **الرابط العالمي الخارجي (HTTPS)**: متاح للوصول من أي هاتف أو كمبيوتر خارج الشبكة.

---

## 📱 تحميل وتثبيت تطبيق الأندرويد (Release 1.1 APK)

1. توجه إلى صفحة [**Releases على GitHub**](https://github.com/AbdelrahmanHussein1/aesh_gu_bus/releases/tag/v1.1).
2. حمل ملف التطبيق المستقل: `bus-aesh-v1.1-release.apk`.
3. ثبته على هاتفك مباشرة — التطبيق يعمل بكامل مزاياه ويرتبط بالخادم مباشرة مع خاصية ضبط عنوان السيرفر.

---

## 🔑 الحسابات الافتراضية للتجربة السريعة

| الدور (Role) | البريد الإلكتروني | كلمة المرور | الوظيفة |
|---|---|---|---|
| **Student (طالب)** | `student@gu.edu.eg` أو التسجيل بريدك الرسمي | `123456` | حجز المقاعد، التذاكر، كود الصعود |
| **Supervisor (مشرف)** | `supervisor@gu.edu.eg` | `123456` | مسح الـ QR وكود الصعود، الإلغاء، الاسترداد |
| **System Admin (مدير)** | `admin@gu.edu.eg` | `123456` | إضافة الحافلات، إعلان الرحلات، مراقبة الأسطول |

---

## ⚙️ ضبط خيارات البريد والنطاق (.env)

يمكنك إنشاء أو تعديل ملف `.env` لإضافة إعدادات بريد Outlook الرسمي والنطاق الثابت:

```env
# النطاق الدائم من Cloudflare Zero Trust (اختياري)
CLOUDFLARE_TUNNEL_TOKEN=eyJh...

# إرسال بريد Outlook الرسمي (@gu.edu.eg)
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=your_email@gu.edu.eg
SMTP_PASS=your_outlook_app_password
```

---

## 📄 الترخيص والدعم (License & Support)

تم تطوير هذا النظام لصالح منظومة النقل الذكي لجامعة الجلالة (Galala University).
جميع الحقوق محفوظة © 2026.
