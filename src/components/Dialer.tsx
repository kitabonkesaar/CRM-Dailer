import React, { useState } from 'react';
import { Phone, Delete } from 'lucide-react';
import { motion } from 'motion/react';

interface DialerProps {
  onCall: (number: string) => void;
}

export default function Dialer({ onCall }: DialerProps) {
  const [number, setNumber] = useState('');

  const handleDigit = (digit: string) => {
    if (number.length < 15) {
      setNumber(prev => prev + digit);
    }
  };

  const handleDelete = () => {
    setNumber(prev => prev.slice(0, -1));
  };

  const handleCall = () => {
    if (number.length > 0) {
      onCall(number);
    }
  };

  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];

  return (
    <div className="flex flex-col h-full p-6">
      <div className="flex-1 flex flex-col justify-center items-center mb-8">
        <div className="h-16 mb-4 flex items-center justify-center">
          <span className="text-4xl font-light tracking-wider text-white">
            {number || <span className="text-white/20">Enter Number</span>}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8 max-w-[280px] mx-auto w-full">
        {digits.map((digit) => (
          <button
            key={digit}
            onClick={() => handleDigit(digit)}
            className="aspect-square rounded-full bg-white/5 hover:bg-white/10 active:bg-white/20 transition-colors flex items-center justify-center text-2xl font-medium text-white"
          >
            {digit}
          </button>
        ))}
      </div>

      <div className="flex justify-center gap-6 items-center mb-8">
        <button
          onClick={handleDelete}
          className="w-16 h-16 rounded-full flex items-center justify-center text-white/50 hover:text-white transition-colors"
          disabled={!number}
        >
          <Delete size={24} />
        </button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleCall}
          disabled={!number}
          className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg shadow-green-500/20 transition-all ${
            number ? 'bg-green-500 text-white' : 'bg-white/10 text-white/20'
          }`}
        >
          <Phone size={32} fill={number ? "currentColor" : "none"} />
        </motion.button>
        
        <div className="w-16" /> {/* Spacer for alignment */}
      </div>
    </div>
  );
}
