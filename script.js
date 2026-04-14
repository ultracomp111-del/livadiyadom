import { sendTelegramMessage } from './api/telegram.js';

// ==========================================
// 1. КОНФИГ БРОНИРОВАНИЯ И ЦЕН
// ==========================================
const MY_BOOKINGS = {
    defaultPrice: 3500, 
    availableMonths: [ 6, 7, 8, 9, 10], // Месяцы (5 = Май)
    monthlyPrices: { 5: 3500, 6: 4000, 7: 4500, 8: 5000, 9: 4000, 10: 3000 },
    specialPrices: {  },
    bookedFullMonths: [], // Полностью занятые месяцы
    bookedDates: ["2026-07-20","2026-07-21","2026-07-22","2026-07-23","2026-07-24","2026-07-25","2026-07-26","2026-07-27","2026-07-28","2026-07-29","2026-07-30","2026-07-31" ] // Занятые дни
};

// Состояния выбора
let selectedStart = null;
let selectedEnd = null;

// ==========================================
// 2. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ==========================================
function setImgSrc(imgElement, path) {
    if (!imgElement || !path) return;
    const cleanPath = path.replace(/\.(webp|jpg|jpeg|png)$/i, '');
    imgElement.src = `${cleanPath}.webp`;
    imgElement.onerror = () => {
        if (imgElement.src.endsWith('.webp')) {
            imgElement.src = `${cleanPath}.jpg`;
            imgElement.onerror = null;
        }
    };
}

// ==========================================
// 3. ОСНОВНАЯ ЛОГИКА (Запуск после загрузки DOM)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    
    // --- ИНТЕРАКТИВНЫЙ КАЛЕНДАРЬ ---
    const calDaysContainer = document.getElementById('calendar-days');
    const checkInInput = document.getElementById('check-in');
    const checkOutInput = document.getElementById('check-out');
    const priceDisplay = document.getElementById('price-display');
    const totalPriceLabel = document.getElementById('total-price');

    if (calDaysContainer) {
        let curDate = new Date();
        let currentYear = 2026; // Или curDate.getFullYear()
        // Начинаем с мая (индекс 4 в JS Date, но у нас в конфиге месяц 5)
        let currentMonth = MY_BOOKINGS.availableMonths.includes(curDate.getMonth() + 1) ? curDate.getMonth() + 1 : MY_BOOKINGS.availableMonths[0];

        const monthYearDisplay = document.getElementById('cal-month-year');
        const prevBtn = document.getElementById('cal-prev');
        const nextBtn = document.getElementById('cal-next');
        const monthNames = ["", "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];

        function renderCalendar(month, year) {
            calDaysContainer.innerHTML = '';
            monthYearDisplay.textContent = `${monthNames[month]} ${year}`;

            let firstDay = new Date(year, month - 1, 1).getDay();
            firstDay = firstDay === 0 ? 6 : firstDay - 1;
            const daysInMonth = new Date(year, month, 0).getDate();

            for (let i = 0; i < firstDay; i++) {
                calDaysContainer.innerHTML += `<div class="cal-day empty"></div>`;
            }

            for (let day = 1; day <= daysInMonth; day++) {
                const fullDateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const isBooked = MY_BOOKINGS.bookedFullMonths.includes(month) || MY_BOOKINGS.bookedDates.includes(fullDateStr);
                const price = MY_BOOKINGS.specialPrices[fullDateStr] || MY_BOOKINGS.monthlyPrices[month] || MY_BOOKINGS.defaultPrice;

                const dayEl = document.createElement('div');
                dayEl.classList.add('cal-day');
                dayEl.classList.add(isBooked ? 'booked' : 'free');
                dayEl.innerHTML = `<span>${day}</span>${!isBooked ? `<span class="price">${price}₽</span>` : ''}`;

                if (!isBooked) {
                    dayEl.onclick = () => handleDateClick(fullDateStr);
                    // Логика подсветки
                    if (fullDateStr === selectedStart || fullDateStr === selectedEnd) dayEl.classList.add('selected');
                    if (selectedStart && selectedEnd && fullDateStr > selectedStart && fullDateStr < selectedEnd) {
                        dayEl.classList.add('in-range');
                    }
                }
                calDaysContainer.appendChild(dayEl);
            }
        }

        function handleDateClick(dateStr) {
            if (!selectedStart || (selectedStart && selectedEnd)) {
                selectedStart = dateStr;
                selectedEnd = null;
            } else if (dateStr > selectedStart) {
                // Проверка, есть ли занятые дни в диапазоне
                let isRangeValid = true;
                let start = new Date(selectedStart);
                let end = new Date(dateStr);
                for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
                    let checkDate = d.toISOString().split('T')[0];
                    if (MY_BOOKINGS.bookedDates.includes(checkDate)) {
                        isRangeValid = false; break;
                    }
                }

                if (isRangeValid) {
                    selectedEnd = dateStr;
                } else {
                    alert('В выбранном диапазоне есть занятые даты.');
                    selectedStart = dateStr;
                }
            } else {
                selectedStart = dateStr;
            }

            if (checkInInput) checkInInput.value = selectedStart || '';
            if (checkOutInput) checkOutInput.value = selectedEnd || '';
            
            calculateTotal();
            renderCalendar(currentMonth, currentYear);
        }

        function calculateTotal() {
            if (selectedStart && selectedEnd) {
                const start = new Date(selectedStart);
                const end = new Date(selectedEnd);
                let total = 0;
                for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
                    const dStr = d.toISOString().split('T')[0];
                    const m = d.getMonth() + 1;
                    total += MY_BOOKINGS.specialPrices[dStr] || MY_BOOKINGS.monthlyPrices[m] || MY_BOOKINGS.defaultPrice;
                }
                totalPriceLabel.textContent = total.toLocaleString();
                priceDisplay.style.display = 'block';
            } else {
                priceDisplay.style.display = 'none';
                totalPriceLabel.textContent = '0';
            }
        }

        prevBtn.onclick = () => {
            currentMonth--; if (currentMonth < 1) { currentMonth = 12; currentYear--; }
            if (MY_BOOKINGS.availableMonths.includes(currentMonth)) renderCalendar(currentMonth, currentYear);
        };
        nextBtn.onclick = () => {
            currentMonth++; if (currentMonth > 12) { currentMonth = 1; currentYear++; }
            if (MY_BOOKINGS.availableMonths.includes(currentMonth)) renderCalendar(currentMonth, currentYear);
        };

        renderCalendar(currentMonth, currentYear);
    }

    // --- ФОРМА БРОНИРОВАНИЯ ---
    const bookingForm = document.getElementById('booking-form');
    if (bookingForm) {
        bookingForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            if (!selectedStart || !selectedEnd) {
                alert("Пожалуйста, выберите даты заезда и выезда в календаре.");
                return;
            }

            const submitBtn = bookingForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            
            const formData = {
                name: bookingForm.querySelector('[name="name"]')?.value?.trim() || '',
                phone: bookingForm.querySelector('[name="phone"]')?.value?.trim() || '',
                guests: bookingForm.querySelector('[name="guests"]')?.value || '1',
                checkIn: selectedStart,
                checkOut: selectedEnd,
                totalPrice: document.getElementById('total-price').textContent + " ₽",
                message: bookingForm.querySelector('[name="wishes"]')?.value?.trim() || ''
            };

            submitBtn.disabled = true;
            submitBtn.textContent = 'Отправляю...';
            
            const result = await sendTelegramMessage(formData);
            alert(result.message);
            if (result.success) {
                bookingForm.reset();
                selectedStart = null;
                selectedEnd = null;
                if (priceDisplay) priceDisplay.style.display = 'none';
                renderCalendar(currentMonth, currentYear); // Обновляем стили календаря
            }
            
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        });
    }

    // --- ШАПКА (УМНЫЙ СКРОЛЛ) ---
    const header = document.querySelector('.header');
    if (header) {
        let lastScrollY = window.scrollY || window.pageYOffset;
        window.addEventListener('scroll', () => {
            const currentScrollY = window.scrollY || window.pageYOffset;
            if (currentScrollY > 50 && currentScrollY > lastScrollY) {
                header.classList.add('header--hidden');
            } else {
                header.classList.remove('header--hidden');
            }
            lastScrollY = currentScrollY <= 0 ? 0 : currentScrollY; 
        }, { passive: true });
    }

    // --- ГАЛЕРЕЯ И СВАЙПЫ ---
    const carousels = document.querySelectorAll('[data-carousel]');
    const fsOverlay = document.getElementById('fs-overlay');
    const fsImg = document.getElementById('fs-img');
    let activeImages = [], activeIndex = 0, activeCarouselNode = null;

    carousels.forEach(carousel => {
        const type = carousel.dataset.carousel;
        const mainImg = carousel.querySelector('[data-main-img]');
        const thumbContainer = carousel.querySelector('[data-thumbs]');
        const countEl = carousel.querySelector('[data-count]');
        let localImages = [], localIndex = 0;

        if (type === 'home') {
            localImages = Array.from({ length: 20 }, (_, i) => `photo/${String(i + 1).padStart(2, "0")}`);
            if (thumbContainer) {
                thumbContainer.innerHTML = '';
                localImages.forEach((path, idx) => {
                    const img = document.createElement('img');
                    setImgSrc(img, path);
                    img.className = `thumb-img ${idx === 0 ? 'active' : ''}`;
                    img.onclick = () => update(idx);
                    thumbContainer.appendChild(img);
                });
            }
        } else {
            localImages = Array.from(carousel.querySelectorAll('.thumb-img')).map(img => img.getAttribute('src').replace(/\.(webp|jpg|jpeg|png)$/i, ''));
            carousel.querySelectorAll('.thumb-img').forEach((t, i) => { t.onclick = () => update(i); });
        }

        function update(idx) {
            localIndex = (idx + localImages.length) % localImages.length;
            if (mainImg) setImgSrc(mainImg, localImages[localIndex]);
            if (countEl) countEl.textContent = `${localIndex + 1} / ${localImages.length}`;
            carousel.querySelectorAll('.thumb-img').forEach((t, i) => {
                t.classList.toggle('active', i === localIndex);
                if (i === localIndex) t.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            });
        }

        carousel.querySelector('[data-prev]')?.addEventListener('click', () => update(localIndex - 1));
        carousel.querySelector('[data-next]')?.addEventListener('click', () => update(localIndex + 1));

        let tsX = 0;
        carousel.addEventListener('touchstart', e => { 
            if (e.target.closest('[data-thumbs]')) return; 
            tsX = e.changedTouches[0].screenX; 
        }, {passive: true});
        
        carousel.addEventListener('touchend', e => {
            if (e.target.closest('[data-thumbs]')) return;
            let dx = tsX - e.changedTouches[0].screenX;
            if (Math.abs(dx) > 50) update(dx > 0 ? localIndex + 1 : localIndex - 1);
        }, {passive: true});

        carousel.querySelector('[data-zoom-trigger]')?.addEventListener('click', () => {
            activeImages = localImages; activeIndex = localIndex; activeCarouselNode = carousel;
            setImgSrc(fsImg, activeImages[activeIndex]);
            fsOverlay.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        });
    });

    // --- FULLSCREEN УПРАВЛЕНИЕ ---
    document.getElementById('fs-prev')?.addEventListener('click', (e) => {
        e.stopPropagation();
        activeIndex = (activeIndex - 1 + activeImages.length) % activeImages.length;
        setImgSrc(fsImg, activeImages[activeIndex]);
        if (activeCarouselNode) activeCarouselNode.querySelectorAll('.thumb-img')[activeIndex]?.click();
    });
    document.getElementById('fs-next')?.addEventListener('click', (e) => {
        e.stopPropagation();
        activeIndex = (activeIndex + 1) % activeImages.length;
        setImgSrc(fsImg, activeImages[activeIndex]);
        if (activeCarouselNode) activeCarouselNode.querySelectorAll('.thumb-img')[activeIndex]?.click();
    });

    const closeFs = () => { fsOverlay.style.display = 'none'; document.body.style.overflow = 'auto'; };
    document.querySelector('.fs-close')?.addEventListener('click', closeFs);
    fsOverlay?.addEventListener('click', (e) => { if(e.target === fsOverlay) closeFs(); });

    // Текущий год
    const yearSpan = document.querySelector('[data-year]');
    if (yearSpan) yearSpan.textContent = new Date().getFullYear();
});