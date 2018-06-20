import Vue from 'vue';
import config from '../../config.js';
import API from '../services/api';

const FETCH_MARKET_HISTORY_REQUEST = 'FETCH_MARKET_HISTORY_REQUEST';
const FETCH_MARKET_HISTORY_COMPLETE = 'FETCH_MARKET_HISTORY_COMPLETE';
const FETCH_MARKET_HISTORY_ERROR = 'FETCH_MARKET_HISTORY_ERROR';

const FETCH_ASSETS_HISTORY_REQUEST = 'FETCH_ASSETS_HISTORY_REQUEST';
const FETCH_ASSETS_HISTORY_COMPLETE = 'FETCH_ASSETS_HISTORY_COMPLETE';
const FETCH_ASSETS_HISTORY_ERROR = 'FETCH_ASSETS_HISTORY_ERROR';

const SUBSCRIBE_TO_EXCHANGE_RATE = 'SUBSCRIBE_TO_EXCHANGE_REQUEST';
const UPDATE_EXCHANGE_PRICE = 'UPDATE_MARKET_PRICE';


const SUBSCRIBE_TO_ORDERS_REQUEST = 'SUBSCRIBE_TO_ORDERS_REQUEST';
const SUBSCRIBE_TO_ORDERS_COMPLETE = 'SUBSCRIBE_TO_ORDERS_COMPLETE';
const UPDATE_MARKET_ORDERS = 'UPDATE_MARKET_ORDERS';

const SUBSCRIBED_TO_BALANCE_MARKETS = 'SUBSCRIBED_TO_BALANCE_MARKETS';
const UNSUBSCRIBED_FROM_MARKET = 'UNSUBSCRIBED_FROM_MARKET';


const initialState = {
  systemBaseId: config.defaultTradingBase,
  pending: false,
  subscribed: false,
  error: false,
  history: {},
  ordersUpdateFlags: {}
};

const actions = {
  fetchMarketHistory: async ({ commit }, { baseId, assetId, days }) => {
    commit(FETCH_MARKET_HISTORY_REQUEST, { baseId });
    const prices = await API.Assets.fetchPriceHistory(baseId, assetId, days);
    if (!prices) {
      commit(FETCH_MARKET_HISTORY_ERROR);
      return false;
    }
    commit(FETCH_MARKET_HISTORY_COMPLETE, { baseId, assetId, prices });
    return true;
  },
  fetchAssetsHistory: (store, { baseId, assetsIds, days }) => {
    const { commit } = store;
    commit(FETCH_ASSETS_HISTORY_REQUEST);

    Promise.all(assetsIds.map(async (assetId) => {
      const prices = await actions.fetchMarketHistory(store, { baseId, assetId, days });
      if (!prices) throw new Error('error market history');
    })).then(() => {
      commit(FETCH_ASSETS_HISTORY_COMPLETE);
    }).catch(() => {
      commit(FETCH_ASSETS_HISTORY_ERROR);
    });
  },
  subscribeToExchangeRate: async (store, { baseId, assetId, balance }) => {
    const { commit } = store;
    commit(SUBSCRIBE_TO_EXCHANGE_RATE, { baseId, assetId });

    const market = API.Market[baseId];
    await market.subscribeToExchangeRate(assetId, balance, (id, baseAmount) => {
      if (!baseAmount) return;
      const price = baseAmount / balance;
      commit(UPDATE_EXCHANGE_PRICE, { baseId, assetId, price });

      // WTF THIS TYT DELAET? @roma219
      store.dispatch('transactions/createOrdersFromDistribution', null, { root: true });
      console.log(assetId + ' new bts amount: : ' + baseAmount);
    });
    console.log('SUBSCRIBED TO : ' + assetId + ' : ' + balance);
  },
  subscribeToExchangeRates: (store, { baseId, balances }) => {
    const { commit } = store;
    const assetsIds = Object.keys(balances);

    Promise.all(assetsIds.map(assetId => {
      const { balance } = balances[assetId];
      return actions.subscribeToExchangeRate(store, { baseId, assetId, balance });
    })).then(() => {
      commit(SUBSCRIBED_TO_BALANCE_MARKETS);
      console.log('subscribed to markets successfully');
    });
  },
  subscribeToMarketOrders: async ({ commit }, { baseId, assetId }) => {
    commit(SUBSCRIBE_TO_ORDERS_REQUEST, { baseId, assetId });
    await API.Market[baseId].subscribeToMarket(assetId, () => {
      console.log('UPDATE MARKET ORDERS', assetId);
      commit(UPDATE_MARKET_ORDERS, { baseId, assetId });
    });
    commit(SUBSCRIBE_TO_ORDERS_COMPLETE, { baseId, assetId });
  },
  unsubscribeFromMarket: ({ commit }, { baseId }) => {
    API.Market[baseId].unsubscribeFromMarkets();
    commit(UNSUBSCRIBED_FROM_MARKET);
  }
};

const mutations = {
  [FETCH_MARKET_HISTORY_REQUEST](state, { baseId }) {
    if (state.history[baseId] === undefined) {
      state.history[baseId] = {};
    }
    state.pending = true;
  },
  [FETCH_MARKET_HISTORY_COMPLETE](state, { baseId, assetId, prices }) {
    state.pending = false;
    state.history[baseId][assetId] = prices;
    state.history = { ...state.history };
  },
  [FETCH_MARKET_HISTORY_ERROR](state) {
    state.pending = false;
    state.error = true;
  },
  [FETCH_ASSETS_HISTORY_REQUEST](state) {
    state.pending = true;
  },
  [FETCH_ASSETS_HISTORY_COMPLETE](state) {
    state.pending = false;
  },
  [FETCH_ASSETS_HISTORY_ERROR](state) {
    state.pending = false;
    state.error = true;
  },
  [SUBSCRIBED_TO_BALANCE_MARKETS](state) {
    state.subscribed = true;
  },
  [SUBSCRIBE_TO_EXCHANGE_RATE](state, { baseId, assetId }) {
    if (!state.history[baseId]) Vue.set(state.history, baseId, {});
    Vue.set(state.history[baseId], assetId, {});
  },
  [UPDATE_EXCHANGE_PRICE](state, { baseId, assetId, price }) {
    Vue.set(state.history[baseId][assetId], 'last', price);
  },
  [SUBSCRIBE_TO_ORDERS_REQUEST](state, { baseId, assetId }) {
    state.pending = true;
    state.ordersUpdateFlags[baseId] = {};
    state.ordersUpdateFlags[baseId][assetId] = null;
  },
  [SUBSCRIBE_TO_ORDERS_COMPLETE](state, { baseId, assetId, }) {
    state.pending = false;
    state.ordersUpdateFlags[baseId][assetId] = new Date();
    state.ordersUpdateFlags = { ...state.ordersUpdateFlags };
  },
  [UPDATE_MARKET_ORDERS](state, { baseId, assetId }) {
    state.ordersUpdateFlags[baseId][assetId] = new Date();
    state.ordersUpdateFlags = { ...state.ordersUpdateFlags };
  },
  [UNSUBSCRIBED_FROM_MARKET](state) {
    state.pending = false;
  }
};

const getters = {
  getMarketHistory: state => baseId => state.history[baseId] || {},
  getSystemBaseId: state => state.systemBaseId,
  getAssetMultiplier: state => {
    return (assetId) => {
      const baseId = state.systemBaseId;
      if (!state.history[baseId] || !state.history[baseId][assetId]) {
        return {
          first: 0,
          last: 0
        };
      }
      return {
        first: 1 / state.history[baseId][assetId].first,
        last: 1 / state.history[baseId][assetId].last
      };
    };
  },
  isError: state => state.error,
  isPending: state => state.pending,
  isSubscribed: state => state.subscribed,
  getMarketOrders: (state) => (baseId, assetId) => {
    return (state.ordersUpdateFlags[baseId][assetId]) ?
      API.Market[baseId].getOrderBook(assetId) : {};
  }
};

export default {
  state: initialState,
  actions,
  mutations,
  getters,
  namespaced: true
};