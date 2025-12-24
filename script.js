// ============================================
// 설정 (Google Apps Script 웹 앱 URL을 여기에 입력하세요)
// ============================================
const CONFIG = {
    // Google Apps Script 웹 앱 URL (배포 후 생성되는 URL을 입력)
    API_URL: 'https://script.google.com/macros/s/AKfycbwNMbNRC5-ilClzYTJQYoXr9nPJhx60JxQOYtJSLb6uJirqe9tAznFSCbZYpMFjBE13/exec',

    // 직원 확인 암호 (원하는 암호로 변경하세요)
    STAFF_PASSWORD: '0426'
};

// ============================================
// DOM 요소 참조
// ============================================
const elements = {
    // 페이지
    loginPage: document.getElementById('loginPage'),
    stampPage: document.getElementById('stampPage'),

    // 로그인 폼
    loginForm: document.getElementById('loginForm'),
    customerName: document.getElementById('customerName'),
    customerPhone: document.getElementById('customerPhone'),

    // 도장 페이지
    backBtn: document.getElementById('backBtn'),
    displayName: document.getElementById('displayName'),
    currentStamps: document.getElementById('currentStamps'),
    stampGrid: document.getElementById('stampGrid'),
    couponCount: document.getElementById('couponCount'),
    couponNotice: document.getElementById('couponNotice'),
    addStampBtn: document.getElementById('addStampBtn'),

    // 모달
    staffModal: document.getElementById('staffModal'),
    closeModal: document.getElementById('closeModal'),
    staffPassword: document.getElementById('staffPassword'),
    passwordError: document.getElementById('passwordError'),
    confirmStamp: document.getElementById('confirmStamp'),

    // 성공 모달
    successModal: document.getElementById('successModal'),
    successTitle: document.getElementById('successTitle'),
    successMessage: document.getElementById('successMessage'),
    closeSuccessModal: document.getElementById('closeSuccessModal'),

    // 로딩
    loadingOverlay: document.getElementById('loadingOverlay')
};

// ============================================
// 상태 관리
// ============================================
let currentUser = {
    name: '',
    phone: '',
    stamps: 0,
    coupons: 0
};

// ============================================
// 유틸리티 함수
// ============================================

// 전화번호 포맷팅 (자동으로 하이픈 추가)
function formatPhoneNumber(value) {
    const numbers = value.replace(/[^\d]/g, '');
    if (numbers.length <= 3) {
        return numbers;
    } else if (numbers.length <= 7) {
        return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    } else {
        return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
    }
}

// 전화번호 유효성 검사
function isValidPhone(phone) {
    const phoneRegex = /^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/;
    return phoneRegex.test(phone.replace(/-/g, ''));
}

// 로딩 표시/숨김
function showLoading() {
    elements.loadingOverlay.classList.add('active');
}

function hideLoading() {
    elements.loadingOverlay.classList.remove('active');
}

// 페이지 전환
function showPage(page) {
    elements.loginPage.classList.remove('active');
    elements.stampPage.classList.remove('active');

    if (page === 'login') {
        elements.loginPage.classList.add('active');
    } else if (page === 'stamp') {
        elements.stampPage.classList.add('active');
    }
}

// 모달 표시/숨김
function showModal(modal) {
    modal.classList.add('active');
}

function hideModal(modal) {
    modal.classList.remove('active');
}

// ============================================
// 도장 그리드 렌더링
// ============================================
function renderStampGrid(stamps) {
    elements.stampGrid.innerHTML = '';

    for (let i = 1; i <= 10; i++) {
        const slot = document.createElement('div');
        slot.className = 'stamp-slot' + (i <= stamps ? ' filled' : '');
        slot.setAttribute('data-number', i);
        elements.stampGrid.appendChild(slot);
    }
}

// ============================================
// 사용자 정보 업데이트
// ============================================
function updateUserDisplay(data) {
    currentUser.stamps = data.stamps || 0;
    currentUser.coupons = data.coupons || 0;

    elements.displayName.textContent = currentUser.name;
    elements.currentStamps.textContent = currentUser.stamps;
    elements.couponCount.textContent = currentUser.coupons;

    renderStampGrid(currentUser.stamps);

    // 쿠폰 안내 메시지 업데이트
    if (currentUser.coupons > 0) {
        elements.couponNotice.textContent = `무료 음료 ${currentUser.coupons}잔을 사용하실 수 있어요!`;
    } else {
        elements.couponNotice.textContent = '무료 음료 쿠폰을 모아보세요!';
    }
}

// ============================================
// API 통신 함수
// ============================================

// 고객 정보 조회 또는 생성
async function getOrCreateCustomer(name, phone) {
    showLoading();

    try {
        const response = await fetch(CONFIG.API_URL, {
            method: 'POST',
            mode: 'no-cors', // CORS 이슈 방지
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'getOrCreate',
                name: name,
                phone: phone
            })
        });

        // no-cors 모드에서는 응답을 읽을 수 없으므로
        // JSONP 방식 또는 doGet을 사용해야 합니다
        // 아래는 doGet 방식으로 변경
        const url = `${CONFIG.API_URL}?action=getOrCreate&name=${encodeURIComponent(name)}&phone=${encodeURIComponent(phone)}`;
        const result = await fetch(url);
        const data = await result.json();

        hideLoading();
        return data;

    } catch (error) {
        hideLoading();
        console.error('API 오류:', error);

        // API 연결 실패시 로컬 스토리지 사용 (백업)
        return getLocalData(name, phone);
    }
}

// 도장 추가 함수 (v2.0 - 다중 도장 지원)
async function addStamp() {
    const password = document.getElementById('staffPassword').value;
    const stampCount = parseInt(document.getElementById('stampCount').value) || 1;

    if (password !== CONFIG.STAFF_PASSWORD) {
        alert('암호가 올바르지 않습니다.');
        return;
    }

    try {
        const response = await fetch(CONFIG.API_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'addStamp',
                phone: currentUser.phone,
                count: stampCount
            })
        });

        const result = await response.json();
        if (result.success) {
            alert('도장 ' + stampCount + '개가 추가되었습니다!');
            closeStampPopup();
            updateStampDisplay();
        }
    } catch (error) {
        alert('오류가 발생했습니다.');
    }
}

// ============================================
// 로컬 스토리지 백업 함수 (오프라인 대응)
// ============================================

function getLocalKey(name, phone) {
    return `stamp_${phone.replace(/-/g, '')}`;
}

function getLocalData(name, phone) {
    const key = getLocalKey(name, phone);
    const stored = localStorage.getItem(key);

    if (stored) {
        return JSON.parse(stored);
    }

    // 신규 고객
    const newData = {
        name: name,
        phone: phone,
        stamps: 0,
        coupons: 0,
        isNew: true
    };
    localStorage.setItem(key, JSON.stringify(newData));
    return newData;
}

function addLocalStamp(name, phone) {
    const key = getLocalKey(name, phone);
    const data = getLocalData(name, phone);

    data.stamps += 1;
    data.newCoupon = false;

    // 10개 모으면 쿠폰 발급
    if (data.stamps >= 10) {
        data.stamps = 0;
        data.coupons += 1;
        data.newCoupon = true;
    }

    localStorage.setItem(key, JSON.stringify(data));
    return data;
}

// ============================================
// 이벤트 핸들러
// ============================================

// 전화번호 입력 자동 포맷팅
elements.customerPhone.addEventListener('input', function(e) {
    const formatted = formatPhoneNumber(e.target.value);
    e.target.value = formatted;
});

// 로그인 폼 제출
elements.loginForm.addEventListener('submit', async function(e) {
    e.preventDefault();

    const name = elements.customerName.value.trim();
    const phone = elements.customerPhone.value.trim();

    // 유효성 검사
    if (!name) {
        alert('이름을 입력해주세요.');
        elements.customerName.focus();
        return;
    }

    if (!isValidPhone(phone)) {
        alert('올바른 휴대폰 번호를 입력해주세요.');
        elements.customerPhone.focus();
        return;
    }

    // 사용자 정보 저장
    currentUser.name = name;
    currentUser.phone = phone;

    // API 호출 또는 로컬 데이터 조회
    const data = await getOrCreateCustomer(name, phone);

    // 화면 업데이트
    updateUserDisplay(data);

    // 도장 페이지로 이동
    showPage('stamp');

    // 신규 고객 환영 메시지
    if (data.isNew) {
        setTimeout(() => {
            elements.successTitle.textContent = '환영합니다!';
            elements.successMessage.textContent = `${name}님, 첫 방문을 환영해요. 도장을 모아 무료 음료를 받아보세요!`;
            showModal(elements.successModal);
        }, 300);
    }
});

// 뒤로가기 버튼
elements.backBtn.addEventListener('click', function() {
    showPage('login');
    // 폼 초기화
    elements.loginForm.reset();
});

// 도장 찍기 버튼
elements.addStampBtn.addEventListener('click', function() {
    elements.passwordError.textContent = '';
    elements.staffPassword.value = '';
    showModal(elements.staffModal);
    elements.staffPassword.focus();
});

// 모달 닫기
elements.closeModal.addEventListener('click', function() {
    hideModal(elements.staffModal);
});

// 모달 외부 클릭시 닫기
elements.staffModal.addEventListener('click', function(e) {
    if (e.target === elements.staffModal) {
        hideModal(elements.staffModal);
    }
});

// 도장 확인 (암호 입력 후)
elements.confirmStamp.addEventListener('click', async function() {
    const password = elements.staffPassword.value;

    if (password !== CONFIG.STAFF_PASSWORD) {
        elements.passwordError.textContent = '암호가 올바르지 않습니다.';
        elements.staffPassword.value = '';
        elements.staffPassword.focus();
        return;
    }

    hideModal(elements.staffModal);

    // 도장 추가 API 호출
    const data = await addStamp(currentUser.name, currentUser.phone);

    // 화면 업데이트
    updateUserDisplay(data);

    // 성공 메시지
    if (data.newCoupon) {
        elements.successTitle.textContent = '축하합니다!';
        elements.successMessage.textContent = '10개 도장을 모두 모아 무료 음료 쿠폰이 발급되었습니다!';
    } else {
        elements.successTitle.textContent = '도장이 찍혔습니다!';
        elements.successMessage.textContent = `현재 ${data.stamps}개의 도장이 모였어요. ${10 - data.stamps}개 더 모으면 무료 음료!`;
    }
    showModal(elements.successModal);
});

// 성공 모달 닫기
elements.closeSuccessModal.addEventListener('click', function() {
    hideModal(elements.successModal);
});

elements.successModal.addEventListener('click', function(e) {
    if (e.target === elements.successModal) {
        hideModal(elements.successModal);
    }
});

// 엔터키로 도장 확인
elements.staffPassword.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        elements.confirmStamp.click();
    }
});

// ============================================
// 초기화
// ============================================
function init() {
    // 도장 그리드 초기 렌더링
    renderStampGrid(0);

    // API URL 설정 확인
    if (CONFIG.API_URL === 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE') {
        console.warn('Google Apps Script URL이 설정되지 않았습니다. 로컬 스토리지 모드로 작동합니다.');
    }
}

// 페이지 로드시 초기화
document.addEventListener('DOMContentLoaded', init);

// ========== v2.0 쿠폰 사용 기능 ==========

// 쿠폰 팝업 열기
function openCouponPopup() {
    const couponCount = parseInt(document.getElementById('couponCount').textContent) || 0;

    if (couponCount <= 0) {
        alert('사용 가능한 쿠폰이 없습니다.');
        return;
    }

    document.getElementById('currentCouponCount').textContent = couponCount;
    document.getElementById('couponStaffPassword').value = '';
    document.getElementById('couponPopup').style.display = 'flex';
}

// 쿠폰 팝업 닫기
function closeCouponPopup() {
    document.getElementById('couponPopup').style.display = 'none';
}

// 쿠폰 사용 (직원 암호 확인 포함)
async function useCoupon() {
    const password = document.getElementById('couponStaffPassword').value;

    // 직원 암호 확인
    if (password !== CONFIG.STAFF_PASSWORD) {
        alert('암호가 올바르지 않습니다.');
        return;
    }

    try {
        const response = await fetch(CONFIG.API_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'useCoupon',
                phone: currentUser.phone
            })
        });

        const result = await response.json();
        if (result.success) {
            alert('쿠폰이 사용되었습니다!');
            closeCouponPopup();
            updateStampDisplay();
        } else {
            alert(result.message || '쿠폰 사용에 실패했습니다.');
        }
    } catch (error) {
        alert('오류가 발생했습니다.');
    }
}