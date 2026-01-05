export type RootStackParamList = {
  MapMainScreen: undefined;
  TransactionScreen: undefined;
  MapScreen: {
    onLocationSelected: (lat: number, lng: number) => void;
  };
  LocationShareScreen: {
    transactionId: string;
    handoffId: string;
  };
  HandoffConfirmScreen: {
    handoffId: string;
    transactionId: string;
  };
};
