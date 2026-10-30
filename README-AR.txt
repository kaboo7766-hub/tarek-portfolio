الموقع الشخصي - طارق محسن
========================

محتويات المشروع:
- index.html: الصفحة الرئيسية.
- style.css: تصميم الموقع المتجاوب.
- firebase-config.js: إعداد Firebase.
- app.js: عرض المشاريع وتبديل اللغة والمظهر.
- admin.html: صفحة لوحة الإدارة.
- admin.css: تصميم لوحة الإدارة.
- admin.js: تسجيل دخول المدير وإدارة المشاريع.
- firestore.rules: قواعد حماية قاعدة البيانات.

قبل النشر:
1) افتح Firebase Console ثم Authentication وتأكد من تفعيل Email/Password.
2) تأكد أن حساب المدير موجود وأن UID الخاص به يطابق القيمة الموجودة في admin.js وfirestore.rules.
3) افتح Firestore Database ثم Rules والصق محتوى firestore.rules واضغط Publish.
4) ارفع ملفات المجلد إلى مستودع GitHub.
5) اربط المستودع بـ Vercel. لا تحتاج إلى Build Command أو Output Directory لموقع HTML عادي؛ اترك الإعدادات الافتراضية المناسبة أو استخدم Framework Preset: Other.
6) افتح رابط الموقع، ثم /admin.html لتسجيل دخول المدير.

ملاحظات مهمة:
- لا يستخدم المشروع Firebase Storage؛ أضف صور المشاريع باستخدام روابط صور عامة مباشرة (https).
- Firebase Web config الموجود في firebase-config.js مخصص للواجهة. حماية البيانات تعتمد على Firestore Security Rules.
- لا تشارك كلمة مرور المدير أو ملفات Service Account.
- هذا المشروع لم يُختبر على حساب Firebase من داخل بيئة الإنشاء. اختبر تسجيل الدخول والإضافة والتعديل والحذف بعد النشر.
- قد يطلب Firestore إنشاء index مركب عند الاستعلام عن المشاريع المنشورة مرتبة. اتبع رابط الخطأ الذي يظهر في Console لإنشائه إن ظهر.
