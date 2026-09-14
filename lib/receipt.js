import { calcDiscount } from "./discount";

// Draws a downloadable PNG receipt for an order. Used both right after
// checkout and later from order history, so it lives here instead of inside
// one component.
export function drawReceipt(order, items, deliveryCharge) {
  const canvas = document.createElement("canvas");
  const W = 640, LINE = 30;
  const rows = items.length + 5;
  const H = 320 + rows * LINE;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#3D6B54";
  ctx.fillRect(0, 0, W, 8);

  let y = 60;
  ctx.fillStyle = "#17181B";
  ctx.font = "bold 26px sans-serif";
  ctx.fillText("Edeals NP", 40, y);
  ctx.font = "13px sans-serif";
  ctx.fillStyle = "#63666B";
  ctx.fillText("Order confirmation", 40, y + 22);

  y += 60;
  ctx.strokeStyle = "#E7E7E3";
  ctx.beginPath(); ctx.moveTo(40, y); ctx.lineTo(W - 40, y); ctx.stroke();

  y += 40;
  ctx.fillStyle = "#63666B";
  ctx.font = "12px sans-serif";
  ctx.fillText("ORDER NUMBER", 40, y);
  y += 32;
  ctx.fillStyle = "#17181B";
  ctx.font = "bold 28px monospace";
  ctx.fillText(order.order_number, 40, y);

  y += 34;
  ctx.font = "12px sans-serif";
  ctx.fillStyle = "#63666B";
  ctx.fillText(order.created_at ? new Date(order.created_at).toLocaleString() : new Date().toLocaleString(), 40, y);

  y += 40;
  ctx.beginPath(); ctx.moveTo(40, y); ctx.lineTo(W - 40, y); ctx.stroke();

  y += 34;
  ctx.fillStyle = "#17181B";
  ctx.font = "bold 13px sans-serif";
  ctx.fillText("ITEMS", 40, y);
  y += 26;
  ctx.font = "14px sans-serif";
  items.forEach((i) => {
    ctx.fillStyle = "#17181B";
    ctx.fillText(`${i.name} × ${i.qty}`, 40, y);
    ctx.textAlign = "right";
    ctx.fillText(`रु ${(i.price * i.qty).toLocaleString("en-IN")}`, W - 40, y);
    ctx.textAlign = "left";
    y += LINE;
  });

  ctx.fillStyle = "#63666B";
  ctx.fillText("Delivery", 40, y);
  ctx.textAlign = "right";
  ctx.fillText(`रु ${deliveryCharge}`, W - 40, y);
  ctx.textAlign = "left";
  y += LINE;

  const discount = calcDiscount(items);
  if (discount > 0) {
    ctx.fillStyle = "#63666B";
    ctx.fillText("Discount", 40, y);
    ctx.textAlign = "right";
    ctx.fillText(`− रु ${discount.toLocaleString("en-IN")}`, W - 40, y);
    ctx.textAlign = "left";
    y += LINE;
  }
  y += 6;

  ctx.strokeStyle = "#17181B";
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(40, y - 20); ctx.lineTo(W - 40, y - 20); ctx.stroke();
  ctx.lineWidth = 1;

  ctx.font = "bold 20px sans-serif";
  ctx.fillStyle = "#17181B";
  ctx.fillText("Total", 40, y);
  const total = items.reduce((s, i) => s + i.price * i.qty, 0) + deliveryCharge;
  ctx.textAlign = "right";
  ctx.fillText(`रु ${total.toLocaleString("en-IN")}`, W - 40, y);
  ctx.textAlign = "left";

  y += 44;
  ctx.font = "12px sans-serif";
  ctx.fillStyle = "#A0A2A6";
  ctx.fillText("Track this order in My Orders on the store's website.", 40, y);

  return canvas;
}

export function downloadReceipt(order, items, deliveryCharge) {
  const canvas = drawReceipt(order, items, deliveryCharge);
  canvas.toBlob((blob) => {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${order.order_number}-receipt.png`;
    link.click();
    URL.revokeObjectURL(link.href);
  });
}
