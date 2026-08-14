export interface Customer {
  id: string | number;
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
