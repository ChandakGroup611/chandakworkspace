import { RealtimeChannel, REALTIME_SUBSCRIBE_STATES } from '@supabase/supabase-js';

class WebsocketTrackerStore {
  private activeChannels = new Map<string, number>();
  private channelInstances = new Set<RealtimeChannel>();
  private totalActiveCount = 0;
  
  private isProduction = process.env.NODE_ENV === 'production';
  private suspendTimeout: any = null;

  constructor() {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => this.handleVisibilityChange());
    }
  }

  private handleVisibilityChange() {
    if (document.visibilityState === 'hidden') {
      // 5 minutes idle
      this.suspendTimeout = setTimeout(() => {
        this.suspendAll();
      }, 5 * 60 * 1000);
    } else {
      if (this.suspendTimeout) {
        clearTimeout(this.suspendTimeout);
        this.suspendTimeout = null;
      }
      // We don't auto-resubscribe here, it's safer to force user refresh or let components handle it via hooks.
    }
  }

  private suspendAll() {
    console.warn('[WebsocketTracker] Long session idle detected (> 5m). Auto-suspending websockets.');
    this.channelInstances.forEach(ch => {
      try { ch.unsubscribe(); } catch(e) {}
    });
    this.channelInstances.clear();
    this.activeChannels.clear();
    this.totalActiveCount = 0;
  }

  public addChannel(topic: string, channel: RealtimeChannel) {
    const current = this.activeChannels.get(topic) || 0;
    this.activeChannels.set(topic, current + 1);
    this.channelInstances.add(channel);
    this.totalActiveCount += 1;

    this.checkThresholds();
  }

  public removeChannel(topic: string, channel: RealtimeChannel) {
    const current = this.activeChannels.get(topic) || 0;
    if (current > 0) {
      this.activeChannels.set(topic, current - 1);
      this.channelInstances.delete(channel);
      this.totalActiveCount -= 1;
      
      if (current - 1 === 0) {
        this.activeChannels.delete(topic);
      }
    }
  }

  public getActiveCount() {
    return this.totalActiveCount;
  }

  public getActiveChannels() {
    return Array.from(this.activeChannels.entries());
  }

  private checkThresholds() {
    if (this.isProduction) return; // Keeps production console clean

    if (this.totalActiveCount > 30) {
      console.error(`[WebsocketTracker] CRITICAL: ${this.totalActiveCount} active websocket channels! (Limit: 30)`);
    } else if (this.totalActiveCount > 15) {
      console.warn(`[WebsocketTracker] WARNING: ${this.totalActiveCount} active websocket channels. (Threshold: 15)`);
    }
  }
}

export const websocketStore = new WebsocketTrackerStore();

export function trackedChannel(channel: RealtimeChannel): RealtimeChannel {
  // We need to monkey patch the subscribe and unsubscribe of THIS specific channel
  const originalSubscribe = channel.subscribe.bind(channel);
  const originalUnsubscribe = channel.unsubscribe.bind(channel);

  channel.subscribe = (callback?: (status: REALTIME_SUBSCRIBE_STATES, err?: Error) => void, timeout?: number) => {
    websocketStore.addChannel(channel.topic, channel);
    return originalSubscribe(callback as any, timeout);
  };

  channel.unsubscribe = () => {
    websocketStore.removeChannel(channel.topic, channel);
    return originalUnsubscribe();
  };

  return channel;
}
