import { describe, it, expect, vi, beforeEach } from 'vitest';
import { trackEvent } from '../tracker';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
    from: vi.fn(() => ({
      insert: vi.fn(() => ({ error: null })),
      upsert: vi.fn(() => ({ error: null })),
    })),
    rpc: vi.fn(() => ({ error: null })),
  },
}));

vi.mock('../safeStorage', () => ({
  safeLocalStorage: {
    getItem: vi.fn(),
    setItem: vi.fn(),
  },
  safeSessionStorage: {
    getItem: vi.fn(),
    setItem: vi.fn(),
  },
}));

describe('trackEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (supabase.auth.getSession as any).mockResolvedValue({ data: { session: null } });
  });

  it('should call track_vendor_customer RPC for message_sent event', async () => {
    await trackEvent('vendor-123', 'message_sent');

    expect(supabase.rpc).toHaveBeenCalledWith('track_vendor_customer', expect.objectContaining({
      p_vendor_id: 'vendor-123',
      p_is_inquiry: true,
    }));
  });

  it('should NOT call track_vendor_customer RPC for order_completed event', async () => {
    await trackEvent('vendor-123', 'order_completed');

    expect(supabase.rpc).not.toHaveBeenCalledWith('track_vendor_customer', expect.anything());
  });

  it('should call track_vendor_customer RPC for view event when authenticated', async () => {
    (supabase.auth.getSession as any).mockResolvedValue({
      data: { session: { user: { id: 'user-456' } } }
    });

    await trackEvent('vendor-123', 'view');

    expect(supabase.rpc).toHaveBeenCalledWith('track_vendor_customer', expect.objectContaining({
      p_vendor_id: 'vendor-123',
      p_buyer_id: 'user-456',
      p_is_inquiry: false,
    }));
  });
});
