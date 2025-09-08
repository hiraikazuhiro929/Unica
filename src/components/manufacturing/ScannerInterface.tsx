"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Camera, 
  Flashlight, 
  FlipHorizontal, 
  QrCode, 
  Barcode,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  ClipboardList,
  Package
} from 'lucide-react';
import { 
  BarcodeScanner, 
  ManufacturingCodeParser, 
  scanManufacturingCode,
  type ScanResult,
  type ManufacturingCode 
} from '@/lib/utils/barcodeScanner';
import { qualityControlSystem } from '@/lib/utils/qualityControl';
import { offlineManager } from '@/lib/utils/offlineManager';

interface ScannerInterfaceProps {
  mode?: 'inventory' | 'production' | 'quality' | 'general';
  onScanComplete?: (result: { code: ManufacturingCode; scanResult: ScanResult }) => void;
  expectedCodeType?: ManufacturingCode['type'];
  className?: string;
}

export const ScannerInterface: React.FC<ScannerInterfaceProps> = ({
  mode = 'general',
  onScanComplete,
  expectedCodeType,
  className = ''
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{ code: ManufacturingCode; scanResult: ScanResult } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState('');
  const [flashlightOn, setFlashlightOn] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerRef = useRef<BarcodeScanner | null>(null);

  const getModeTitle = () => {
    switch (mode) {
      case 'inventory': return '在庫管理スキャン';
      case 'production': return '製番スキャン';
      case 'quality': return '品質管理スキャン';
      default: return 'バーコード・QRコードスキャン';
    }
  };

  const getModeDescription = () => {
    switch (mode) {
      case 'inventory': return '在庫品のバーコードをスキャンして管理します';
      case 'production': return '製番・ロット番号をスキャンして作業を記録します';
      case 'quality': return '品質検査対象物のコードをスキャンします';
      default: return '製造業で使用される各種コードを読み取ります';
    }
  };

  const getExpectedCodeTypes = (): ManufacturingCode['type'][] => {
    switch (mode) {
      case 'inventory': return ['material_code', 'part_number'];
      case 'production': return ['production_number', 'lot_number', 'serial_number'];
      case 'quality': return ['production_number', 'lot_number', 'serial_number', 'part_number'];
      default: return [];
    }
  };

  // スキャン開始
  const startScanning = async () => {
    try {
      setError(null);
      setIsScanning(true);
      
      const scanner = new BarcodeScanner();
      scannerRef.current = scanner;

      const video = await scanner.startScanning(
        (scanResult) => {
          handleScanSuccess(scanResult);
        },
        (error) => {
          setError(error.message);
          setIsScanning(false);
        },
        { facingMode: 'environment' }
      );

      if (videoRef.current) {
        // 既存のvideoを置き換え
        const container = videoRef.current.parentElement;
        if (container) {
          container.removeChild(videoRef.current);
          container.appendChild(video);
          videoRef.current = video;
        }
      }

    } catch (err: any) {
      setError(err.message);
      setIsScanning(false);
    }
  };

  // スキャン停止
  const stopScanning = () => {
    if (scannerRef.current) {
      scannerRef.current.stopScanning();
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  // スキャン成功処理
  const handleScanSuccess = (result: ScanResult) => {
    const code = ManufacturingCodeParser.parseCode(result.value);
    const expectedTypes = getExpectedCodeTypes();
    
    // モードに応じたコードタイプチェック
    if (expectedTypes.length > 0 && !expectedTypes.includes(code.type)) {
      setError(`このモードでは ${expectedTypes.join(', ')} のコードが期待されますが、${code.type} がスキャンされました`);
      return;
    }
    
    if (expectedCodeType && code.type !== expectedCodeType) {
      setError(`期待されるコードタイプ: ${expectedCodeType}, スキャンされたタイプ: ${code.type}`);
      return;
    }

    stopScanning();
    
    const scanData = { code, scanResult: result };
    setScanResult(scanData);
    
    // オフライン対応: スキャンデータを記録
    offlineManager.queueOperation('create', 'other', {
      type: 'barcode_scan',
      mode,
      code: code.value,
      codeType: code.type,
      timestamp: result.timestamp
    }, { priority: 'medium' });

    onScanComplete?.(scanData);
  };

  // 手動入力処理
  const handleManualInput = () => {
    if (!manualInput.trim()) {
      setError('コードを入力してください');
      return;
    }

    const code = ManufacturingCodeParser.parseCode(manualInput.trim());
    const mockScanResult: ScanResult = {
      value: manualInput.trim(),
      format: 'UNKNOWN',
      timestamp: new Date().toISOString(),
      confidence: 1.0
    };

    handleScanSuccess(mockScanResult);
    setManualInput('');
    setShowManualInput(false);
  };

  // カメラ切り替え
  const switchCamera = async () => {
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.switchCamera();
      } catch (err: any) {
        setError(err.message);
      }
    }
  };

  // フラッシュライト切り替え
  const toggleFlashlight = async () => {
    if (scannerRef.current && isScanning) {
      try {
        const newState = await scannerRef.current.toggleFlashlight();
        setFlashlightOn(newState);
      } catch (err: any) {
        setError('フラッシュライトの制御に失敗しました');
      }
    }
  };

  // 品質検査開始（品質モードの場合）
  const startQualityInspection = () => {
    if (scanResult && mode === 'quality') {
      // 品質検査を開始
      qualityControlSystem.startInspection(
        'checkpoint-id', // 実際の実装では適切なチェックポイントIDを使用
        {
          type: 'product',
          id: scanResult.code.value,
          name: `Product ${scanResult.code.value}`,
          productionNumber: scanResult.code.type === 'production_number' ? scanResult.code.value : undefined,
          lotNumber: scanResult.code.type === 'lot_number' ? scanResult.code.value : undefined,
          serialNumber: scanResult.code.type === 'serial_number' ? scanResult.code.value : undefined
        },
        {
          id: 'current-user-id',
          name: 'Current User'
        }
      ).then(inspection => {
        console.log('品質検査開始:', inspection);
      }).catch(err => {
        setError(err.message);
      });
    }
  };

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stopScanning();
      }
    };
  }, []);

  const getCodeTypeColor = (type: ManufacturingCode['type']) => {
    switch (type) {
      case 'production_number': return 'bg-blue-100 text-blue-800';
      case 'part_number': return 'bg-green-100 text-green-800';
      case 'serial_number': return 'bg-purple-100 text-purple-800';
      case 'lot_number': return 'bg-orange-100 text-orange-800';
      case 'material_code': return 'bg-yellow-100 text-yellow-800';
      case 'machine_id': return 'bg-gray-100 text-gray-800';
      case 'worker_id': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className={`w-full max-w-md mx-auto ${className}`}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            {mode === 'quality' ? <ClipboardList className="w-5 h-5" /> :
             mode === 'inventory' ? <Package className="w-5 h-5" /> :
             <QrCode className="w-5 h-5" />}
            <span>{getModeTitle()}</span>
          </CardTitle>
          <CardDescription>{getModeDescription()}</CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* カメラビュー */}
          <div className="relative aspect-square bg-black rounded-lg overflow-hidden">
            {isScanning ? (
              <div ref={videoRef} className="w-full h-full" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white">
                <Camera className="w-16 h-16 opacity-50" />
              </div>
            )}
            
            {/* スキャン中のオーバーレイ */}
            {isScanning && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-48 h-48 border-2 border-white rounded-lg">
                  <div className="w-full h-full border border-white/50 rounded-lg animate-pulse" />
                </div>
              </div>
            )}
          </div>

          {/* エラー表示 */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* スキャン結果 */}
          {scanResult && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <Badge className={getCodeTypeColor(scanResult.code.type)}>
                  {scanResult.code.parsedData?.metadata?.description || scanResult.code.type}
                </Badge>
              </div>
              <div className="font-mono text-lg font-semibold text-gray-800">
                {scanResult.code.value}
              </div>
              {scanResult.code.parsedData && (
                <div className="mt-2 text-sm text-gray-600">
                  {scanResult.code.parsedData.prefix && (
                    <div>プレフィックス: {scanResult.code.parsedData.prefix}</div>
                  )}
                  {scanResult.code.parsedData.year && (
                    <div>年度: {scanResult.code.parsedData.year}</div>
                  )}
                  {scanResult.code.parsedData.sequence && (
                    <div>連番: {scanResult.code.parsedData.sequence}</div>
                  )}
                </div>
              )}
              <div className="mt-2 text-xs text-gray-500">
                フォーマット: {scanResult.scanResult.format} | 
                信頼度: {Math.round(scanResult.scanResult.confidence * 100)}%
              </div>
            </div>
          )}

          {/* コントロールボタン */}
          <div className="space-y-2">
            {!isScanning && !scanResult && (
              <Button onClick={startScanning} className="w-full">
                <Camera className="w-4 h-4 mr-2" />
                スキャン開始
              </Button>
            )}

            {isScanning && (
              <div className="grid grid-cols-3 gap-2">
                <Button variant="outline" onClick={switchCamera}>
                  <FlipHorizontal className="w-4 h-4" />
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={toggleFlashlight}
                  className={flashlightOn ? 'bg-yellow-100' : ''}
                >
                  <Flashlight className="w-4 h-4" />
                </Button>
                
                <Button variant="destructive" onClick={stopScanning}>
                  <XCircle className="w-4 h-4" />
                </Button>
              </div>
            )}

            {scanResult && (
              <div className="space-y-2">
                {mode === 'quality' && (
                  <Button onClick={startQualityInspection} className="w-full">
                    <ClipboardList className="w-4 h-4 mr-2" />
                    品質検査開始
                  </Button>
                )}
                
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setScanResult(null);
                    setError(null);
                  }} 
                  className="w-full"
                >
                  新しくスキャン
                </Button>
              </div>
            )}

            {/* 手動入力 */}
            <div className="pt-2 border-t">
              {!showManualInput ? (
                <Button 
                  variant="ghost" 
                  onClick={() => setShowManualInput(true)}
                  className="w-full text-sm"
                >
                  手動でコードを入力
                </Button>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="manual-input">コード手動入力</Label>
                  <div className="flex space-x-2">
                    <Input
                      id="manual-input"
                      value={manualInput}
                      onChange={(e) => setManualInput(e.target.value)}
                      placeholder="バーコード・QRコードの内容を入力"
                      onKeyPress={(e) => e.key === 'Enter' && handleManualInput()}
                    />
                    <Button onClick={handleManualInput}>
                      確認
                    </Button>
                  </div>
                  <Button 
                    variant="ghost" 
                    onClick={() => {
                      setShowManualInput(false);
                      setManualInput('');
                    }}
                    className="w-full text-xs"
                  >
                    キャンセル
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ScannerInterface;