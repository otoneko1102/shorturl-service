const errorMessages = {
  unknown: "不明なエラーが発生しました。",
  // Custom Error Messages
  CAPTCHA_MISSING: "CAPTCHA情報が不足しています",
  CAPTCHA_INVALID_TOKEN: "無効なCAPTCHAトークンです",
  CAPTCHA_EXPIRED: "CAPTCHAの有効期限が切れています",
  CAPTCHA_FAILED: "CAPTCHAの認証に失敗しました",
  URL_REQUIRED: "URLは必須です",
  URL_INVALID_FORMAT: "無効なURL形式です",
  URL_BANNED: "このURLは短縮できません",
  ALIAS_INVALID_CHARACTERS: "カスタムIDに無効な文字が含まれています",
  ALIAS_BANNED: "このカスタムIDは利用できません",
  ALIAS_ALREADY_EXISTS: "このカスタムIDは既に使用されています",
  DATABASE_INSERT_FAILED: "短縮リンクの作成に失敗しました",
  INTERNAL_SERVER_ERROR: "サーバー内部でエラーが発生しました",
};

export default errorMessages;
