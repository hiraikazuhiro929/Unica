import * as ExcelJS from 'exceljs';
import { uploadFile } from "@/lib/firebase/fileManagement";

interface FileSystemNode {
  id: string;
  name: string;
  type: 'folder' | 'file' | 'database';
  parentId: string | null;
  path: string;
  children?: FileSystemNode[];
  size?: number;
  fileType?: string;
  created?: string;
  modifiedDate?: string;
  modifiedBy?: string;
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

// 一意な名前生成関数
const generateUniqueName = (name: string, parentNodes: FileSystemNode[]): string => {
  const nameWithoutExt = name.substring(0, name.lastIndexOf('.')) || name;
  const ext = name.substring(name.lastIndexOf('.')) || '';

  let counter = 1;
  let uniqueName = name;

  while (parentNodes.some(node => node.name === uniqueName)) {
    uniqueName = `${nameWithoutExt} (${counter})${ext}`;
    counter++;
  }

  return uniqueName;
};

// 列インデックスを文字に変換（A, B, C... AA, AB...）
const encodeColumn = (colIndex: number): string => {
  let name = '';
  let num = colIndex;
  while (num >= 0) {
    name = String.fromCharCode(65 + (num % 26)) + name;
    num = Math.floor(num / 26) - 1;
  }
  return name;
};

export const handleFileUpload = async (
  files: FileList,
  selectedPath: string[],
  currentFolder: FileSystemNode | null,
  fileSystem: FileSystemNode[],
  setIsUploading: (uploading: boolean) => void,
  setFileSystem: (system: FileSystemNode[]) => void,
  findNodeById: (id: string) => FileSystemNode | null
) => {

  // parentNodesを正しく取得
  let parentNodes: FileSystemNode[];
  if (currentFolder && currentFolder.children) {
    parentNodes = currentFolder.children;
  } else if (selectedPath.length === 0) {
    parentNodes = fileSystem;
  } else {
    // フォルダが見つからない場合は、ルートを使用
    parentNodes = fileSystem;
  }


  setIsUploading(true);

  try {
    for (const file of Array.from(files)) {
      const uniqueName = generateUniqueName(file.name, parentNodes);

      // ファイル内容を読み込む
      let dataUrl: string | undefined;
      let content: string | undefined;
      let excelData: { sheets: { [key: string]: any[][] }; sheetNames: string[]; styles?: any; metadata?: any } | undefined;
      let pdfData: { numPages: number; dataUrl: string } | undefined;

      // PDFファイルの場合
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        try {
          dataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.readAsDataURL(file);
          });

          // PDFの基本情報を取得
          pdfData = {
            numPages: 0, // 実際のページ数は表示時に取得
            dataUrl: dataUrl
          };

        } catch (error) {
        }
      }
      // Excelファイルの場合はExcelJSで構造化データとして保存
      else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls') ||
          file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
          file.type === 'application/vnd.ms-excel') {
        try {

          const buffer = await new Promise<ArrayBuffer>((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as ArrayBuffer);
            reader.readAsArrayBuffer(file);
          });

          // ExcelJSでワークブックを読み込み
          const excelWorkbook = new ExcelJS.Workbook();
          await excelWorkbook.xlsx.load(buffer);

          // ワークブック構造をデバッグ出力
          console.log('=== Excel ワークブック構造デバッグ ===');
          console.log('ワークシート数:', excelWorkbook.worksheets.length);
          console.log('ワークシート名:', excelWorkbook.worksheets.map(ws => ws.name));

          const sheets: { [key: string]: any[][] } = {};
          const columnWidths: { [key: string]: { [key: string]: number } } = {};
          const rowHeights: { [key: string]: { [key: string]: number } } = {};
          const mergeRanges: { [key: string]: any[] } = {};
          const sheetNames: string[] = [];


          // 各ワークシートを処理
          excelWorkbook.worksheets.forEach(worksheet => {
            const sheetName = worksheet.name;
            sheetNames.push(sheetName);

            console.log(`\n=== ワークシート: ${sheetName} ===`);
            console.log('行数:', worksheet.rowCount);
            console.log('列数:', worksheet.columnCount);
            console.log('実際のセル範囲:', worksheet.actualCellCount);


            // 列幅情報を取得
            const colWidths: { [key: string]: number } = {};
            if (worksheet.columns && Array.isArray(worksheet.columns)) {
              worksheet.columns.forEach((column, index) => {
                if (column && column.width) {
                  const colLetter = encodeColumn(index);
                  colWidths[colLetter] = column.width * 7; // Excelの幅をピクセルに変換
                }
              });
            }
            columnWidths[sheetName] = colWidths;

            // 行高情報を取得
            const heights: { [key: string]: number } = {};
            if (worksheet.eachRow) {
              worksheet.eachRow((row, rowNumber) => {
                if (row && row.height) {
                  heights[rowNumber.toString()] = row.height * 1.33; // Excelの高さをピクセルに変換
                }
              });
            }
            rowHeights[sheetName] = heights;

            // セル結合情報を取得
            const merges: any[] = [];
            if (worksheet.model && worksheet.model.merges && Array.isArray(worksheet.model.merges)) {
              worksheet.model.merges.forEach((merge: string) => {
                merges.push(merge);
              });
            }
            mergeRanges[sheetName] = merges;

            // セルデータをスタイル情報付きで取得
            const sheetData: any[][] = [];
            const maxRow = Math.min(worksheet.rowCount, 1000); // パフォーマンスのため制限
            const maxCol = Math.min(worksheet.columnCount, 100); // パフォーマンスのため制限


            for (let rowIndex = 1; rowIndex <= maxRow; rowIndex++) {
              const row: any[] = [];
              const excelRow = worksheet.getRow(rowIndex);

              for (let colIndex = 1; colIndex <= maxCol; colIndex++) {
                const excelCell = excelRow.getCell(colIndex);


                // セル値の安全な取得
                let cellValue = '';
                let cellText = '';

                try {
                  // textプロパティの安全な取得（ExcelJSのgetterはエラーを起こすことがある）
                  try {
                    const textValue = excelCell.text;
                    if (textValue !== null && textValue !== undefined) {
                      cellText = String(textValue);
                    }
                  } catch (textAccessError) {
                    // textプロパティアクセスエラーは無視
                  }

                  // valueの安全な取得
                  if (excelCell.value !== null && excelCell.value !== undefined) {
                    if (typeof excelCell.value === 'object' && excelCell.value.result !== undefined) {
                      // 数式の結果
                      cellValue = String(excelCell.value.result);
                    } else if (typeof excelCell.value === 'object' && excelCell.value.richText) {
                      // リッチテキスト
                      cellValue = excelCell.value.richText.map((rt: any) => rt.text).join('');
                    } else {
                      cellValue = String(excelCell.value);
                    }
                  }
                } catch (e) {
                }

                // 最初の3x3のセルについて詳細な構造をデバッグ出力
                if (rowIndex <= 3 && colIndex <= 3) {
                  console.log(`\nセル ${rowIndex},${colIndex}:`);
                  console.log('値:', cellValue);
                  console.log('型:', excelCell.type);
                  console.log('スタイル有無:', !!excelCell.style);
                  if (excelCell.border) {
                    console.log('罫線情報:', JSON.stringify(excelCell.border, null, 2));
                  }
                  if (excelCell.fill) {
                    console.log('背景情報:', JSON.stringify(excelCell.fill, null, 2));
                  }
                  if (excelCell.font) {
                    console.log('フォント情報:', JSON.stringify(excelCell.font, null, 2));
                  }
                }

                // 実際にデータまたはスタイルがあるかチェック
                const hasValue = cellText || cellValue || excelCell.formula;
                const hasStyle = excelCell.font || excelCell.border || excelCell.fill || excelCell.alignment;

                // データもスタイルもない空セルはスキップ
                if (!hasValue && !hasStyle) {
                  row.push(null);
                  continue;
                }

                // ExcelJSからセル情報を取得（より詳細に）
                const cellData = {
                  value: cellText || cellValue || '',
                  rawValue: excelCell.value,
                  type: excelCell.type || 'string',
                  formula: excelCell.formula || undefined,
                  hyperlink: excelCell.hyperlink || undefined,
                  excelJSStyle: {
                    font: excelCell.font && Object.keys(excelCell.font).length > 0 ? {
                      name: excelCell.font.name,
                      size: excelCell.font.size,
                      bold: excelCell.font.bold,
                      italic: excelCell.font.italic,
                      underline: excelCell.font.underline,
                      strike: excelCell.font.strike,
                      color: excelCell.font.color,
                      scheme: excelCell.font.scheme,
                      vertAlign: excelCell.font.vertAlign
                    } : undefined,
                    alignment: excelCell.alignment && Object.keys(excelCell.alignment).length > 0 ? {
                      horizontal: excelCell.alignment.horizontal,
                      vertical: excelCell.alignment.vertical,
                      wrapText: excelCell.alignment.wrapText,
                      shrinkToFit: excelCell.alignment.shrinkToFit,
                      indent: excelCell.alignment.indent,
                      readingOrder: excelCell.alignment.readingOrder,
                      textRotation: excelCell.alignment.textRotation
                    } : undefined,
                    border: (() => {

                      if (excelCell.border && Object.keys(excelCell.border).length > 0) {
                        return {
                          top: excelCell.border.top,
                          left: excelCell.border.left,
                          bottom: excelCell.border.bottom,
                          right: excelCell.border.right,
                          diagonal: excelCell.border.diagonal,
                          diagonalUp: excelCell.border.diagonalUp,
                          diagonalDown: excelCell.border.diagonalDown
                        };
                      }
                      return undefined;
                    })(),
                    fill: excelCell.fill && Object.keys(excelCell.fill).length > 0 ? {
                      type: excelCell.fill.type,
                      pattern: excelCell.fill.pattern,
                      fgColor: excelCell.fill.fgColor,
                      bgColor: excelCell.fill.bgColor,
                      gradient: excelCell.fill.gradient
                    } : undefined,
                    numFmt: excelCell.numFmt || undefined,
                    protection: excelCell.protection || undefined
                  }
                };

                row.push(cellData);
              }
              sheetData.push(row);
            }
            sheets[sheetName] = sheetData;
          });

          excelData = {
            sheets,
            sheetNames,
            columnWidths,
            rowHeights,
            mergeRanges,
            metadata: {
              creator: excelWorkbook.creator,
              lastModifiedBy: excelWorkbook.lastModifiedBy,
              created: excelWorkbook.created,
              modified: excelWorkbook.modified,
              worksheetCount: excelWorkbook.worksheets.length,
              company: excelWorkbook.company,
              manager: excelWorkbook.manager,
              title: excelWorkbook.title,
              subject: excelWorkbook.subject,
              keywords: excelWorkbook.keywords,
              category: excelWorkbook.category,
              description: excelWorkbook.description
            }
          };

          // フォールバック用にDataURLも保存
          dataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.readAsDataURL(file);
          });

        } catch (error) {
          // エラー時はDataURLのみ保存
          dataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.readAsDataURL(file);
          });
        }
      }
      // 画像ファイルの場合はDataURLとして保存
      else if (file.type.startsWith('image/')) {
        dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(file);
        });
      }
      // テキストファイルの場合は内容を保存
      else if (file.type.startsWith('text/') ||
               file.name.endsWith('.txt') ||
               file.name.endsWith('.md') ||
               file.name.endsWith('.json') ||
               file.name.endsWith('.csv')) {
        content = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsText(file);
        });
      }
      // PDFやその他のファイルもDataURLとして保存
      else {
        dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(file);
        });
      }

      const newFile: FileSystemNode = {
        id: `file-${Date.now()}-${Math.random()}`,
        name: uniqueName,
        type: 'file',
        parentId: currentFolder?.id || null,
        path: selectedPath.length > 0
          ? `/${selectedPath.join('/')}/${uniqueName}`
          : `/${uniqueName}`,
        size: file.size,
        fileType: file.name.split('.').pop() || 'unknown',
        created: new Date().toISOString(),
        modifiedDate: new Date().toISOString(),
        modifiedBy: "現在のユーザー",
        content,
        dataUrl,
        excelData,
        pdfData
      };

      // Firebaseにアップロード
      try {
        await uploadFile(file, selectedPath.join('/'), {
          id: newFile.id,
          name: newFile.name,
          type: 'file',
          parentId: newFile.parentId,
          path: newFile.path,
          size: newFile.size,
          fileType: newFile.fileType,
          createdBy: "現在のユーザー",
          modifiedBy: "現在のユーザー"
        });
      } catch (uploadError) {
      }

      // ローカルのファイルシステムを更新
      const updateFileSystem = (nodes: FileSystemNode[], pathIndex: number = 0): FileSystemNode[] => {
        if (selectedPath.length === 0) {
          // ルートディレクトリに追加
          return [...nodes, newFile];
        }

        return nodes.map(node => {
          if (node.name === selectedPath[pathIndex] && node.type === 'folder') {
            if (pathIndex === selectedPath.length - 1) {
              // 最終階層に到達、ここにファイルを追加
              return {
                ...node,
                children: [...(node.children || []), newFile]
              };
            } else if (node.children) {
              // さらに深い階層を探索
              return {
                ...node,
                children: updateFileSystem(node.children, pathIndex + 1)
              };
            }
          }
          return node;
        });
      };

      const updatedFileSystem = updateFileSystem(fileSystem);
      setFileSystem(updatedFileSystem);
      localStorage.setItem('unica-file-system', JSON.stringify(updatedFileSystem));

      // 次のファイルのために、parentNodesを更新
      if (currentFolder && currentFolder.children) {
        const updatedFolder = findNodeById(currentFolder.id);
        if (updatedFolder && updatedFolder.children) {
          parentNodes = updatedFolder.children;
        }
      } else {
        parentNodes = updatedFileSystem;
      }
    }

    alert(`${files.length}個のファイルをアップロードしました`);
  } catch (error) {
    alert("ファイルのアップロードに失敗しました");
  } finally {
    setIsUploading(false);
  }
};