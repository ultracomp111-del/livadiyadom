import { sendTelegramMessage } from './api/telegram.js';

// ==========================================
// ПАНЕЛЬ УПРАВЛЕНИЯ КАЛЕНДАРЕМ 
// ==========================================
const MY_BOOKINGS = {
    // Базовая цена за сутки
    defaultPrice: "3500₽", 
    
    // МЕСЯЦЫ, КОГДА ТЫ СДАЕШЬ (5 - Май, 6 - Июнь и т.д.)
    availableMonths: [5, 6, 7, 8, 9, 10],

    // Цены по месяцам
    monthlyPrices: {
        5: "3500₽", 6: "4000₽", 7: "4500₽", 8: "5000₽", 9: "3500₽", 10: "3000₽"
    },

    // Праздники или особые цены на конкретные дни
    specialPrices: {
        "2026-05-01": "5000₽",
        "2026-05-09": "5000₽",
        "2026-06-12": "4500₽"
    },
    
    // 1. НОВЫЙ РАЗДЕЛ: ЗАНЯТЫЕ МЕСЯЦЫ ПОЛНОСТЬЮ
    bookedFullMonths: [7, 8], 

    // 2. ЗАНЯТЫЕ ОТДЕЛЬНЫЕ ДАТЫ
    bookedDates: [
        "2026-05-10", "2026-05-11", "2026-06-15"
    ]
};
// ==========================================

// ==========================================
// ОТПРАВКА ЗАЯВКИ
// ==========================================

// Обработчик формы бронирования
function setupBookingForm() {
    const form = document.getElementById('booking-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Отправляю...';

        const formData = {
            name: form.querySelector('[name="name"]')?.value?.trim() || '',
            guests: form.querySelector('[name="guests"]')?.value || '1',
            phone: form.querySelector('[name="phone"]')?.value?.trim() || '',
            checkIn: form.querySelector('[name="date_start"]')?.value || '',
            checkOut: form.querySelector('[name="date_end"]')?.value || '',
            message: form.querySelector('[name="wishes"]')?.value?.trim() || ''
        };

        console.log('📤 Отправляемые данные в Telegram:', formData);

        if (!formData.name || !formData.phone) {
            alert('Пожалуйста, заполните имя и телефон');
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
            return;
        }

        // Вызываем импортированную функцию из telegram.js
        const result = await sendTelegramMessage(formData);
        alert(result.message);

        if (result.success) {
            form.reset();
        }

        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    });
}

// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    setupBookingForm();

    // === SMART STICKY HEADER LOGIC ===
    const header = document.querySelector('.header');
    if (header) {
        let scrollPauseTimeout;
        const HIDE_DELAY = 1500; // 1.5 секунды до исчезновения

        window.addEventListener('scroll', () => {
            let scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            
            // 1. При ЛЮБОМ движении скролла сразу показываем меню
            header.classList.remove('header--hidden');
            
            // 2. Сбрасываем предыдущий таймер
            clearTimeout(scrollPauseTimeout);
            
            // 3. Запускаем таймер заново. Если скролл не трогают 1.5 сек - прячем
            if (scrollTop > 50) { // Не прячем, если мы в самом начале страницы
                scrollPauseTimeout = setTimeout(() => {
                    header.classList.add('header--hidden');
                }, HIDE_DELAY);
            }
        });
    }

    // === ЛОГИКА КАЛЕНДАРЯ ===
    const calDaysContainer = document.getElementById('calendar-days');
    const monthYearDisplay = document.getElementById('cal-month-year');
    const prevBtn = document.getElementById('cal-prev');
    const nextBtn = document.getElementById('cal-next');

    if (calDaysContainer) {
        let currentDate = new Date();
        let currentMonth = currentDate.getMonth() + 1; // 1-12
        let currentYear = currentDate.getFullYear();

        if (!MY_BOOKINGS.availableMonths.includes(currentMonth)) {
            currentMonth = MY_BOOKINGS.availableMonths[0];
        }

        const monthNames = ["", "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];

        function renderCalendar(month, year) {
            calDaysContainer.innerHTML = "";
            monthYearDisplay.textContent = `${monthNames[month]} ${year}`;

            let firstDay = new Date(year, month - 1, 1).getDay();
            firstDay = firstDay === 0 ? 6 : firstDay - 1; 

            const daysInMonth = new Date(year, month, 0).getDate();

            for (let i = 0; i < firstDay; i++) {
                const emptyDiv = document.createElement('div');
                emptyDiv.classList.add('cal-day', 'empty');
                calDaysContainer.appendChild(emptyDiv);
            }

            for (let i = 1; i <= daysInMonth; i++) {
                const dayDiv = document.createElement('div');
                dayDiv.classList.add('cal-day');
                
                const dateString = `${year}-${String(month).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
                const isMonthBooked = MY_BOOKINGS.bookedFullMonths && MY_BOOKINGS.bookedFullMonths.includes(month);
                const isDayBooked = MY_BOOKINGS.bookedDates.includes(dateString);
                const isBooked = isMonthBooked || isDayBooked;

                const price = MY_BOOKINGS.specialPrices[dateString] || MY_BOOKINGS.monthlyPrices[month] || MY_BOOKINGS.defaultPrice;

                if (isBooked) {
                    dayDiv.classList.add('booked');
                    // Добавляем пустой span для цены, чтобы высота ячейки не менялась
                    dayDiv.innerHTML = `<span>${i}</span><span class="price"></span>`;
                } else {
                    dayDiv.classList.add('free');
                    dayDiv.innerHTML = `<span>${i}</span><span class="price">${price}</span>`;
                }
                calDaysContainer.appendChild(dayDiv);
            }
        }

        renderCalendar(currentMonth, currentYear);

        prevBtn.addEventListener('click', () => {
            let targetMonth = currentMonth - 1;
            let targetYear = currentYear;
            if (targetMonth < 1) { targetMonth = 12; targetYear--; }
            
            if (MY_BOOKINGS.availableMonths.includes(targetMonth)) {
                currentMonth = targetMonth;
                currentYear = targetYear;
                renderCalendar(currentMonth, currentYear);
            }
        });

        nextBtn.addEventListener('click', () => {
            let targetMonth = currentMonth + 1;
            let targetYear = currentYear;
            if (targetMonth > 12) { targetMonth = 1; targetYear++; }
            
            if (MY_BOOKINGS.availableMonths.includes(targetMonth)) {
                currentMonth = targetMonth;
                currentYear = targetYear;
                renderCalendar(currentMonth, currentYear);
            }
        });
    }

    // === ЛОГИКА ГАЛЕРЕИ ===
    const carousels = document.querySelectorAll('[data-carousel]');
    const fsOverlay = document.getElementById('fs-overlay');
    const fsImg = document.getElementById('fs-img');
    const fsPrev = document.getElementById('fs-prev');
    const fsNext = document.getElementById('fs-next');
    
    let activeImages = [];
    let activeIndex = 0;

    carousels.forEach(carousel => {
        const type = carousel.dataset.carousel;
        const mainImg = carousel.querySelector('[data-main-img]');
        const thumbContainer = carousel.querySelector('[data-thumbs]');
        const countEl = carousel.querySelector('[data-count]');
        
        let localImages = [];
        let localIndex = 0;

        if (type === 'home') {
            localImages = Array.from({ length: 20 }, (_, i) => `photo/${String(i + 1).padStart(2, "0")}.jpg`);
            if(thumbContainer) {
                thumbContainer.innerHTML = '';
                localImages.forEach((src, idx) => {
                    const img = document.createElement('img');
                    img.src = src;
                    img.className = `thumb-img ${idx === 0 ? 'active' : ''}`;
                    img.onclick = () => update(idx);
                    thumbContainer.appendChild(img);
                });
            }
        } else {
            localImages = Array.from(carousel.querySelectorAll('.thumb-img')).map(img => img.src);
            carousel.querySelectorAll('.thumb-img').forEach((t, i) => {
                t.onclick = () => update(i);
            });
        }

        function update(idx) {
            localIndex = (idx + localImages.length) % localImages.length;
            if(mainImg) mainImg.src = localImages[localIndex];
            if (countEl) countEl.textContent = `${localIndex + 1} / ${localImages.length}`;
            
            carousel.querySelectorAll('.thumb-img').forEach((t, i) => {
                t.classList.toggle('active', i === localIndex);
                if (i === localIndex) t.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            });
            
            if (fsOverlay && fsOverlay.style.display === 'flex') {
                fsImg.src = localImages[localIndex];
                activeIndex = localIndex;
            }
        }

        const pBtn = carousel.querySelector('[data-prev]');
        const nBtn = carousel.querySelector('[data-next]');
        if(pBtn) pBtn.onclick = () => update(localIndex - 1);
        if(nBtn) nBtn.onclick = () => update(localIndex + 1);

        const zoomTrigger = carousel.querySelector('[data-zoom-trigger]');
        if (zoomTrigger) {
            zoomTrigger.onclick = () => {
                activeImages = localImages;
                activeIndex = localIndex;
                if(fsImg) fsImg.src = activeImages[activeIndex];
                if(fsOverlay) fsOverlay.style.display = 'flex';
                document.body.style.overflow = 'hidden';
            };
        }
    });

    if(fsPrev && fsNext) {
        fsPrev.onclick = (e) => {
            e.stopPropagation();
            activeIndex = (activeIndex - 1 + activeImages.length) % activeImages.length;
            fsImg.src = activeImages[activeIndex];
            syncMain(activeIndex);
        };
        fsNext.onclick = (e) => {
            e.stopPropagation();
            activeIndex = (activeIndex + 1) % activeImages.length;
            fsImg.src = activeImages[activeIndex];
            syncMain(activeIndex);
        };
    }

    function syncMain(idx) {
        const activeCarousel = Array.from(carousels).find(c => Array.from(c.querySelectorAll('.thumb-img')).some(t => t.src === activeImages[idx]));
        if (activeCarousel) {
            const thumbs = activeCarousel.querySelectorAll('.thumb-img');
            if(thumbs[idx]) thumbs[idx].click();
        }
    }

    const fsClose = document.querySelector('.fs-close');
    if (fsClose) {
        fsClose.onclick = () => {
            fsOverlay.style.display = 'none';
            document.body.style.overflow = 'auto';
        };
        fsOverlay.onclick = (e) => { if(e.target === fsOverlay) fsClose.onclick(); };
    }

    const yearSpan = document.querySelector('[data-year]');
    if (yearSpan) yearSpan.textContent = new Date().getFullYear();
});