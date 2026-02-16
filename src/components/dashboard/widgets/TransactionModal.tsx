import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Transaction, TransactionType, TransactionCategory } from '@/types/finance';
import { MobiGlasButton } from '@/components/ui/mobiglas';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (transaction: Omit<Transaction, 'id' | 'submittedAt' | 'submittedBy'>) => void;
}

const transactionCategories: TransactionCategory[] = [
  'SALARY',
  'MISSION_REWARD',
  'CARGO_SALE',
  'MINING_PROCEEDS',
  'EQUIPMENT_PURCHASE',
  'SHIP_PURCHASE',
  'FUEL_EXPENSE',
  'MAINTENANCE',
  'OTHER'
];

export default function TransactionModal({ isOpen, onClose, onSubmit }: TransactionModalProps) {
  const [newTransaction, setNewTransaction] = useState({
    type: 'DEPOSIT' as TransactionType,
    amount: '',
    category: 'OTHER' as TransactionCategory,
    description: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...newTransaction,
      amount: Number(newTransaction.amount)
    });
    setNewTransaction({
      type: 'DEPOSIT',
      amount: '',
      category: 'OTHER',
      description: ''
    });
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50"
            onClick={onClose}
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="mg-panel relative w-full max-w-lg p-6 rounded-sm bg-[rgba(var(--mg-panel-dark),0.95)] border border-[rgba(var(--mg-primary),0.3)] shadow-lg"
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[rgba(var(--mg-primary),0.5)] to-transparent" />
            
            <h2 className="mg-title text-xl mb-6 text-center">New Transaction</h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm mb-2 text-[rgba(var(--mg-text),0.7)]">Transaction Type</label>
                  <div className="relative">
                    <select
                      value={newTransaction.type}
                      onChange={(e) => setNewTransaction({
                        ...newTransaction,
                        type: e.target.value as TransactionType
                      })}
                      className="w-full mg-input appearance-none bg-[rgba(var(--mg-panel-light),0.3)] border border-[rgba(var(--mg-primary),0.3)] pr-10"
                    >
                      <option value="DEPOSIT">Deposit</option>
                      <option value="WITHDRAWAL">Withdrawal</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                      <svg className="w-4 h-4 fill-current text-[rgba(var(--mg-primary),0.7)]" viewBox="0 0 20 20">
                        <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm mb-2 text-[rgba(var(--mg-text),0.7)]">Amount (AUEC)</label>
                  <input
                    type="number"
                    value={newTransaction.amount}
                    onChange={(e) => setNewTransaction({
                      ...newTransaction,
                      amount: e.target.value
                    })}
                    className="w-full mg-input bg-[rgba(var(--mg-panel-light),0.3)] border border-[rgba(var(--mg-primary),0.3)]"
                    min="0"
                    placeholder="Enter amount..."
                  />
                </div>

                <div>
                  <label className="block text-sm mb-2 text-[rgba(var(--mg-text),0.7)]">Category</label>
                  <div className="relative">
                    <select
                      value={newTransaction.category}
                      onChange={(e) => setNewTransaction({
                        ...newTransaction,
                        category: e.target.value as TransactionCategory
                      })}
                      className="w-full mg-input appearance-none bg-[rgba(var(--mg-panel-light),0.3)] border border-[rgba(var(--mg-primary),0.3)] pr-10"
                    >
                      {transactionCategories.map((category) => (
                        <option key={category} value={category}>
                          {category.replace('_', ' ')}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                      <svg className="w-4 h-4 fill-current text-[rgba(var(--mg-primary),0.7)]" viewBox="0 0 20 20">
                        <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm mb-2 text-[rgba(var(--mg-text),0.7)]">Description</label>
                  <input
                    type="text"
                    value={newTransaction.description}
                    onChange={(e) => setNewTransaction({
                      ...newTransaction,
                      description: e.target.value
                    })}
                    className="w-full mg-input bg-[rgba(var(--mg-panel-light),0.3)] border border-[rgba(var(--mg-primary),0.3)]"
                    placeholder="Enter transaction details..."
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-4">
                <MobiGlasButton
                  type="button"
                  variant="secondary"
                  onClick={onClose}
                >
                  Cancel
                </MobiGlasButton>
                <MobiGlasButton
                  type="submit"
                  variant="primary"
                  disabled={!newTransaction.amount || !newTransaction.description}
                >
                  Submit Transaction
                </MobiGlasButton>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
} 