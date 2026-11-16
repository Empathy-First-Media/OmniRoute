# Chaos Mode (Oʻzbekcha)

🌐 **Languages:** 🇺🇸 [English](../../../../guides/CHAOS-MODE.md) · 🇪🇹 [am](../../../am/docs/guides/CHAOS-MODE.md) · 🇸🇦 [ar](../../../ar/docs/guides/CHAOS-MODE.md) · 🇦🇿 [az](../../../az/docs/guides/CHAOS-MODE.md) · 🇧🇬 [bg](../../../bg/docs/guides/CHAOS-MODE.md) · 🇧🇩 [bn](../../../bn/docs/guides/CHAOS-MODE.md) · 🇧🇦 [bs](../../../bs/docs/guides/CHAOS-MODE.md) · 🇨🇿 [cs](../../../cs/docs/guides/CHAOS-MODE.md) · 🇩🇰 [da](../../../da/docs/guides/CHAOS-MODE.md) · 🇩🇪 [de](../../../de/docs/guides/CHAOS-MODE.md) · 🇬🇷 [el](../../../el/docs/guides/CHAOS-MODE.md) · 🇪🇸 [es](../../../es/docs/guides/CHAOS-MODE.md) · 🇪🇪 [et](../../../et/docs/guides/CHAOS-MODE.md) · 🇮🇷 [fa](../../../fa/docs/guides/CHAOS-MODE.md) · 🇫🇮 [fi](../../../fi/docs/guides/CHAOS-MODE.md) · 🇫🇷 [fr](../../../fr/docs/guides/CHAOS-MODE.md) · 🇮🇪 [ga](../../../ga/docs/guides/CHAOS-MODE.md) · 🇮🇳 [gu](../../../gu/docs/guides/CHAOS-MODE.md) · 🇳🇬 [ha](../../../ha/docs/guides/CHAOS-MODE.md) · 🇮🇱 [he](../../../he/docs/guides/CHAOS-MODE.md) · 🇮🇳 [hi](../../../hi/docs/guides/CHAOS-MODE.md) · 🇭🇷 [hr](../../../hr/docs/guides/CHAOS-MODE.md) · 🇭🇺 [hu](../../../hu/docs/guides/CHAOS-MODE.md) · 🇦🇲 [hy](../../../hy/docs/guides/CHAOS-MODE.md) · 🇮🇩 [id](../../../id/docs/guides/CHAOS-MODE.md) · 🇳🇬 [ig](../../../ig/docs/guides/CHAOS-MODE.md) · 🇮🇹 [it](../../../it/docs/guides/CHAOS-MODE.md) · 🇯🇵 [ja](../../../ja/docs/guides/CHAOS-MODE.md) · 🇬🇪 [ka](../../../ka/docs/guides/CHAOS-MODE.md) · 🇰🇭 [km](../../../km/docs/guides/CHAOS-MODE.md) · 🇮🇳 [kn](../../../kn/docs/guides/CHAOS-MODE.md) · 🇰🇷 [ko](../../../ko/docs/guides/CHAOS-MODE.md) · 🇱🇹 [lt](../../../lt/docs/guides/CHAOS-MODE.md) · 🇱🇻 [lv](../../../lv/docs/guides/CHAOS-MODE.md) · 🇮🇳 [ml](../../../ml/docs/guides/CHAOS-MODE.md) · 🇮🇳 [mr](../../../mr/docs/guides/CHAOS-MODE.md) · 🇲🇾 [ms](../../../ms/docs/guides/CHAOS-MODE.md) · 🇲🇹 [mt](../../../mt/docs/guides/CHAOS-MODE.md) · 🇲🇲 [my](../../../my/docs/guides/CHAOS-MODE.md) · 🇳🇵 [ne](../../../ne/docs/guides/CHAOS-MODE.md) · 🇳🇱 [nl](../../../nl/docs/guides/CHAOS-MODE.md) · 🇳🇴 [no](../../../no/docs/guides/CHAOS-MODE.md) · 🇮🇳 [or](../../../or/docs/guides/CHAOS-MODE.md) · 🇮🇳 [pa](../../../pa/docs/guides/CHAOS-MODE.md) · 🇵🇭 [phi](../../../phi/docs/guides/CHAOS-MODE.md) · 🇵🇱 [pl](../../../pl/docs/guides/CHAOS-MODE.md) · 🇵🇹 [pt](../../../pt/docs/guides/CHAOS-MODE.md) · 🇧🇷 [pt-BR](../../../pt-BR/docs/guides/CHAOS-MODE.md) · 🇷🇴 [ro](../../../ro/docs/guides/CHAOS-MODE.md) · 🇷🇺 [ru](../../../ru/docs/guides/CHAOS-MODE.md) · 🇱🇰 [si](../../../si/docs/guides/CHAOS-MODE.md) · 🇸🇰 [sk](../../../sk/docs/guides/CHAOS-MODE.md) · 🇸🇮 [sl](../../../sl/docs/guides/CHAOS-MODE.md) · 🇷🇸 [sr](../../../sr/docs/guides/CHAOS-MODE.md) · 🇸🇪 [sv](../../../sv/docs/guides/CHAOS-MODE.md) · 🇰🇪 [sw](../../../sw/docs/guides/CHAOS-MODE.md) · 🇮🇳 [ta](../../../ta/docs/guides/CHAOS-MODE.md) · 🇮🇳 [te](../../../te/docs/guides/CHAOS-MODE.md) · 🇹🇭 [th](../../../th/docs/guides/CHAOS-MODE.md) · 🇹🇷 [tr](../../../tr/docs/guides/CHAOS-MODE.md) · 🇺🇦 [uk-UA](../../../uk-UA/docs/guides/CHAOS-MODE.md) · 🇵🇰 [ur](../../../ur/docs/guides/CHAOS-MODE.md) · 🇻🇳 [vi](../../../vi/docs/guides/CHAOS-MODE.md) · 🇳🇬 [yo](../../../yo/docs/guides/CHAOS-MODE.md) · 🇨🇳 [zh-CN](../../../zh-CN/docs/guides/CHAOS-MODE.md) · 🇹🇼 [zh-TW](../../../zh-TW/docs/guides/CHAOS-MODE.md)

---

> **Boshqaruv paneli:** **Chaos Mode** (yon panel) → `/dashboard/chaos`  
> **API:** `GET` / `PUT` `/api/chaos/config` · `POST /api/chaos/run` (boshqaruv paneli sessiyasi) · `POST /api/skills/collect/chaos` (API kaliti)  
> **Manba:** `src/lib/chaos/chaosExecutor.ts`, `src/lib/chaos/chaosConfig.ts`

Chaos Mode **bitta vazifani bir vaqtning oʻzida bir nechta provayderga yuboradi** — ishtirok etayotgan har bir provayder
bittadan model nusxasini taqdim etadi va siz barcha javoblarni yonma-yon (yoki zanjirlangan holda) olasiz. Bu
marshrutlash strategiyasi emas, balki bir nechta modelni ishga tushirish vositasidir: odatiy `/v1/chat/completions`
trafikingizga u hech qachon taʼsir qilmaydi.

**Aniqlik kiritish — nomida "chaos" boʻlgan uch xil narsa taqdim etiladi:**

| Narsa                        | Bu nima                                                                                                                                                                                                       | Hujjatlashtirilgan joy                       |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| **Chaos Mode**               | Bu yerda tasvirlangan boshqaruv paneli sahifasi va API: bitta vazifani koʻplab provayderlarga tarqatish (parallel yoki hamkorlikda).                                                                          | Ushbu qoʻllanma                              |
| `auto/chaos`                 | Auto-Combo model identifikatori: parallel tarqatish, har bir provayderdan bittadan model, har biri uchun bittadan yuqori oqim chaqiruvi. Nosozlik kiritish emas ([tafsilotlar](#autochaos-parallel-fan-out)). | [AUTO-COMBO.md](../routing/AUTO-COMBO.md)    |
| Chaos combo konfiguratsiyasi | `config.chaos.enabled` bilan saqlanadigan combo xuddi shu tarzda tarqatadi (faqat API orqali); `judgeModel` faqat yakuniy javobni tanlaydi, sintez chaqiruvi amalga oshirilmaydi.                             | `open-sse/services/autoCombo/chaosEngine.ts` |

### `auto/chaos`: parallel tarqatish

`auto/chaos` nosozlik kiritish yoki barqarorlikni sinash uchun **moʻljallanmagan**. `/v1/chat/completions` orqali
`model: "auto/chaos"` soʻralganda:

1. **Har bir provayderdan bittadan model**dan iborat panel tuziladi: har bir
   ulangan provayderning nomzodlar havzasi tartibidagi birinchi nomzodi, koʻpi bilan 5 ta aʼzogacha
   (`OMNIROUTE_CHAOS_MAX_PANEL`, yuqori chegarasi 10)
   (`open-sse/services/autoCombo/virtualFactory.ts`). `chaos-mode` vaznlar
   toʻplami faqat har bir aʼzoning `weight` qiymatini belgilaydi; tarqatish uni oʻqimaydi.
2. Bir xil soʻrov har bir panel aʼzosiga **parallel ravishda** yuboriladi, shuning uchun bitta soʻrov
   har bir panel aʼzosi uchun bittadan yuqori oqim chaqiruviga teng xarajat qiladi
   (`open-sse/services/autoCombo/chaosEngine.ts`, quyidagi manbadan yuboriladi:
   `open-sse/services/combo.ts`).
3. Har bir panel aʼzosi natijasi kelishi bilan unga tegishli bittadan holat qatori uzatiladi: sukut boʻyicha
   SSE izohi (`: chaos <index> ok|fail <model>`), shuningdek, soʻrovda
   `stream_options.include_chaos_parts: true` oʻrnatilgan boʻlsa, `omni-chaos-part`
   hodisasi (`model`, `index`, `ok`, `error`). Ular javob matnini oʻz ichiga olmaydi.
4. Yakuniy OpenAI uslubidagi parcha sifatida panelning **bitta** javobi yuboriladi: birinchi panel
   aʼzosining javobi (`auto/chaos` uni `judgeModel` sifatida belgilaydi), agar u muvaffaqiyatli boʻlsa, aks holda
   oxirgi muvaffaqiyatli aʼzoning javobi. Panelning boshqa javoblari qaytarilmaydi, shu sababli
   siz N ta chaqiruv uchun toʻlaysiz va bitta yakunlangan javob olasiz.

## Sozlash; o'rnatish

1. Ochiq** Boshqaruv paneli → Chaos rejimi** (`/dashboard/chaos`).
2. Uni aylantiring** yoqilgan** — Chaos Mode kemalari** sukut bo'yicha o'chirilgan** (`enabled: false` in `src/lib/chaos/chaosConfig.ts`). O'chirilgan holda, `POST /api/chaos/run` `400 — "Chaos Mode is not enabled. Enable it in Dashboard → Chaos Mode."` javob beradi.
3. Ishtirokchilarni va standart sozlamalarni tanlang (sozlamalar doʻkoni orqali har bir misolda saqlanadi):

   | Maydon              | Ma'nosi                                                                    | Standart / chegaralar                        |
   | ------------------- | -------------------------------------------------------------------------- | -------------------------------------------- |
   | `enabled`           | Asosiy kalit                                                               | `false`                                      |
   | `defaultMode`       | `parallel` yoki `collaborative` (pastga qarang)                            | `parallel`                                   |
   | `providerOverrides` | Har bir provayder ishtiroki (`providerId`, ixtiyoriy `modelId`, `enabled`) | bo'sh = har bir faol provayder, maksimal 200 |
   | `systemPrompt`      | O'rnatilgan Chaos tizimi so'rovini bekor qilish                            | ixtiyoriy, maksimal 10 000 belgi             |
   | `timeoutMs`         | Har bir model chaqiruvining maksimal vaqti                                 | `120000` (5 000–600 000)                     |
   | `maxTokens`         | har bir model uchun `max_tokens`                                           | `4096` (256–128 000)                         |

4. Har bir ishtirokchi provayderga a** model** . Provayder modeli bu Chaos Mode sahifasida yoqilgan bekor qilishning `modelId` (u g'alaba qozonadi), aks holda** standart model** uning aloqasi. Provayder identifikatori hech qachon model nomi sifatida ishlatilmaydi. Hech biriga ega bo'lmagan provayder** chaqirilmagan** : u natijalarda _"Ushbu provayder uchun hech qanday model oʻrnatilmagan. Xaos rejimi sahifasida uning modelini yoki ulanishda standart modelni oʻrnating."_ va boʻsh `modelId` xabari bilan `status: "error"` koʻrinadi, boshqa provayderlar esa normal ishlaydi. Agar tanlangan provayderda model bo'lmasa, ishga tushirish _"Hech bir provayderda modellar to'plami yo'q. …"_ (har ikki so'nggi nuqtada HTTP 500) bilan yuqori oqim so'rovi oldidan ishga tushirish muvaffaqiyatsiz tugadi.
5. Yugurish a** sahifaning o'zidan sinov** — natijalar paneli har bir provayderning javobi, holati va davomiyligini ko'rsatadi.

## Bajarish rejimlari

- **`parallel`** — har bir model bir xil vazifani bir vaqtning oʻzida oladi; siz barcha javoblarni
  bir-biridan mustaqil ravishda olasiz.
- **`collaborative`** — modellar **zanjir boʻylab** ishlaydi: har biri oldingi model natijasini koʻradi va
  uni takomillashtirish, kengaytirish, tanqid qilish yoki muqobil variant taklif etish soʻraladi. Javobdagi `summary` maydoni
  muvaffaqiyatli natijalarni zanjir tartibida birlashtiradi (parallel bajarilishlarda `summary` boʻlmaydi).

## API

### `POST /api/chaos/run` — boshqaruv paneli sessiyasi

Cookie orqali autentifikatsiya qilinadi (boshqaruv sessiyasi — qarang:
[MANAGEMENT-AUTH.md](MANAGEMENT-AUTH.md)); boshqaruv paneli sahifasi tomonidan ishlatiladi.

```jsonc
// soʻrov tanasi
{
  "task": "X uchun yondashuvlarni taqqoslang", // majburiy
  "providers": ["glm", "kimi"], // ixtiyoriy filtr
  "mode": "parallel", // ixtiyoriy — defaultMode qiymatini almashtiradi
  "systemPrompt": "…", // ixtiyoriy almashtirish
  "maxTokens": 4096, // ixtiyoriy almashtirish
}
```

### `POST /api/skills/collect/chaos` — API kaliti

Tashqi chaqiruvchilar uchun Bearer-token varianti. Kalitda **Chaos Mode ruxsati**
(`chaosModeEnabled`) boʻlishi kerak; u **standart holatda oʻchirilgan** — uni har bir kalit uchun
**Boshqaruv paneli → API Manager → kalitni tahrirlash → ruxsatlar → Chaos Mode** orqali yoqing. Soʻrov tanasi yuqoridagisi bilan bir xil.

```bash
curl -X POST http://localhost:20128/api/skills/collect/chaos \
  -H "Authorization: Bearer $OMNIROUTE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"task":"X uchun yondashuvlarni taqqoslang","mode":"parallel"}'
```

Har ikkala endpoint bir xil tuzilishdagi javobni qaytaradi:

```jsonc
{
  "task": "…",
  "mode": "parallel",
  "startedAt": "2026-09-01T00:00:00.000Z",
  "totalProviders": 3,
  "totalResults": 3,
  "models": [
    {
      "providerId": "glm",
      "providerName": "GLM",
      "modelId": "glm-4.7",
      "status": "success",
      "content": "…",
      "durationMs": 3210,
    },
  ],
  "summary": "…", // faqat collaborative rejimida
}
```

## Muammolarni bartaraf qilish; nosozliklarni TUZATISH

- **`400 Chaos Mode is not enabled`** — yuqoridagi 2-bosqich: global kalit o'chirilgan.
- **API kaliti `/api/skills/collect/chaos` da rad etiladi** — kalitda har bir kalit uchun `chaosModeEnabled` ruxsati yo'q (sukut bo'yicha o'chirilgan; bu sozlama, xato emas).
- **Provayder `No model set for this provider` ko'rsatadi** — o'z modelini Chaos Mode sahifasida yoki uning ulanishida standart modelni o'rnatadi (O'rnatish, 4-bosqichga qarang).
- **Natijalarda siz kutgan provayder etishmayapti** — Chaos Mode sahifasida `providerOverrides` tekshiring (o'chirilgan bekor qilish uni istisno qiladi) va provayder ulanishining faolligini tekshiring.
