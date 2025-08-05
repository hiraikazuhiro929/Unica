import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface EditableFieldProps {
  value: string | number;
  onSave: (value: string) => void;
  placeholder?: string;
  type?: "text" | "number" | "textarea";
  className?: string;
  displayClassName?: string;
  fieldName?: string;
  multiline?: boolean;
}

export const EditableField: React.FC<EditableFieldProps> = ({
  value,
  onSave,
  placeholder = "未設定",
  type = "text",
  className = "",
  displayClassName = "",
  fieldName,
  multiline = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(String(value));

  const handleSave = () => {
    onSave(tempValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setTempValue(String(value));
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !multiline) {
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  if (!isEditing) {
    return (
      <div
        className={`p-3 hover:bg-blue-50 cursor-pointer rounded-lg border-2 border-transparent hover:border-blue-200 transition-all min-h-[44px] flex items-center bg-gray-50 ${displayClassName}`}
        onClick={() => {
          setIsEditing(true);
          setTempValue(String(value));
        }}
      >
        <span className="text-gray-800 font-medium">
          {value || placeholder}
        </span>
      </div>
    );
  }

  if (multiline) {
    return (
      <Textarea
        value={tempValue}
        onChange={(e) => setTempValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className={`border-blue-300 focus:border-blue-500 ${className}`}
        placeholder={placeholder}
        autoFocus
        rows={3}
      />
    );
  }

  return (
    <Input
      type={type}
      value={tempValue}
      onChange={(e) => setTempValue(e.target.value)}
      onBlur={handleSave}
      onKeyDown={handleKeyDown}
      className={`border-blue-300 focus:border-blue-500 ${className}`}
      placeholder={placeholder}
      autoFocus
    />
  );
};
