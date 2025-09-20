"use client";
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { Document, Page } from 'react-pdf';
import ExcelViewerExcelJS from './ExcelViewerExcelJS';

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

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setPdfNumPages(numPages);
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
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* コンテンツ */}
        <div className="flex-1 overflow-auto p-4">
          {file.fileType &&
            ['jpg', 'jpeg', 'png', 'gif', 'svg', 'bmp', 'webp'].includes(
              file.fileType.toLowerCase()
            ) && file.dataUrl ? (
            /* 画像表示 */
            <div className="text-center">
              <img
                src={file.dataUrl}
                alt={file.name}
                className="max-w-full max-h-[60vh] mx-auto rounded shadow"
              />
            </div>
          ) : file.fileType === 'pdf' && file.pdfData ? (
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
                    {pdfPageNumber} / {pdfNumPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPdfPageNumber(Math.min(pdfNumPages, pdfPageNumber + 1))}
                    disabled={pdfPageNumber >= pdfNumPages}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  ダウンロード
                </Button>
              </div>

              {/* PDF表示 */}
              <div className="text-center">
                <Document
                  file={file.pdfData.dataUrl}
                  onLoadSuccess={onDocumentLoadSuccess}
                  className="mx-auto"
                >
                  <Page
                    pageNumber={pdfPageNumber}
                    className="max-w-full"
                    width={Math.min(window.innerWidth * 0.8, 800)}
                  />
                </Document>
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
                <p className="text-lg mb-2">プレビューできません</p>
                <p className="text-sm">
                  このファイル形式（{file.fileType}）はプレビューに対応していません。
                </p>
              </div>

              {(file.excelData || file.pdfData) && (
                <Button variant="outline" className="mt-4">
                  <Download className="w-4 h-4 mr-2" />
                  ダウンロード
                </Button>
              )}
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