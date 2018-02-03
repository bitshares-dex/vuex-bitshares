import * as types from '../mutations';
import * as apis from '../services/api';
import * as utils from '../services/utils';

/**
 * Fetches and processes data for portfolio
 * @param {Object} balances - object with balances by key as id of asset
 */
export const fetchPortfolioData = async ({ commit, getters }, {
  balances, baseId, fiatId, days
}) => {
  const assets = getters.getAssets;
  const defaultAssetsIds = getters.getDefaultAssetsIds;
  const base = assets[baseId];
  const fiatAsset = assets[fiatId];
  const userAssetsIds = Object.keys(balances);

  // balance + default assets without duplication
  const filteredAssetsIdsList = userAssetsIds.concat(defaultAssetsIds.filter((id) => {
    return userAssetsIds.indexOf(id) < 0;
  }));

    // fetch currency asset prices history first to calc multiplier
    // (to calculate fiat value of each asset)
  const fiatPrices = await apis.fetchAssetsPriceHistory(base, fiatAsset, days);
  const fiatMultiplier = {
    first: 1 / fiatPrices.first,
    last: 1 / fiatPrices.last
  };

    // fetch and calculate prices for each asset
  filteredAssetsIdsList.forEach(async (id) => {
    let balance = (balances[id] && balances[id].balance) || 0;
    balance = balance / (10 ** assets[id].precision);
    const name = assets[id].symbol;
    commit(types.FETCH_PORTFOLIO_ASSET_REQUEST, { id, name: assets[id].symbol, balance });
    const prices = await apis.fetchAssetsPriceHistory(base, assets[id], 7);

    const { balanceBase, balanceFiat, change } = utils.calcPortfolioData({
      balance,
      assetPrices: prices,
      fiatMultiplier,
      isBase: id === baseId,
      isFiat: id === fiatId
    });

    commit(types.FETCH_PORTFOLIO_ASSET_COMPLETE, {
      id,
      data: {
        name, balance, balanceBase, balanceFiat, change
      }
    });
    // }, () => {
    // commit(types.FETCH_PORTFOLIO_ASSET_ERROR, { id });
    // });
  });
};
/**
 * Resets portfolio state to initial
 */
export const resetPortfolioState = ({ commit }) => {
  commit(types.RESET_PORTFOLIO_STATE);
};
