export interface BillItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category: string;
  assignees: string[]; // List of user IDs splitting this specific item
}

export interface Bill {
  id: string;
  title: string;
  shopName: string;
  date: string;
  totalAmount: number;
  items: BillItem[];
  creatorId: string;
  homeId?: string;
  imageUrl?: string;
  status: 'pending' | 'paid';
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  photoUrl?: string;
  homeId?: string;
}

export interface Home {
  id: string;
  name: string;
  inviteCode: string;
  members: User[];
  billHistory: Bill[];
}

export interface SMSTransaction {
  id: string;
  sender: string;
  text: string;
  amount: number;
  date: string;
  bankName: string;
  isHousehold: boolean;
}

export interface ProductPrice {
  name: string;
  price: number;
  shopName: string;
  date: string;
}
