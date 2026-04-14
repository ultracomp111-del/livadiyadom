// api/telegram.js

// Токены из .env (Vite вставит их сюда при сборке)
const TOKEN = import.meta.env.VITE_BOT_TOKEN;
const CHAT_ID = import.meta.env.VITE_CHAT_ID;

// Вспомогательная функция для экранирования HTML (Безопасность)
function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Основная функция отправки
export async function sendTelegramMessage(formData) {
  if (!TOKEN || !CHAT_ID) {
    console.error('Ошибка: Токены Telegram не найдены в .env');
    return { success: false, message: '❌ Ошибка конфигурации. Токены не найдены.' };
  }

  const { name, phone, checkIn, checkOut, guests, totalPrice, message } = formData;

  if (!name || !phone) {
    return { success: false, message: '❌ Имя и телефон обязательны' };
  }

  // Форматируем сообщение
  const telegramMessage = `
📝 <b>НОВАЯ ЗАЯВКА НА БРОНЬ!</b>

👤 <b>Имя:</b> ${escapeHtml(name)}
📱 <b>Телефон:</b> <code>${phone}</code>
🔢 <b>Кол-во гостей:</b> ${guests || '1'}
📅 <b>Дата заезда:</b> ${checkIn || 'Не указана'}
📅 <b>Дата выезда:</b> ${checkOut || 'Не указана'}
💰 <b>Итоговая стоимость:</b> <b>${escapeHtml(totalPrice)}</b>
💬 <b>Сообщение:</b> ${message ? escapeHtml(message) : 'Не указано'}
  `.trim();

  const telegramUrl = `https://api.telegram.org/bot${TOKEN}/sendMessage`;

  try {
    const response = await fetch(telegramUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: telegramMessage,
        parse_mode: 'HTML'
      })
    });

    const data = await response.json();

    if (data.ok) {
      return { success: true, message: '✅ Спасибо! Ваша заявка отправлена. Мы скоро свяжемся.' };
    } else {
      console.error('Telegram API Error:', data);
      return { success: false, message: `❌ Ошибка: ${data.description || 'Не удалось отправить'}` };
    }
  } catch (error) {
    console.error('Fetch/Network Error:', error);
    return { success: false, message: '❌ Ошибка при отправке. Проверьте интернет.' };
  }
}