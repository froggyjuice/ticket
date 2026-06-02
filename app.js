const PRICE = 10000;
const PERFORMANCE_NAME = '제1회 HEXA 오케스트라 정기연주회';
const PERFORMANCE_AT = '2026-06-19T19:30:00+09:00';
const PERFORMANCE_DATE_LABEL = '2026.06.19 금 19:30';
const BLOCK_NAMES = {
    A: '가',
    B: '나',
    C: '다'
};

const screens = {
    1: document.getElementById('step-seat'),
    2: document.getElementById('step-info'),
    3: document.getElementById('step-complete')
};

const steps = [...document.querySelectorAll('.step')];
const summarySeat = document.getElementById('summary-seat');
const summaryPayment = document.getElementById('summary-payment');
const confirmMessage = document.getElementById('confirm-message');
const completeTitle = document.getElementById('complete-title');
const completeDetail = document.getElementById('complete-detail');
const seatMap = document.getElementById('seat-map');
const blockHelper = document.getElementById('block-helper');
const backBlocks = document.getElementById('back-blocks');
const buyerName = document.getElementById('buyer-name');
const buyerPhone = document.getElementById('buyer-phone');
const agreeCheck = document.getElementById('agree-check');
const goInfoButton = document.getElementById('go-info');
const toast = document.getElementById('toast');
const ticketingSection = document.getElementById('ticketing');
const ticketApp = document.getElementById('ticket-app');
const openTicketButtons = [...document.querySelectorAll('[data-open-ticket]')];
const heroDday = document.getElementById('hero-dday');
const detailDday = document.getElementById('detail-dday');
const heroDate = document.getElementById('hero-date');
const loginForm = document.getElementById('login-form');
const loginName = document.getElementById('login-name');
const loginPhone = document.getElementById('login-phone');
const accountName = document.getElementById('account-name');
const accountPhone = document.getElementById('account-phone');
const accountNote = document.getElementById('current-account-note');
const logoutAccount = document.getElementById('logout-account');
const ticketWallet = document.getElementById('ticket-wallet');
const seatStatusGrid = document.getElementById('seat-status-grid');
const fsmNodes = [...document.querySelectorAll('[data-fsm]')];
const saveCompleteTicket = document.getElementById('save-complete-ticket');
const viewWallet = document.getElementById('view-wallet');

let currentFloor = 'all';
let activeBlock = null;
let selectedSeatIds = [];
let currentCompletedBooking = null;
let currentAccount = safeGet('currentAccount', null);

function safeGet(key, fallback) {
    try {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : fallback;
    } catch (error) {
        return fallback;
    }
}

function safeSet(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        // The page still works without persistent storage.
    }
}

function safeRemove(key) {
    try {
        localStorage.removeItem(key);
    } catch (error) {
        // Ignore storage cleanup errors in file:// contexts.
    }
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function normalizePhone(value) {
    return value.replace(/\D/g, '').slice(0, 11);
}

function accountKey(name, phone) {
    return `${name.trim()}::${normalizePhone(phone)}`;
}

function makeAccount(name, phone) {
    return {
        name: name.trim(),
        phone: formatPhoneNumber(phone),
        key: accountKey(name, phone)
    };
}

function createSeatData() {
    const seats = [];

    const addBlock = ({ floor, block, rowCounts, blockedRows = [] }) => {
        let number = 1;

        rowCounts.forEach((count, rowIndex) => {
            for (let column = 1; column <= count; column++) {
                const id = `${floor}-${block}-${String(number).padStart(3, '0')}`;
                seats.push({
                    id,
                    floor,
                    block,
                    blockName: BLOCK_NAMES[block],
                    number,
                    row: rowIndex + 1,
                    column,
                    blocked: blockedRows.includes(rowIndex)
                });
                number++;
            }
        });
    };

    const sideFirstFloorRows = [8, 9, 10, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11];

    addBlock({ floor: '1F', block: 'A', rowCounts: sideFirstFloorRows });
    addBlock({ floor: '1F', block: 'B', rowCounts: [12, 12, 12, 11, 12, 12, 12, 12, 12, 12, 12, 12, 16], blockedRows: [12] });
    addBlock({ floor: '1F', block: 'C', rowCounts: sideFirstFloorRows });
    addBlock({ floor: '2F', block: 'A', rowCounts: [5, 5, 11, 11, 11, 11, 11] });
    addBlock({ floor: '2F', block: 'B', rowCounts: [12, 11, 12, 12, 12] });
    addBlock({ floor: '2F', block: 'C', rowCounts: [5, 5, 11, 11, 11, 11, 11] });

    return seats;
}

const seats = createSeatData();
const sampleReservedSeats = ['1F-A-012', '1F-A-053', '1F-B-047', '1F-B-108', '1F-C-043', '2F-A-021', '2F-B-053', '2F-C-016'];

function getBookings() {
    return safeGet('bookings', []);
}

function getTicketImages() {
    return safeGet('ticketImages', {});
}

function getReservedSeatIds() {
    const saved = getBookings().flatMap(booking => booking.seats.map(seat => seat.id));
    return new Set([...sampleReservedSeats, ...saved]);
}

function formatMoney(value) {
    return `${value.toLocaleString('ko-KR')}원`;
}

function formatSeat(seat) {
    return `${seat.floor} ${seat.blockName}블록 ${seat.number}번`;
}

function formatDate(value) {
    return new Intl.DateTimeFormat('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    }).format(new Date(value));
}

function getSeatById(id) {
    return seats.find(seat => seat.id === id);
}

function getSelectedSeats() {
    return selectedSeatIds.map(getSeatById).filter(Boolean);
}

function showToast(message) {
    toast.textContent = message;
    toast.classList.add('is-visible');
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => {
        toast.classList.remove('is-visible');
    }, 2200);
}

function updateFSM(state) {
    fsmNodes.forEach(node => {
        node.classList.toggle('is-active', node.dataset.fsm === state);
    });
}

function syncBookingFormWithAccount() {
    if (!currentAccount) return;
    buyerName.value = currentAccount.name;
    buyerPhone.value = currentAccount.phone;
}

function updateAccountNote() {
    if (!accountNote) return;
    accountNote.textContent = currentAccount
        ? `${currentAccount.name}님의 내 티켓 보관함에 예매가 저장됩니다.`
        : '로그인하면 이 정보로 내 티켓 보관함에 저장됩니다.';
}

function goToStep(step) {
    Object.entries(screens).forEach(([key, screen]) => {
        screen.classList.toggle('is-active', Number(key) === step);
    });

    steps.forEach(button => {
        const buttonStep = Number(button.dataset.step);
        button.classList.toggle('is-active', buttonStep === step);
        button.disabled = buttonStep > step;
    });

    if (step === 2) {
        syncBookingFormWithAccount();
    }

    renderSummaries();
    updateFSM(step === 1 ? (activeBlock ? 'seat' : 'block') : step === 2 ? 'info' : 'complete');
    ticketingSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function openTicketing() {
    ticketApp.classList.remove('is-hidden');
    syncBookingFormWithAccount();
    goToStep(1);
}

function getSeatStatus(seat) {
    if (seat.blocked) return 'blocked';
    if (selectedSeatIds.includes(seat.id)) return 'selected';
    if (getReservedSeatIds().has(seat.id)) return 'reserved';
    return 'available';
}

function floorFilteredSeats() {
    return seats.filter(seat => {
        if (currentFloor !== 'all' && seat.floor !== currentFloor) return false;
        return true;
    });
}

function renderSeatMap() {
    seatMap.innerHTML = '';
    seatMap.className = activeBlock ? 'seat-map detail-mode' : 'seat-map overview-mode';
    blockHelper.classList.toggle('is-hidden', Boolean(activeBlock));
    backBlocks.classList.toggle('is-hidden', !activeBlock);

    if (!activeBlock) {
        renderBlockOverview();
        return;
    }

    renderBlockDetail(activeBlock);
}

function renderBlockOverview() {
    const section = document.createElement('section');
    section.className = 'block-overview';
    section.innerHTML = `
        <div class="block-overview-title">
            <h3>블록을 선택하세요</h3>
            <span>${currentFloor === 'all' ? '1층과 2층 전체' : currentFloor}</span>
        </div>
    `;

    const overviewGrid = document.createElement('div');
    overviewGrid.className = 'block-overview-grid';

    ['A', 'B', 'C'].forEach(block => {
        const blockSeats = floorFilteredSeats().filter(seat => seat.block === block);
        const statusCounts = blockSeats.reduce((counts, seat) => {
            counts[getSeatStatus(seat)] += 1;
            return counts;
        }, { available: 0, selected: 0, reserved: 0, blocked: 0 });

        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'block-overview-card';
        card.setAttribute('aria-label', `${BLOCK_NAMES[block]}블록 확대`);
        card.innerHTML = `
            <div class="block-card-header">
                <h3>${BLOCK_NAMES[block]}블록</h3>
                <strong>${statusCounts.available}석 가능</strong>
            </div>
            <div class="block-card-meta">
                <span>선택 ${statusCounts.selected}</span>
                <span>예매 ${statusCounts.reserved}</span>
                <span>불가 ${statusCounts.blocked}</span>
            </div>
        `;

        card.appendChild(createMiniSeatMap(blockSeats));
        card.addEventListener('click', () => {
            activeBlock = block;
            renderSeatMap();
            renderSummaries();
            updateFSM('seat');
        });
        overviewGrid.appendChild(card);
    });

    section.appendChild(overviewGrid);
    seatMap.appendChild(section);
}

function createMiniSeatMap(blockSeats) {
    const miniMap = document.createElement('div');
    miniMap.className = 'mini-seat-map';

    const floors = [...new Set(blockSeats.map(seat => seat.floor))];
    floors.forEach(floor => {
        const floorGroup = document.createElement('div');
        floorGroup.className = 'mini-floor-group';

        const floorLabel = document.createElement('span');
        floorLabel.className = 'mini-floor-label';
        floorLabel.textContent = floor;
        floorGroup.appendChild(floorLabel);

        const floorSeats = blockSeats.filter(seat => seat.floor === floor);
        [...new Set(floorSeats.map(seat => seat.row))].forEach(row => {
            const rowElement = document.createElement('div');
            rowElement.className = 'mini-seat-row';

            floorSeats
                .filter(seat => seat.row === row)
                .forEach(seat => {
                    const dot = document.createElement('span');
                    dot.className = `mini-seat ${getSeatStatus(seat)}`;
                    rowElement.appendChild(dot);
                });

            floorGroup.appendChild(rowElement);
        });

        miniMap.appendChild(floorGroup);
    });

    return miniMap;
}

function renderBlockDetail(block) {
    const visibleSeats = floorFilteredSeats().filter(seat => seat.block === block);

    const header = document.createElement('div');
    header.className = 'block-detail-header';
    header.innerHTML = `
        <div>
            <span>확대 보기</span>
            <h3>${BLOCK_NAMES[block]}블록 좌석 선택</h3>
        </div>
        <button class="ghost-button" type="button">블록 전체 보기</button>
    `;
    header.querySelector('button').addEventListener('click', showBlockOverview);
    seatMap.appendChild(header);

    const floors = [...new Set(visibleSeats.map(seat => seat.floor))];

    floors.forEach(floor => {
        const floorSection = document.createElement('section');
        floorSection.className = 'floor-section';
        floorSection.innerHTML = `<h3>${floor}</h3>`;

        const blockGrid = document.createElement('div');
        blockGrid.className = 'block-grid';

        [block].forEach(blockCode => {
            const blockSeats = visibleSeats.filter(seat => seat.floor === floor && seat.block === blockCode);
            if (blockSeats.length === 0) return;

            const blockElement = document.createElement('article');
            blockElement.className = 'seat-block expanded';
            blockElement.innerHTML = `<h4>${BLOCK_NAMES[blockCode]}블록</h4>`;

            const rowsElement = document.createElement('div');
            rowsElement.className = 'seat-rows';

            [...new Set(blockSeats.map(seat => seat.row))].forEach(row => {
                const rowElement = document.createElement('div');
                rowElement.className = 'seat-row';

                blockSeats
                    .filter(seat => seat.row === row)
                    .forEach(seat => {
                        const status = getSeatStatus(seat);
                        const button = document.createElement('button');
                        button.type = 'button';
                        button.className = `seat ${status}`;
                        button.textContent = seat.number;
                        button.title = formatSeat(seat);
                        button.disabled = status === 'blocked' || status === 'reserved';
                        button.addEventListener('click', () => toggleSeat(seat));
                        rowElement.appendChild(button);
                    });

                rowsElement.appendChild(rowElement);
            });

            blockElement.appendChild(rowsElement);
            blockGrid.appendChild(blockElement);
        });

        floorSection.appendChild(blockGrid);
        seatMap.appendChild(floorSection);
    });
}

function showBlockOverview() {
    activeBlock = null;
    renderSeatMap();
    renderSummaries();
    updateFSM('block');
}

function toggleSeat(seat) {
    if (selectedSeatIds.includes(seat.id)) {
        selectedSeatIds = selectedSeatIds.filter(id => id !== seat.id);
    } else {
        selectedSeatIds.push(seat.id);
    }

    renderSeatMap();
    renderSummaries();
    updateFSM('seat');
}

function summaryRow(label, value) {
    return `<div class="summary-row"><span>${label}</span><strong>${value}</strong></div>`;
}

function renderSummaries() {
    const selectedSeats = getSelectedSeats();
    const count = selectedSeats.length;
    const selectedLabels = count ? selectedSeats.map(seat => escapeHtml(formatSeat(seat))).join('<br>') : '선택 전';
    const total = count * PRICE;

    summarySeat.innerHTML = [
        summaryRow('공연', escapeHtml(PERFORMANCE_NAME)),
        summaryRow('선택 좌석', `${count}석`),
        summaryRow('좌석', selectedLabels),
        summaryRow('금액', formatMoney(total))
    ].join('');

    summaryPayment.innerHTML = [
        summaryRow('공연', escapeHtml(PERFORMANCE_NAME)),
        summaryRow('예매 매수', `${count}매`),
        summaryRow('좌석', selectedLabels),
        summaryRow('총 결제 금액', formatMoney(total))
    ].join('');

    confirmMessage.textContent = count
        ? `선택한 좌석 ${count}매를 예매합니다.`
        : '좌석을 먼저 선택해 주세요.';

    goInfoButton.disabled = count === 0;
    renderSeatStatus();
}

function formatPhoneNumber(value) {
    const digits = normalizePhone(value);
    if (digits.length < 4) return digits;
    if (digits.length < 8) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

function makeBookingNumber() {
    const today = new Date();
    const datePart = today.toISOString().slice(2, 10).replace(/-/g, '');
    const randomPart = Math.floor(1000 + Math.random() * 9000);
    return `YJ${datePart}${randomPart}`;
}

function completeBooking() {
    const form = document.getElementById('booking-form');
    const selectedSeats = getSelectedSeats();

    if (!form.reportValidity()) return;

    if (selectedSeats.length === 0) {
        showToast('좌석을 먼저 선택해 주세요.');
        goToStep(1);
        return;
    }

    const buyer = {
        name: buyerName.value.trim(),
        phone: formatPhoneNumber(buyerPhone.value)
    };

    if (normalizePhone(buyer.phone).length < 10) {
        showToast('전화번호를 다시 확인해 주세요.');
        return;
    }

    const account = makeAccount(buyer.name, buyer.phone);
    const booking = {
        bookingNo: makeBookingNumber(),
        performance: PERFORMANCE_NAME,
        performanceAt: PERFORMANCE_AT,
        accountKey: account.key,
        seats: selectedSeats.map(seat => ({
            id: seat.id,
            label: formatSeat(seat)
        })),
        buyer,
        total: selectedSeats.length * PRICE,
        createdAt: new Date().toISOString()
    };

    const bookings = getBookings();
    bookings.push(booking);
    safeSet('bookings', bookings);

    currentCompletedBooking = booking;
    setCurrentAccount(account, false);
    renderComplete(booking);
    renderSeatMap();
    renderSummaries();
    renderSeatStatus();
    goToStep(3);
}

function renderComplete(booking) {
    completeTitle.textContent = `선택한 좌석 ${booking.seats.length}매 예매가 완료되었습니다`;
    completeDetail.innerHTML = [
        summaryRow('예매번호', escapeHtml(booking.bookingNo)),
        summaryRow('공연', escapeHtml(booking.performance)),
        summaryRow('예매 매수', `${booking.seats.length}매`),
        summaryRow('좌석', booking.seats.map(seat => escapeHtml(seat.label)).join('<br>')),
        summaryRow('예매자', `${escapeHtml(booking.buyer.name)} / ${escapeHtml(booking.buyer.phone)}`),
        summaryRow('결제 금액', formatMoney(booking.total))
    ].join('');
    saveCompleteTicket.disabled = false;
}

function startNewBooking() {
    selectedSeatIds = [];
    activeBlock = null;
    currentCompletedBooking = null;
    if (currentAccount) {
        syncBookingFormWithAccount();
    } else {
        buyerName.value = '';
        buyerPhone.value = '';
    }
    agreeCheck.checked = false;
    saveCompleteTicket.disabled = true;
    renderSeatMap();
    goToStep(1);
}

function renderDday() {
    const target = new Date(PERFORMANCE_AT);
    const diff = target.getTime() - Date.now();
    const days = Math.ceil(diff / 86400000);
    const label = days > 0 ? `D-${days}` : days === 0 ? 'D-Day' : '공연 종료';

    heroDday.textContent = label;
    detailDday.textContent = label;
    heroDate.textContent = PERFORMANCE_DATE_LABEL;
}

function setCurrentAccount(account, showMessage = true) {
    currentAccount = account;
    safeSet('currentAccount', currentAccount);
    loginName.value = account.name;
    loginPhone.value = account.phone;
    syncBookingFormWithAccount();
    renderAccount();
    updateAccountNote();
    updateFSM('wallet');
    if (showMessage) showToast(`${account.name}님으로 로그인했습니다.`);
}

function clearCurrentAccount() {
    currentAccount = null;
    safeRemove('currentAccount');
    loginName.value = '';
    loginPhone.value = '';
    renderAccount();
    updateAccountNote();
    updateFSM('home');
    showToast('로그아웃했습니다.');
}

function bookingBelongsToAccount(booking, account) {
    if (!account) return false;
    if (booking.accountKey) return booking.accountKey === account.key;
    return accountKey(booking.buyer.name, booking.buyer.phone) === account.key;
}

function accountBookings() {
    return getBookings().filter(booking => bookingBelongsToAccount(booking, currentAccount));
}

function renderAccount() {
    if (!currentAccount) {
        accountName.textContent = '로그인 전';
        accountPhone.textContent = '이름과 전화번호를 입력하면 예매 내역이 표시됩니다.';
        logoutAccount.disabled = true;
        ticketWallet.innerHTML = '<p class="wallet-empty">아직 로그인하지 않았습니다. 이름과 전화번호로 로그인하면 본인 티켓을 조회할 수 있습니다.</p>';
        return;
    }

    const bookings = accountBookings();
    const images = getTicketImages();
    accountName.textContent = `${currentAccount.name}님`;
    accountPhone.textContent = currentAccount.phone;
    logoutAccount.disabled = false;

    if (bookings.length === 0) {
        ticketWallet.innerHTML = `
            <div class="wallet-empty">
                아직 저장된 티켓이 없습니다.
                <button class="outline-button wallet-book-button" type="button" data-wallet-book>좌석 예매하기</button>
            </div>
        `;
        return;
    }

    ticketWallet.innerHTML = bookings.map(booking => {
        const savedLabel = images[booking.bookingNo] ? '저장됨' : '이미지 저장';
        return `
            <article class="wallet-ticket">
                <h4>${escapeHtml(booking.performance)}</h4>
                <p><strong>${escapeHtml(booking.bookingNo)}</strong> · ${formatDate(booking.createdAt)}</p>
                <p>${booking.seats.map(seat => escapeHtml(seat.label)).join(', ')}</p>
                <p>${booking.seats.length}매 · ${formatMoney(booking.total)}</p>
                <div class="wallet-ticket-actions">
                    <button type="button" data-save-ticket="${escapeHtml(booking.bookingNo)}">${savedLabel}</button>
                    <button type="button" data-wallet-book>추가 예매</button>
                </div>
            </article>
        `;
    }).join('');
}

function renderSeatStatus() {
    const reservedIds = getReservedSeatIds();

    seatStatusGrid.innerHTML = ['A', 'B', 'C'].map(block => {
        const blockSeats = seats.filter(seat => seat.block === block);
        const counts = blockSeats.reduce((result, seat) => {
            if (seat.blocked) result.blocked += 1;
            else if (selectedSeatIds.includes(seat.id)) result.selected += 1;
            else if (reservedIds.has(seat.id)) result.reserved += 1;
            else result.available += 1;
            return result;
        }, { available: 0, selected: 0, reserved: 0, blocked: 0 });

        return `
            <article class="seat-status-card">
                <h4>${BLOCK_NAMES[block]}블록</h4>
                <strong>${counts.available}석</strong>
                <p>선택 ${counts.selected} · 예매 ${counts.reserved} · 불가 ${counts.blocked}</p>
            </article>
        `;
    }).join('');
}

function drawRoundRect(context, x, y, width, height, radius) {
    context.beginPath();
    context.moveTo(x + radius, y);
    context.lineTo(x + width - radius, y);
    context.quadraticCurveTo(x + width, y, x + width, y + radius);
    context.lineTo(x + width, y + height - radius);
    context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    context.lineTo(x + radius, y + height);
    context.quadraticCurveTo(x, y + height, x, y + height - radius);
    context.lineTo(x, y + radius);
    context.quadraticCurveTo(x, y, x + radius, y);
    context.closePath();
}

function drawWrappedText(context, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    let currentY = y;

    words.forEach(word => {
        const testLine = line ? `${line} ${word}` : word;
        if (context.measureText(testLine).width > maxWidth && line) {
            context.fillText(line, x, currentY);
            line = word;
            currentY += lineHeight;
        } else {
            line = testLine;
        }
    });

    if (line) context.fillText(line, x, currentY);
}

function hashString(value) {
    return [...value].reduce((hash, char) => ((hash << 5) - hash) + char.charCodeAt(0), 0);
}

function drawTicketCode(context, bookingNo, x, y, size) {
    const grid = 11;
    const cell = size / grid;
    const seed = Math.abs(hashString(bookingNo));

    context.fillStyle = '#ffffff';
    context.fillRect(x, y, size, size);
    context.fillStyle = '#172338';

    for (let row = 0; row < grid; row++) {
        for (let col = 0; col < grid; col++) {
            const finder = (row < 3 && col < 3) || (row < 3 && col > 7) || (row > 7 && col < 3);
            const value = (seed + row * 17 + col * 31 + row * col) % 5;
            if (finder || value < 2) {
                context.fillRect(x + col * cell + 2, y + row * cell + 2, cell - 3, cell - 3);
            }
        }
    }
}

function createTicketImage(booking) {
    const canvas = document.createElement('canvas');
    canvas.width = 900;
    canvas.height = 520;
    const context = canvas.getContext('2d');

    context.fillStyle = '#172338';
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.fillStyle = '#f6f7f2';
    drawRoundRect(context, 34, 34, 832, 452, 24);
    context.fill();

    context.fillStyle = '#27655a';
    drawRoundRect(context, 56, 56, 788, 96, 18);
    context.fill();

    context.fillStyle = '#ffffff';
    context.font = 'bold 20px sans-serif';
    context.fillText('HEXA ORCHESTRA DIGITAL TICKET', 84, 96);
    context.font = 'bold 30px sans-serif';
    context.fillText(PERFORMANCE_NAME, 84, 132);

    context.fillStyle = '#18201b';
    context.font = 'bold 24px sans-serif';
    context.fillText(`예매번호 ${booking.bookingNo}`, 84, 205);
    context.font = '18px sans-serif';
    context.fillText(`예매자 ${booking.buyer.name} / ${booking.buyer.phone}`, 84, 244);
    context.fillText(`공연일 ${PERFORMANCE_DATE_LABEL}`, 84, 282);
    context.fillText(`좌석 ${booking.seats.map(seat => seat.label).join(', ')}`, 84, 320);
    context.fillText(`매수 ${booking.seats.length}매 · 금액 ${formatMoney(booking.total)}`, 84, 358);

    context.fillStyle = '#667085';
    context.font = '15px sans-serif';
    drawWrappedText(context, '입장 시 이 디지털 티켓과 예매자 정보를 함께 확인해 주세요.', 84, 424, 520, 22);

    drawTicketCode(context, booking.bookingNo, 650, 214, 150);
    context.fillStyle = '#18201b';
    context.font = 'bold 16px sans-serif';
    context.fillText('연지홀 입장 확인용', 652, 394);

    return canvas.toDataURL('image/png');
}

function saveTicketImage(bookingNo) {
    const booking = getBookings().find(item => item.bookingNo === bookingNo);
    if (!booking) {
        showToast('티켓 정보를 찾을 수 없습니다.');
        return;
    }

    const dataUrl = createTicketImage(booking);
    const images = getTicketImages();
    images[booking.bookingNo] = dataUrl;
    safeSet('ticketImages', images);

    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `ticket-${booking.bookingNo}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();

    renderAccount();
    showToast('디지털 티켓 이미지를 저장했습니다.');
}

function setupMemberFilters() {
    document.querySelectorAll('[data-member-filter]').forEach(button => {
        button.addEventListener('click', () => {
            const filter = button.dataset.memberFilter;
            document.querySelectorAll('[data-member-filter]').forEach(item => item.classList.remove('is-active'));
            button.classList.add('is-active');
            document.querySelectorAll('[data-member-part]').forEach(card => {
                card.classList.toggle('is-hidden', filter !== 'all' && card.dataset.memberPart !== filter);
            });
        });
    });
}

function setupProgramAccordion() {
    document.querySelectorAll('.program-trigger').forEach(button => {
        button.addEventListener('click', () => {
            const item = button.closest('.program-item');
            const willOpen = !item.classList.contains('is-open');
            document.querySelectorAll('.program-item').forEach(program => {
                program.classList.remove('is-open');
                program.querySelector('.program-trigger').setAttribute('aria-expanded', 'false');
            });
            item.classList.toggle('is-open', willOpen);
            button.setAttribute('aria-expanded', String(willOpen));
        });
    });
}

function setupAccountEvents() {
    loginForm.addEventListener('submit', event => {
        event.preventDefault();
        const account = makeAccount(loginName.value, loginPhone.value);
        if (!account.name || normalizePhone(account.phone).length < 10) {
            showToast('이름과 전화번호를 확인해 주세요.');
            return;
        }
        setCurrentAccount(account);
    });

    logoutAccount.addEventListener('click', clearCurrentAccount);

    ticketWallet.addEventListener('click', event => {
        const button = event.target.closest('button');
        if (!button) return;

        if (button.dataset.saveTicket) {
            saveTicketImage(button.dataset.saveTicket);
            return;
        }

        if (button.dataset.walletBook !== undefined) {
            openTicketing();
        }
    });

    viewWallet.addEventListener('click', () => {
        renderAccount();
        updateFSM('wallet');
    });
}

document.getElementById('go-info').addEventListener('click', () => goToStep(2));
document.getElementById('back-seat').addEventListener('click', () => goToStep(1));
document.getElementById('complete-booking').addEventListener('click', completeBooking);
document.getElementById('new-booking').addEventListener('click', startNewBooking);
saveCompleteTicket.addEventListener('click', () => {
    if (currentCompletedBooking) saveTicketImage(currentCompletedBooking.bookingNo);
});

openTicketButtons.forEach(button => {
    button.addEventListener('click', openTicketing);
});

document.querySelectorAll('a[href="#account"]').forEach(link => {
    link.addEventListener('click', () => updateFSM(currentAccount ? 'wallet' : 'login'));
});

document.getElementById('reset-demo').addEventListener('click', () => {
    safeRemove('bookings');
    safeRemove('ticketImages');
    selectedSeatIds = [];
    activeBlock = null;
    currentCompletedBooking = null;
    saveCompleteTicket.disabled = true;
    renderSeatMap();
    renderSummaries();
    renderAccount();
    showToast('예매 데이터를 초기화했습니다.');
});

backBlocks.addEventListener('click', showBlockOverview);

buyerPhone.addEventListener('input', event => {
    event.target.value = formatPhoneNumber(event.target.value);
});

loginPhone.addEventListener('input', event => {
    event.target.value = formatPhoneNumber(event.target.value);
});

document.querySelectorAll('.filter').forEach(button => {
    button.addEventListener('click', () => {
        document.querySelectorAll('.filter').forEach(item => item.classList.remove('is-active'));
        button.classList.add('is-active');
        currentFloor = button.dataset.floor;
        renderSeatMap();
        renderSummaries();
    });
});

setupMemberFilters();
setupProgramAccordion();
setupAccountEvents();
renderDday();
renderSeatMap();
renderSummaries();
renderSeatStatus();
renderAccount();
updateAccountNote();
if (currentAccount) {
    syncBookingFormWithAccount();
}
updateFSM('home');
