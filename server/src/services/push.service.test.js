// Unit tests for push notification rules. Repositories and the web-push
// sender are mocked. The key behaviours: notifications never throw into the
// caller, dead subscriptions are cleaned up, and subscribe validates input.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as pushRepository from '../repositories/push.repository.js';
import * as usersRepository from '../repositories/users.repository.js';
import { sendPushNotification } from '../config/webPush.js';
import { notifyUser, notifyAdministrators, subscribe } from './push.service.js';

vi.mock('../repositories/push.repository.js');
vi.mock('../repositories/users.repository.js');
vi.mock('../config/webPush.js', () => ({
  pushEnabled: true,
  vapidPublicKey: 'public-key',
  sendPushNotification: vi.fn(),
}));

const sub = (endpoint, user = 'u1') => ({ endpoint, p256dh: 'p', auth: 'a', user_id: user });
const payload = { title: 't', body: 'b', url: '/' };

describe('notifyUser', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sends to every device the user has subscribed', async () => {
    pushRepository.findSubscriptionsByUserIds.mockResolvedValue([sub('e1'), sub('e2')]);
    sendPushNotification.mockResolvedValue({});

    await notifyUser('u1', payload);

    expect(sendPushNotification).toHaveBeenCalledTimes(2);
    expect(sendPushNotification).toHaveBeenCalledWith(
      { endpoint: 'e1', keys: { p256dh: 'p', auth: 'a' } },
      payload
    );
  });

  it('deletes a subscription the push service reports as gone (410)', async () => {
    pushRepository.findSubscriptionsByUserIds.mockResolvedValue([sub('dead')]);
    sendPushNotification.mockRejectedValue({ statusCode: 410 });
    pushRepository.deleteSubscriptionByEndpoint.mockResolvedValue();

    await notifyUser('u1', payload);

    expect(pushRepository.deleteSubscriptionByEndpoint).toHaveBeenCalledWith('dead');
  });

  it('keeps the subscription on a transient failure, and never throws', async () => {
    pushRepository.findSubscriptionsByUserIds.mockResolvedValue([sub('e1')]);
    sendPushNotification.mockRejectedValue({ statusCode: 500 });
    vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(notifyUser('u1', payload)).resolves.toBeUndefined();
    expect(pushRepository.deleteSubscriptionByEndpoint).not.toHaveBeenCalled();
  });

  it('never throws even if the database lookup fails', async () => {
    pushRepository.findSubscriptionsByUserIds.mockRejectedValue(new Error('db down'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(notifyUser('u1', payload)).resolves.toBeUndefined();
  });
});

describe('notifyAdministrators', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sends to every administrator account', async () => {
    usersRepository.findUsersByRole.mockResolvedValue([{ user_id: 'a1' }, { user_id: 'a2' }]);
    pushRepository.findSubscriptionsByUserIds.mockResolvedValue([sub('e1', 'a1')]);
    sendPushNotification.mockResolvedValue({});

    await notifyAdministrators(payload);

    expect(usersRepository.findUsersByRole).toHaveBeenCalledWith('administrator');
    expect(pushRepository.findSubscriptionsByUserIds).toHaveBeenCalledWith(['a1', 'a2']);
    expect(sendPushNotification).toHaveBeenCalledTimes(1);
  });
});

describe('subscribe', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects a malformed subscription', async () => {
    await expect(subscribe({ userId: 'u1', subscription: { endpoint: 'x' } })).rejects.toMatchObject({
      statusCode: 400,
    });
    expect(pushRepository.upsertSubscription).not.toHaveBeenCalled();
  });

  it('stores a valid subscription for the user', async () => {
    pushRepository.upsertSubscription.mockResolvedValue();
    await subscribe({
      userId: 'u1',
      subscription: { endpoint: 'https://push.example/1', keys: { p256dh: 'p', auth: 'a' } },
    });
    expect(pushRepository.upsertSubscription).toHaveBeenCalledWith({
      userId: 'u1',
      endpoint: 'https://push.example/1',
      p256dh: 'p',
      auth: 'a',
    });
  });
});
