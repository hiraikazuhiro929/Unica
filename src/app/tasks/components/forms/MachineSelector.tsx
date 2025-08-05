import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { MACHINES } from "@/app/tasks/constants";

interface MachineSelectorProps {
  selectedMachines: string[];
  onMachinesChange: (machines: string[]) => void;
  placeholder?: string;
}

export const MachineSelector: React.FC<MachineSelectorProps> = ({
  selectedMachines,
  onMachinesChange,
  placeholder = "機械を選択",
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMachine = (machine: string) => {
    if (selectedMachines.includes(machine)) {
      onMachinesChange(selectedMachines.filter((m) => m !== machine));
    } else {
      onMachinesChange([...selectedMachines, machine]);
    }
  };

  const displayText =
    selectedMachines.length === 0 ? placeholder : selectedMachines.join(", ");

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-between text-left font-normal"
        >
          <span className="truncate">{displayText}</span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0">
        <div className="max-h-64 overflow-y-auto">
          {MACHINES.map((machine) => (
            <div
              key={machine}
              className={`p-3 hover:bg-gray-100 cursor-pointer transition-colors border-l-4 ${
                selectedMachines.includes(machine)
                  ? "bg-blue-50 border-blue-500 text-blue-700 font-medium"
                  : "border-transparent"
              }`}
              onClick={() => toggleMachine(machine)}
            >
              <span className="text-sm">{machine}</span>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};
