import { useEffect, useCallback } from 'react';
import { usePayment } from 'hooks/usePayment';
import { PaymentProviderInterfaceProps } from '.';

const PayplugLightbox = ({
  url,
  payment_id,
  onSuccess,
  onError,
}: PaymentProviderInterfaceProps) => {
  const paymentManager = usePayment();
  const openLightbox = useCallback(() => {
    window.Payplug.showPayment(url);

    window.addEventListener('message', (event) => {
      if (typeof event.data === 'string') {
        switch (event.data) {
          case 'closePayPlugFrame':
            // paymentManager.methods.abort(payment_id);
            onError();
            break;
        }
      } else if (typeof event.data === 'object') {
        switch (event.data.event) {
          case 'paidByPayPlug':
            window.Payplug._closeIframe();
            onSuccess();
        }
      }
    });
  }, [url]);

  useEffect(() => {
    if (!window.Payplug) {
      const script = document.createElement('script');
      script.src = 'https://api.payplug.com/js/1/form.latest.js';
      script.async = true;
      document.body.appendChild(script);
      script.onload = openLightbox;
    } else {
      openLightbox();
    }
  }, []);

  return null;
};

export default PayplugLightbox;
