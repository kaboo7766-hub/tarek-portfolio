# البورتفوليو الشخصي – طارق محسن

موقع عربي متجاوب مع إطار مضيء متحرك للصورة الشخصية، معرض مشاريع ببطاقات مائلة، ولوحة إدارة Firebase.

## إعداد Firebase
1. المشروع المستخدم: tarek-portfolio-fa40d.
2. فعّل Google من Authentication > Sign-in method.
3. تأكد أن حساب المدير هو kaboo7766@gmail.com ومفعّل وموثّق.
4. أنشئ Cloud Firestore وCloud Storage bucket الافتراضي.
5. انشر firestore.rules وstorage.rules.
6. أضف نطاق موقعك الفعلي إلى Authentication > Settings > Authorized domains.
7. افتح /admin.html وسجّل الدخول بحساب المدير، ثم ارفع الصورة الشخصية وأضف المشاريع.

## النشر
بعد تثبيت Firebase CLI وتسجيل الدخول:

    firebase use tarek-portfolio-fa40d
    firebase deploy --only firestore:rules,storage

يمكن الاستمرار في نشر الواجهة من GitHub عبر Vercel. Firebase للمصادقة والبيانات والصور. ويمكن استخدام Firebase Hosting اختياريًا عبر firebase deploy --only hosting.

## تنبيه فوترة مهم
Cloud Storage for Firebase يتطلب خطة Blaze مرتبطة بحساب فوترة منذ 3 فبراير 2026، حتى لو كان الاستخدام ضمن الحصة المجانية. قد تظهر رسوم عند تجاوز الحصة. لا يقوم هذا المشروع بتفعيل الفوترة تلقائيًا. راجع وثائق Firebase واضبط تنبيهات الميزانية قبل تفعيل Storage.

## الحماية
قراءة المشاريع والصورة الشخصية عامة. التعديل والحذف ورفع الصور محصور بحساب Google المعتمد والبريد الموثّق. لا تضع كلمات مرور أو ملفات Service Account في المستودع.

## الاختبار بعد الإعداد
اختبر تسجيل الدخول، رفع صورة شخصية، إضافة مشروع بصورة، التعديل والحذف، ثم افتح الموقع من جهاز آخر للتأكد من ظهور الصور والبيانات السحابية.