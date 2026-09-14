const fmt = (n) => `रु ${Number(n).toLocaleString("en-IN")}`;

function itemsToText(items) {
  return items.map((i) => `• ${i.name} (${i.size}) × ${i.qty} — ${fmt(i.price * i.qty)}`).join("\n");
}

// ---------- Email (Resend) ----------
// Needs RESEND_API_KEY + RESEND_FROM env vars. Silently skipped if not set,
// so orders still work even before you wire up email.
export async function sendOrderEmail(order) {
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM) return { skipped: true };

  const itemsHtml = order.items
    .map((i) => `<tr><td style="padding:6px 0;">${i.name} (${i.size}) × ${i.qty}</td><td style="text-align:right;">${fmt(i.price * i.qty)}</td></tr>`)
    .join("");

  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:auto;">
      <h2>Order confirmed — ${order.order_number}</h2>
      <p>Hi ${order.full_name}, thanks for your order! Here's a summary:</p>
      <table style="width:100%;border-collapse:collapse;">${itemsHtml}
        <tr><td style="padding-top:10px;">Delivery</td><td style="text-align:right;padding-top:10px;">${fmt(order.delivery_charge)}</td></tr>
        <tr><td style="font-weight:bold;padding-top:10px;border-top:2px solid #17181B;">Total</td><td style="text-align:right;font-weight:bold;padding-top:10px;border-top:2px solid #17181B;">${fmt(order.total)}</td></tr>
      </table>
      <p style="margin-top:20px;">Delivering to: ${order.address}, ${order.city}<br>Payment: ${order.payment_method === "cod" ? "Cash on delivery" : "QR payment"}</p>
      <p style="color:#666;font-size:13px;">Track this order anytime with order number <b>${order.order_number}</b> and your phone number.</p>
    </div>`;

  const recipients = [order.email, process.env.STORE_EMAIL].filter(Boolean);

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM,
        to: recipients,
        subject: `Edeals NP — order ${order.order_number} confirmed`,
        html,
      }),
    });
    return { sent: true };
  } catch (err) {
    console.error("sendOrderEmail failed:", err);
    return { error: err.message };
  }
}

// ---------- WhatsApp (Meta WhatsApp Cloud API) ----------
// Needs WHATSAPP_PHONE_NUMBER_ID + WHATSAPP_ACCESS_TOKEN env vars, from a
// Meta developer app with the WhatsApp product added. Outside a 24-hour
// customer-initiated window, WhatsApp requires a pre-approved message
// template rather than free-form text — set WHATSAPP_TEMPLATE_NAME once
// you've created and approved one in Meta Business Manager. Until both are
// configured, this is skipped and the order still goes through normally
// ("if available", as requested).
async function sendWhatsAppMessage(toNumber, text, templateParams) {
  const { WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN, WHATSAPP_TEMPLATE_NAME } = process.env;
  if (!WHATSAPP_PHONE_NUMBER_ID || !WHATSAPP_ACCESS_TOKEN) return { skipped: true };

  const digits = toNumber.replace(/\D/g, "");
  const fullNumber = digits.startsWith("977") ? digits : `977${digits}`;

  const body = WHATSAPP_TEMPLATE_NAME
    ? {
        messaging_product: "whatsapp",
        to: fullNumber,
        type: "template",
        template: {
          name: WHATSAPP_TEMPLATE_NAME,
          language: { code: "en" },
          components: [{ type: "body", parameters: templateParams.map((t) => ({ type: "text", text: t })) }],
        },
      }
    : {
        // Free-form text only works if that number messaged your WhatsApp
        // business number in the last 24 hours — fine for testing, not
        // reliable for every recipient until a template is approved.
        messaging_product: "whatsapp",
        to: fullNumber,
        type: "text",
        text: { body: text },
      };

  try {
    const res = await fetch(`https://graph.facebook.com/v20.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error("sendWhatsAppMessage failed:", errText);
      return { error: errText };
    }
    return { sent: true };
  } catch (err) {
    console.error("sendWhatsAppMessage failed:", err);
    return { error: err.message };
  }
}

// Confirmation to the customer (only reaches them without a template if
// they've messaged your business number in the last 24 hours — see above).
export async function sendOrderWhatsApp(order) {
  if (!order.phone) return { skipped: true };
  const text = `Edeals NP — order ${order.order_number} confirmed!\n\n${itemsToText(order.items)}\n\nTotal: ${fmt(order.total)}\nDelivering to: ${order.address}, ${order.city}`;
  return sendWhatsAppMessage(order.phone, text, [order.order_number, fmt(order.total)]);
}

// New-order alert to the store owner's own WhatsApp — needs
// STORE_WHATSAPP_NUMBER set (e.g. 9779845522014). Uses free-form text since
// it's your own number messaging you; no template needed for this one.
export async function sendStoreOrderAlert(order) {
  if (!process.env.STORE_WHATSAPP_NUMBER) return { skipped: true };
  const text = `New order ${order.order_number} — ${fmt(order.total)}\n${order.full_name} · ${order.phone}\n${order.city}\n\n${itemsToText(order.items)}`;
  return sendWhatsAppMessage(process.env.STORE_WHATSAPP_NUMBER, text, [order.order_number, fmt(order.total)]);
}
