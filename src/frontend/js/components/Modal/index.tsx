import { PropsWithChildren } from 'react';
import ReactModal from 'react-modal';

// The `setAppElement` needs to happen in proper code but breaks our testing environment.
// This workaround is not satisfactory but it allows us to both test <SearchFilterGroupModal />
// and avoid compromising accessibility in real-world use.
const isTestEnv = process.env.NODE_ENV === 'test';
if (!isTestEnv) {
  ReactModal.setAppElement('#modal-exclude');
}

export const Modal = ({
  className,
  bodyOpenClassName,
  overlayClassName,
  children,
  ...props
}: PropsWithChildren<ReactModal.Props>) => {
  // As ReactModal can accept a ReactModal.Classes object or a string for some
  // class properties, we have to impletemente a little util to merge this special
  // object with the default CSS class to applied.
  const mergeClasses = ({ base, classes }: { base?: string; classes?: any }) => {
    if (base && classes) {
      if (typeof classes === 'object') {
        return {
          ...classes,
          base: base.concat(' ', classes.base),
        };
      }
      if (typeof classes === 'string' && classes.trim()) {
        return base.concat(' ', classes);
      }
    }

    return base || classes || undefined;
  };

  return (
    <ReactModal
      ariaHideApp={!isTestEnv}
      className={mergeClasses({ base: 'modal', classes: className })}
      bodyOpenClassName={mergeClasses({ base: 'has-opened-modal', classes: bodyOpenClassName })}
      overlayClassName={mergeClasses({ base: 'modal__overlay', classes: overlayClassName })}
      {...props}
    >
      {children}
    </ReactModal>
  );
};
