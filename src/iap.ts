import * as Android from './types/android';

import {
  EmitterSubscription,
  Linking,
  NativeEventEmitter,
  NativeModules,
  Platform,
} from 'react-native';
import {
  IAPErrorCode,
  InAppPurchase,
  InstallSourceAndroid,
  Product,
  ProductCommon,
  ProductPurchase,
  ProrationModesAndroid,
  PurchaseError,
  PurchaseResult,
  PurchaseStateAndroid,
  Subscription,
  SubscriptionPurchase,
} from './types';

const {RNIapAndroidModule} = NativeModules;

const ANDROID_ITEM_TYPE_SUBSCRIPTION = 'subs';
const ANDROID_ITEM_TYPE_IAP = 'inapp';

export const getInstallSourceAndroid = (): InstallSourceAndroid => {
  return InstallSourceAndroid.GOOGLE_PLAY;
};

const checkNativeAndroidAvailable = (): void => {
  if (!RNIapAndroidModule)
    throw new Error(IAPErrorCode.E_IAP_NOT_AVAILABLE);
};

const getAndroidModule = (): typeof RNIapAndroidModule => {
  checkNativeAndroidAvailable();

  return RNIapAndroidModule;
};

const getNativeModule = ():
  | typeof RNIapAndroidModule => {
  return RNIapAndroidModule
};

/**
 * Init module for purchase flow. Required on Android. In ios it will check wheter user canMakePayment.
 * @returns {Promise<boolean>}
 */
export const initConnection = (): Promise<boolean> =>
  getNativeModule().initConnection();

/**
 * End module for purchase flow.
 * @returns {Promise<void>}
 */
export const endConnection = (): Promise<void> =>
  getNativeModule().endConnection();

/**
 * Consume all 'ghost' purchases (that is, pending payment that already failed but is still marked as pending in Play Store cache). Android only.
 * @returns {Promise<boolean>}
 */
export const flushFailedPurchasesCachedAsPendingAndroid = (): Promise<
  string[]
> => getAndroidModule().flushFailedPurchasesCachedAsPending();

/**
 * Fill products with additional data
 * @param {Array<ProductCommon>} products Products
 */
const fillProductsAdditionalData = async (
  products: Array<ProductCommon>,
): Promise<Array<ProductCommon>> => {
  return products;
};

/**
 * Get a list of products (consumable and non-consumable items, but not subscriptions)
 * @param {string[]} skus The item skus
 * @returns {Promise<Product[]>}
 */
export const getProducts = async (skus: string[]): Promise<Array<Product>> => {
  const products = await getAndroidModule().getItemsByType(
    ANDROID_ITEM_TYPE_IAP,
    skus,
  );

  // @ts-ignore
  return fillProductsAdditionalData(products);
}


/**
 * Get a list of subscriptions
 * @param {string[]} skus The item skus
 * @returns {Promise<Subscription[]>}
 */
export const getSubscriptions = async (skus: string[]): Promise<Subscription[]> => {
  const subscriptions = await getAndroidModule().getItemsByType(
    ANDROID_ITEM_TYPE_SUBSCRIPTION,
    skus,
  );

  // @ts-ignore
  return fillProductsAdditionalData(subscriptions);
}

/**
 * Gets an invetory of purchases made by the user regardless of consumption status
 * @returns {Promise<(InAppPurchase | SubscriptionPurchase)[]>}
 */
export const getPurchaseHistory = (): Promise<
  (InAppPurchase | SubscriptionPurchase)[]
> =>
  (
    Platform.select({
      android: async () => {
        const products = await getAndroidModule().getPurchaseHistoryByType(
          ANDROID_ITEM_TYPE_IAP,
        );

        const subscriptions = await getAndroidModule().getPurchaseHistoryByType(
          ANDROID_ITEM_TYPE_SUBSCRIPTION,
        );

        return products.concat(subscriptions);
      },
    }) || Promise.resolve
  )();

/**
 * Get all purchases made by the user (either non-consumable, or haven't been consumed yet)
 * @returns {Promise<(InAppPurchase | SubscriptionPurchase)[]>}
 */
export const getAvailablePurchases = (): Promise<
  (InAppPurchase | SubscriptionPurchase)[]
> =>
  (
    Platform.select({
      android: async () => {
        const products = await getAndroidModule().getAvailableItemsByType(
          ANDROID_ITEM_TYPE_IAP,
        );

        const subscriptions = await getAndroidModule().getAvailableItemsByType(
          ANDROID_ITEM_TYPE_SUBSCRIPTION,
        );

        return products.concat(subscriptions);
      },
    }) || Promise.resolve
  )();

/**
 * Request a purchase for product. This will be received in `PurchaseUpdatedListener`.
 * @param {string} sku The product's sku/ID
 * @param {boolean} [andDangerouslyFinishTransactionAutomaticallyIOS] You should set this to false and call finishTransaction manually when you have delivered the purchased goods to the user. It defaults to true to provide backwards compatibility. Will default to false in version 4.0.0.
 * @param {string} [obfuscatedAccountIdAndroid] Specifies an optional obfuscated string that is uniquely associated with the user's account in your app.
 * @param {string} [obfuscatedProfileIdAndroid] Specifies an optional obfuscated string that is uniquely associated with the user's profile in your app.
 * @returns {Promise<InAppPurchase>}
 */
export const requestPurchase = (
  sku: string,
  andDangerouslyFinishTransactionAutomaticallyIOS: boolean = false,
  obfuscatedAccountIdAndroid: string | undefined = undefined,
  obfuscatedProfileIdAndroid: string | undefined = undefined,
): Promise<InAppPurchase> =>
  (
    Platform.select({
      android: async () => {
        return getAndroidModule().buyItemByType(
          ANDROID_ITEM_TYPE_IAP,
          sku,
          null,
          0,
          obfuscatedAccountIdAndroid,
          obfuscatedProfileIdAndroid,
        );
      },
    }) || Promise.resolve
  )();

/**
 * Request a purchase for product. This will be received in `PurchaseUpdatedListener`.
 * @param {string} [sku] The product's sku/ID
 * @param {boolean} [andDangerouslyFinishTransactionAutomaticallyIOS] You should set this to false and call finishTransaction manually when you have delivered the purchased goods to the user. It defaults to true to provide backwards compatibility. Will default to false in version 4.0.0.
 * @param {string} [purchaseTokenAndroid] purchaseToken that the user is upgrading or downgrading from (Android).
 * @param {ProrationModesAndroid} [prorationModeAndroid] UNKNOWN_SUBSCRIPTION_UPGRADE_DOWNGRADE_POLICY, IMMEDIATE_WITH_TIME_PRORATION, IMMEDIATE_AND_CHARGE_PRORATED_PRICE, IMMEDIATE_WITHOUT_PRORATION, DEFERRED
 * @param {string} [obfuscatedAccountIdAndroid] Specifies an optional obfuscated string that is uniquely associated with the user's account in your app.
 * @param {string} [obfuscatedProfileIdAndroid] Specifies an optional obfuscated string that is uniquely associated with the user's profile in your app.
 * @returns {Promise<SubscriptionPurchase | null>} Promise resolves to null when using proratioModesAndroid=DEFERRED, and to a SubscriptionPurchase otherwise
 */
export const requestSubscription = (
  sku: string,
  andDangerouslyFinishTransactionAutomaticallyIOS: boolean = false,
  purchaseTokenAndroid: string | undefined = undefined,
  prorationModeAndroid: ProrationModesAndroid = -1,
  obfuscatedAccountIdAndroid: string | undefined = undefined,
  obfuscatedProfileIdAndroid: string | undefined = undefined,
): Promise<SubscriptionPurchase | null> =>
  (
    Platform.select({
      android: async () => {
        return getAndroidModule().buyItemByType(
          ANDROID_ITEM_TYPE_SUBSCRIPTION,
          sku,
          purchaseTokenAndroid,
          prorationModeAndroid,
          obfuscatedAccountIdAndroid,
          obfuscatedProfileIdAndroid,
        );
      },
    }) || Promise.resolve
  )();

/**
 * Finish Transaction (both platforms)
 *   Abstracts  Finish Transaction
 *   iOS: Tells StoreKit that you have delivered the purchase to the user and StoreKit can now let go of the transaction.
 *   Call this after you have persisted the purchased state to your server or local data in your app.
 *   `react-native-iap` will continue to deliver the purchase updated events with the successful purchase until you finish the transaction. **Even after the app has relaunched.**
 *   Android: it will consume purchase for consumables and acknowledge purchase for non-consumables.
 * @param {object} purchase The purchase that you would like to finish.
 * @param {boolean} isConsumable Checks if purchase is consumable. Has effect on `android`.
 * @param {string} developerPayloadAndroid Android developerPayload.
 * @returns {Promise<string | void> }
 */
export const finishTransaction = (
  purchase: InAppPurchase | ProductPurchase,
  isConsumable?: boolean,
  developerPayloadAndroid?: string,
): Promise<string | void> => {
  return (
    Platform.select({
      android: async () => {
        if (purchase)
          if (isConsumable)
            return getAndroidModule().consumeProduct(
              purchase.purchaseToken,
              developerPayloadAndroid,
            );
          else if (
            (!purchase.isAcknowledgedAndroid &&
              purchase.purchaseStateAndroid === PurchaseStateAndroid.PURCHASED)
          )
            return getAndroidModule().acknowledgePurchase(
              purchase.purchaseToken,
              developerPayloadAndroid,
            );
          else throw new Error('purchase is not suitable to be purchased');
        else throw new Error('purchase is not assigned');
      },
    }) || Promise.resolve
  )();
};

/**
 * Acknowledge a product (on Android.) No-op on iOS.
 * @param {string} token The product's token (on Android)
 * @returns {Promise<PurchaseResult | void>}
 */
export const acknowledgePurchaseAndroid = (
  token: string,
  developerPayload?: string,
): Promise<PurchaseResult | void> => {
  return getAndroidModule().acknowledgePurchase(token, developerPayload);
};

/**
 * Deep link to subscriptions screen on Android. No-op on iOS.
 * @param {string} sku The product's SKU (on Android)
 * @returns {Promise<void>}
 */
export const deepLinkToSubscriptionsAndroid = (sku: string): Promise<void> => {
  checkNativeAndroidAvailable();

  return Linking.openURL(
    `https://play.google.com/store/account/subscriptions?package=${RNIapAndroidModule.getPackageName()}&sku=${sku}`,
  );
};

/**
 * Validate receipt for Android. NOTE: This method is here for debugging purposes only. Including
 * your access token in the binary you ship to users is potentially dangerous.
 * Use server side validation instead for your production builds
 * @param {string} packageName package name of your app.
 * @param {string} productId product id for your in app product.
 * @param {string} productToken token for your purchase.
 * @param {string} accessToken accessToken from googleApis.
 * @param {boolean} isSub whether this is subscription or inapp. `true` for subscription.
 * @returns {Promise<object>}
 */
export const validateReceiptAndroid = async (
  packageName: string,
  productId: string,
  productToken: string,
  accessToken: string,
  isSub?: boolean,
): Promise<Android.ReceiptType> => {
  const type = isSub ? 'subscriptions' : 'products';

  const url =
    'https://androidpublisher.googleapis.com/androidpublisher/v3/applications' +
    `/${packageName}/purchases/${type}/${productId}` +
    `/tokens/${productToken}?access_token=${accessToken}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok)
    throw Object.assign(new Error(response.statusText), {
      statusCode: response.status,
    });

  return response.json();
};

/**
 * Add IAP purchase event
 * @returns {callback(e: InAppPurchase | ProductPurchase)}
 */
export const purchaseUpdatedListener = (
  listener: (event: InAppPurchase | SubscriptionPurchase) => void,
): EmitterSubscription => {
  const myModuleEvt = new NativeEventEmitter(getNativeModule());

  const emitterSubscription = myModuleEvt.addListener(
    'purchase-updated',
    listener,
  );
  if (Platform.OS === 'android') getAndroidModule().startListening();

  return emitterSubscription;
};

/**
 * Add IAP purchase error event
 * @returns {callback(e: PurchaseError)}
 */
export const purchaseErrorListener = (
  listener: (errorEvent: PurchaseError) => void,
): EmitterSubscription =>
  new NativeEventEmitter(getNativeModule()).addListener(
    'purchase-error',
    listener,
  );
