// ============================================================
// src/utils/logger.ts — Logger đẹp có màu và timestamp
// ============================================================
// Cung cấp logger thống nhất toàn ứng dụng. Mỗi dòng log sẽ
// hiển thị: [Thời gian] [Mức độ] [Module] Nội dung
// Sử dụng ANSI color codes (không cần thư viện bên ngoài).
// ============================================================

// ── ANSI Color Codes ─────────────────────────────────────────
const colors = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  blue: '\x1b[34m',
  white: '\x1b[37m',
};

// ── Format timestamp ─────────────────────────────────────────
function getTimestamp(): string {
  return new Date().toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

// ── Logger Class ─────────────────────────────────────────────
class Logger {
  private module: string;

  constructor(module: string) {
    this.module = module;
  }

  info(message: string, ...args: unknown[]): void {
    const ts = getTimestamp();
    console.log(
      `${colors.dim}[${ts}]${colors.reset} ${colors.green}[INFO]${colors.reset} ${colors.cyan}[${this.module}]${colors.reset} ${message}`,
      ...args
    );
  }

  warn(message: string, ...args: unknown[]): void {
    const ts = getTimestamp();
    console.warn(
      `${colors.dim}[${ts}]${colors.reset} ${colors.yellow}[WARN]${colors.reset} ${colors.cyan}[${this.module}]${colors.reset} ${message}`,
      ...args
    );
  }

  error(message: string, ...args: unknown[]): void {
    const ts = getTimestamp();
    console.error(
      `${colors.dim}[${ts}]${colors.reset} ${colors.red}[ERROR]${colors.reset} ${colors.cyan}[${this.module}]${colors.reset} ${message}`,
      ...args
    );
  }

  success(message: string, ...args: unknown[]): void {
    const ts = getTimestamp();
    console.log(
      `${colors.dim}[${ts}]${colors.reset} ${colors.magenta}[SUCCESS]${colors.reset} ${colors.cyan}[${this.module}]${colors.reset} ${message}`,
      ...args
    );
  }
}

// ── Factory function ─────────────────────────────────────────
export function createLogger(module: string): Logger {
  return new Logger(module);
}
