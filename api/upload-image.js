const OWNER = "kaboo7766-hub";
const REPO = "tarek-portfolio";
const ASSET_BRANCH = process.env.GITHUB_ASSETS_BRANCH || "portfolio-assets";
const FIREBASE_API_KEY = "AIzaSyCOEGFTA36rt6PpB_EoLKLd5yLGYBfpGPI";
const ADMIN_EMAIL = "kaboo7766@gmail.com";
const MAX_BYTES = 2.5 * 1024 * 1024;

function send(res, status, body) {
  res.status(status).json(body);
}

async function verifyAdmin(req) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) throw Object.assign(new Error("يلزم تسجيل الدخول مرة أخرى."), { status: 401 });

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: token })
    }
  );
  if (!response.ok) throw Object.assign(new Error("جلسة الدخول غير صالحة. سجّل الدخول مرة أخرى."), { status: 401 });
  const data = await response.json();
  const account = data.users && data.users[0];
  if (!account || !account.emailVerified || String(account.email).toLowerCase() !== ADMIN_EMAIL) {
    throw Object.assign(new Error("غير مصرح بتنفيذ هذا الإجراء."), { status: 403 });
  }
  return account;
}

function githubHeaders() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw Object.assign(new Error("إعداد GITHUB_TOKEN غير مكتمل في Vercel."), { status: 503 });
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json"
  };
}

function validAssetPath(value) {
  return typeof value === "string" &&
    /^uploads\/(profile|projects)\/[A-Za-z0-9_-]{1,128}\/[A-Za-z0-9-]{1,100}\.webp$/.test(value);
}

async function uploadImage(req, account) {
  const { kind, contentBase64 } = req.body || {};
  if (!["profile", "projects"].includes(kind)) throw Object.assign(new Error("نوع الصورة غير صحيح."), { status: 400 });
  if (typeof contentBase64 !== "string" || contentBase64.length < 20) throw Object.assign(new Error("ملف الصورة فارغ أو غير صالح."), { status: 400 });

  const buffer = Buffer.from(contentBase64, "base64");
  if (!buffer.length || buffer.length > MAX_BYTES) throw Object.assign(new Error("يجب ألا يتجاوز حجم الصورة المضغوطة 2.5 ميجابايت."), { status: 413 });
  if (buffer.toString("base64") !== contentBase64.replace(/\s/g, "")) throw Object.assign(new Error("ترميز الصورة غير صالح."), { status: 400 });

  const { randomUUID } = await import("node:crypto");
  const path = `uploads/${kind}/${account.localId}/${randomUUID()}.webp`;
  const endpoint = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${path.split("/").map(encodeURIComponent).join("/")}`;
  const response = await fetch(endpoint, {
    method: "PUT",
    headers: githubHeaders(),
    body: JSON.stringify({
      message: `Add portfolio ${kind} image`,
      content: buffer.toString("base64"),
      branch: ASSET_BRANCH
    })
  });
  if (!response.ok) {
    const detail = await response.text();
    console.error("GitHub upload failed:", response.status, detail.slice(0, 500));
    throw Object.assign(new Error("تعذر حفظ الصورة على مستودع الصور. راجع صلاحيات GitHub Token."), { status: 502 });
  }

  const url = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${ASSET_BRANCH}/${path}`;
  return { path, url };
}

async function deleteImage(req) {
  const path = req.body && req.body.path;
  if (!validAssetPath(path)) throw Object.assign(new Error("مسار الصورة غير صالح."), { status: 400 });
  const endpoint = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${path.split("/").map(encodeURIComponent).join("/")}?ref=${encodeURIComponent(ASSET_BRANCH)}`;
  const headers = githubHeaders();
  const found = await fetch(endpoint, { headers });
  if (found.status === 404) return { deleted: false, missing: true };
  if (!found.ok) throw Object.assign(new Error("تعذر العثور على الصورة لحذفها."), { status: 502 });
  const file = await found.json();

  const removed = await fetch(endpoint.split("?")[0], {
    method: "DELETE",
    headers,
    body: JSON.stringify({
      message: "Delete unused portfolio image",
      sha: file.sha,
      branch: ASSET_BRANCH
    })
  });
  if (!removed.ok) throw Object.assign(new Error("تعذر حذف الصورة من مستودع الصور."), { status: 502 });
  return { deleted: true };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return send(res, 405, { error: "Method not allowed" });
  }
  try {
    const account = await verifyAdmin(req);
    const action = req.body && req.body.action;
    const result = action === "upload"
      ? await uploadImage(req, account)
      : action === "delete"
        ? await deleteImage(req)
        : (() => { throw Object.assign(new Error("الإجراء غير معروف."), { status: 400 }); })();
    return send(res, 200, result);
  } catch (error) {
    return send(res, error.status || 500, { error: error.message || "حدث خطأ غير متوقع." });
  }
}
