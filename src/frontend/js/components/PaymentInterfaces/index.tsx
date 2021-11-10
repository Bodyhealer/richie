import { lazy, Suspense } from 'react';
import * as Joanie from 'types/Joanie';
import { handle } from 'utils/errors/handle';

const LazyPayplugLightbox = lazy(() => import('./PayplugLightbox'));

export interface PaymentProviderInterfaceProps extends Joanie.Payment {
  onSuccess: () => void;
  onError: () => void;
}

const PaymentProvider = (props: PaymentProviderInterfaceProps) => {
  const isSupportedProvider = (provider: string) => {
    return Object.values<string>(Joanie.PaymentProviders).includes(provider);
  };

  if (!isSupportedProvider(props.provider)) {
    const error = new Error(`Payment provider ${props.provider} not implemented`);
    handle(error);
    throw error;
  }

  return (
    <Suspense fallback={null}>
      {props.provider === Joanie.PaymentProviders.PAYPLUG && <LazyPayplugLightbox {...props} />}
    </Suspense>
  );
};

export default PaymentProvider;
