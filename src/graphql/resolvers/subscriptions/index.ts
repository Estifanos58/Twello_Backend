import taskSubscriptions from './task.js';
import notificationSubscriptions from './notification.js';

export const Subscription = {
  ...taskSubscriptions,
  ...notificationSubscriptions,
};

export default Subscription;
