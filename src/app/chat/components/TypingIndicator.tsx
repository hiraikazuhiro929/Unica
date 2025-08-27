"use client";

import React from "react";
import { motion } from "framer-motion";
import { MoreHorizontal } from "lucide-react";
import type { TypingStatus } from "@/lib/firebase/chat";

interface TypingIndicatorProps {
  typingUsers: TypingStatus[];
  className?: string;
}

const TypingDots: React.FC = () => (
  <div className="flex space-x-1">
    {[0, 1, 2].map((index) => (
      <motion.div
        key={index}
        className="w-2 h-2 bg-gray-400 rounded-full"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.7, 1, 0.7],
        }}
        transition={{
          duration: 1.2,
          repeat: Infinity,
          delay: index * 0.2,
        }}
      />
    ))}
  </div>
);

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({
  typingUsers,
  className = "",
}) => {
  if (typingUsers.length === 0) {
    return null;
  }

  const renderTypingText = () => {
    if (typingUsers.length === 1) {
      return `${typingUsers[0].userName}が入力中`;
    } else if (typingUsers.length === 2) {
      return `${typingUsers[0].userName}と${typingUsers[1].userName}が入力中`;
    } else if (typingUsers.length === 3) {
      return `${typingUsers[0].userName}、${typingUsers[1].userName}、${typingUsers[2].userName}が入力中`;
    } else {
      return `${typingUsers.length}人が入力中`;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className={`flex items-center space-x-2 text-sm text-gray-500 ${className}`}
    >
      <TypingDots />
      <span className="italic">{renderTypingText()}</span>
    </motion.div>
  );
};

export default TypingIndicator;