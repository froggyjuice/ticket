const PRICE = 10000;
const PERFORMANCE_NAME = '제1회 HEXA 오케스트라 정기연주회';
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
const toast = document.getElementById('toast');

let currentFloor = 'all';
let activeBlock = null;
let selectedSeatIds = [];

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

function goToStep(step) {
    Object.entries(screens).forEach(([key, screen]) => {
        screen.classList.toggle('is-active', Number(key) === step);
    });

    steps.forEach(button => {
        const buttonStep = Number(button.dataset.step);
        button.classList.toggle('is-active', buttonStep === step);
        button.disabled = buttonStep > step;
    });

    renderSummaries();
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
}

function toggleSeat(seat) {
    if (selectedSeatIds.includes(seat.id)) {
        selectedSeatIds = selectedSeatIds.filter(id => id !== seat.id);
    } else {
        selectedSeatIds.push(seat.id);
    }

    renderSeatMap();
    renderSummaries();
}

function summaryRow(label, value) {
    return `<div class="summary-row"><span>${label}</span><strong>${value}</strong></div>`;
}

function renderSummaries() {
    const selectedSeats = getSelectedSeats();
    const count = selectedSeats.length;
    const selectedLabels = count ? selectedSeats.map(formatSeat).join('<br>') : '선택 전';
    const total = count * PRICE;

    summarySeat.innerHTML = [
        summaryRow('공연', PERFORMANCE_NAME),
        summaryRow('선택 좌석', `${count}석`),
        summaryRow('좌석', selectedLabels),
        summaryRow('금액', formatMoney(total))
    ].join('');

    summaryPayment.innerHTML = [
        summaryRow('공연', PERFORMANCE_NAME),
        summaryRow('예매 매수', `${count}매`),
        summaryRow('좌석', selectedLabels),
        summaryRow('총 결제 금액', formatMoney(total))
    ].join('');

    confirmMessage.textContent = count
        ? `선택한 좌석 ${count}매를 예매합니다.`
        : '좌석을 먼저 선택해 주세요.';

    document.getElementById('go-info').disabled = count === 0;
}

function formatPhoneNumber(value) {
    const digits = value.replace(/\D/g, '').slice(0, 11);
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

    const booking = {
        bookingNo: makeBookingNumber(),
        performance: PERFORMANCE_NAME,
        seats: selectedSeats.map(seat => ({
            id: seat.id,
            label: formatSeat(seat)
        })),
        buyer: {
            name: buyerName.value.trim(),
            phone: buyerPhone.value.trim()
        },
        total: selectedSeats.length * PRICE,
        createdAt: new Date().toISOString()
    };

    const bookings = getBookings();
    bookings.push(booking);
    safeSet('bookings', bookings);
    renderComplete(booking);
    goToStep(3);
}

function renderComplete(booking) {
    completeTitle.textContent = `선택한 좌석 ${booking.seats.length}매 예매가 완료되었습니다`;
    completeDetail.innerHTML = [
        summaryRow('예매번호', booking.bookingNo),
        summaryRow('공연', booking.performance),
        summaryRow('예매 매수', `${booking.seats.length}매`),
        summaryRow('좌석', booking.seats.map(seat => seat.label).join('<br>')),
        summaryRow('예매자', `${booking.buyer.name} / ${booking.buyer.phone}`),
        summaryRow('결제 금액', formatMoney(booking.total))
    ].join('');
}

function startNewBooking() {
    selectedSeatIds = [];
    activeBlock = null;
    buyerName.value = '';
    buyerPhone.value = '';
    agreeCheck.checked = false;
    renderSeatMap();
    goToStep(1);
}

document.getElementById('go-info').addEventListener('click', () => goToStep(2));
document.getElementById('back-seat').addEventListener('click', () => goToStep(1));
document.getElementById('complete-booking').addEventListener('click', completeBooking);
document.getElementById('new-booking').addEventListener('click', startNewBooking);
document.getElementById('reset-demo').addEventListener('click', () => {
    safeRemove('bookings');
    startNewBooking();
    showToast('예매 데이터를 초기화했습니다.');
});

backBlocks.addEventListener('click', showBlockOverview);

buyerPhone.addEventListener('input', event => {
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

renderSeatMap();
renderSummaries();
