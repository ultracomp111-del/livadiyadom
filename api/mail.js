// Ключ Web3Forms из .env (Vite вставит его сюда при сборке)
const ACCESS_KEY = import.meta.env.VITE_WEB3FORMS_KEY;

// Основная функция отправки
export async function sendTelegramMessage(formData) {
  if (!ACCESS_KEY) {
    console.error('Ошибка: Ключ Web3Forms не найден в .env');
    return { success: false, message: '❌ Ошибка конфигурации. Ключ не найден.' };
  }

  const { name, phone, checkIn, checkOut, guests, totalPrice, message } = formData;

  if (!name || !phone) {
    return { success: false, message: '❌ Имя и телефон обязательны' };
  }

  // Готовим данные для отправки. 
  // Web3Forms сам соберет эти поля в красивую таблицу в письме.
  const payload = {
    access_key: ACCESS_KEY,
    subject: `🏠 Новая заявка на бронь от: ${name}`,
    from_name: "Ливадия Дом",
    "Имя": name,
    "Телефон": phone,
    "Кол-во гостей": guests || '1',
    "Дата заезда": checkIn || 'Не указана',
    "Дата выезда": checkOut || 'Не указана',
    "Итоговая стоимость": totalPrice,
    "Сообщение": message || 'Не указано'
  };

  try {
    const response = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (data.success) {
      return { success: true, message: '✅ Спасибо! Ваша заявка отправлена. Мы скоро свяжемся.' };
    } else {
      console.error('Web3Forms API Error:', data);
      return { success: false, message: `❌ Ошибка: ${data.message || 'Не удалось отправить'}` };
    }
  } catch (error) {
    console.error('Fetch/Network Error:', error);
    return { success: false, message: '❌ Ошибка при отправке. Проверьте интернет.' };
  }
}