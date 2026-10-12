// State Machine & Calculator State
const STATE = {
  INPUTTING: 'INPUTTING',
  CALCULATED: 'CALCULATED',
  ERROR: 'ERROR'
};

let currentState = STATE.INPUTTING;
let currentOperand = '0';
let previousOperand = '';
let operation = undefined;
let history = [];

// DOM Elements
const formulaDisplay = document.getElementById('formula-display');
const mainDisplay = document.getElementById('main-display');
const historyList = document.getElementById('history-list');
const toggleHistoryBtn = document.getElementById('toggle-history-btn');
const historyPanel = document.getElementById('history-panel');
const clearHistoryBtn = document.getElementById('clear-history-btn');
const toast = document.getElementById('toast-notification');

// Khởi tạo ứng dụng
document.addEventListener('DOMContentLoaded', () => {
  loadHistoryFromStorage();
  updateDisplay();
  setupEventListeners();
});

// Đồng bộ hóa hiển thị
function updateDisplay() {
  if (currentState === STATE.ERROR) {
    mainDisplay.textContent = currentOperand;
    formulaDisplay.textContent = '';
    return;
  }

  // Định dạng hiển thị số lớn hoặc số thập phân
  mainDisplay.textContent = formatDisplayNumber(currentOperand);

  if (operation != null) {
    formulaDisplay.textContent = `${formatDisplayNumber(previousOperand)} ${getOperatorSymbol(operation)}`;
  } else {
    formulaDisplay.textContent = '';
  }
}

// Định dạng số hiển thị đẹp mắt
function formatDisplayNumber(numberStr) {
  if (numberStr === 'Error: Division by zero' || numberStr === 'Error') return numberStr;
  if (numberStr === '-') return '-';
  
  const parts = numberStr.split('.');
  const integerPart = parts[0];
  const decimalPart = parts[1];

  let formattedInteger = '';
  if (!isNaN(parseFloat(integerPart))) {
    formattedInteger = parseFloat(integerPart).toLocaleString('en-US', { maximumFractionDigits: 0 });
  } else {
    formattedInteger = integerPart;
  }

  if (decimalPart != null) {
    return `${formattedInteger}.${decimalPart}`;
  } else {
    return formattedInteger;
  }
}

function getOperatorSymbol(op) {
  switch (op) {
    case '/': return '÷';
    case '*': return '×';
    case '-': return '−';
    case '+': return '+';
    default: return op;
  }
}

// Xử lý nhập số
function appendNumber(number) {
  if (currentState === STATE.ERROR) return;
  
  if (currentState === STATE.CALCULATED) {
    currentOperand = '';
    currentState = STATE.INPUTTING;
  }

  if (number === '.' && currentOperand.includes('.')) return;
  if (currentOperand === '0' && number !== '.') {
    currentOperand = number;
  } else {
    currentOperand = currentOperand + number;
  }
  updateDisplay();
}

// Xử lý chọn toán tử
function chooseOperation(op) {
  if (currentState === STATE.ERROR) return;

  // Nếu đang nhập dở toán tử mà muốn đổi toán tử khác (chuẩn hóa toán tử nhập liên tiếp)
  if (currentOperand === '0' && previousOperand !== '' && operation !== undefined) {
    operation = op;
    updateDisplay();
    return;
  }

  if (currentOperand === '') return;
  
  if (previousOperand !== '') {
    compute();
  }

  if (currentState !== STATE.ERROR) {
    operation = op;
    previousOperand = currentOperand;
    currentOperand = '0';
    currentState = STATE.INPUTTING;
    updateDisplay();
  }
}

// Thực hiện tính toán
function compute() {
  let computation;
  const prev = parseFloat(previousOperand);
  const current = parseFloat(currentOperand);

  if (isNaN(prev) || isNaN(current)) return;

  switch (operation) {
    case '+':
      computation = prev + current;
      break;
    case '-':
      computation = prev - current;
      break;
    case '*':
      computation = prev * current;
      break;
    case '/':
      if (current === 0) {
        showError('Error: Division by zero');
        return;
      }
      computation = prev / current;
      break;
    default:
      return;
  }

  // Giải quyết lỗi dấu phẩy động của JS (ví dụ: 0.1 + 0.2)
  const precision = 12;
  const result = parseFloat(computation.toPrecision(precision));
  
  // Lưu vào lịch sử trước khi cập nhật state
  const expression = `${previousOperand} ${getOperatorSymbol(operation)} ${currentOperand}`;
  saveHistoryItem(expression, result.toString());

  currentOperand = result.toString();
  operation = undefined;
  previousOperand = '';
  currentState = STATE.CALCULATED;
  updateDisplay();
}

// Đảo dấu số âm/dương
function toggleSign() {
  if (currentState === STATE.ERROR) return;
  if (currentOperand === '0') return;

  if (currentOperand.startsWith('-')) {
    currentOperand = currentOperand.slice(1);
  } else {
    currentOperand = '-' + currentOperand;
  }
  updateDisplay();
}

// Tính phần trăm
function inputPercent() {
  if (currentState === STATE.ERROR) return;
  const current = parseFloat(currentOperand);
  if (isNaN(current)) return;

  currentOperand = (current / 100).toString();
  currentState = STATE.INPUTTING;
  updateDisplay();
}

// Xóa ký tự cuối cùng (Backspace)
function deleteLast() {
  if (currentState === STATE.ERROR) {
    clearAll();
    return;
  }
  if (currentState === STATE.CALCULATED) return;

  currentOperand = currentOperand.toString().slice(0, -1);
  if (currentOperand === '' || currentOperand === '-') {
    currentOperand = '0';
  }
  updateDisplay();
}

// Reset toàn bộ máy tính
function clearAll() {
  currentOperand = '0';
  previousOperand = '';
  operation = undefined;
  currentState = STATE.INPUTTING;
  updateDisplay();
}

// Hiển thị lỗi
function showError(message) {
  currentOperand = message;
  currentState = STATE.ERROR;
  updateDisplay();
  showToast(message);
}

// Toast Notification
function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// --- QUẢN LÝ LỊCH SỬ (LOCALSTORAGE) ---
function saveHistoryItem(expression, result) {
  const item = {
    id: Date.now(),
    expression: expression,
    result: result
  };
  history.unshift(item);
  if (history.length > 50) {
    history.pop();
  }
  localStorage.setItem('calc_history', JSON.stringify(history));
  renderHistory();
}

function loadHistoryFromStorage() {
  const stored = localStorage.getItem('calc_history');
  if (stored) {
    history = JSON.parse(stored);
  }
  renderHistory();
}

function renderHistory() {
  historyList.innerHTML = '';
  if (history.length === 0) {
    historyList.innerHTML = '<div class="empty-history">Chưa có lịch sử phép tính nào</div>';
    return;
  }

  history.forEach(item => {
    const div = document.createElement('div');
    div.className = 'history-item';
    div.innerHTML = `
      <div class="history-expr">${item.expression} =</div>
      <div class="history-res">${formatDisplayNumber(item.result)}</div>
    `;
    div.addEventListener('click', () => {
      if (currentState !== STATE.ERROR) {
        currentOperand = item.result;
        currentState = STATE.CALCULATED;
        updateDisplay();
      }
    });
    historyList.appendChild(div);
  });
}

function clearHistory() {
  history = [];
  localStorage.removeItem('calc_history');
  renderHistory();
  showToast('Đã xóa toàn bộ lịch sử');
}

// --- SỰ KIỆN & TƯƠNG TÁC ---
function setupEventListeners() {
  // Click các nút trên bàn phím máy tính
  document.querySelectorAll('.btn-number').forEach(button => {
    button.addEventListener('click', () => {
      appendNumber(button.getAttribute('data-val'));
    });
  });

  document.querySelectorAll('.btn-operator').forEach(button => {
    button.addEventListener('click', () => {
      chooseOperation(button.getAttribute('data-operator'));
    });
  });

  document.querySelectorAll('.btn-action').forEach(button => {
    button.addEventListener('click', () => {
      const action = button.getAttribute('data-action');
      if (action === 'clear') clearAll();
      if (action === 'backspace') deleteLast();
      if (action === 'percent') inputPercent();
      if (action === 'toggle-sign') toggleSign();
    });
  });

  document.getElementById('btn-equals').addEventListener('click', () => {
    if (currentState !== STATE.ERROR) {
      compute();
    }
  });

  // Toggle History Panel trên Mobile
  toggleHistoryBtn.addEventListener('click', () => {
    historyPanel.classList.toggle('active');
  });

  // Clear History
  clearHistoryBtn.addEventListener('click', clearHistory);

  // Lắng nghe sự kiện bàn phím vật lý
  document.addEventListener('keydown', (event) => {
    const key = event.key;

    // Ngăn chặn hành vi mặc định của trình duyệt cho một số phím đặc biệt
    if (key === '/' || key === 'Backspace') {
      event.preventDefault();
    }

    // Tìm nút tương ứng trên giao diện để tạo hiệu ứng nhấn phím trực quan
    let targetBtn = null;

    if (!isNaN(key) && key !== ' ') {
      appendNumber(key);
      targetBtn = document.querySelector(`.btn-number[data-val="${key}"]`);
    } else if (key === '.') {
      appendNumber('.');
      targetBtn = document.querySelector(`.btn-number[data-val="."]`);
    } else if (['+', '-', '*', '/'].includes(key)) {
      chooseOperation(key);
      targetBtn = document.querySelector(`.btn-operator[data-operator="${key}"]`);
    } else if (key === 'Enter' || key === '=') {
      if (currentState !== STATE.ERROR) {
        compute();
      }
      targetBtn = document.getElementById('btn-equals');
    } else if (key === 'Backspace') {
      deleteLast();
      targetBtn = document.getElementById('btn-backspace');
    } else if (key === 'Escape' || key.toLowerCase() === 'c') {
      clearAll();
      targetBtn = document.getElementById('btn-clear');
    } else if (key === '%') {
      inputPercent();
      targetBtn = document.querySelector(`.btn-action[data-action="percent"]`);
    }

    // Thêm hiệu ứng active-press khi nhấn phím vật lý
    if (targetBtn) {
      targetBtn.classList.add('active-press');
      setTimeout(() => {
        targetBtn.classList.remove('active-press');
      }, 150);
    }
  });
}