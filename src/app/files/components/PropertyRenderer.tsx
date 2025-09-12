import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Star,
  StarHalf,
  Calendar,
  User,
  Link,
  Mail,
  Phone,
  Calculator,
  FileText,
  Check,
  X,
  DollarSign,
  Clock,
  AlertCircle
} from "lucide-react";
import {
  PropertyValue,
  PropertyType,
  PropertyConfig,
  SelectOption,
  SelectColor,
  FileAttachment,
  Person,
  FormulaResult
} from "../types";

interface PropertyRendererProps {
  type: PropertyType;
  value: PropertyValue;
  config: PropertyConfig;
  editing: boolean;
  onChange: (value: PropertyValue) => void;
  onBlur: () => void;
  className?: string;
}

const PropertyRenderer: React.FC<PropertyRendererProps> = ({
  type,
  value,
  config,
  editing,
  onChange,
  onBlur,
  className = ""
}) => {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleLocalChange = (newValue: PropertyValue) => {
    setLocalValue(newValue);
    onChange(newValue);
  };

  const getColorClass = (color: SelectColor): string => {
    const colorMap: Record<SelectColor, string> = {
      default: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
      gray: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      brown: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
      orange: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
      yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      green: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
      pink: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300',
      red: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    };
    return colorMap[color] || colorMap.default;
  };

  const renderEditMode = () => {
    switch (type) {
      case 'title':
      case 'text':
        return (
          <Input
            type="text"
            value={(localValue as string) || ''}
            onChange={(e) => handleLocalChange(e.target.value)}
            onBlur={onBlur}
            className="w-full"
            autoFocus
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            value={(localValue as number) || ''}
            onChange={(e) => handleLocalChange(parseFloat(e.target.value) || 0)}
            onBlur={onBlur}
            className="w-full"
            autoFocus
          />
        );

      case 'currency':
        return (
          <div className="relative">
            <DollarSign className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              type="number"
              value={(localValue as number) || ''}
              onChange={(e) => handleLocalChange(parseFloat(e.target.value) || 0)}
              onBlur={onBlur}
              className="w-full pl-8"
              autoFocus
            />
          </div>
        );

      case 'url':
        return (
          <div className="relative">
            <Link className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              type="url"
              value={(localValue as string) || ''}
              onChange={(e) => handleLocalChange(e.target.value)}
              onBlur={onBlur}
              className="w-full pl-8"
              autoFocus
              placeholder="https://"
            />
          </div>
        );

      case 'email':
        return (
          <div className="relative">
            <Mail className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              type="email"
              value={(localValue as string) || ''}
              onChange={(e) => handleLocalChange(e.target.value)}
              onBlur={onBlur}
              className="w-full pl-8"
              autoFocus
              placeholder="email@example.com"
            />
          </div>
        );

      case 'phone':
        return (
          <div className="relative">
            <Phone className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              type="tel"
              value={(localValue as string) || ''}
              onChange={(e) => handleLocalChange(e.target.value)}
              onBlur={onBlur}
              className="w-full pl-8"
              autoFocus
            />
          </div>
        );

      case 'date':
      case 'date_range':
        return (
          <Input
            type="date"
            value={localValue instanceof Date ? localValue.toISOString().split('T')[0] : ''}
            onChange={(e) => handleLocalChange(new Date(e.target.value))}
            onBlur={onBlur}
            className="w-full"
            autoFocus
          />
        );

      case 'select':
      case 'status':
        return (
          <Select
            value={(localValue as SelectOption)?.id || ''}
            onValueChange={(selectedId) => {
              const selectedOption = config.options?.find(opt => opt.id === selectedId);
              if (selectedOption) {
                handleLocalChange(selectedOption);
                onBlur();
              }
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="選択してください" />
            </SelectTrigger>
            <SelectContent>
              {config.options?.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  <Badge variant="outline" className={getColorClass(option.color)}>
                    {option.name}
                  </Badge>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'multi_select':
        const selectedOptions = (localValue as SelectOption[]) || [];
        return (
          <div className="space-y-2">
            <Select
              value=""
              onValueChange={(selectedId) => {
                const selectedOption = config.options?.find(opt => opt.id === selectedId);
                if (selectedOption && !selectedOptions.find(opt => opt.id === selectedId)) {
                  handleLocalChange([...selectedOptions, selectedOption]);
                }
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="タグを追加..." />
              </SelectTrigger>
              <SelectContent>
                {config.options?.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    <Badge variant="outline" className={getColorClass(option.color)}>
                      {option.name}
                    </Badge>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedOptions.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {selectedOptions.map((option) => (
                  <Badge
                    key={option.id}
                    variant="outline"
                    className={`${getColorClass(option.color)} cursor-pointer`}
                    onClick={() => {
                      handleLocalChange(selectedOptions.filter(opt => opt.id !== option.id));
                    }}
                  >
                    {option.name} ×
                  </Badge>
                ))}
              </div>
            )}
          </div>
        );

      case 'rating':
        const maxRating = config.maxRating || 5;
        const currentRating = (localValue as number) || 0;
        return (
          <div className="flex items-center gap-1">
            {Array.from({ length: maxRating }, (_, i) => (
              <Star
                key={i}
                className={`h-4 w-4 cursor-pointer ${
                  i < currentRating
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-300 hover:text-yellow-400'
                }`}
                onClick={() => {
                  handleLocalChange(i + 1);
                  onBlur();
                }}
              />
            ))}
            <span className="ml-2 text-sm text-gray-500">
              {currentRating} / {maxRating}
            </span>
          </div>
        );

      case 'checkbox':
        return (
          <button
            onClick={() => {
              handleLocalChange(!(localValue as boolean));
              onBlur();
            }}
            className={`flex items-center justify-center w-5 h-5 rounded border-2 transition-colors ${
              localValue
                ? 'bg-blue-500 border-blue-500 text-white'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            {localValue && <Check className="h-3 w-3" />}
          </button>
        );

      default:
        return (
          <div className="text-gray-500 italic text-sm">
            {type}タイプは実装中...
          </div>
        );
    }
  };

  const renderViewMode = () => {
    if (!localValue && localValue !== false && localValue !== 0) {
      return <div className="text-gray-400 italic text-sm">空</div>;
    }

    switch (type) {
      case 'title':
      case 'text':
        return <span className="text-gray-900 dark:text-gray-100">{localValue as string}</span>;

      case 'number':
        const numberFormat = config.numberFormat || 'number';
        if (numberFormat === 'currency') {
          return (
            <span className="flex items-center gap-1 text-gray-900 dark:text-gray-100">
              <DollarSign className="h-3 w-3" />
              {(localValue as number).toLocaleString()}
            </span>
          );
        } else if (numberFormat === 'percent') {
          return <span className="text-gray-900 dark:text-gray-100">{localValue as number}%</span>;
        }
        return <span className="text-gray-900 dark:text-gray-100">{localValue as number}</span>;

      case 'currency':
        return (
          <span className="flex items-center gap-1 text-gray-900 dark:text-gray-100">
            <DollarSign className="h-3 w-3" />
            {(localValue as number).toLocaleString()}
          </span>
        );

      case 'url':
        const url = localValue as string;
        return (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline"
          >
            <Link className="h-3 w-3" />
            {url.length > 30 ? `${url.substring(0, 30)}...` : url}
          </a>
        );

      case 'email':
        const email = localValue as string;
        return (
          <a
            href={`mailto:${email}`}
            className="flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline"
          >
            <Mail className="h-3 w-3" />
            {email}
          </a>
        );

      case 'phone':
        const phone = localValue as string;
        return (
          <a
            href={`tel:${phone}`}
            className="flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline"
          >
            <Phone className="h-3 w-3" />
            {phone}
          </a>
        );

      case 'date':
        const date = localValue as Date;
        const dateFormat = config.dateFormat || 'full';
        if (dateFormat === 'relative') {
          const now = new Date();
          const diffTime = date.getTime() - now.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          let relativeText = '';
          if (diffDays === 0) relativeText = '今日';
          else if (diffDays === 1) relativeText = '明日';
          else if (diffDays === -1) relativeText = '昨日';
          else if (diffDays > 0) relativeText = `${diffDays}日後`;
          else relativeText = `${Math.abs(diffDays)}日前`;
          
          return (
            <span className="flex items-center gap-1 text-gray-900 dark:text-gray-100">
              <Calendar className="h-3 w-3" />
              {relativeText}
            </span>
          );
        }
        return (
          <span className="flex items-center gap-1 text-gray-900 dark:text-gray-100">
            <Calendar className="h-3 w-3" />
            {date.toLocaleDateString('ja-JP')}
          </span>
        );

      case 'select':
      case 'status':
        const selectValue = localValue as SelectOption;
        return (
          <Badge variant="outline" className={getColorClass(selectValue.color)}>
            {selectValue.name}
          </Badge>
        );

      case 'multi_select':
        const multiSelectValue = localValue as SelectOption[];
        return (
          <div className="flex flex-wrap gap-1">
            {multiSelectValue.map((option) => (
              <Badge
                key={option.id}
                variant="outline"
                className={getColorClass(option.color)}
              >
                {option.name}
              </Badge>
            ))}
          </div>
        );

      case 'rating':
        const maxRating = config.maxRating || 5;
        const currentRating = (localValue as number) || 0;
        return (
          <div className="flex items-center gap-1">
            {Array.from({ length: maxRating }, (_, i) => (
              <Star
                key={i}
                className={`h-4 w-4 ${
                  i < currentRating
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-300'
                }`}
              />
            ))}
            <span className="ml-1 text-xs text-gray-500">{currentRating}</span>
          </div>
        );

      case 'checkbox':
        return (
          <div
            className={`flex items-center justify-center w-5 h-5 rounded border-2 ${
              localValue
                ? 'bg-blue-500 border-blue-500 text-white'
                : 'border-gray-300'
            }`}
          >
            {localValue && <Check className="h-3 w-3" />}
          </div>
        );

      case 'formula':
        const formulaResult = localValue as FormulaResult;
        return (
          <span className="flex items-center gap-1 text-purple-600 dark:text-purple-400 font-mono text-sm">
            <Calculator className="h-3 w-3" />
            {formulaResult?.value || 'N/A'}
          </span>
        );

      case 'created_time':
      case 'last_edited_time':
        const timestamp = localValue as Date;
        return (
          <span className="flex items-center gap-1 text-gray-500 text-sm">
            <Clock className="h-3 w-3" />
            {timestamp.toLocaleString('ja-JP')}
          </span>
        );

      case 'created_by':
      case 'last_edited_by':
        const person = localValue as Person;
        return (
          <span className="flex items-center gap-1 text-gray-900 dark:text-gray-100">
            <User className="h-3 w-3" />
            {person?.name || 'Unknown'}
          </span>
        );

      case 'files':
        const files = localValue as FileAttachment[];
        return (
          <div className="flex flex-wrap gap-1">
            {files?.map((file) => (
              <Badge key={file.id} variant="outline" className="text-blue-600">
                <FileText className="h-3 w-3 mr-1" />
                {file.name}
              </Badge>
            ))}
          </div>
        );

      case 'relation':
        return (
          <span className="text-blue-600 underline cursor-pointer">
            リレーション実装中
          </span>
        );

      case 'rollup':
        return (
          <span className="text-purple-600 font-medium">
            ロールアップ実装中
          </span>
        );

      default:
        return (
          <div className="text-gray-500 italic text-sm">
            {type}タイプは実装中...
          </div>
        );
    }
  };

  return (
    <div className={`min-h-[32px] flex items-center ${className}`}>
      {editing ? renderEditMode() : renderViewMode()}
    </div>
  );
};

export default PropertyRenderer;