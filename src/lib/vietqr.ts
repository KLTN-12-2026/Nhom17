export interface VietQrInfo {
  bank_id: string;
  account_no: string;
  account_name: string;
  transfer_content: string;
  amount: number;
  qr_url: string;
}

export function getVietQrConfig() {
  const bankId = process.env.VIETQR_BANK_ID?.trim() || "";
  const accountNo = process.env.VIETQR_ACCOUNT_NO?.trim() || "";
  const accountName = process.env.VIETQR_ACCOUNT_NAME?.trim() || "";
  const template = process.env.VIETQR_TEMPLATE?.trim() || "compact2";

  if (!bankId || !accountNo) {
    return null;
  }

  return { bankId, accountNo, accountName, template };
}

export function buildVietQrInfo(params: {
  amount: number;
  orderCode: string;
}): VietQrInfo | null {
  const config = getVietQrConfig();
  if (!config || params.amount <= 0) {
    return null;
  }

  const query = new URLSearchParams({
    amount: String(Math.round(params.amount)),
    addInfo: params.orderCode,
  });
  if (config.accountName) {
    query.set("accountName", config.accountName);
  }

  const qrUrl = `https://img.vietqr.io/image/${encodeURIComponent(config.bankId)}-${encodeURIComponent(config.accountNo)}-${encodeURIComponent(config.template)}.png?${query.toString()}`;

  return {
    bank_id: config.bankId,
    account_no: config.accountNo,
    account_name: config.accountName,
    transfer_content: params.orderCode,
    amount: params.amount,
    qr_url: qrUrl,
  };
}

/**
 * Trích xuất mã đơn hàng dạng RD... từ nội dung chuyển khoản ngân hàng.
 */
export function extractOrderCodeFromText(text: string): string | null {
  if (!text) return null;
  const match = text.toUpperCase().match(/\b(?:RD|RM)[A-Z0-9]{6,24}\b/);
  return match ? match[0] : null;
}
