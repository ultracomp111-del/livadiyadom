import { sendTelegramMessage } from './api/mail.js';

// ==========================================
// 1. КОНФИГ БРОНИРОВАНИЯ И ЦЕН
// ==========================================
const MY_BOOKINGS = {
	defaultPrice: 3000, 
	availableMonths: [ 5, 6, 7, 8, 9, 10], // Месяцы (5 = Май)
	monthlyPrices: { 5: 3000, 6: 4000, 7: 4000, 8: 4500, 9: 3500, 10: 3000 },
	specialPrices: {  },
	bookedFullMonths: [], // Полностью занятые месяцы
	bookedDates: [] // Занятые дни ["2026-05-20",] - пример
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

function parseBookingDate(value) {
	if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
	const [y, m, d] = value.split('-').map(Number);
	const dt = new Date(y, m - 1, d);
	if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
	return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function isBookingDateBooked(dateStr) {
	const month = parseInt(dateStr.slice(5, 7), 10);
	return MY_BOOKINGS.bookedFullMonths.includes(month) || MY_BOOKINGS.bookedDates.includes(dateStr);
}

function isBookingRangeValid(start, end) {
	if (!start || !end || end <= start) return false;
	const startDt = new Date(start);
	const endDt = new Date(end);
	for (let d = new Date(startDt); d < endDt; d.setDate(d.getDate() + 1)) {
		const y = d.getFullYear();
		const m = d.getMonth() + 1;
		const day = d.getDate();
		const checkDate = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
		if (MY_BOOKINGS.bookedDates.includes(checkDate)) return false;
	}
	return true;
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
	const calendarHint = document.getElementById('calendar-hint');

	let refreshBookingCalendar = null;

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

		refreshBookingCalendar = () => renderCalendar(currentMonth, currentYear);

		function handleDateClick(dateStr) {
			clearCalendarHint();
			if (!selectedStart || (selectedStart && selectedEnd)) {
				selectedStart = dateStr;
				selectedEnd = null;
			} else if (dateStr > selectedStart) {
				if (isBookingRangeValid(selectedStart, dateStr)) {
					selectedEnd = dateStr;
				} else {
					showCalendarHint('В выбранном диапазоне есть занятые даты. Выберите другие даты.');
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
					const y = d.getFullYear();
					const m = d.getMonth() + 1;
					const day = d.getDate();
					const dStr = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
					total += MY_BOOKINGS.specialPrices[dStr] || MY_BOOKINGS.monthlyPrices[m] || MY_BOOKINGS.defaultPrice;
				}
				totalPriceLabel.textContent = total.toLocaleString();
				priceDisplay.style.display = 'block';
			} else {
				priceDisplay.style.display = 'none';
				totalPriceLabel.textContent = '0';
			}
		}

		function ensureCalendarMonthVisible(dateStr) {
			if (!dateStr) return;
			const month = parseInt(dateStr.slice(5, 7), 10);
			const year = parseInt(dateStr.slice(0, 4), 10);
			if (MY_BOOKINGS.availableMonths.includes(month)) {
				currentMonth = month;
				currentYear = year;
			}
		}

		function showCalendarHint(message) {
			if (!calendarHint) return;
			calendarHint.textContent = message;
			calendarHint.classList.add('calendar-hint--error');
		}

		function clearCalendarHint() {
			if (!calendarHint) return;
			calendarHint.textContent = '';
			calendarHint.classList.remove('calendar-hint--error');
		}

		function applyBookingDatesFromForm({ showHint = true } = {}) {
			const start = parseBookingDate(checkInInput?.value || '');
			const end = parseBookingDate(checkOutInput?.value || '');

			if (showHint) clearCalendarHint();

			if (!start && !end) {
				selectedStart = null;
				selectedEnd = null;
				calculateTotal();
				renderCalendar(currentMonth, currentYear);
				return;
			}

			if (start && isBookingDateBooked(start)) {
				if (showHint) showCalendarHint('Эта дата заезда занята. Выберите другую.');
				selectedStart = null;
				selectedEnd = null;
				calculateTotal();
				renderCalendar(currentMonth, currentYear);
				return;
			}

			if (end && isBookingDateBooked(end)) {
				if (showHint) showCalendarHint('Дата выезда недоступна. Выберите другую.');
				selectedStart = start;
				selectedEnd = null;
				if (checkOutInput) checkOutInput.value = '';
				ensureCalendarMonthVisible(start);
				calculateTotal();
				renderCalendar(currentMonth, currentYear);
				return;
			}

			if (start && end) {
				if (end <= start) {
					if (showHint) showCalendarHint('Дата выезда должна быть позже даты заезда.');
					selectedStart = start;
					selectedEnd = null;
					if (checkOutInput) checkOutInput.value = '';
				} else if (!isBookingRangeValid(start, end)) {
					if (showHint) showCalendarHint('В выбранном диапазоне есть занятые даты. Выберите другие даты.');
					selectedStart = start;
					selectedEnd = null;
					if (checkOutInput) checkOutInput.value = '';
				} else {
					selectedStart = start;
					selectedEnd = end;
				}
				ensureCalendarMonthVisible(start);
			} else if (start) {
				selectedStart = start;
				selectedEnd = null;
				ensureCalendarMonthVisible(start);
			} else {
				selectedStart = null;
				selectedEnd = null;
			}

			calculateTotal();
			renderCalendar(currentMonth, currentYear);
		}

		const syncBookingFromDateInputs = () => applyBookingDatesFromForm({ showHint: true });

		checkInInput?.addEventListener('change', syncBookingFromDateInputs);
		checkOutInput?.addEventListener('change', syncBookingFromDateInputs);

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
	const bookingFormFeedback = document.getElementById('booking-form-feedback');
	const pdConsentWrap = document.getElementById('pd-consent-wrap');
	const pdConsent = document.getElementById('pd-consent');
	const pdConsentLabel = pdConsentWrap?.querySelector('.pd-consent-label');

	function triggerConsentShake() {
		if (!pdConsentWrap) return;
		pdConsentWrap.classList.remove('pd-consent-block--shake');
		void pdConsentWrap.offsetWidth;
		pdConsentWrap.classList.add('pd-consent-block--shake');
		pdConsentWrap.addEventListener('animationend', () => {
			pdConsentWrap.classList.remove('pd-consent-block--shake');
		}, { once: true });
	}

	function clearBookingFieldErrors() {
		if (!bookingForm) return;
		bookingForm.querySelectorAll('.error-input').forEach((el) => el.classList.remove('error-input'));
		pdConsentLabel?.classList.remove('pd-consent-label--error');
		pdConsentWrap?.classList.remove('pd-consent-block--shake');
	}

	if (bookingForm) {
		const nameInput = bookingForm.querySelector('[name="name"]');
		const phoneInput = bookingForm.querySelector('[name="phone"]');

		bookingForm.addEventListener('input', (e) => {
			const t = e.target;
			if (t.matches('input, textarea, select')) {
				t.classList.remove('error-input');
			}
			if (bookingFormFeedback && bookingFormFeedback.classList.contains('form-feedback--error')) {
				bookingFormFeedback.hidden = true;
				bookingFormFeedback.textContent = '';
				bookingFormFeedback.className = 'form-feedback';
			}
		});

		bookingForm.addEventListener('change', (e) => {
			const t = e.target;
			if (t === pdConsent) {
				pdConsentLabel?.classList.remove('pd-consent-label--error');
				pdConsentWrap?.classList.remove('pd-consent-block--shake');
			}
			if (t.matches('input[type="date"]')) {
				t.classList.remove('error-input');
				if (calendarHint) {
					calendarHint.textContent = '';
					calendarHint.classList.remove('calendar-hint--error');
				}
			}
			if (bookingFormFeedback && bookingFormFeedback.classList.contains('form-feedback--error')) {
				bookingFormFeedback.hidden = true;
				bookingFormFeedback.textContent = '';
				bookingFormFeedback.className = 'form-feedback';
			}
		});

		bookingForm.addEventListener('submit', async (e) => {
			e.preventDefault();

			clearBookingFieldErrors();
			if (bookingFormFeedback) {
				bookingFormFeedback.hidden = true;
				bookingFormFeedback.textContent = '';
				bookingFormFeedback.className = 'form-feedback';
			}

			const name = nameInput?.value?.trim() || '';
			const phone = phoneInput?.value?.trim() || '';
			const datesOk = Boolean(selectedStart && selectedEnd);
			const consentOk = Boolean(pdConsent?.checked);

			let firstScrollTarget = null;
			const markFirst = (el) => {
				if (el && !firstScrollTarget) firstScrollTarget = el;
			};

			let hasError = false;

			if (!name) {
				nameInput?.classList.add('error-input');
				markFirst(nameInput);
				hasError = true;
			}
			if (!phone) {
				phoneInput?.classList.add('error-input');
				markFirst(phoneInput);
				hasError = true;
			}
			if (!datesOk) {
				checkInInput?.classList.add('error-input');
				checkOutInput?.classList.add('error-input');
				markFirst(document.querySelector('.calendar-card-wrapper') || checkInInput);
				hasError = true;
			}
			if (!consentOk) {
				pdConsentLabel?.classList.add('pd-consent-label--error');
				triggerConsentShake();
				markFirst(pdConsentWrap);
				hasError = true;
			}

			if (hasError) {
				if (bookingFormFeedback) {
					bookingFormFeedback.textContent =
						'Пожалуйста, заполните обязательные поля и примите соглашение';
					bookingFormFeedback.classList.add('form-feedback--error');
					bookingFormFeedback.hidden = false;
				}
				firstScrollTarget?.scrollIntoView({ behavior: 'smooth', block: 'center' });
				return;
			}

			const submitBtn = bookingForm.querySelector('button[type="submit"]');
			const originalText = submitBtn.textContent;

			const formData = {
				name,
				phone,
				guests: bookingForm.querySelector('[name="guests"]')?.value || '1',
				checkIn: selectedStart,
				checkOut: selectedEnd,
				totalPrice: document.getElementById('total-price').textContent + ' ₽',
				message: bookingForm.querySelector('[name="wishes"]')?.value?.trim() || ''
			};

			submitBtn.disabled = true;
			submitBtn.textContent = 'Отправляю...';

			const result = await sendTelegramMessage(formData);
			if (bookingFormFeedback) {
				bookingFormFeedback.className = 'form-feedback';
				bookingFormFeedback.textContent = result.message;
				bookingFormFeedback.hidden = false;
				bookingFormFeedback.classList.add(result.success ? 'form-feedback--success' : 'form-feedback--error');
			}
			if (result.success) {
				bookingForm.reset();
				selectedStart = null;
				selectedEnd = null;
				if (priceDisplay) priceDisplay.style.display = 'none';
				refreshBookingCalendar?.();
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
			localImages = Array.from({ length: 13 }, (_, i) => `photo/${String(i + 1).padStart(2, "0")}`);
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

	const COOKIE_CONSENT_KEY = 'kvartira_cookie_consent_v1';
	if (!localStorage.getItem(COOKIE_CONSENT_KEY)) {
		const banner = document.createElement('div');
		banner.className = 'cookie-banner';
		banner.setAttribute('role', 'dialog');
		banner.setAttribute('aria-label', 'Уведомление о cookie');
		banner.innerHTML =
			'<p class="cookie-banner__text">Наш сайт использует файлы cookie для улучшения работы. Продолжая использовать сайт, вы соглашаетесь с условиями использования данных.</p>' +
			'<button type="button" class="cookie-banner__accept">Принять</button>';
		document.body.appendChild(banner);
		banner.querySelector('.cookie-banner__accept')?.addEventListener('click', () => {
			localStorage.setItem(COOKIE_CONSENT_KEY, '1');
			banner.remove();
		});
	}
});