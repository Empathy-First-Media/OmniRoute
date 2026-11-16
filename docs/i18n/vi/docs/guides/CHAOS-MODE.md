# Chaos Mode (Tiếng Việt)

🌐 **Languages:** 🇺🇸 [English](../../../../guides/CHAOS-MODE.md) · 🇪🇹 [am](../../../am/docs/guides/CHAOS-MODE.md) · 🇸🇦 [ar](../../../ar/docs/guides/CHAOS-MODE.md) · 🇦🇿 [az](../../../az/docs/guides/CHAOS-MODE.md) · 🇧🇬 [bg](../../../bg/docs/guides/CHAOS-MODE.md) · 🇧🇩 [bn](../../../bn/docs/guides/CHAOS-MODE.md) · 🇧🇦 [bs](../../../bs/docs/guides/CHAOS-MODE.md) · 🇨🇿 [cs](../../../cs/docs/guides/CHAOS-MODE.md) · 🇩🇰 [da](../../../da/docs/guides/CHAOS-MODE.md) · 🇩🇪 [de](../../../de/docs/guides/CHAOS-MODE.md) · 🇬🇷 [el](../../../el/docs/guides/CHAOS-MODE.md) · 🇪🇸 [es](../../../es/docs/guides/CHAOS-MODE.md) · 🇪🇪 [et](../../../et/docs/guides/CHAOS-MODE.md) · 🇮🇷 [fa](../../../fa/docs/guides/CHAOS-MODE.md) · 🇫🇮 [fi](../../../fi/docs/guides/CHAOS-MODE.md) · 🇫🇷 [fr](../../../fr/docs/guides/CHAOS-MODE.md) · 🇮🇪 [ga](../../../ga/docs/guides/CHAOS-MODE.md) · 🇮🇳 [gu](../../../gu/docs/guides/CHAOS-MODE.md) · 🇳🇬 [ha](../../../ha/docs/guides/CHAOS-MODE.md) · 🇮🇱 [he](../../../he/docs/guides/CHAOS-MODE.md) · 🇮🇳 [hi](../../../hi/docs/guides/CHAOS-MODE.md) · 🇭🇷 [hr](../../../hr/docs/guides/CHAOS-MODE.md) · 🇭🇺 [hu](../../../hu/docs/guides/CHAOS-MODE.md) · 🇦🇲 [hy](../../../hy/docs/guides/CHAOS-MODE.md) · 🇮🇩 [id](../../../id/docs/guides/CHAOS-MODE.md) · 🇳🇬 [ig](../../../ig/docs/guides/CHAOS-MODE.md) · 🇮🇹 [it](../../../it/docs/guides/CHAOS-MODE.md) · 🇯🇵 [ja](../../../ja/docs/guides/CHAOS-MODE.md) · 🇬🇪 [ka](../../../ka/docs/guides/CHAOS-MODE.md) · 🇰🇭 [km](../../../km/docs/guides/CHAOS-MODE.md) · 🇮🇳 [kn](../../../kn/docs/guides/CHAOS-MODE.md) · 🇰🇷 [ko](../../../ko/docs/guides/CHAOS-MODE.md) · 🇱🇹 [lt](../../../lt/docs/guides/CHAOS-MODE.md) · 🇱🇻 [lv](../../../lv/docs/guides/CHAOS-MODE.md) · 🇮🇳 [ml](../../../ml/docs/guides/CHAOS-MODE.md) · 🇮🇳 [mr](../../../mr/docs/guides/CHAOS-MODE.md) · 🇲🇾 [ms](../../../ms/docs/guides/CHAOS-MODE.md) · 🇲🇹 [mt](../../../mt/docs/guides/CHAOS-MODE.md) · 🇲🇲 [my](../../../my/docs/guides/CHAOS-MODE.md) · 🇳🇵 [ne](../../../ne/docs/guides/CHAOS-MODE.md) · 🇳🇱 [nl](../../../nl/docs/guides/CHAOS-MODE.md) · 🇳🇴 [no](../../../no/docs/guides/CHAOS-MODE.md) · 🇮🇳 [or](../../../or/docs/guides/CHAOS-MODE.md) · 🇮🇳 [pa](../../../pa/docs/guides/CHAOS-MODE.md) · 🇵🇭 [phi](../../../phi/docs/guides/CHAOS-MODE.md) · 🇵🇱 [pl](../../../pl/docs/guides/CHAOS-MODE.md) · 🇵🇹 [pt](../../../pt/docs/guides/CHAOS-MODE.md) · 🇧🇷 [pt-BR](../../../pt-BR/docs/guides/CHAOS-MODE.md) · 🇷🇴 [ro](../../../ro/docs/guides/CHAOS-MODE.md) · 🇷🇺 [ru](../../../ru/docs/guides/CHAOS-MODE.md) · 🇱🇰 [si](../../../si/docs/guides/CHAOS-MODE.md) · 🇸🇰 [sk](../../../sk/docs/guides/CHAOS-MODE.md) · 🇸🇮 [sl](../../../sl/docs/guides/CHAOS-MODE.md) · 🇷🇸 [sr](../../../sr/docs/guides/CHAOS-MODE.md) · 🇸🇪 [sv](../../../sv/docs/guides/CHAOS-MODE.md) · 🇰🇪 [sw](../../../sw/docs/guides/CHAOS-MODE.md) · 🇮🇳 [ta](../../../ta/docs/guides/CHAOS-MODE.md) · 🇮🇳 [te](../../../te/docs/guides/CHAOS-MODE.md) · 🇹🇭 [th](../../../th/docs/guides/CHAOS-MODE.md) · 🇹🇷 [tr](../../../tr/docs/guides/CHAOS-MODE.md) · 🇺🇦 [uk-UA](../../../uk-UA/docs/guides/CHAOS-MODE.md) · 🇵🇰 [ur](../../../ur/docs/guides/CHAOS-MODE.md) · 🇺🇿 [uz](../../../uz/docs/guides/CHAOS-MODE.md) · 🇳🇬 [yo](../../../yo/docs/guides/CHAOS-MODE.md) · 🇨🇳 [zh-CN](../../../zh-CN/docs/guides/CHAOS-MODE.md) · 🇹🇼 [zh-TW](../../../zh-TW/docs/guides/CHAOS-MODE.md)

---

> **Dashboard:** **Chaos Mode** (thanh bên) → `/dashboard/chaos`  
> **API:** `GET` / `PUT` `/api/chaos/config` · `POST /api/chaos/run` (phiên dashboard) · `POST /api/skills/collect/chaos` (khóa API)  
> **Mã nguồn:** `src/lib/chaos/chaosExecutor.ts`, `src/lib/chaos/chaosConfig.ts`

Chaos Mode gửi **một tác vụ đến nhiều nhà cung cấp cùng lúc** — mỗi nhà cung cấp tham gia đóng góp một phiên bản mô hình, và bạn nhận được tất cả câu trả lời cạnh nhau (hoặc theo chuỗi). Đây là một bề mặt thực thi đa mô hình, không phải chiến lược định tuyến: lưu lượng `/v1/chat/completions` thông thường của bạn không bao giờ bị ảnh hưởng bởi tính năng này.

**Phân biệt — có ba thứ khác nhau được phát hành với từ "chaos" trong tên:**

| Thứ                  | Nội dung                                                                                                                                                                                    | Nơi có tài liệu                              |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| **Chaos Mode**       | Trang dashboard + API được mô tả tại đây: phân phối một tác vụ đến nhiều nhà cung cấp (song song hoặc cộng tác).                                                                            | Hướng dẫn này                                |
| `auto/chaos`         | ID mô hình Auto-Combo: phân phối song song, một mô hình cho mỗi nhà cung cấp, mỗi mô hình thực hiện một lệnh gọi ngược dòng. Không phải chèn lỗi ([chi tiết](#autochaos-parallel-fan-out)). | [AUTO-COMBO.md](../routing/AUTO-COMBO.md)    |
| Cấu hình combo Chaos | Một combo được lưu bền vững với `config.chaos.enabled` sẽ phân phối theo cùng cách (chỉ qua API); `judgeModel` chỉ chọn câu trả lời cuối cùng, không có lệnh gọi tổng hợp.                  | `open-sse/services/autoCombo/chaosEngine.ts` |

### `auto/chaos`: phân phối song song

`auto/chaos` **không** phải là tùy chọn chèn lỗi hoặc kiểm thử khả năng phục hồi. Khi yêu cầu
`model: "auto/chaos"` trên `/v1/chat/completions`:

1. Tạo một nhóm gồm **một mô hình cho mỗi nhà cung cấp**: ứng viên đầu tiên của từng
   nhà cung cấp đã kết nối, theo thứ tự nhóm ứng viên, tối đa 5 thành viên
   (`OMNIROUTE_CHAOS_MAX_PANEL`, giới hạn tối đa là 10)
   (`open-sse/services/autoCombo/virtualFactory.ts`). Gói trọng số `chaos-mode`
   chỉ đặt `weight` cho từng thành viên; quá trình phân phối không đọc giá trị này.
2. Gửi cùng một yêu cầu đến mọi thành viên trong nhóm **theo cách song song**, vì vậy một yêu cầu
   tiêu tốn một lệnh gọi ngược dòng cho mỗi thành viên trong nhóm
   (`open-sse/services/autoCombo/chaosEngine.ts`, được điều phối từ
   `open-sse/services/combo.ts`).
3. Truyền một dòng trạng thái cho mỗi thành viên trong nhóm khi có kết quả: theo mặc định là một chú thích SSE
   (`: chaos <index> ok|fail <model>`), cùng với một sự kiện `omni-chaos-part`
   (`model`, `index`, `ok`, `error`) khi yêu cầu đặt
   `stream_options.include_chaos_parts: true`. Các thông tin này không chứa văn bản câu trả lời.
4. Gửi **một** câu trả lời của nhóm dưới dạng đoạn dữ liệu cuối cùng theo kiểu OpenAI: câu trả lời của thành viên
   đầu tiên trong nhóm (`auto/chaos` đặt thành viên này làm `judgeModel`) khi thành công; nếu không,
   câu trả lời của thành viên thành công cuối cùng sẽ được gửi. Các câu trả lời khác trong nhóm không được trả về, vì vậy
   bạn trả phí cho N lệnh gọi nhưng chỉ nhận được một kết quả hoàn thành.

## Cài đặt

1. Mở** Bảng điều khiển → Chế độ hỗn loạn** (`/dashboard/chaos`).
2. Xoay nó** TRÊN** tàu chế độ hỗn loạn —** bị tắt theo mặc định** (`enabled: false` trong `src/lib/chaos/chaosConfig.ts`). Khi bị tắt, `POST /api/chaos/run` trả lời `400 — "Chaos Mode is not enabled. Enable it in Dashboard → Chaos Mode."`.
3. Chọn người tham gia và mặc định (được duy trì theo từng trường hợp thông qua cửa hàng cài đặt):

   | Cánh đồng           | Nghĩa                                                                           | Mặc định/giới hạn                                   |
   | ------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------- |
   | `enabled`           | Công tắc chính                                                                  | `false`                                             |
   | `defaultMode`       | `parallel` hoặc `collaborative` (xem bên dưới)                                  | `parallel`                                          |
   | `providerOverrides` | Sự tham gia của mỗi nhà cung cấp (`providerId`, `modelId` tùy chọn , `enabled`) | = trống mỗi nhà cung cấp đang hoạt động, tối đa 200 |
   | `systemPrompt`      | Ghi đè cho lời nhắc hệ thống Chaos tích hợp                                     | tùy chọn, tối đa 10 000 ký tự                       |
   | `timeoutMs`         | Thời gian tối đa cho mỗi cuộc gọi mô hình                                       | `120000` (5 000–600 000)                            |
   | `maxTokens`         | `max_tokens` cho mỗi cuộc gọi mô hình                                           | `4096` (256–128 000)                                |

4. Cung cấp cho mỗi nhà cung cấp tham gia một** người mẫu** . Mô hình của nhà cung cấp là `modelId` của ghi đè được kích hoạt trên trang Chế độ hỗn loạn (nó thắng), nếu không thì** mô hình mặc định** kết nối của nó. Id nhà cung cấp không bao giờ được sử dụng làm tên mẫu. Một nhà cung cấp không có** không được gọi** : nó hiển thị trong kết quả dưới dạng `status: "error"` với thông báo _"Không có mô hình nào được đặt cho nhà cung cấp này. Đặt mô hình cho nó trên trang Chế độ hỗn loạn hoặc mô hình mặc định trên kết nối."_ và một `modelId` trống, trong khi các nhà cung cấp khác chạy bình thường. Nếu không có nhà cung cấp nào được chọn có mô hình thì quá trình chạy sẽ không thành công trước bất kỳ yêu cầu ngược dòng nào có _"Không có nhà cung cấp nào có bộ mô hình. ..."_ (HTTP 500 trên cả hai điểm cuối).
5. Chạy một** kiểm tra từ chính trang đó** — bảng kết quả hiển thị câu trả lời, trạng thái và thời lượng của từng nhà cung cấp.

## Chế độ thực thi

- **`parallel`** — mọi mô hình nhận cùng một tác vụ đồng thời; bạn nhận được tất cả câu trả lời
  một cách độc lập.
- **`collaborative`** — các mô hình chạy **theo chuỗi**: mỗi mô hình nhìn thấy đầu ra của mô hình trước đó và
  được yêu cầu tinh chỉnh, mở rộng, phản biện hoặc đưa ra phương án thay thế. Trường `summary` của phản hồi
  nối các đầu ra thành công theo thứ tự chuỗi (các lần chạy song song không có `summary`).

## API

### `POST /api/chaos/run` — phiên bảng điều khiển

Được xác thực bằng cookie (phiên quản lý — xem
[MANAGEMENT-AUTH.md](MANAGEMENT-AUTH.md)); được trang bảng điều khiển sử dụng.

```jsonc
// nội dung yêu cầu
{
  "task": "Compare approaches to X", // bắt buộc
  "providers": ["glm", "kimi"], // bộ lọc tùy chọn
  "mode": "parallel", // tùy chọn — ghi đè defaultMode
  "systemPrompt": "…", // giá trị ghi đè tùy chọn
  "maxTokens": 4096, // giá trị ghi đè tùy chọn
}
```

### `POST /api/skills/collect/chaos` — khóa API

Biến thể sử dụng bearer token dành cho trình gọi bên ngoài. Khóa phải có **quyền Chaos Mode**
(`chaosModeEnabled`), vốn **bị tắt theo mặc định** — bật quyền này cho từng khóa tại
**Bảng điều khiển → Trình quản lý API → chỉnh sửa khóa → quyền → Chaos Mode**. Nội dung yêu cầu giống như trên.

```bash
curl -X POST http://localhost:20128/api/skills/collect/chaos \
  -H "Authorization: Bearer $OMNIROUTE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"task":"Compare approaches to X","mode":"parallel"}'
```

Cả hai endpoint đều trả về cùng một cấu trúc:

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
  "summary": "…", // chỉ dành cho chế độ cộng tác
}
```

## Khắc phục sự cố

- **`400 Chaos Mode is not enabled`** — bước 2 ở trên: công tắc chung bị tắt.
- **khóa API bị từ chối trên `/api/skills/collect/chaos`** — khóa thiếu quyền `chaosModeEnabled` cho mỗi phím (tắt theo mặc định; đây là cài đặt, không phải lỗi).
- **Một nhà cung cấp cho thấy `No model set for this provider`** — đặt mô hình của nó trên trang Chế độ hỗn loạn hoặc mô hình mặc định trên kết nối của nó (xem Thiết lập, bước 4).
- **Thiếu nhà cung cấp mà bạn mong đợi trong kết quả** — kiểm tra `providerOverrides` trên trang Chế độ hỗn loạn (ghi đè bị tắt sẽ loại trừ nó) và liệu kết nối nhà cung cấp có hoạt động hay không.
