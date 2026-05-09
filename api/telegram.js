// api/telegram.js

export async function sendTelegramMessage(formData) {
  try {
    // Отправляем данные на наш PHP-файл
    const response = await fetch('/send.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    const data = await response.json();

    if (data.ok) {
      return { success: true, message: '✅ Спасибо! Ваша заявка отправлена. Мы скоро свяжемся.' };
    } else {
      console.error('Server Error:', data);
      return { success: false, message: '❌ Ошибка на сервере. Не удалось отправить.' };
    }
  } catch (error) {
    console.error('Fetch Error:', error);
    return { success: false, message: '❌ Ошибка сети. Проверьте интернет.' };
  }
}