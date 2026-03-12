// Trial status hook - simplified for marketplace model
export const useTrialStatus = () => {
  return {
    isTrialActive: true,
    trialEndsAt: null,
    daysRemaining: 0,
    paymentConfirmed: true,
    isLoading: false,
  };
};
