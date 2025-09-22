"use client";
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Download, ChevronLeft, ChevronRight, FileText, Image } from "lucide-react";
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import ExcelViewerExcelJS from './ExcelViewerExcelJS';

// PDFワーカーの設定
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface FileSystemNode {
  id: string;
  name: string;
  type: 'folder' | 'file' | 'database';
  size?: number;
  fileType?: string;
  content?: string;
  dataUrl?: string;
  excelData?: {
    sheets: { [key: string]: any[][] };
    sheetNames: string[];
    styles?: any;
    rawSheets?: { [key: string]: any };
    columnWidths?: { [key: string]: { [key: string]: number } };
    metadata?: any;
  };
  pdfData?: {
    numPages: number;
    dataUrl: string;
  };
}

interface FilePreviewProps {
  file: FileSystemNode;
  onClose: () => void;
}

const FilePreview: React.FC<FilePreviewProps> = ({ file, onClose }) => {
  const [pdfPageNumber, setPdfPageNumber] = useState(1);
  const [pdfNumPages, setPdfNumPages] = useState(0);
  const [pdfUrl, setPdfUrl] = useState<string>('');

  useEffect(() => {
    // PDFファイルの場合、ダミーURLを設定（実際のファイルがある場合はdataUrlを使用）
    if (file.fileType === 'pdf') {
      if (file.dataUrl) {
        setPdfUrl(file.dataUrl);
      } else {
        // ダミーPDFファイルのためのプレースホルダー
        // 実際のアプリケーションでは、ファイルのURLやBase64データを設定
        setPdfUrl('/sample.pdf');
      }
    }
  }, [file]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setPdfNumPages(numPages);
  };

  // ファイルダウンロード機能
  const handleDownload = () => {
    // ダミーファイルの場合の処理
    if (!file.dataUrl) {
      // 実際のファイルがない場合は、ダミーデータを生成
      const dummyContent = `ファイル名: ${file.name}\nファイルタイプ: ${file.fileType}\nサイズ: ${file.size ? (file.size / 1024).toFixed(1) + ' KB' : '不明'}`;
      const blob = new Blob([dummyContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return;
    }

    // 実際のファイルがある場合
    const a = document.createElement('a');
    a.href = file.dataUrl;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Excelファイルの場合は専用ビューアーを使用
  if (file.excelData) {
    return <ExcelViewerExcelJS file={file} onClose={onClose} />;
  }

  // 他のファイル形式は従来のプレビューを使用
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-6xl max-h-[90vh] w-[90vw] flex flex-col">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-600">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {file.name}
            </h3>
            <Badge variant="secondary" className="text-xs">
              {file.fileType?.toUpperCase() || 'ファイル'}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="w-4 h-4 mr-2" />
              ダウンロード
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* コンテンツ */}
        <div className="flex-1 overflow-auto p-4">
          {file.fileType &&
            ['jpg', 'jpeg', 'png', 'gif', 'svg', 'bmp', 'webp'].includes(
              file.fileType.toLowerCase()
            ) ? (
            /* 画像表示 */
            <div className="text-center">
              {file.dataUrl ? (
                <img
                  src={file.dataUrl}
                  alt={file.name}
                  className="max-w-full max-h-[60vh] mx-auto rounded shadow"
                />
              ) : (
                <div className="bg-gray-50 dark:bg-slate-700 rounded border p-8">
                  <Image className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg font-semibold mb-2">画像ファイル: {file.name}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    実際の画像ファイルがアップロードされた場合はここに表示されます
                  </p>
                </div>
              )}
            </div>
          ) : file.fileType === 'pdf' ? (
            <div>
              {/* PDF制御 */}
              <div className="flex items-center justify-between mb-4 p-3 bg-gray-100 dark:bg-slate-700 rounded">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPdfPageNumber(Math.max(1, pdfPageNumber - 1))}
                    disabled={pdfPageNumber <= 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm">
                    ページ {pdfPageNumber} / {pdfNumPages || '?'}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPdfPageNumber(Math.min(pdfNumPages, pdfPageNumber + 1))}
                    disabled={pdfPageNumber >= pdfNumPages || pdfNumPages === 0}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* PDF表示 */}
              <div className="text-center">
                {file.dataUrl || file.pdfData?.dataUrl ? (
                  <Document
                    file={file.dataUrl || file.pdfData?.dataUrl}
                    onLoadSuccess={onDocumentLoadSuccess}
                    onLoadError={(error) => {
                      console.error('PDF読み込みエラー:', error);
                    }}
                    loading={
                      <div className="text-gray-500 py-8">
                        <p>PDFを読み込み中...</p>
                      </div>
                    }
                    error={
                      <div className="text-red-500 py-8">
                        <p>PDFの読み込みに失敗しました</p>
                      </div>
                    }
                  >
                    <Page
                      pageNumber={pdfPageNumber}
                      className="mx-auto"
                      width={Math.min(window.innerWidth * 0.8, 800)}
                      renderTextLayer={true}
                      renderAnnotationLayer={true}
                    />
                  </Document>
                ) : (
                  <div className="bg-gray-50 dark:bg-slate-700 rounded border p-8">
                    <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                    <p className="text-lg font-semibold mb-2">PDFファイル: {file.name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      実際のPDFファイルがアップロードされた場合はここに表示されます
                    </p>
                    <div className="text-xs text-gray-500">
                      {file.size && `サイズ: ${(file.size / 1024).toFixed(1)} KB`}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : file.content ? (
            /* テキストファイル表示 */
            <div className="bg-gray-50 dark:bg-slate-700 rounded border p-4">
              <pre className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap font-mono">
                {file.content}
              </pre>
            </div>
          ) : (
            /* その他のファイル */
            <div className="text-center py-8">
              <div className="text-gray-500 dark:text-gray-400">
                <FileText className="w-16 h-16 mx-auto mb-4" />
                <p className="text-lg mb-2">プレビューできません</p>
                <p className="text-sm">
                  このファイル形式（{file.fileType}）はプレビューに対応していません。
                </p>
                <p className="text-sm mt-2">
                  ダウンロードボタンからファイルを保存できます。
                </p>
              </div>
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="p-4 border-t border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700">
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
            <div>
              {file.size && (
                <span>サイズ: {(file.size / 1024).toFixed(1)} KB</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {file.fileType && (
                <Badge variant="outline" className="text-xs">
                  {file.fileType.toUpperCase()}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilePreview;