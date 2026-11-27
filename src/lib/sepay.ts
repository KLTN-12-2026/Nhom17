import { connectDB } from "@/lib/db";
import { extractOrderCodeFromText } from "@/lib/vietqr";
import { LearningProgress, Order, type IOrder } from "@/models";

interface SePayTransaction {
  id?: string | number;
  account_number?: string;
  amount_in?: string | number;
  transaction_content?: string;
  code?: string | null;
}

interface SePayTransactionsResponse {
  status?: number;
  transactions?: SePayTransaction[];
}

export async function completePendingOrder(order: IOrder) {
  if (order.status === "completed") return;
  order.status = "completed";
  order.paid_at = new Date();
  await order.save();

  await LearningProgress.updateOne(
    { user_id: order.user_id, roadmap_id: order.roadmap_id },
    {
      $setOnInsert: {
        user_id: order.user_id,
        roadmap_id: order.roadmap_id,
        completion_percentage: 0,
        completed_content_ids: [],
        last_activity_at: new Date(),
      },
    },
    { upsert: true },
  );
}

/**
 * Đối soát trực tiếp giao dịch tiền vào qua SePay User API (hoạt động trên localhost không cần ngrok).
 */
export async function syncPendingOrderFromSePay(orderId: string): Promise<{
  synced: boolean;
  configured: boolean;
}> {
  const apiToken = process.env.SEPAY_API_TOKEN?.trim() || "";
  if (!apiToken) {
    return { synced: false, configured: false };
  }

  await connectDB();
  const order = await Order.findById(orderId);
  if (!order) {
    return { synced: false, configured: true };
  }
  if (order.status === "completed") {
    return { synced: true, configured: true };
  }
  if (order.status !== "pending") {
    return { synced: false, configured: true };
  }

  const query = new URLSearchParams({ limit: "20" });
  const accountNo = process.env.VIETQR_ACCOUNT_NO?.trim();
  if (accountNo) {
    query.set("account_number", accountNo);
  }

  try {
    const response = await fetch(`https://my.sepay.vn/userapi/transactions/list?${query.toString()}`, {
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      return { synced: false, configured: true };
    }

    const payload = (await response.json()) as SePayTransactionsResponse;
    const transactions = Array.isArray(payload.transactions) ? payload.transactions : [];

    for (const tx of transactions) {
      const amountIn = Number(tx.amount_in || 0);
      if (amountIn < order.amount) continue;

      const matchedCode =
        extractOrderCodeFromText(tx.code || "") ||
        extractOrderCodeFromText(tx.transaction_content || "");

      if (matchedCode === order.order_code) {
        await completePendingOrder(order);
        return { synced: true, configured: true };
      }
    }

    return { synced: false, configured: true };
  } catch (error) {
    console.error("SePay API sync error:", error);
    return { synced: false, configured: true };
  }
}
