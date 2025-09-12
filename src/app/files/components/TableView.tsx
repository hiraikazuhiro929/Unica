import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  MoreHorizontal,
  Plus,
  Trash2,
  Copy,
  Edit,
  ArrowUp,
  ArrowDown,
  Filter,
  SortAsc,
  SortDesc,
  Columns,
  Settings,
  GripVertical,
} from "lucide-react";
import PropertyRenderer from "./PropertyRenderer";
import {
  DatabaseSchema,
  DatabaseView,
  DatabaseRow,
  DatabaseProperty,
  PropertyValue,
  EditingCell,
  ContextMenuState,
  Sort,
  Filter as FilterType,
} from "../types";

interface TableViewProps {
  database: DatabaseSchema;
  view: DatabaseView;
  onDatabaseUpdate?: (database: DatabaseSchema) => void;
}

const TableView: React.FC<TableViewProps> = ({
  database,
  view,
  onDatabaseUpdate
}) => {
  // State管理
  const [rows, setRows] = useState<DatabaseRow[]>([]);
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [sorts, setSorts] = useState<Sort[]>(view.sorts || []);
  const [filters, setFilters] = useState<FilterType[]>(view.filters || []);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [isResizing, setIsResizing] = useState<string | null>(null);
  
  const tableRef = useRef<HTMLTableElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  // サンプルデータの初期化
  useEffect(() => {
    initializeSampleRows();
  }, [database]);

  // コンテキストメニューの外クリック処理
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setContextMenu(null);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setContextMenu(null);
        setEditingCell(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  // カラムリサイズ処理
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (isResizing) {
        const newWidth = Math.max(100, e.clientX - tableRef.current!.getBoundingClientRect().left);
        setColumnWidths(prev => ({
          ...prev,
          [isResizing]: newWidth
        }));
      }
    };

    const handleMouseUp = () => {
      setIsResizing(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const initializeSampleRows = () => {
    const sampleRows: DatabaseRow[] = [
      {
        id: 'row-1',
        properties: {
          title: 'WEBアプリケーション開発',
          status: { id: '2', name: '開発中', color: 'yellow' },
          rating: 4,
          tags: [
            { id: 't1', name: 'web', color: 'blue' },
            { id: 't3', name: 'api', color: 'purple' }
          ],
          due_date: new Date('2024-12-31')
        },
        createdTime: new Date().toISOString(),
        lastEditedTime: new Date().toISOString()
      },
      {
        id: 'row-2',
        properties: {
          title: 'モバイルアプリ設計',
          status: { id: '1', name: '計画中', color: 'gray' },
          rating: 3,
          tags: [
            { id: 't2', name: 'mobile', color: 'green' }
          ],
          due_date: new Date('2025-01-15')
        },
        createdTime: new Date().toISOString(),
        lastEditedTime: new Date().toISOString()
      },
      {
        id: 'row-3',
        properties: {
          title: 'データ分析システム',
          status: { id: '3', name: '完了', color: 'green' },
          rating: 5,
          tags: [
            { id: 't1', name: 'web', color: 'blue' },
            { id: 't3', name: 'api', color: 'purple' }
          ],
          due_date: new Date('2024-11-20')
        },
        createdTime: new Date().toISOString(),
        lastEditedTime: new Date().toISOString()
      }
    ];
    setRows(sampleRows);
  };

  const handleCellClick = (rowId: string, propertyId: string) => {
    setEditingCell({ rowId, propertyId });
    setContextMenu(null);
  };

  const handleCellChange = (rowId: string, propertyId: string, value: PropertyValue) => {
    setRows(prev => prev.map(row => 
      row.id === rowId 
        ? {
            ...row,
            properties: {
              ...row.properties,
              [propertyId]: value
            },
            lastEditedTime: new Date().toISOString()
          }
        : row
    ));
  };

  const handleCellBlur = () => {
    setEditingCell(null);
  };

  const handleRowContextMenu = (e: React.MouseEvent, rowId: string) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      type: 'row',
      targetId: rowId
    });
  };

  const handlePropertyContextMenu = (e: React.MouseEvent, propertyId: string) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      type: 'property',
      targetId: propertyId
    });
  };

  const handleRowSelection = (rowId: string, selected: boolean) => {
    setSelectedRows(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(rowId);
      } else {
        newSet.delete(rowId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedRows.size === rows.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(rows.map(row => row.id)));
    }
  };

  const addNewRow = () => {
    const newRow: DatabaseRow = {
      id: `row-${Date.now()}`,
      properties: {},
      createdTime: new Date().toISOString(),
      lastEditedTime: new Date().toISOString()
    };
    setRows(prev => [...prev, newRow]);
  };

  const duplicateRow = (rowId: string) => {
    const originalRow = rows.find(r => r.id === rowId);
    if (originalRow) {
      const duplicatedRow: DatabaseRow = {
        ...originalRow,
        id: `row-${Date.now()}`,
        createdTime: new Date().toISOString(),
        lastEditedTime: new Date().toISOString()
      };
      setRows(prev => [...prev, duplicatedRow]);
    }
    setContextMenu(null);
  };

  const deleteRow = (rowId: string) => {
    setRows(prev => prev.filter(row => row.id !== rowId));
    setSelectedRows(prev => {
      const newSet = new Set(prev);
      newSet.delete(rowId);
      return newSet;
    });
    setContextMenu(null);
  };

  const deleteSelectedRows = () => {
    setRows(prev => prev.filter(row => !selectedRows.has(row.id)));
    setSelectedRows(new Set());
  };

  const sortByProperty = (propertyId: string) => {
    const currentSort = sorts.find(s => s.property === propertyId);
    const direction = currentSort?.direction === 'ascending' ? 'descending' : 'ascending';
    
    setSorts([{ property: propertyId, direction }]);
    
    setRows(prev => [...prev].sort((a, b) => {
      const aValue = a.properties[propertyId];
      const bValue = b.properties[propertyId];
      
      if (direction === 'ascending') {
        return String(aValue || '').localeCompare(String(bValue || ''));
      } else {
        return String(bValue || '').localeCompare(String(aValue || ''));
      }
    }));
    
    setContextMenu(null);
  };

  const visibleProperties = database.properties.filter(prop => 
    view.properties.find(vp => vp.property === prop.id && vp.visible)
  );

  const ContextMenu = () => {
    if (!contextMenu) return null;

    const menuItems = [];

    if (contextMenu.type === 'row') {
      menuItems.push(
        <button
          key="duplicate"
          onClick={() => duplicateRow(contextMenu.targetId)}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <Copy className="h-4 w-4" />
          行を複製
        </button>,
        <button
          key="delete"
          onClick={() => deleteRow(contextMenu.targetId)}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-800 text-red-600"
        >
          <Trash2 className="h-4 w-4" />
          行を削除
        </button>
      );
    } else if (contextMenu.type === 'property') {
      const property = database.properties.find(p => p.id === contextMenu.targetId);
      if (property) {
        menuItems.push(
          <button
            key="sort-asc"
            onClick={() => sortByProperty(property.id)}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <SortAsc className="h-4 w-4" />
            昇順で並び替え
          </button>,
          <button
            key="sort-desc"
            onClick={() => sortByProperty(property.id)}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <SortDesc className="h-4 w-4" />
            降順で並び替え
          </button>,
          <div key="divider" className="border-t border-gray-200 dark:border-gray-700 my-1" />,
          <button
            key="filter"
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <Filter className="h-4 w-4" />
            フィルターを追加
          </button>
        );
      }
    }

    return (
      <div
        ref={contextMenuRef}
        className="fixed z-50 min-w-48 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1"
        style={{ left: contextMenu.x, top: contextMenu.y }}
      >
        {menuItems}
      </div>
    );
  };

  const BulkActionBar = () => {
    if (selectedRows.size === 0) return null;

    return (
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg px-4 py-2 flex items-center gap-4 z-40">
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {selectedRows.size}行を選択
        </span>
        <Button
          size="sm"
          variant="outline"
          onClick={deleteSelectedRows}
          className="text-red-600 border-red-200 hover:bg-red-50"
        >
          <Trash2 className="h-4 w-4 mr-1" />
          削除
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setSelectedRows(new Set())}
        >
          キャンセル
        </Button>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={addNewRow}>
            <Plus className="h-4 w-4 mr-1" />
            新しい行
          </Button>
          {selectedRows.size > 0 && (
            <Button size="sm" variant="outline" onClick={deleteSelectedRows}>
              <Trash2 className="h-4 w-4 mr-1" />
              選択した行を削除 ({selectedRows.size})
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">
            {rows.length}行
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table ref={tableRef} className="w-full">
          <thead className="sticky top-0 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
            <tr>
              {/* 行選択チェックボックス */}
              <th className="w-12 p-3">
                <input
                  type="checkbox"
                  checked={selectedRows.size === rows.length && rows.length > 0}
                  onChange={handleSelectAll}
                  className="w-4 h-4 rounded border-gray-300"
                />
              </th>
              
              {/* プロパティヘッダー */}
              {visibleProperties.map((property) => (
                <th
                  key={property.id}
                  className="text-left p-3 font-medium text-gray-700 dark:text-gray-300 relative group cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                  style={{ width: columnWidths[property.id] || 200 }}
                  onContextMenu={(e) => handlePropertyContextMenu(e, property.id)}
                >
                  <div className="flex items-center justify-between">
                    <span>{property.name}</span>
                    {sorts.find(s => s.property === property.id) && (
                      <span className="ml-1">
                        {sorts.find(s => s.property === property.id)?.direction === 'ascending' ? (
                          <SortAsc className="h-3 w-3" />
                        ) : (
                          <SortDesc className="h-3 w-3" />
                        )}
                      </span>
                    )}
                  </div>
                  
                  {/* リサイズハンドル */}
                  <div
                    className="absolute right-0 top-0 h-full w-2 cursor-col-resize opacity-0 group-hover:opacity-100 hover:bg-blue-500 hover:opacity-100"
                    onMouseDown={() => setIsResizing(property.id)}
                  />
                </th>
              ))}

              {/* プロパティ追加ボタン */}
              <th className="w-12 p-3">
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                  <Plus className="h-4 w-4" />
                </Button>
              </th>
            </tr>
          </thead>
          
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={row.id}
                className={`border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 group ${
                  selectedRows.has(row.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                }`}
                onContextMenu={(e) => handleRowContextMenu(e, row.id)}
              >
                {/* 行選択チェックボックス */}
                <td className="w-12 p-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedRows.has(row.id)}
                      onChange={(e) => handleRowSelection(row.id, e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <span className="text-xs text-gray-400 opacity-0 group-hover:opacity-100">
                      {index + 1}
                    </span>
                  </div>
                </td>

                {/* プロパティセル */}
                {visibleProperties.map((property) => (
                  <td
                    key={property.id}
                    className="p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                    onClick={() => handleCellClick(row.id, property.id)}
                    style={{ width: columnWidths[property.id] || 200 }}
                  >
                    <PropertyRenderer
                      type={property.type}
                      value={row.properties[property.id]}
                      config={property.config}
                      editing={editingCell?.rowId === row.id && editingCell?.propertyId === property.id}
                      onChange={(value) => handleCellChange(row.id, property.id, value)}
                      onBlur={handleCellBlur}
                    />
                  </td>
                ))}

                {/* 行メニューボタン */}
                <td className="w-12 p-3">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                    onClick={(e) => handleRowContextMenu(e, row.id)}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}

            {/* 空行（新規作成用） */}
            <tr className="hover:bg-gray-50 dark:hover:bg-gray-900">
              <td colSpan={visibleProperties.length + 2} className="p-3">
                <Button
                  variant="ghost"
                  onClick={addNewRow}
                  className="w-full justify-start text-gray-500 hover:text-gray-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  新しい行
                </Button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <ContextMenu />
      <BulkActionBar />
    </div>
  );
};

export default TableView;