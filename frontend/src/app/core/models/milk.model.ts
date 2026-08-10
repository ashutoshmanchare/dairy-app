export interface MilkCollection {
  id: number;
  customerId: number;
  customerName?: string;
  farmerCode?: string;
  entryDate: string;
  quantity: number;
  rate: number;
  totalAmount: number;
  shift?: 'morning' | 'evening';
  animalType?: 'cow' | 'buffalo';
  fat?: number;
  snf?: number;
  clr?: number;
}
