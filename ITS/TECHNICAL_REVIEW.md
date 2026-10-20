# ITS — Teknik İnceleme Raporu

> **Tarih:** 2026-10-20
> **Kapsam:** Backend (`backend/`) + Frontend (`frontend-new/`) tam kaynak incelemesi, veri modeli, deployment/CI-CD hazırlığı.
> **Durum:** Yalnızca inceleme — bu aşamada hiçbir kod değiştirilmedi. Amaç: canlıya almadan önce en büyük sorunları önceliklendirmek ve "baştan kurallara göre dizme" hedefi için yol haritası çıkarmak.

---

## 0. Yönetici Özeti

Proje klasik 3 katmanlı bir mimariye sahip ve iskeleti makul:

```
React (CRA)  ──HTTP──▶  Express 5 API  ──Prisma──▶  PostgreSQL
frontend-new/           backend/                     (managed)
```

İş kuralları (STAJ1 → STAJ2 geçişi, `@@unique([studentId, internshipOrder])`) düşünülmüş, Prisma şeması temiz. Ancak proje **"hızlı prototip"** olgunluğunda; canlıya almadan kapatılması **şart** olan güvenlik delikleri var. En kritik olanı: **yönetim endpoint'lerinin çoğunda hiç kimlik doğrulama yok — internetteki herhangi biri kendine `General Admin` hesabı açabilir.**

Önceliklendirme özeti:

| Faz | İçerik | Aciliyet |
|-----|--------|----------|
| **Faz 0** | Güvenlik bloklayıcıları (auth, scoping, CORS, rate limit, sır rotasyonu) | 🔴 Canlı öncesi ŞART |
| **Faz 1** | Build/CI temeli (lock dosyası, pipeline, healthcheck, migrate) | 🟠 Canlıdan hemen sonra |
| **Faz 2** | Mimari sağlamlaştırma (validation, service layer, guard, logger, test, Vite?) | 🟡 Orta vade |

---

## 1. 🔴 KRİTİK Güvenlik Sorunları (Faz 0 — canlı öncesi)

### 1.1. Yönetim & veri endpoint'lerinin çoğunda kimlik doğrulama YOK
**En büyük delik.** Sadece `gradingRoutes.js` ve `internshipRoutes.js` korumalı. Aşağıdakiler dünyaya açık:

- `backend/src/routes/userRoutes.js:6` → `POST /api/kullanici` tamamen açık ve `roleId` body'den geliyor (`backend/src/controllers/userController.js:5`). **Herhangi biri tek POST ile `General Admin` hesabı açabilir.**
- `backend/src/routes/userRoutes.js:7` → `GET /api/kullanicilar` (tüm kullanıcılar).
- `backend/src/routes/departmentRoutes.js:21-33` → `create-commission-chair`, `create-commission-member`, `remove-*`, `assign-commission-chair`, `commission-status`, `department-chair`, `department-members` — hepsi auth'suz.
- `backend/src/routes/studentRoutes.js:12-17` → `terms`, `students/:dep/:term`, `student/:id`, `student` (upsert) — auth'suz.
- `backend/src/routes/departmentRoutes.js:18` → `departments` — auth'suz.

**Çözüm:** Tüm bu route'lara `authenticateToken` ekle; yönetim işlemlerini `requireRole(['General Admin'])`, departman/öğrenci okumalarını uygun rollerle gate'le. `POST /api/kullanici`'yi ya kaldır ya da admin + sunucu tarafında sabitlenen rol ile kısıtla (body'den `roleId` kabul etme).

### 1.2. Yatay yetki (department scoping) yok
`requireRole` yalnızca **rol adına** bakıyor, kullanıcının ilgili departmana ait olup olmadığına bakmıyor — `backend/src/middlewares/auth.js:20-38`. Sonuç: A bölümü başkanı, B bölümü öğrencilerini notlandırabilir/silebilir/görebilir.

**Çözüm:** Notlandırma/listeleme/silme işlemlerinde, `req.user`'ın departmanı ile hedef kaydın departmanını karşılaştıran bir yetki kontrolü ekle (örn. `requireDepartmentOwnership` middleware'i veya controller içi kontrol). Admin bypass edebilir.

### 1.3. CORS tamamen açık
`backend/src/server.js:21` → `app.use(cors())` (allow-all). `CLIENT_URL` env var mevcut ama bağlanmamış.

**Çözüm:**
```js
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
```

### 1.4. Rate limiting / brute-force koruması yok
- `/login` sınırsız denenebilir (`backend/src/controllers/authController.js:20`).
- `/forgot-password` 6 haneli kod üretiyor (`authController.js:86`); `verifyResetCode`'da deneme sayacı yok (`authController.js:134`) → 1M olasılık kaba kuvvetle kırılabilir.
- Kod DB'de **düz metin** tutuluyor (`PasswordResetToken.token`, `schema.prisma:62`).
- Backend dependency'lerinde `helmet`, `express-rate-limit` yok (`backend/package.json`).

**Çözüm:** `helmet` ekle; `/login`, `/forgot-password`, `/verify-reset-code`, `/change-password` için `express-rate-limit`. Reset kodunu hash'le; `verifyResetCode`'a deneme sayacı + kilitlenme ekle.

### 1.5. Kullanıcı enumerasyonu (forgot-password)
`backend/src/controllers/authController.js:82` → e-posta yoksa `404 "kullanıcı bulunamadı"` dönüyor; hangi e-postaların kayıtlı olduğunu sızdırıyor. (Login doğru yapmış: generic mesaj, `authController.js:36,44`.)

**Çözüm:** `forgotPassword` her durumda aynı generic başarı mesajını dönsün ("kod gönderildiyse e-postanıza ulaşacak").

### 1.6. `/change-password` auth'suz ve token'a bağlı değil
`backend/src/routes/authRoutes.js:10` → auth yok. `backend/src/controllers/authController.js:205` → `email` + `currentPassword` body'den geliyor, oturumla ilişkilendirilmiyor. Rate limit de yok → eski şifre kaba kuvvetle denenebilir.

**Çözüm:** `authenticateToken` ekle; e-postayı body yerine `req.user`'dan al; rate limit uygula.

### 1.7. Sızmış sır + zayıf JWT_SECRET
`DEPLOYMENT.md:23` → gerçek bir Gmail App Password git geçmişinde kaldı. `backend/.env.example:10` örnek `JWT_SECRET`.

**Çözüm:** Gmail App Password'ü Google hesabından **iptal et**. Her ortam için ≥32 karakter rastgele `JWT_SECRET` ata (env var). Örnek değer asla kullanılmasın.

### 1.8. (İkincil) Şifre güçlülük doğrulaması yok
`resetPasswordWithCode` ve `changePassword` herhangi bir şifreyi kabul ediyor (`authController.js:177,227`). Minimum uzunluk/karmaşıklık kuralı yok.

---

## 2. 🟠 Mimari & Kod Kalitesi (Faz 2)

### 2.1. Doğrulama (validation) katmanı yok
Hiçbir yerde `zod`/`joi` yok; body'ler doğrudan güveniliyor. `parseInt` sonuçları `NaN` olabilir, kontrol edilmiyor (örn. `internshipController.js:135`).
**Çözüm:** Merkezi bir validation katmanı (zod schema'ları + bir `validate(schema)` middleware).

### 2.2. İki ayrı Prisma erişim deseni
Middleware `req.app.locals.prisma` kullanıyor (`auth.js:23`), controller'lar doğrudan `import prisma` (`config/prisma.js`). Tutarsız; birden fazla PrismaClient örneği riski.
**Çözüm:** Tek pattern — her yerde `import prisma`. `app.locals.prisma` atamasını kaldır.

### 2.3. Frontend'de merkezi token yönetimi yok
`frontend-new/src/services/authService.js:7` axios instance token'ı **hiç eklemiyor**. Her sayfa elle ekliyor — kimi `authService.getToken()` (ör. `Chair/GradeInternship.js:163`), kimi doğrudan `localStorage` (ör. `Chair/StudentList.js:115`). Unutma riski → rastgele 403'ler.
**Çözüm:** `authService`'teki axios instance'a bir request interceptor ekle; tüm sayfalar aynı instance'ı kullansın. 401 yakalayan response interceptor ile otomatik logout.

### 2.4. React route guard yok + rol kontrolü yok
`frontend-new/src/App.js:15-22` — hiçbir route korumalı değil. `/dashboard` doğrudan açılabiliyor. Koruma sadece dashboard içi `useEffect` (`Admin/AdminDashboard.js:16`) ve **rol kontrolü yok** — bir Member admin dashboard URL'ine gidebilir.
**Çözüm:** `<ProtectedRoute requiredRole="...">` sarmalayıcısı; rol uyuşmazlığında yönlendir.

### 2.5. Service layer yok + kod tekrarı
İş mantığı controller'da. `gradeInternship` (`gradingController.js:8`) ile `bulkGradeInternships` (`gradingController.js:75`) neredeyse aynı kodu tekrar ediyor.
**Çözüm:** Notlandırma mantığını tek bir service fonksiyonuna çıkar; tekil endpoint onu `[tek eleman]` ile çağırsın.

### 2.6. Loglama & bilgi sızıntısı
Her yerde `console.log`. Hassas veri loglanıyor: reset kodu (`authController.js:104`), PDF içeriği (`internshipController.js:337-339`). Client'a iç detay dönülüyor: `details: error.message` (`internshipController.js:199,293,760`).
**Çözüm:** Gerçek logger (`pino`/`winston`); prod'da `details` gizle; hassas log'ları kaldır. Merkezi error handler'ı iyileştir (`server.js:41`).

### 2.7. Rapor üretimi atomik değil
`generateCommissionReport` önce docx üretip sonra `updateMany({ isReported: true })` yapıyor (`internshipController.js:744`). Transaction yok → docx gönderimi başarısız olsa bile kayıtlar "raporlandı" işaretlenebilir / yarış durumu.
**Çözüm:** İşaretlemeyi `prisma.$transaction` içine al; gönderim başarılı olduktan sonra işaretle.

### 2.8. `createInternship` içindeki sessiz student upsert
`internshipController.js:129` — mevcut bir öğrencinin email/departman bilgisini sessizce ezebilir. Email yoksa `${studentId}@example.com` uyduruyor (`:133`).
**Çözüm:** Öğrenci kaydını ayır; var olanı ezme veya açıkça güncelleme akışı yap.

### 2.9. Test yok
`backend/package.json:7` → `test` sadece `exit 1`. Frontend'de CRA default `App.test.js` dışında test yok.
**Çözüm:** Backend için en azından auth + kritik akış integration testleri (supertest); CI'da koştur.

### 2.10. Tutarsızlıklar
Karışık dil (TR+EN) kod/mesajlarda; endpoint isimlendirmesi karışık (`/kullanici` vs `/students`). Tek bir konvansiyon belirlenmeli.

---

## 3. 🟡 Veri Modeli (`backend/prisma/schema.prisma`)

- **Denetim izi (audit trail) yok:** Notu kimin/ne zaman verdiği kaydedilmiyor (`Internship`'te grader ilişkisi yok). Modellerde `updatedAt` yok.
  **Çözüm:** `gradedById`, `gradedAt` ekle; modellere `@updatedAt`.
- **Hard delete:** Başkan/üye silme kalıcı (`departmentController.js:79,126,377`). Geçmiş kaybı.
  **Çözüm:** Soft delete (`deletedAt`) veya en azından arşiv.
- **`grade` serbest String** ('S'/'U') — `schema.prisma:153`. Enum olmalı.
- **Bir departmana tek başkan kuralı** yalnızca uygulama kodunda (önce-sil-sonra-yarat, `departmentController.js:78`). DB kısıtı yok → yarış durumunda iki başkan oluşabilir.
- **`PasswordResetToken`** düz metin kod + deneme sayacı yok (bkz. 1.4).

---

## 4. 🟠 Deployment & CI/CD Hazırlığı (Faz 1)

- **`package-lock.json` .gitignore'da!** (`.gitignore` kök + `backend/.gitignore` dolaylı). Bu CI/CD için büyük engel: tekrarlanabilir kurulum yapılamaz, `npm ci` çalışmaz.
  **Çözüm:** Lock dosyalarını `.gitignore`'dan çıkar, commit et, CI'da `npm ci` kullan. **İlk yapılacaklardan.**
- **CI/CD hiç yok** — `.github/workflows/` yok.
  **Çözüm:** GitHub Actions: `install → lint → test → build`; main'e merge'de `prisma migrate deploy` + deploy.
- **`postinstall: prisma generate` yok** (`backend/package.json`) → build'de Prisma client üretilmez. `DEPLOYMENT.md:101` bunu not etmiş.
- **Healthcheck endpoint yok** — sadece `/` banner döndürüyor (`server.js:28`).
  **Çözüm:** `GET /health` (DB ping dahil).
- **Dockerfile yok** — container'lı deploy / reproducible ortam için eklenebilir.
- **Prod URL commit'li:** `frontend-new/.env.production` → sabit Railway URL. Env yönetimi host/CI'a taşınmalı.

---

## 5. Frontend: CRA mı, Vite mi? (karar bekliyor)

`frontend-new` Create React App (`react-scripts`) üzerinde. Karar için:

| Kriter | CRA'da kalmak | Vite'a taşımak |
|--------|---------------|----------------|
| Bakım | `react-scripts` fiilen bakımsız | Aktif, modern |
| Build hızı | Yavaş | Çok hızlı (CI süresi ↓) |
| CI/CD uyumu | Çalışır ama ağır | Daha hafif, dostça |
| Geçiş maliyeti | 0 | ~Yarım gün (env değişkenleri `REACT_APP_` → `VITE_`, index.html, giriş noktası) |
| Risk | Düşük (canlıya hızlı) | Düşük-orta (test gerekir) |

**Öneri:** Canlıya çıkış birkaç gün içindeyse **önce CRA ile çık**, Faz 2'de Vite geçişini ayrı bir iş olarak yap. "Baştan temiz mimari" önceliğin baskınsa en baştan Vite kur. (Karar netleşince bu bölüm güncellenecek.)

---

## 6. Önceliklendirilmiş Yol Haritası

### Faz 0 — Canlı öncesi güvenlik (bunlar olmadan AÇILMAMALI)
1. Tüm yönetim/veri endpoint'lerine auth + rol (§1.1)
2. `POST /api/kullanici`'yi kaldır/kısıtla (§1.1)
3. Department scoping (§1.2)
4. CORS kilidi (§1.3)
5. `helmet` + rate limit (§1.4)
6. forgot-password enumerasyonu (§1.5), `/change-password` auth (§1.6)
7. Gmail App Password iptali + güçlü `JWT_SECRET` (§1.7)

### Faz 1 — Build/CI temeli
8. `package-lock.json` commit + `npm ci` (§4)
9. `postinstall: prisma generate`, `/health` endpoint (§4)
10. GitHub Actions pipeline (§4)

### Faz 2 — Mimari sağlamlaştırma
11. Validation (zod) + merkezi axios interceptor + React `ProtectedRoute` (§2.1, 2.3, 2.4)
12. Service layer + logger + error handling (§2.5, 2.6)
13. Audit trail / soft delete / enum (§3)
14. Test altyapısı (§2.9)
15. (Karara göre) Vite geçişi (§5)

---

## 7. Fonksiyonel / Davranışsal Hata Listesi (kullanımı etkileyen 16 bulgu)

> İkinci bir gözden geçirmede (kod üzerinden; bazıları gerçek veri değiştirilmeden doğrulanmış, canlı panelde uçtan uca test edilmedi) tespit edilen, **kullanımı ciddi etkileyen** 16 fonksiyonel hata. Yollar bu repoya göre güncellendi. "Örtüşme" sütunu raporun önceki bölümleriyle ilişkiyi gösterir. ✅ = tarafımca kodda doğrulandı.
>
> **İlk çözülmesi gerekenler (reviewer önceliği):** yetki açıkları **#1–#3**, hesap kaybı **#4**, yanlış belgeyi düzeltme/silme **#5–#6**, tutanak yeniden oluşturma **#10**.

| # | Sorun | Konum | Örtüşme / Not |
|---|-------|-------|----------------|
| 1 | **Üye hesabıyla yönetici işlemleri:** Üye girişinden sonra `/dashboard`'a gidince admin paneli açılıyor; rol kontrolü yok → başkan ekle/kaldır yapılabiliyor. | `frontend-new/src/pages/Admin/AdminDashboard.js:14` | §2.4 (route guard + rol kontrolü yok) |
| 2 | **Auth'suz kritik erişim:** Doğrudan isteklerle öğrenci okunabiliyor, komisyon hesapları eklenip silinebiliyor; `POST /api/kullanici` rolsüz çağrılırsa admin oluşturuyor. | `backend/src/routes/userRoutes.js:6` | §1.1 (auth eksikliği) |
| 3 | **Bölümler arası yetki yok:** Bir bölümün üyesi, başka bölümdeki stajın notunu değiştirebiliyor; sadece rol kontrol ediliyor, öğrencinin aynı bölümde olduğu değil. | `backend/src/controllers/gradingController.js:27` | §1.2 (department scoping) |
| 4 | **Başkan değişiminde hesap kaybı:** Mevcut başkan önce siliniyor; yeni hesap (örn. e-posta çakışması) oluşturulamazsa bölüm başkansız kalıyor ve eski hesap kayboluyor. Atomik değil. | `backend/src/controllers/departmentController.js:102` (sil-sonra-yarat `:78`) | §3 (tek-başkan kuralı DB'de değil) — **transaction'a alınmalı** |
| 5 | **Yanlış kaydı silme/düzeltme UI'si yok:** Yanlış belge onaylanınca oluşan staj panelden silinemiyor/düzenlenemiyor; doğru belge tekrar yüklenince "zaten kayıtlı" hatası. (Backend'de `DELETE/PUT /internship/:id` var ama UI'de yok.) | `frontend-new/src/pages/Chair/StudentList.js:261` | Yeni — UI eksik (backend `internshipRoutes.js:40,43` mevcut) |
| 6 | **Yüklenen PDF saklanmıyor:** Sadece parse edilen alanlar kaydediliyor; orijinal PDF tutulmuyor → imza/yanlış okuma sonradan kontrol edilemiyor. | `frontend-new/src/pages/Chair/UploadInternshipPDF.js:136` | Yeni — dosya saklama (storage) gerekiyor |
| 7 | **Başarısız stajı tekrar kaydedememe:** `@@unique([studentId, internshipOrder])` ömür boyu tek STAJ1/STAJ2 tanıyor; başarısız (U) staj sonraki dönem tekrar kaydedilemiyor. | `backend/prisma/schema.prisma:166` (iş kuralı yorumu `:121`) | §3 (veri modeli) — benzersizlik dönem bazlı mı olmalı? |
| 8 | ✅ **Reddedilen öğrenci toplu kayıtta yine kaydediliyor:** "Reddet" öğrenciyi listeden çıkarmıyor, sadece sonrakine geçiyor; "Tümünü Kaydet" reddedileni de kaydediyor. | `frontend-new/src/pages/Chair/UploadInternshipPDF.js:250` (save döngüsü `:195`) | Yeni — doğrulandı |
| 9 | ✅ **"Dönem eklendi" diyor ama eklemiyor:** `handleAddTerm` içinde `// TODO: Backend'e gönderilecek` var; API çağrısı yok, yine de başarı toast'ı. Üstelik dönem oluşturma endpoint'i backend'de hiç yok. | `frontend-new/src/pages/Chair/UploadInternshipPDF.js:294` | Yeni — doğrulandı; backend'de term create yok |
| 10 | **Tutanak yeniden oluşturulamıyor:** İlk üretimde ilgili stajlar `isReported=true` işaretlenip sonraki tutanaklardan çıkarılıyor; dosya kaybı/not düzeltmesi sonrası aynı kayıtlarla güncel tutanak alınamıyor. | `backend/src/controllers/internshipController.js:477` (`isReported: false` filtresi) | §2.7 (atomiklik) + yeniden üretim akışı yok |
| 11 | **Aynı öğrencinin iki stajı erken değerlendirmede karışıyor:** Aynı dönem STAJ1+STAJ2 varsa bir satır seçilince iki satır seçili görünüyor; kaydederken "ilk bulunan" staj kullanılıp yanlış staj değerlendirilebiliyor. | `frontend-new/src/pages/Chair/EarlyEvaluation.js:177` | Yeni — satır kimliği internship.id yerine student bazlı |
| 12 | ✅ **Toplu notlandırmada hatalar gizli:** 10 nottan 2'si hata verse bile sadece başarı mesajı (`successCount`) gösteriliyor; `errorCount`/`errors` yok sayılıyor. Erken değerlendirmede hatalara rağmen tutanak üretimi sürüyor. | `frontend-new/src/pages/Chair/GradeInternship.js:159` (toast `:168`) | Yeni — doğrulandı |
| 13 | **Yeni staj mevcut öğrenci bilgisini bozuyor:** Eksik e-posta/telefonla upsert eski değerleri korumuyor; telefon boşalabiliyor, e-posta `studentId@example.com` oluyor, öğrenci yükleyenin bölümüne taşınabiliyor. | `backend/src/controllers/internshipController.js:129` | §2.8 (sessiz upsert) |
| 14 | **Geçersiz veriyle kayıt:** Bitiş < başlangıç engellenmiyor; PDF'den okunamayan `NOT FOUND` değerleri (ad, no, kurum) yine kaydedilebiliyor → sahte veri listelere/tutanaklara giriyor. | `backend/src/controllers/internshipController.js:66` (validasyon) | §2.1 (validation yok) — tarih mantığı + `NOT FOUND` reddi |
| 15 | ✅ **Filtre değişince notlar uyarısız kayboluyor:** Kaydetmeden dönem/not filtresi değişince `useEffect` state'i resetliyor; ayrıca arama ile gizlenenlerin notu "Tüm Notları Kaydet"te gönderilmiyor (`filteredStudents` üzerinde dönülüyor). | `frontend-new/src/pages/Chair/GradeInternship.js:73` (save `:128`, effect `:94`) | Yeni — doğrulandı |
| 16 | **Şifremi Unuttum kullanıcıyı bekletiyor:** E-posta ayarı boşken "e-postanıza gönderildi" deniyor ama mail gitmiyor; kod yalnızca sunucu terminalinde → kullanıcı tek başına sıfırlayamıyor. | `backend/src/controllers/authController.js:108` (email koşulu) | Prod'da `EMAIL_*` zorunlu; aksi halde mesaj yanıltıcı |

**Önceliklendirmeye etkisi:** #1–#3 zaten **Faz 0** (güvenlik) kapsamında. #4 (atomiklik/transaction) ve #13 (upsert) Faz 0–1 arası hızlı kazanımlar. #5, #6, #9, #10 kullanıcıyı doğrudan tıkayan işlevsel eksikler → **Faz 1.5** olarak ayrı ele alınmalı (canlı kullanım için kritik). #8, #11, #12, #14, #15 veri doğruluğu/UX → Faz 2 validation + UI çalışmasıyla birlikte.

---

## 8. Dosya Referans Haritası (incelenen)

**Backend:** `index.js`, `src/server.js`, `src/config/prisma.js`, `src/middlewares/auth.js`, `src/controllers/{auth,user,department,student,grading,internship}Controller.js`, `src/routes/*`, `prisma/schema.prisma`, `prisma/seed.js`, `package.json`, `.env.example`, `.gitignore`.
**Frontend:** `src/App.js`, `src/services/authService.js`, `src/pages/**` (token kullanımı + guard), `.env.production`, `package.json`, `.gitignore`.
**Dokümanlar:** `README.md`, `DEPLOYMENT.md`, `LOCAL_DEMO.md`.
