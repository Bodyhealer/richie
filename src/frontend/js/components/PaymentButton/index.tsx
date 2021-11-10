import { Fragment, useMemo, useState } from 'react';
import { defineMessages, FormattedMessage, useIntl } from 'react-intl';
import * as Joanie from 'types/Joanie';
import { Maybe, Nullable } from 'types/utils';
import { handle } from 'utils/errors/handle';
import { useOrders } from 'hooks/useOrders';
import { usePayment } from 'hooks/usePayment';
import { useCourse } from 'data/CourseProductsProvider';
import { Spinner } from 'components/Spinner';
import PaymentInterface from 'components/PaymentInterfaces';

const messages = defineMessages({
  pay: {
    defaultMessage: 'Pay {price}',
    description: 'CTA label to proceed of the product',
    id: 'components.SaleTunnelStepPayment.pay',
  },
});

interface PaymentButtonProps {
  product: Joanie.Product;
  billingAddress: Maybe<Joanie.Address>;
  creditCard: Nullable<Joanie.CreditCard['id']>;
  onSuccess: () => void;
  // ? onFailed
}

enum ComponentStates {
  IDLE = 'idle',
  PAYING = 'paying',
  LOADING = 'loading',
  NOT_READY = 'not_ready',
}

const PaymentButton = ({ product, billingAddress, creditCard, onSuccess }: PaymentButtonProps) => {
  const intl = useIntl();
  const { item: course } = useCourse();
  const orders = useOrders();
  const paymentManager = usePayment();

  const isReadyToPay = useMemo(() => {
    return course?.code && product.id && billingAddress;
  }, [product, course, billingAddress]);
  const [payment, setPayment] = useState<Joanie.Payment>();
  const [state, setState] = useState<ComponentStates>(
    isReadyToPay ? ComponentStates.IDLE : ComponentStates.NOT_READY,
  );

  const processOrder = async () => {
    try {
      // ? How manage free products?
      await orders.methods.create({ course: course!.code, product: product.id }, { onSuccess });
    } catch (error) {
      handle(error);
    }
  };

  const createPayment = async () => {
    try {
      if (isReadyToPay) {
        let paymentInfos = payment;

        if (!paymentInfos) {
          paymentInfos = await paymentManager.methods.create({
            billing_address: billingAddress!,
            product_id: product.id,
            course_code: course!.code,
            credit_card_id: creditCard,
          });
        }

        if (paymentInfos) {
          setPayment(paymentInfos);
          setState(ComponentStates.PAYING);
        } else if (!paymentInfos && creditCard) {
          handleSuccess();
        }
      }
    } catch (error) {
      handle(error);
    }
  };

  const handleSuccess = () => {
    setState(ComponentStates.IDLE);
    onSuccess();
  };

  const handleError = () => {
    setState(ComponentStates.IDLE);
  };

  return (
    <Fragment>
      <button
        className="button button--primary"
        disabled={state !== ComponentStates.IDLE || orders.states.creating}
        onClick={createPayment}
      >
        {state === ComponentStates.PAYING ? (
          <Fragment>
            <Spinner />
            {payment && (
              <PaymentInterface {...payment} onError={handleError} onSuccess={handleSuccess} />
            )}
          </Fragment>
        ) : (
          <FormattedMessage
            {...messages.pay}
            values={{
              price: intl.formatNumber(product.price, {
                style: 'currency',
                currency: product.currency.code,
              }),
            }}
          />
        )}
      </button>
    </Fragment>
  );
};

export default PaymentButton;
