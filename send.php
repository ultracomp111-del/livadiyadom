<?php
// Получаем токены из переменных окружения сервера Webtime
$token = getenv('VITE_BOT_TOKEN'); 
$chat_id = getenv('VITE_CHAT_ID');

if (!$token || !$chat_id) {
    header('Content-Type: application/json');
    echo json_encode(['ok' => false, 'description' => 'Ошибка: Токены не найдены на сервере']);
    exit;
}

$input = file_get_contents('php://input');
$data = json_decode($input, true);

if ($data) {
    // Функция для экранирования (как в твоем JS)
    function escapeHtml($text) {
        return htmlspecialchars($text ?? '', ENT_QUOTES, 'UTF-8');
    }

    // Собираем переменные
    $name = escapeHtml($data['name']);
    $phone = escapeHtml($data['phone']);
    $guests = escapeHtml($data['guests'] ?: '1');
    $checkIn = escapeHtml($data['checkIn'] ?: 'Не указана');
    $checkOut = escapeHtml($data['checkOut'] ?: 'Не указана');
    $totalPrice = escapeHtml($data['totalPrice']);
    
    // Обработка пустого сообщения
    $messageRaw = escapeHtml($data['message']);
    $messageText = $messageRaw ? $messageRaw : 'Не указано';

    // Твое точное форматирование
    $telegramMessage = "📝 <b>НОВАЯ ЗАЯВКА НА БРОНЬ!</b>\n\n"
                     . "👤 <b>Имя:</b> {$name}\n"
                     . "📱 <b>Телефон:</b> <code>{$phone}</code>\n"
                     . "🔢 <b>Кол-во гостей:</b> {$guests}\n"
                     . "📅 <b>Дата заезда:</b> {$checkIn}\n"
                     . "📅 <b>Дата выезда:</b> {$checkOut}\n"
                     . "💰 <b>Итоговая стоимость:</b> <b>{$totalPrice}</b>\n"
                     . "💬 <b>Сообщение:</b> {$messageText}";

    $url = "https://api.telegram.org/bot{$token}/sendMessage";
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query([
        'chat_id' => $chat_id,
        'text' => $telegramMessage,
        'parse_mode' => 'HTML'
    ]));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    
    $result = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    header('Content-Type: application/json');
    if ($httpCode == 200) {
        echo $result; // Передаем успешный ответ Телеграма обратно на фронтенд
    } else {
        echo json_encode(['ok' => false, 'description' => 'Telegram API Error']);
    }
}
?>