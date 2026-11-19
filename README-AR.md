# البورتفوليو الشخصي – طارق محسن

موقع عربي/إنجليزي متجاوب، صورة شخصية بالطول بإطار مضيء متحرك، معرض مشاريع، ولوحة إدارة خاصة.

## الخدمات المستخدمة
- Firebase Authentication: تسجيل الدخول بحساب Google.
- Cloud Firestore: بيانات الملف الشخصي والمشاريع.
- GitHub repository: حفظ ملفات الصور داخل فرع مستقل باسم `portfolio-assets`.
- Vercel Functions: واجهة آمنة لرفع الصور وحذفها إلى GitHub.

**لم يعد المشروع يستخدم Firebase Storage**، وبالتالي لا يحتاج إلى تفعيل Cloud Storage أو ربط خطة Blaze من أجل الصور. تبقى حصص GitHub وVercel المجانية وشروطهما مطبقة؛ GitHub ليس خدمة CDN مخصصة للصور ولا توجد ضمانة أن استخدامًا كثيفًا سيظل بلا قيود.

## إعداد GitHub للصور
1. تم إنشاء فرع `portfolio-assets` ليكون مخصصًا لملفات الصور فقط.
2. أنشئ GitHub Fine-grained Personal Access Token من إعدادات GitHub.
3. اختر المستودع `kaboo7766-hub/tarek-portfolio) فقط.
4. امنح صلاحية **Contents: Read and write** فقط، وحدد تاريخ انتهاء مناسبًا.
5. لا ترسل الرمز في المحادثة ولا تضعه في أي ملف بالمستودع.

## إعداد Vercel
من Project Settings > Environment Variables أضف:
- `GITHUB_TOKEN`: الرمز الذي أنشأته، بنوع Sensitive/Encrypted، إلى Preview وProduction وDevelopment حسب الحاجة.
- `GITHUB_ASSETS_BRANCH`: القيمة `portfolio-assets` إلى نفس البيئات.

بعد إضافة المتغيرات، أعد نشر معاينة الفرع. لا تضع رمز GitHub في `admin.js` أو أي ملف يصل إلى المتصفح.

## إعداد Firebase
1. المشروع: `tarek-portfolio-fa40d`.
2. فعّل Google في Authentication > Sign-in method.
3. تأكد من أن حساب المدير `kaboo7766@gmail.com` موثّق البريد.
4. أنشئ Cloud Firestore وانشر `firestore.rules`.
5. أضف نطاق الموقع إلى Authentication > Settings > Authorized domains.
6. افتح `/admin.html)، سجّل الدخول بحساب المدير، ثم أعد رفع الصورة الشخصية وصور المشاريع القديمة إن لم تعد تظهر.

## آلية حماية الصور
- كل طلب رفع/حذف يرسل Firebase ID token.
- دالة Vercel تتحقق من الرمز مباشرة مع Firebase Identity Toolkit، ثم تتحقق من البريد الموثّق المطابق لحساب المدير.
- GitHub token محفوظ في إعدادات Vercel فقط.
- الخادم يقبل صور WebP فقط، بحجم أقصى 2.5 ميجابايت بعد الضغط، ويولّد مسار الملف بنفسه.
- لا يسمح API بحذف إلا ملفات الصور ضمن مجلدات `uploads/profile` و`uploads/projects`.

## الاختبار
بعد إضافة متغيرات Vercel وإعادة النشر:
1. افتح `/admin.html) وسجّل الدخول بحساب المدير.
2. ارفع صورة شخصية طولية، ثم افتح الصفحة الرئيسية من نافذة أخرى.
3. أضف مشروعًا بصورة، ثم جرّب التعديل والحذف.
4. جرّب فتح الموقع من الهاتف.
5. جرّب استدعاء API دون تسجيل دخول؛ يجب أن يرفض الطلب.

ملاحظة: الصور القديمة المخزنة سابقًا في Firebase Storage لا تنتقل تلقائيًا إلى GitHub. أعد رفعها من لوحة الإدارة بعد نشر التحديث.
