// バーコード・QRコードスキャン機能 - 製造業現場向け
import { logSecurityEvent } from './securityUtils';
import { showError, showSuccess } from './errorHandling';

// =============================================================================
// スキャン結果の型定義
// =============================================================================

export interface ScanResult {
  value: string;
  format: 'QR_CODE' | 'CODE_128' | 'CODE_39' | 'EAN_13' | 'EAN_8' | 'UPC_A' | 'UPC_E' | 'DATA_MATRIX' | 'PDF_417' | 'UNKNOWN';
  timestamp: string;
  confidence: number;
  rawData?: any;
}

export interface ManufacturingCode {
  type: 'production_number' | 'part_number' | 'serial_number' | 'lot_number' | 'material_code' | 'machine_id' | 'worker_id' | 'unknown';
  value: string;
  parsedData?: {
    prefix?: string;
    year?: string;
    sequence?: string;
    category?: string;
    metadata?: Record<string, any>;
  };
}

// =============================================================================
// バーコードパターン解析
// =============================================================================

export class ManufacturingCodeParser {
  // 製造業で一般的なコードパターン
  private static patterns = [
    // 製番パターン (例: PROD-2024-001, P240001, 24001-A)
    {
      type: 'production_number' as const,
      regex: /^(PROD|P|製)[-]?(\d{4})[-]?(\d{3,6})([A-Z]?)$/i,
      description: '製番（生産番号）'
    },
    // 品番パターン (例: PART-ABC-123, PT123456)  
    {
      type: 'part_number' as const,
      regex: /^(PART|PT|品)[-]?([A-Z0-9]{2,10})[-]?(\d{3,6})$/i,
      description: '品番'
    },
    // シリアル番号 (例: SN123456789, S240001)
    {
      type: 'serial_number' as const,
      regex: /^(SN|S|串)[-]?(\d{6,12})$/i,
      description: 'シリアル番号'
    },
    // ロット番号 (例: LOT-20240101, L240101)
    {
      type: 'lot_number' as const,
      regex: /^(LOT|L|ロット)[-]?(\d{6,8})$/i,
      description: 'ロット番号'
    },
    // 材料コード (例: MAT-ST-001, M123)
    {
      type: 'material_code' as const,
      regex: /^(MAT|M|材)[-]?([A-Z]{2,4})[-]?(\d{3,6})$/i,
      description: '材料コード'
    },
    // 機械ID (例: MCH-001, MACHINE-A1)
    {
      type: 'machine_id' as const,
      regex: /^(MCH|MACHINE|機)[-]?([A-Z0-9]{1,4})(\d{1,3})?$/i,
      description: '機械ID'
    },
    // 作業者ID (例: WKR-001, WORKER-123)
    {
      type: 'worker_id' as const,
      regex: /^(WKR|WORKER|作業者)[-]?(\d{3,6})$/i,
      description: '作業者ID'
    }
  ];

  public static parseCode(code: string): ManufacturingCode {
    const trimmedCode = code.trim().toUpperCase();
    
    for (const pattern of this.patterns) {
      const match = trimmedCode.match(pattern.regex);
      if (match) {
        const [, prefix, ...parts] = match;
        
        return {
          type: pattern.type,
          value: code,
          parsedData: {
            prefix,
            sequence: parts[parts.length - 1],
            year: parts.length > 1 && parts[0].length === 4 ? parts[0] : undefined,
            category: parts.length > 2 ? parts[1] : undefined,
            metadata: {
              description: pattern.description,
              pattern: pattern.regex.source,
              fullMatch: match[0]
            }
          }
        };
      }
    }
    
    return {
      type: 'unknown',
      value: code
    };
  }
}

// =============================================================================
// ブラウザベースのバーコードスキャナー
// =============================================================================

export class BarcodeScanner {
  private video: HTMLVideoElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private context: CanvasRenderingContext2D | null = null;
  private stream: MediaStream | null = null;
  private isScanning: boolean = false;
  private scanCallback: ((result: ScanResult) => void) | null = null;
  private errorCallback: ((error: Error) => void) | null = null;

  constructor() {
    this.initializeElements();
  }

  private initializeElements(): void {
    this.video = document.createElement('video');
    this.video.setAttribute('playsinline', 'true');
    this.video.setAttribute('webkit-playsinline', 'true');
    this.video.style.width = '100%';
    this.video.style.height = '100%';
    this.video.style.objectFit = 'cover';

    this.canvas = document.createElement('canvas');
    this.context = this.canvas.getContext('2d');
  }

  // カメラアクセスと開始
  public async startScanning(
    onScan: (result: ScanResult) => void,
    onError: (error: Error) => void,
    options: {
      facingMode?: 'user' | 'environment';
      width?: number;
      height?: number;
    } = {}
  ): Promise<HTMLVideoElement> {
    if (this.isScanning) {
      throw new Error('Scanner is already running');
    }

    this.scanCallback = onScan;
    this.errorCallback = onError;

    try {
      // カメラ権限を要求
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: options.facingMode || 'environment', // 背面カメラを優先
          width: { ideal: options.width || 1280 },
          height: { ideal: options.height || 720 }
        }
      });

      if (!this.video || !this.stream) {
        throw new Error('Failed to initialize video or stream');
      }

      this.video.srcObject = this.stream;
      await this.video.play();

      // キャンバスのサイズを調整
      if (this.canvas && this.video) {
        this.canvas.width = this.video.videoWidth;
        this.canvas.height = this.video.videoHeight;
      }

      this.isScanning = true;
      this.startScanLoop();

      logSecurityEvent('barcode_scanner_started', {
        facingMode: options.facingMode,
        videoWidth: this.video.videoWidth,
        videoHeight: this.video.videoHeight
      });

      return this.video;
    } catch (error: any) {
      console.error('Failed to start barcode scanning:', error);
      
      if (error.name === 'NotAllowedError') {
        showError(error, 'カメラへのアクセスが拒否されました。設定でカメラの使用を許可してください。');
      } else if (error.name === 'NotFoundError') {
        showError(error, 'カメラが見つかりません。デバイスにカメラが接続されているか確認してください。');
      } else {
        showError(error, 'カメラの初期化に失敗しました。');
      }
      
      onError(error);
      throw error;
    }
  }

  // スキャン停止
  public stopScanning(): void {
    this.isScanning = false;

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    if (this.video) {
      this.video.srcObject = null;
    }

    logSecurityEvent('barcode_scanner_stopped', {});
    console.log('📷 Barcode scanner stopped');
  }

  // メインスキャンループ
  private async startScanLoop(): Promise<void> {
    if (!this.isScanning || !this.video || !this.canvas || !this.context) {
      return;
    }

    try {
      // フレームをキャンバスに描画
      this.context.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
      
      // 画像データを取得してスキャン
      const imageData = this.context.getImageData(0, 0, this.canvas.width, this.canvas.height);
      const scanResult = await this.scanImageData(imageData);
      
      if (scanResult && this.scanCallback) {
        this.scanCallback(scanResult);
        // 連続スキャンを防ぐため一時停止
        this.isScanning = false;
        setTimeout(() => {
          this.isScanning = true;
          this.startScanLoop();
        }, 1000);
        return;
      }
    } catch (error) {
      console.error('Scan error:', error);
      if (this.errorCallback) {
        this.errorCallback(error as Error);
      }
    }

    // 次のフレームでスキャンを継続
    if (this.isScanning) {
      requestAnimationFrame(() => this.startScanLoop());
    }
  }

  // 画像データからバーコードを検出
  private async scanImageData(imageData: ImageData): Promise<ScanResult | null> {
    try {
      // ZXingを使用（実際の実装では適切なライブラリをインストール）
      // この例では簡易的な実装
      const result = await this.detectBarcode(imageData);
      
      if (result) {
        return {
          value: result.text,
          format: this.determineFormat(result.format),
          timestamp: new Date().toISOString(),
          confidence: result.confidence || 0.8,
          rawData: result
        };
      }
    } catch (error) {
      console.warn('Barcode detection failed:', error);
    }
    
    return null;
  }

  // 簡易的なバーコード検出（実際の実装では専用ライブラリを使用）
  private async detectBarcode(imageData: ImageData): Promise<any> {
    // 実際の実装では @zxing/library または quagga2 などを使用
    // ここでは擬似的な実装
    return new Promise((resolve) => {
      // 開発時のテスト用コード
      if (Math.random() > 0.95) { // 5%の確率でテスト結果を返す
        resolve({
          text: 'PROD-2024-001',
          format: 'CODE_128',
          confidence: 0.95
        });
      } else {
        resolve(null);
      }
    });
  }

  private determineFormat(format: string): ScanResult['format'] {
    const formatMap: Record<string, ScanResult['format']> = {
      'QR_CODE': 'QR_CODE',
      'CODE_128': 'CODE_128',
      'CODE_39': 'CODE_39',
      'EAN_13': 'EAN_13',
      'EAN_8': 'EAN_8',
      'UPC_A': 'UPC_A',
      'UPC_E': 'UPC_E',
      'DATA_MATRIX': 'DATA_MATRIX',
      'PDF_417': 'PDF_417'
    };
    
    return formatMap[format] || 'UNKNOWN';
  }

  // カメラの切り替え
  public async switchCamera(): Promise<void> {
    if (!this.isScanning) return;

    const currentFacingMode = this.stream?.getVideoTracks()[0]?.getSettings()?.facingMode;
    const newFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
    
    this.stopScanning();
    
    if (this.scanCallback && this.errorCallback) {
      await this.startScanning(this.scanCallback, this.errorCallback, {
        facingMode: newFacingMode
      });
    }
  }

  // フラッシュライト制御（対応デバイスのみ）
  public async toggleFlashlight(): Promise<boolean> {
    try {
      const track = this.stream?.getVideoTracks()[0];
      if (!track) return false;
      
      const capabilities = track.getCapabilities();
      if (!capabilities.torch) return false;
      
      const settings = track.getSettings();
      const newTorchState = !settings.torch;
      
      await track.applyConstraints({
        advanced: [{ torch: newTorchState } as MediaTrackConstraintSet]
      });
      
      return newTorchState;
    } catch (error) {
      console.error('Failed to toggle flashlight:', error);
      return false;
    }
  }

  // スキャナーの状態取得
  public getStatus() {
    return {
      isScanning: this.isScanning,
      hasStream: !!this.stream,
      videoWidth: this.video?.videoWidth || 0,
      videoHeight: this.video?.videoHeight || 0
    };
  }
}

// =============================================================================
// 製造業向けスキャンヘルパー
// =============================================================================

export const scanManufacturingCode = async (
  options: {
    expectedType?: ManufacturingCode['type'];
    onSuccess?: (code: ManufacturingCode, scanResult: ScanResult) => void;
    onError?: (error: Error) => void;
    timeout?: number; // ミリ秒
  } = {}
): Promise<{ code: ManufacturingCode; scanResult: ScanResult }> => {
  return new Promise((resolve, reject) => {
    const scanner = new BarcodeScanner();
    let timeoutId: NodeJS.Timeout | null = null;

    const cleanup = () => {
      scanner.stopScanning();
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };

    // タイムアウト設定
    if (options.timeout) {
      timeoutId = setTimeout(() => {
        cleanup();
        const error = new Error('スキャンがタイムアウトしました');
        options.onError?.(error);
        reject(error);
      }, options.timeout);
    }

    scanner.startScanning(
      (scanResult) => {
        const code = ManufacturingCodeParser.parseCode(scanResult.value);
        
        // 期待するタイプが指定されている場合はチェック
        if (options.expectedType && code.type !== options.expectedType) {
          showError(new Error('invalid_code_type'), 
            `期待されるコードタイプ: ${options.expectedType}, スキャンされたタイプ: ${code.type}`);
          return; // スキャン継続
        }
        
        cleanup();
        
        logSecurityEvent('manufacturing_code_scanned', {
          codeType: code.type,
          codeValue: code.value,
          scanFormat: scanResult.format,
          confidence: scanResult.confidence
        });
        
        showSuccess(`${code.parsedData?.metadata?.description || 'コード'}をスキャンしました: ${code.value}`);
        
        options.onSuccess?.(code, scanResult);
        resolve({ code, scanResult });
      },
      (error) => {
        cleanup();
        options.onError?.(error);
        reject(error);
      },
      { facingMode: 'environment' } // 製造現場では背面カメラを優先
    );
  });
};

// QRコード生成機能
export const generateQRCode = async (
  data: string,
  options: {
    size?: number;
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
    margin?: number;
  } = {}
): Promise<string> => {
  // 実際の実装では qrcode ライブラリを使用
  // ここでは擬似的なデータURLを返す
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const size = options.size || 200;
    canvas.width = size;
    canvas.height = size;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // 簡易的なQRコード風の表示
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = '#fff';
      ctx.font = '12px Arial';
      ctx.fillText(data, 10, size / 2);
    }
    
    resolve(canvas.toDataURL('image/png'));
  });
};

export default BarcodeScanner;