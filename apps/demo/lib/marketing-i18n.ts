export const marketingLocales = [
  "en",
  "zh-CN",
  "zh-TW",
  "ja",
  "ko",
  "es",
  "pt-BR",
  "de",
  "fr",
] as const;
export type MarketingLocale = (typeof marketingLocales)[number];

type Dictionary = {
  code: string;
  direction: "ltr";
  nav: [string, string, string, string];
  openConsole: string;
  eyebrow: string;
  hero: [string, string];
  summary: string;
  tryDemo: string;
  seePricing: string;
  proof: string[];
  definition: string;
  facts: [string, string][];
  modesTitle: string;
  modesSummary: string;
  modes: [string, string][];
  brandTitle: string;
  brandSummary: string;
  brandPoints: string[];
  pricingTitle: string;
  pricingSummary: string;
  perMonth: string;
  perYear: string;
  yearly: string;
  choose: string;
  currentFree: string;
  planNames: [string, string, string, string];
  planFeatures: string[][];
  faqTitle: string;
  faqs: [string, string][];
  ctaTitle: string;
  ctaSummary: string;
  footer: string;
  metaTitle: string;
  metaDescription: string;
};

export const localeNames: Record<MarketingLocale, string> = {
  en: "English",
  "zh-CN": "简体中文",
  "zh-TW": "繁體中文",
  ja: "日本語",
  ko: "한국어",
  es: "Español",
  "pt-BR": "Português",
  de: "Deutsch",
  fr: "Français",
};

export const dictionaries: Record<MarketingLocale, Dictionary> = {
  en: {
    code: "en-US",
    direction: "ltr",
    nav: ["Product", "Security", "Pricing", "FAQ"],
    openConsole: "Open console",
    eyebrow: "Adaptive, privacy-aware human verification",
    hero: ["Stop automated abuse.", "Keep real people moving."],
    summary:
      "TrustCaptcha is a CAPTCHA and bot-protection SaaS for modern web apps. It adapts friction to risk, binds every token to its intended action, and verifies it on the server.",
    tryDemo: "Try the live verification",
    seePricing: "See pricing",
    proof: [
      "250,000 free requests monthly",
      "No raw pointer trails",
      "Server-verified, single-use tokens",
    ],
    definition:
      "TrustCaptcha combines aggregated interaction signals, rate limits, adaptive proof of work, optional branded image challenges and short-lived action-bound tokens. It supports managed, invisible, checkbox and non-interactive experiences.",
    facts: [
      ["Free capacity", "250K requests / month"],
      ["Languages", "9 launch languages"],
      ["Retention", "14 to 3,650 days"],
      ["Payments", "Creem merchant of record"],
    ],
    modesTitle: "One API, the right amount of friction",
    modesSummary:
      "Set a predictable experience or let the risk engine step suspicious traffic up automatically.",
    modes: [
      ["Managed", "Invisible for low risk, interactive only when needed."],
      [
        "Non-interactive",
        "A visible security status without requiring a checkbox click.",
      ],
      [
        "Checkbox",
        "Accessible explicit consent plus privacy-safe behavior signals.",
      ],
      [
        "Branded visual",
        "Customer artwork becomes a randomized orientation task on paid plans.",
      ],
    ],
    brandTitle: "Turn brand artwork into a security moment",
    brandSummary:
      "Upload upright PNG, JPEG or WebP campaign images. TrustCaptcha safely creates randomized rotation challenges that reinforce your brand without external image-labeling labor.",
    brandPoints: [
      "Your assets remain isolated to your tenant",
      "Accessible descriptions are required",
      "SVG and active content are rejected",
      "Visual tasks are used only when policy and risk require them",
    ],
    pricingTitle: "Generous free protection, simple paid plans",
    pricingSummary:
      "Start without a card. Upgrade for longer retention, more sites, branded challenges and higher request capacity.",
    perMonth: "/month",
    perYear: "/year",
    yearly: "Yearly pricing",
    choose: "Choose",
    currentFree: "Start free",
    planNames: ["Free", "Pro", "Scale", "Private Cloud"],
    planFeatures: [
      [
        "250K requests monthly",
        "14-day logs",
        "3 sites",
        "Core verification modes",
      ],
      ["2M requests monthly", "90-day logs", "25 sites", "20 branded assets"],
      ["10M requests monthly", "365-day logs", "100 sites", "Priority support"],
      [
        "Private deployment",
        "Configurable retention",
        "Dedicated capacity",
        "Architecture support",
      ],
    ],
    faqTitle: "Frequently asked questions",
    faqs: [
      [
        "Does TrustCaptcha record the mouse trail?",
        "No. The browser uploads bounded aggregates such as event counts, timing, distance and direction changes—not raw coordinates or a replayable trail.",
      ],
      [
        "How are branded image challenges made?",
        "A customer uploads an upright image. The server chooses a random quarter-turn and validates that the visitor restores the correct orientation.",
      ],
      [
        "Can a token be reused?",
        "No. Tokens are short-lived, site- and action-bound, and atomically consumed once.",
      ],
      [
        "What does the free plan include?",
        "250,000 requests per month, 14-day verification-log retention, three sites and the core verification modes.",
      ],
      [
        "Who handles payments and tax?",
        "Creem provides checkout, subscription management and merchant-of-record services once billing credentials are configured.",
      ],
    ],
    ctaTitle: "Protect your first action today",
    ctaSummary:
      "Create a site, copy the widget key, and enforce the resulting token on your server.",
    footer: "Privacy-aware bot protection for real-world web apps.",
    metaTitle:
      "TrustCaptcha — Adaptive CAPTCHA, Bot Protection & Branded Challenges",
    metaDescription:
      "Privacy-aware CAPTCHA SaaS with 250K free monthly requests, managed and invisible verification, branded image challenges, multilingual widgets and server-side enforcement.",
  },
  "zh-CN": {
    code: "zh-CN",
    direction: "ltr",
    nav: ["产品", "安全", "价格", "常见问题"],
    openConsole: "打开控制台",
    eyebrow: "自适应、重隐私的人机验证",
    hero: ["阻止自动化滥用，", "让真实用户顺畅前行。"],
    summary:
      "TrustCaptcha 是面向现代 Web 应用的 CAPTCHA 与机器人防护 SaaS。系统根据风险动态调整摩擦，将令牌绑定到具体操作，并在服务端完成验证。",
    tryDemo: "体验在线验证",
    seePricing: "查看价格",
    proof: [
      "每月 25 万次免费请求",
      "不上传原始鼠标轨迹",
      "服务端验证、令牌仅用一次",
    ],
    definition:
      "TrustCaptcha 结合聚合交互信号、限流、自适应工作量证明、可选品牌图片题和短时操作绑定令牌，支持托管、隐形、复选框及非交互模式。",
    facts: [
      ["免费额度", "每月 25 万次"],
      ["首发语言", "9 种"],
      ["数据保留", "14 至 3650 天"],
      ["支付", "Creem 收单主体"],
    ],
    modesTitle: "一个 API，按风险选择合适摩擦",
    modesSummary: "可固定验证体验，也可让风险引擎仅对可疑流量逐级增强验证。",
    modes: [
      ["托管模式", "低风险隐形通过，需要时才交互。"],
      ["非交互", "显示安全状态，但无需点击复选框。"],
      ["复选框", "无障碍显式操作并结合隐私安全的行为信号。"],
      ["品牌视觉题", "付费版可把客户素材变成随机方向验证题。"],
    ],
    brandTitle: "把品牌素材变成安全触点",
    brandSummary:
      "上传正向 PNG、JPEG 或 WebP 活动图片，TrustCaptcha 会安全生成随机旋转题，在不依赖外部图片标注的情况下强化品牌曝光。",
    brandPoints: [
      "素材按租户严格隔离",
      "必须填写无障碍图片描述",
      "拒绝 SVG 与活动内容",
      "仅在策略和风险需要时出现视觉题",
    ],
    pricingTitle: "免费额度充足，付费方案简单",
    pricingSummary:
      "无需信用卡即可开始。升级可获得更长留存、更多站点、品牌图片题和更高请求量。",
    perMonth: "/月",
    perYear: "/年",
    yearly: "年付价格",
    choose: "选择",
    currentFree: "免费开始",
    planNames: ["免费版", "专业版", "规模版", "私有化版"],
    planFeatures: [
      ["每月 25 万次", "日志保留 14 天", "3 个站点", "核心验证模式"],
      ["每月 200 万次", "日志保留 90 天", "25 个站点", "20 个品牌素材"],
      ["每月 1000 万次", "日志保留 365 天", "100 个站点", "优先支持"],
      ["私有化部署", "可配置留存", "专属容量", "架构支持"],
    ],
    faqTitle: "常见问题",
    faqs: [
      [
        "TrustCaptcha 会记录完整鼠标轨迹吗？",
        "不会。浏览器只上传事件数、时间、距离、方向变化等有界聚合值，不上传原始坐标或可回放轨迹。",
      ],
      [
        "品牌图片题如何生成？",
        "客户上传一张正向图片，服务端随机旋转四分之一圈，并验证访客是否把它恢复到正确方向。",
      ],
      [
        "验证令牌可以重复使用吗？",
        "不可以。令牌有效期短，绑定站点与操作，并在首次成功验证时原子消费。",
      ],
      [
        "免费版包含什么？",
        "每月 25 万次请求、14 天验证日志、3 个站点和核心验证模式。",
      ],
      [
        "支付和税务由谁处理？",
        "配置计费密钥后，Creem 提供结账、订阅管理及收单主体服务。",
      ],
    ],
    ctaTitle: "今天就保护第一个关键操作",
    ctaSummary: "创建站点、复制小组件密钥，并在服务端强制校验返回的令牌。",
    footer: "为真实 Web 应用打造的隐私友好机器人防护。",
    metaTitle: "TrustCaptcha — 自适应 CAPTCHA、机器人防护与品牌图片验证",
    metaDescription:
      "隐私友好的人机验证 SaaS：每月 25 万次免费请求、托管与隐形验证、品牌图片题、多语言小组件和服务端强制校验。",
  },
  "zh-TW": {
    code: "zh-TW",
    direction: "ltr",
    nav: ["產品", "安全", "價格", "常見問題"],
    openConsole: "開啟控制台",
    eyebrow: "自適應、重視隱私的人機驗證",
    hero: ["阻止自動化濫用，", "讓真實使用者順暢前進。"],
    summary:
      "TrustCaptcha 是現代 Web 應用的 CAPTCHA 與機器人防護 SaaS，依風險調整摩擦、將權杖綁定特定操作，並在伺服器端驗證。",
    tryDemo: "體驗即時驗證",
    seePricing: "查看價格",
    proof: [
      "每月 25 萬次免費請求",
      "不傳送原始滑鼠軌跡",
      "伺服器驗證、權杖僅用一次",
    ],
    definition:
      "TrustCaptcha 結合聚合互動訊號、限流、自適應工作量證明、可選品牌圖片題與短效操作綁定權杖，支援託管、隱形、核取方塊及非互動模式。",
    facts: [
      ["免費額度", "每月 25 萬次"],
      ["首發語言", "9 種"],
      ["資料保留", "14 至 3650 天"],
      ["付款", "Creem 收單主體"],
    ],
    modesTitle: "一個 API，依風險選擇合適摩擦",
    modesSummary: "可固定驗證體驗，或只對可疑流量逐級增強驗證。",
    modes: [
      ["託管模式", "低風險隱形通過，需要時才互動。"],
      ["非互動", "顯示安全狀態，不需點擊核取方塊。"],
      ["核取方塊", "無障礙明確操作搭配隱私安全行為訊號。"],
      ["品牌視覺題", "付費方案可將客戶素材轉成隨機方向題。"],
    ],
    brandTitle: "把品牌素材變成安全接觸點",
    brandSummary:
      "上傳正向 PNG、JPEG 或 WebP 圖片，系統安全產生隨機旋轉題，同時強化品牌曝光。",
    brandPoints: [
      "素材依租戶隔離",
      "必須提供無障礙描述",
      "拒絕 SVG 與活動內容",
      "僅在策略與風險需要時出題",
    ],
    pricingTitle: "免費額度充足，付費方案簡單",
    pricingSummary:
      "無需信用卡即可開始；升級可獲得更長保留期、更多站點、品牌圖片題與更高額度。",
    perMonth: "/月",
    perYear: "/年",
    yearly: "年繳價格",
    choose: "選擇",
    currentFree: "免費開始",
    planNames: ["免費版", "專業版", "規模版", "私有化版"],
    planFeatures: [
      ["每月 25 萬次", "14 天日誌", "3 個站點", "核心驗證模式"],
      ["每月 200 萬次", "90 天日誌", "25 個站點", "20 個品牌素材"],
      ["每月 1000 萬次", "365 天日誌", "100 個站點", "優先支援"],
      ["私有化部署", "可設定保留期", "專屬容量", "架構支援"],
    ],
    faqTitle: "常見問題",
    faqs: [
      [
        "會記錄完整滑鼠軌跡嗎？",
        "不會，只傳送有界聚合值，不傳送原始座標或可回放軌跡。",
      ],
      [
        "品牌圖片題如何產生？",
        "客戶上傳正向圖片，伺服器隨機旋轉並驗證是否恢復正確方向。",
      ],
      [
        "權杖可重複使用嗎？",
        "不可以，權杖短效、綁定站點與操作，且僅能原子消費一次。",
      ],
      ["免費版包含什麼？", "每月 25 萬次請求、14 天日誌、3 個站點與核心模式。"],
      [
        "誰處理付款與稅務？",
        "設定後由 Creem 提供結帳、訂閱管理與收單主體服務。",
      ],
    ],
    ctaTitle: "今天就保護第一個關鍵操作",
    ctaSummary: "建立站點、複製小工具金鑰，並在伺服器驗證回傳權杖。",
    footer: "為真實 Web 應用打造的隱私友善機器人防護。",
    metaTitle: "TrustCaptcha — 自適應 CAPTCHA、機器人防護與品牌圖片驗證",
    metaDescription:
      "隱私友善的人機驗證 SaaS，提供每月 25 萬次免費請求、品牌圖片題、多語系小工具與伺服器驗證。",
  },
  ja: {
    code: "ja-JP",
    direction: "ltr",
    nav: ["製品", "セキュリティ", "料金", "FAQ"],
    openConsole: "コンソールを開く",
    eyebrow: "適応型・プライバシー重視の人間認証",
    hero: ["自動化された不正を止め、", "本物のユーザーを止めない。"],
    summary:
      "TrustCaptcha は最新の Web アプリ向け CAPTCHA／ボット対策 SaaS です。リスクに応じて摩擦を調整し、トークンを操作に結び付け、サーバーで検証します。",
    tryDemo: "ライブ認証を試す",
    seePricing: "料金を見る",
    proof: [
      "月25万件まで無料",
      "生のポインター軌跡を送信しない",
      "サーバー検証・一回限りのトークン",
    ],
    definition:
      "集約操作シグナル、レート制限、適応型 PoW、任意のブランド画像課題、短寿命の操作バインドトークンを組み合わせます。",
    facts: [
      ["無料枠", "月25万件"],
      ["対応言語", "初期9言語"],
      ["保持期間", "14〜3650日"],
      ["決済", "Creem MoR"],
    ],
    modesTitle: "1つのAPI、適切な摩擦",
    modesSummary:
      "固定モードまたはリスクに応じた自動ステップアップを選べます。",
    modes: [
      ["Managed", "低リスクは非表示、必要な場合のみ操作。"],
      ["Non-interactive", "チェック操作なしで状態を表示。"],
      ["Checkbox", "アクセシブルな明示操作と安全な行動シグナル。"],
      ["ブランド画像", "有料プランで自社画像を方向課題に変換。"],
    ],
    brandTitle: "ブランド素材を安全体験へ",
    brandSummary:
      "正向きの PNG／JPEG／WebP をアップロードすると、安全なランダム回転課題を生成します。",
    brandPoints: [
      "テナントごとに素材を分離",
      "代替説明を必須化",
      "SVGと動的コンテンツを拒否",
      "ポリシーとリスクが必要な場合のみ表示",
    ],
    pricingTitle: "大きな無料枠、わかりやすい料金",
    pricingSummary:
      "カード不要で開始。保持期間、サイト数、ブランド課題、容量をアップグレード。",
    perMonth: "/月",
    perYear: "/年",
    yearly: "年払い",
    choose: "選択",
    currentFree: "無料で開始",
    planNames: ["Free", "Pro", "Scale", "Private Cloud"],
    planFeatures: [
      ["月25万件", "14日ログ", "3サイト", "基本モード"],
      ["月200万件", "90日ログ", "25サイト", "ブランド素材20件"],
      ["月1000万件", "365日ログ", "100サイト", "優先サポート"],
      ["専用環境", "保持期間を設定", "専用容量", "設計支援"],
    ],
    faqTitle: "よくある質問",
    faqs: [
      [
        "マウス軌跡を記録しますか？",
        "いいえ。生の座標ではなく、件数・時間・距離などの集約値だけを送ります。",
      ],
      [
        "ブランド画像課題は？",
        "正向き画像をサーバーがランダム回転し、正しい向きへの復元を検証します。",
      ],
      [
        "トークンは再利用できますか？",
        "できません。短寿命でサイトと操作に結び付き、一度だけ消費されます。",
      ],
      [
        "無料プランの内容は？",
        "月25万件、14日ログ、3サイト、基本認証モードです。",
      ],
      [
        "決済と税務は？",
        "設定後は Creem がチェックアウト、購読管理、MoR を提供します。",
      ],
    ],
    ctaTitle: "最初の重要操作を今日から保護",
    ctaSummary:
      "サイトを作成し、キーをコピーしてサーバーでトークンを検証します。",
    footer: "実用 Web アプリ向けのプライバシー重視ボット対策。",
    metaTitle: "TrustCaptcha — 適応型CAPTCHA・ボット対策・ブランド画像認証",
    metaDescription:
      "月25万件無料、多言語ウィジェット、ブランド画像課題、サーバー検証を備えたプライバシー重視CAPTCHA SaaS。",
  },
  ko: {
    code: "ko-KR",
    direction: "ltr",
    nav: ["제품", "보안", "요금", "FAQ"],
    openConsole: "콘솔 열기",
    eyebrow: "적응형 개인정보 보호 인간 인증",
    hero: ["자동화된 악용은 막고,", "실제 사용자는 계속 이동하게."],
    summary:
      "TrustCaptcha는 최신 웹 앱을 위한 CAPTCHA 및 봇 방어 SaaS입니다. 위험에 따라 마찰을 조정하고 토큰을 작업에 바인딩해 서버에서 검증합니다.",
    tryDemo: "실시간 인증 체험",
    seePricing: "요금 보기",
    proof: [
      "월 25만 요청 무료",
      "원시 마우스 궤적 미전송",
      "서버 검증·일회용 토큰",
    ],
    definition:
      "집계 상호작용 신호, 속도 제한, 적응형 PoW, 선택적 브랜드 이미지 문제, 짧은 수명의 작업 바인딩 토큰을 결합합니다.",
    facts: [
      ["무료 용량", "월 25만"],
      ["언어", "출시 9개 언어"],
      ["보존", "14~3650일"],
      ["결제", "Creem MoR"],
    ],
    modesTitle: "하나의 API, 적절한 수준의 마찰",
    modesSummary: "고정 경험 또는 위험 기반 자동 단계 강화를 선택하세요.",
    modes: [
      ["Managed", "저위험은 보이지 않게, 필요할 때만 상호작용."],
      ["Non-interactive", "체크 클릭 없이 보안 상태 표시."],
      ["Checkbox", "접근 가능한 명시적 동작과 개인정보 보호 신호."],
      ["브랜드 이미지", "유료 플랜에서 자체 이미지를 방향 문제로 변환."],
    ],
    brandTitle: "브랜드 이미지를 보안 순간으로",
    brandSummary:
      "정방향 PNG, JPEG, WebP를 업로드하면 안전한 무작위 회전 문제를 생성합니다.",
    brandPoints: [
      "테넌트별 자산 격리",
      "접근성 설명 필수",
      "SVG 및 활성 콘텐츠 차단",
      "정책과 위험이 요구할 때만 표시",
    ],
    pricingTitle: "넉넉한 무료 보호, 단순한 유료 플랜",
    pricingSummary:
      "카드 없이 시작하고 보존 기간, 사이트, 브랜드 문제와 용량을 확장하세요.",
    perMonth: "/월",
    perYear: "/년",
    yearly: "연간 요금",
    choose: "선택",
    currentFree: "무료 시작",
    planNames: ["무료", "Pro", "Scale", "Private Cloud"],
    planFeatures: [
      ["월 25만", "14일 로그", "3개 사이트", "핵심 모드"],
      ["월 200만", "90일 로그", "25개 사이트", "브랜드 자산 20개"],
      ["월 1,000만", "365일 로그", "100개 사이트", "우선 지원"],
      ["전용 배포", "보존 설정", "전용 용량", "아키텍처 지원"],
    ],
    faqTitle: "자주 묻는 질문",
    faqs: [
      [
        "마우스 궤적을 기록하나요?",
        "아니요. 원시 좌표 대신 이벤트 수, 시간, 거리 등의 제한된 집계값만 전송합니다.",
      ],
      [
        "브랜드 이미지 문제는 어떻게 만드나요?",
        "정방향 이미지를 서버가 무작위 회전하고 올바른 방향 복원을 검증합니다.",
      ],
      [
        "토큰을 재사용할 수 있나요?",
        "아니요. 짧은 수명, 사이트·작업 바인딩, 원자적 1회 사용입니다.",
      ],
      [
        "무료 플랜은?",
        "월 25만 요청, 14일 로그, 3개 사이트, 핵심 모드를 제공합니다.",
      ],
      [
        "결제와 세금은?",
        "설정 후 Creem이 결제, 구독 관리 및 MoR 서비스를 제공합니다.",
      ],
    ],
    ctaTitle: "오늘 첫 번째 중요 작업을 보호하세요",
    ctaSummary:
      "사이트를 만들고 키를 복사한 뒤 서버에서 토큰을 강제 검증하세요.",
    footer: "실제 웹 앱을 위한 개인정보 보호 봇 방어.",
    metaTitle: "TrustCaptcha — 적응형 CAPTCHA·봇 방어·브랜드 이미지 인증",
    metaDescription:
      "월 25만 무료 요청, 다국어 위젯, 브랜드 이미지 문제와 서버 검증을 제공하는 개인정보 보호 CAPTCHA SaaS.",
  },
  es: makeEuropean("es"),
  "pt-BR": makeEuropean("pt-BR"),
  de: makeEuropean("de"),
  fr: makeEuropean("fr"),
};

function makeEuropean(locale: "es" | "pt-BR" | "de" | "fr"): Dictionary {
  const values = {
    es: {
      code: "es-ES",
      nav: ["Producto", "Seguridad", "Precios", "Preguntas"],
      open: "Abrir consola",
      eyebrow: "Verificación humana adaptativa y privada",
      hero: ["Detén el abuso automatizado.", "Deja avanzar a las personas."],
      summary:
        "TrustCaptcha es un SaaS de CAPTCHA y protección contra bots que adapta la fricción al riesgo, vincula cada token a una acción y lo valida en el servidor.",
      demo: "Probar verificación",
      pricing: "Ver precios",
      modes: "Una API, la fricción adecuada",
      brand: "Convierte tu marca en un momento de seguridad",
      priceTitle: "Protección gratuita generosa y planes simples",
      faq: "Preguntas frecuentes",
      cta: "Protege hoy tu primera acción",
      footer: "Protección privada contra bots para aplicaciones reales.",
    },
    "pt-BR": {
      code: "pt-BR",
      nav: ["Produto", "Segurança", "Preços", "Dúvidas"],
      open: "Abrir console",
      eyebrow: "Verificação humana adaptativa e privada",
      hero: ["Pare o abuso automatizado.", "Mantenha pessoas reais avançando."],
      summary:
        "TrustCaptcha é um SaaS de CAPTCHA e proteção contra bots que adapta o atrito ao risco, vincula tokens à ação e valida tudo no servidor.",
      demo: "Testar verificação",
      pricing: "Ver preços",
      modes: "Uma API, o nível certo de atrito",
      brand: "Transforme sua marca em um momento de segurança",
      priceTitle: "Proteção gratuita generosa e planos simples",
      faq: "Perguntas frequentes",
      cta: "Proteja sua primeira ação hoje",
      footer: "Proteção privada contra bots para aplicações reais.",
    },
    de: {
      code: "de-DE",
      nav: ["Produkt", "Sicherheit", "Preise", "FAQ"],
      open: "Konsole öffnen",
      eyebrow: "Adaptive, datenschutzfreundliche Verifizierung",
      hero: [
        "Automatisierten Missbrauch stoppen.",
        "Echte Menschen weiterbringen.",
      ],
      summary:
        "TrustCaptcha ist ein CAPTCHA- und Bot-Schutz-SaaS, das Reibung an Risiken anpasst, Tokens an Aktionen bindet und serverseitig prüft.",
      demo: "Live-Verifizierung testen",
      pricing: "Preise ansehen",
      modes: "Eine API, die richtige Reibung",
      brand: "Markenmaterial wird zum Sicherheitsmoment",
      priceTitle: "Großzügiger Gratis-Schutz, einfache Pläne",
      faq: "Häufige Fragen",
      cta: "Schützen Sie heute Ihre erste Aktion",
      footer: "Datenschutzfreundlicher Bot-Schutz für echte Web-Apps.",
    },
    fr: {
      code: "fr-FR",
      nav: ["Produit", "Sécurité", "Tarifs", "FAQ"],
      open: "Ouvrir la console",
      eyebrow: "Vérification humaine adaptative et respectueuse",
      hero: [
        "Stoppez les abus automatisés.",
        "Laissez avancer les vraies personnes.",
      ],
      summary:
        "TrustCaptcha est un SaaS CAPTCHA et anti-bot qui adapte la friction au risque, lie chaque jeton à une action et le vérifie côté serveur.",
      demo: "Tester la vérification",
      pricing: "Voir les tarifs",
      modes: "Une API, le bon niveau de friction",
      brand: "Transformez votre marque en moment de sécurité",
      priceTitle: "Protection gratuite généreuse, offres simples",
      faq: "Questions fréquentes",
      cta: "Protégez votre première action aujourd’hui",
      footer: "Protection anti-bot respectueuse pour les applications réelles.",
    },
  }[locale];
  return {
    code: values.code,
    direction: "ltr",
    nav: values.nav as [string, string, string, string],
    openConsole: values.open,
    eyebrow: values.eyebrow,
    hero: values.hero as [string, string],
    summary: values.summary,
    tryDemo: values.demo,
    seePricing: values.pricing,
    proof:
      locale === "de"
        ? [
            "250.000 Gratis-Anfragen/Monat",
            "Keine Rohdaten der Mausspur",
            "Servergeprüfte Einmal-Tokens",
          ]
        : locale === "fr"
          ? [
              "250 000 requêtes gratuites/mois",
              "Aucune trajectoire brute",
              "Jetons uniques vérifiés serveur",
            ]
          : locale === "pt-BR"
            ? [
                "250 mil requisições grátis/mês",
                "Sem trilhas brutas do mouse",
                "Tokens únicos no servidor",
              ]
            : [
                "250.000 solicitudes gratis/mes",
                "Sin trayectorias brutas",
                "Tokens únicos verificados en servidor",
              ],
    definition:
      values.summary +
      " Incluye modos administrado, invisible, casilla, no interactivo y desafíos visuales de marca.",
    facts: [
      ["Free", "250K / month"],
      ["Languages", "9"],
      ["Retention", "14–3,650 days"],
      ["Payments", "Creem MoR"],
    ],
    modesTitle: values.modes,
    modesSummary: values.summary,
    modes: [
      ["Managed", "Low risk stays invisible; suspicious traffic steps up."],
      ["Non-interactive", "Visible security status without a checkbox click."],
      ["Checkbox", "Accessible explicit verification."],
      ["Branded visual", "Your artwork becomes an orientation challenge."],
    ],
    brandTitle: values.brand,
    brandSummary: values.summary,
    brandPoints: [
      "Tenant-isolated assets",
      "Accessible description required",
      "SVG is rejected",
      "Only shown when policy requires it",
    ],
    pricingTitle: values.priceTitle,
    pricingSummary: values.summary,
    perMonth: "/mo",
    perYear: "/year",
    yearly: "Annual",
    choose: "Choose",
    currentFree: "Start free",
    planNames: ["Free", "Pro", "Scale", "Private Cloud"],
    planFeatures: [
      ["250K requests", "14-day logs", "3 sites", "Core modes"],
      ["2M requests", "90-day logs", "25 sites", "20 brand assets"],
      ["10M requests", "365-day logs", "100 sites", "Priority support"],
      [
        "Private deployment",
        "Configurable retention",
        "Dedicated capacity",
        "Architecture support",
      ],
    ],
    faqTitle: values.faq,
    faqs: [
      [
        "Does it record the full mouse trail?",
        "No. Only bounded aggregate signals are sent, never raw coordinates.",
      ],
      [
        "How are branded challenges created?",
        "The server randomly rotates an uploaded upright image and validates its restored orientation.",
      ],
      [
        "Can tokens be reused?",
        "No. Tokens are short-lived, action-bound and atomically consumed once.",
      ],
      [
        "What is included for free?",
        "250,000 monthly requests, 14-day logs, three sites and core modes.",
      ],
      [
        "Who handles payment?",
        "Creem provides checkout, subscriptions and merchant-of-record services when configured.",
      ],
    ],
    ctaTitle: values.cta,
    ctaSummary: values.summary,
    footer: values.footer,
    metaTitle: `TrustCaptcha — CAPTCHA adaptativo, protección anti-bot y desafíos de marca`,
    metaDescription: values.summary,
  };
}

export function isMarketingLocale(value: string): value is MarketingLocale {
  return marketingLocales.includes(value as MarketingLocale);
}
