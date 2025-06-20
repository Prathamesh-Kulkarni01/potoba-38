import React from 'react';
import AppLoadingScreen from '@/components/shared/app-loading-screen';

interface LoadingStateProps {
  authContextLoading: boolean;
  pathname: string;
  authContextRole: string | null;
  user: { onboardingComplete: boolean } | null;
}

const LoadingState = ({
  authContextLoading,
  pathname,
  authContextRole,
  user,
}: LoadingStateProps) => {
  if (
    authContextLoading ||
    (authContextRole === "owner" &&
      !pathname.endsWith("/create-restaurant") &&
      !pathname.endsWith("/subscription") &&
      !pathname.endsWith("/restaurant-setup"))
  ) {
    return <AppLoadingScreen message="Loading dashboard..." />;
  }

  if (
    !user ||
    !authContextRole ||
    (authContextRole === "owner" && user.onboardingComplete === false) ||
    (authContextRole === 'Waiter')
  ) {
    return <AppLoadingScreen message="Preparing your space..." />;
  }

  return null;
};

export default React.memo(LoadingState);
