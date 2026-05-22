import type { ReferralValidationResponse } from '@/lib/utils/types';

export async function validateReferral(
  ref: string,
): Promise<ReferralValidationResponse> {
  try {
    const response = await fetch('/api/referral/validate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ref }),
    });

    const data = (await response.json()) as Partial<ReferralValidationResponse>;

    if (!response.ok) {
      return {
        valid: false,
        message:
          typeof data.message === 'string'
            ? data.message
            : 'Failed to validate referral code',
      };
    }

    return {
      valid: Boolean(data.valid),
      message: typeof data.message === 'string' ? data.message : undefined,
    };
  } catch {
    return {
      valid: false,
      message: 'Failed to validate referral code',
    };
  }
}
