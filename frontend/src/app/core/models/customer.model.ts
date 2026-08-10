export interface Customer {
  id: number;
  name: string;
  mobile: string;
  address: string;
  farmerCode?: string;
  village?: string;
  bankDetails?: string;
  defaultAnimalType?: 'cow' | 'buffalo';
  joiningDate?: string;
  status?: 'active' | 'inactive';
}
