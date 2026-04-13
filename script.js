import { sendTelegramMessage } from './api/telegram.js';

// ==========================================
// 1. КОНФИГ БРОНИРОВАНИЯ
// ==========================================
const MY_BOOKINGS = {
    defaultPrice: "3500₽", 
    availableMonths: [5, 6, 7, 8, 9, 10],
    monthlyPrices: { 5: "3500₽", 6: "4000₽", 7: "4500₽", 8: "5000₽", 9: "3500₽", 10: "3000₽" },
    specialPrices: { "2026-05-01": "5000₽", "2026-05-09": "5000₽", "2026-06-12": "4500₽" },
    bookedFullMonths: [7, 8], 
    bookedDates: ["2026-05-10", "2026-05-11", "2026-06-15"]
};

// ==========================================
// 2. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ==========================================

// Загрузчик WebP с переходом на JPG
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
    
    // --- ФОРМА БРОНИРОВАНИЯ ---
    const bookingForm = document.getElementById('booking-form');
    if (bookingForm) {
        bookingForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = bookingForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            
            const formData = {
                name: bookingForm.querySelector('[name="name"]')?.value?.trim() || '',
                phone: bookingForm.querySelector('[name="phone"]')?.value?.trim() || '',
                guests: bookingForm.querySelector('[name="guests"]')?.value || '1',
                checkIn: bookingForm.querySelector('[name="date_start"]')?.value || '',
                checkOut: bookingForm.querySelector('[name="date_end"]')?.value || '',
                message: bookingForm.querySelector('[name="wishes"]')?.value?.trim() || ''
            };

            if (!formData.name || !formData.phone) {
                alert('Пожалуйста, заполните имя и телефон');
                return;
            }

            submitBtn.disabled = true;
            submitBtn.textContent = 'Отправляю...';
            
            const result = await sendTelegramMessage(formData);
            alert(result.message);
            if (result.success) bookingForm.reset();
            
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
            
            // Если скроллим вниз и ушли от верха на 50px - прячем
            if (currentScrollY > 50 && currentScrollY > lastScrollY) {
                header.classList.add('header--hidden');
            } 
            // Если скроллим вверх или находимся в самом верху - показываем
            else {
                header.classList.remove('header--hidden');
            }
            
            // Защита от отрицательного скролла ("резинового" отскока) на iOS
            lastScrollY = currentScrollY <= 0 ? 0 : currentScrollY; 
        }, { passive: true });
    }

    // --- КАЛЕНДАРЬ ---
    const calDaysContainer = document.getElementById('calendar-days');
    if (calDaysContainer) {
        const monthYearDisplay = document.getElementById('cal-month-year');
        const prevBtn = document.getElementById('cal-prev');
        const nextBtn = document.getElementById('cal-next');
        const monthNames = ["", "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
        
        let curDate = new Date();
        let curMonth = MY_BOOKINGS.availableMonths.includes(curDate.getMonth() + 1) ? curDate.getMonth() + 1 : MY_BOOKINGS.availableMonths[0];
        let curYear = curDate.getFullYear();

        function renderCalendar(m, y) {
            calDaysContainer.innerHTML = "";
            monthYearDisplay.textContent = `${monthNames[m]} ${y}`;
            let firstDay = new Date(y, m - 1, 1).getDay();
            firstDay = firstDay === 0 ? 6 : firstDay - 1;
            const daysInMonth = new Date(y, m, 0).getDate();

            for (let i = 0; i < firstDay; i++) {
                const empty = document.createElement('div');
                empty.className = 'cal-day empty';
                calDaysContainer.appendChild(empty);
            }

            for (let i = 1; i <= daysInMonth; i++) {
                const dayDiv = document.createElement('div');
                dayDiv.className = 'cal-day';
                const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
                const isBooked = (MY_BOOKINGS.bookedFullMonths?.includes(m)) || (MY_BOOKINGS.bookedDates.includes(dateStr));
                const price = MY_BOOKINGS.specialPrices[dateStr] || MY_BOOKINGS.monthlyPrices[m] || MY_BOOKINGS.defaultPrice;

                dayDiv.classList.add(isBooked ? 'booked' : 'free');
                dayDiv.innerHTML = `<span>${i}</span><span class="price">${isBooked ? '' : price}</span>`;
                calDaysContainer.appendChild(dayDiv);
            }
        }

        prevBtn.onclick = () => {
            curMonth--; if(curMonth < 1) { curMonth = 12; curYear--; }
            if(MY_BOOKINGS.availableMonths.includes(curMonth)) renderCalendar(curMonth, curYear);
        };
        nextBtn.onclick = () => {
            curMonth++; if(curMonth > 12) { curMonth = 1; curYear++; }
            if(MY_BOOKINGS.availableMonths.includes(curMonth)) renderCalendar(curMonth, curYear);
        };
        renderCalendar(curMonth, curYear);
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

        // Свайп (ИСПРАВЛЕНО)
        let tsX = 0;
        carousel.addEventListener('touchstart', e => { 
            // Если пальцем трогают миниатюры - не запускаем логику главного свайпа
            if (e.target.closest('[data-thumbs]')) return; 
            tsX = e.changedTouches[0].screenX; 
        }, {passive: true});
        
        carousel.addEventListener('touchend', e => {
            // Игнорируем отпускание пальца над миниатюрами
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