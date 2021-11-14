import {NativeModules, Platform} from 'react-native';
NativeModules.RNIapAndroidModule = {
  ...NativeModules.RNIapAndroidModule,
  initConnection: jest.fn(() => Promise.resolve(true)),
  endConnection: jest.fn(),
  getInstallSource: jest.fn(),
};
