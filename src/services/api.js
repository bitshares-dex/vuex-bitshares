import { Apis } from 'bitsharesjs-ws';
import * as User from './user';
import * as utils from './utils';

export const initApis = (statusCallback) => {
  const wsString = 'wss://bitshares.openledger.info/ws';
  Apis.setRpcConnectionStatusCallback(statusCallback);
  return Apis.instance(wsString, true).init_promise;
};

// export const getAssets = (assets) => {
//   return new Promise((resolve, reject) => {
//     Apis.instance().db_api().exec('lookup_asset_symbols', [assets])
//       .then(assetObjects => {
//         resolve(assetObjects);
//       })
//       .catch(error => {
//         reject(error);
//       });
//   });
// };


export const getAssets = async (assets) => {
  const result = await Apis.instance().db_api().exec('lookup_asset_symbols', [assets]);
  return result;
};


export const fetchAssetsPriceHistory = (base, quote, days) => {
  return new Promise((resolve, reject) => {
    const bucketSize = 3600;
    const endDate = new Date();
    const startDate = new Date(endDate - (1000 * 60 * 60 * 24 * days));
    const endDateISO = endDate.toISOString().slice(0, -5);
    const startDateISO = startDate.toISOString().slice(0, -5);

    Apis.instance().history_api().exec(
      'get_market_history',
      [base.id, quote.id, bucketSize, startDateISO, endDateISO]
    ).then((result) => {
      const prices = utils.formatPrices(utils.getPrices(result), base, quote);
      resolve(prices);
    })
      .catch((error) => {
        reject(error);
      });
  });
};


export { User };
