import { test, expect } from '@playwright/test';

const APP_URL = 'http://localhost:3000';

test.describe('Pocket Calculator - [TEA 1.27.2] Test Suite', () => {

  test.beforeEach(async ({ page }) => {
    // Khởi tạo trang và dọn dẹp localStorage trước mỗi test case
    await page.goto(APP_URL);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  // ==========================================
  // [SC-01]: KIỂM THỬ PHÉP TÍNH CƠ BẢN & LÀM TRÒN SỐ THẬP PHÂN
  // ==========================================
  test('[SC-01] Phép tính cơ bản và xử lý số thập phân chính xác', async ({ page }) => {
    // Thực hiện phép tính: 0.1 + 0.2
    await page.click('button:has-text("0")');
    await page.click('button:has-text(".")');
    await page.click('button:has-text("1")');
    
    await page.click('button:has-text("+")');
    
    await page.click('button:has-text("0")');
    await page.click('button:has-text(".")');
    await page.click('button:has-text("2")');
    
    // Kiểm tra màn hình công thức hiển thị đúng tiến trình
    const formula = page.locator('#formula-display');
    await expect(formula).toHaveText('0.1 +');

    // Nhấn dấu bằng để tính kết quả
    await page.click('#btn-equals');

    // Kết quả phải là 0.3 (tránh lỗi dấu phẩy động 0.30000000000000004 của JS)
    const mainDisplay = page.locator('#main-display');
    await expect(mainDisplay).toHaveText('0.3');
  });

  test('[SC-01] Phép tính nhân và chia số lớn', async ({ page }) => {
    // Phép tính: 12 × 5
    await page.click('button:has-text("1")');
    await page.click('button:has-text("2")');
    await page.click('button[data-operator="*"]'); // Nút ×
    await page.click('button:has-text("5")');
    await page.click('#btn-equals');

    const mainDisplay = page.locator('#main-display');
    await expect(mainDisplay).toHaveText('60');
  });

  // ==========================================
  // [SC-02]: KIỂM THỬ XỬ LÝ NGOẠI LỆ & CHIA CHO 0
  // ==========================================
  test('[SC-02] Ngăn chặn lỗi chia cho 0 và hiển thị thông báo lỗi', async ({ page }) => {
    // Phép tính: 9 ÷ 0
    await page.click('button:has-text("9")');
    await page.click('button[data-operator="/"]'); // Nút ÷
    await page.click('button:has-text("0")');
    await page.click('#btn-equals');

    // Màn hình hiển thị trạng thái lỗi hoặc thông báo lỗi đặc trưng
    const mainDisplay = page.locator('#main-display');
    await expect(mainDisplay).toHaveText(/Error|Lỗi|Infinity/i);

    // Kiểm tra Toast Notification xuất hiện cảnh báo người dùng
    const toast = page.locator('#toast-notification');
    await expect(toast).toBeVisible();
  });

  test('[SC-02] Tự động chuẩn hóa toán tử nhập liên tiếp', async ({ page }) => {
    // Nhập liên tiếp các toán tử: 5 + - * 3
    await page.click('button:has-text("5")');
    await page.click('button[data-operator="+"]');
    await page.click('button[data-operator="-"]');
    await page.click('button[data-operator="*"]'); // Toán tử cuối cùng phải được giữ lại
    await page.click('button:has-text("3")');
    await page.click('#btn-equals');

    // Kết quả phải là 5 * 3 = 15
    const mainDisplay = page.locator('#main-display');
    await expect(mainDisplay).toHaveText('15');
  });

  // ==========================================
  // [SC-03]: KIỂM THỬ LƯU TRỮ & TƯƠNG TÁC LỊCH SỬ (HISTORY)
  // ==========================================
  test('[SC-03] Tự động lưu lịch sử và khôi phục phép tính khi click', async ({ page }) => {
    // Thực hiện phép tính thứ nhất: 7 + 8 = 15
    await page.click('button:has-text("7")');
    await page.click('button[data-operator="+"]');
    await page.click('button:has-text("8")');
    await page.click('#btn-equals');

    // Kiểm tra xem mục lịch sử có xuất hiện trong danh sách không
    const firstHistoryItem = page.locator('.history-item').first();
    await expect(firstHistoryItem).toBeVisible();
    await expect(firstHistoryItem.locator('.history-expr')).toHaveText('7 + 8 =');
    await expect(firstHistoryItem.locator('.history-res')).toHaveText('15');

    // Nhấn nút xóa màn hình (C) để đưa máy tính về trạng thái 0
    await page.click('#btn-clear');
    const mainDisplay = page.locator('#main-display');
    await expect(mainDisplay).toHaveText('0');

    // Click vào mục lịch sử vừa lưu để khôi phục kết quả
    await firstHistoryItem.click();
    await expect(mainDisplay).toHaveText('15');
  });

  test('[SC-03] Xóa toàn bộ lịch sử phép tính', async ({ page }) => {
    // Tạo một phép tính bất kỳ để sinh lịch sử
    await page.click('button:has-text("2")');
    await page.click('button[data-operator="+"]');
    await page.click('button:has-text("2")');
    await page.click('#btn-equals');

    // Đảm bảo lịch sử đã được ghi nhận
    await expect(page.locator('.history-item')).toHaveCount(1);

    // Click nút xóa toàn bộ lịch sử
    await page.click('#clear-history-btn');

    // Danh sách lịch sử phải hiển thị trạng thái trống
    const emptyHistoryMsg = page.locator('.empty-history');
    await expect(emptyHistoryMsg).toBeVisible();
    await expect(page.locator('.history-item')).toHaveCount(0);
  });

  // ==========================================
  // [SC-04]: KIỂM THỬ TƯƠNG TÁC QUA BÀN PHÍM VẬT LÝ
  // ==========================================
  test('[SC-04] Lắng nghe và xử lý chính xác các phím số và toán tử từ bàn phím', async ({ page }) => {
    // Giả lập gõ phím từ bàn phím vật lý: "4", "*", "2", "Enter"
    await page.keyboard.press('4');
    await page.keyboard.press('*');
    await page.keyboard.press('2');
    await page.keyboard.press('Enter');

    // Kiểm tra kết quả hiển thị trên màn hình chính
    const mainDisplay = page.locator('#main-display');
    await expect(mainDisplay).toHaveText('8');
  });

  test('[SC-04] Sử dụng Backspace để xóa ký tự và Escape để xóa sạch (Clear)', async ({ page }) => {
    // Gõ số "123" từ bàn phím
    await page.keyboard.press('1');
    await page.keyboard.press('2');
    await page.keyboard.press('3');
    
    const mainDisplay = page.locator('#main-display');
    await expect(mainDisplay).toHaveText('123');

    // Nhấn Backspace để xóa số cuối cùng (số 3)
    await page.keyboard.press('Backspace');
    await expect(mainDisplay).toHaveText('12');

    // Nhấn Escape để xóa sạch toàn bộ màn hình về 0
    await page.keyboard.press('Escape');
    await expect(mainDisplay).toHaveText('0');
  });
});