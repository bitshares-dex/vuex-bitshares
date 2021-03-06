import connection from './modules/connection';
import user from './modules/user';
import assets from './modules/assets';
import account from './modules/account';
import transactions from './modules/transactions';
import operations from './modules/operations';
import market from './modules/market';
import openledger from './modules/openledger';
import history from './modules/history';

export default function install(store) {
  store.registerModule('connection', connection);
  store.registerModule('user', user);
  store.registerModule('assets', assets);
  store.registerModule('account', account);
  store.registerModule('transactions', transactions);
  store.registerModule('operations', operations);
  store.registerModule('market', market);
  store.registerModule('openledger', openledger);
  store.registerModule('history', history);
}
