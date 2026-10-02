import { saveOnce } from "./store.mjs";

export function submit(request, store) {
  const id = typeof request.id === "string" ? request.id.trim() : "";
  if (!id) return { status: 400, error: "id is required" };
  if (!Number.isInteger(request.amount) || request.amount <= 0) {
    return { status: 400, error: "amount must be a positive integer" };
  }
  return saveOnce(store, { id, amount: request.amount });
}
