import { Fragment, useEffect, useState } from 'react';
import { defineMessages, FormattedMessage, MessageDescriptor, useIntl } from 'react-intl';
import { Modal } from 'components/Modal';

import { fetchList } from 'data/getResourceList';
import { CourseSearchParamsAction, useCourseSearchParams } from 'data/useCourseSearchParams';
import { RequestStatus } from 'types/api';
import { FacetedFilterDefinition, FilterValue } from 'types/filters';
import { Nullable } from 'types/utils';
import { useAsyncEffect } from 'utils/useAsyncEffect';

interface SearchFilterGroupModalProps {
  filter: FacetedFilterDefinition;
}

const messages = defineMessages({
  closeButton: {
    defaultMessage: 'Close',
    description: 'Text for the button to close the search filters modal',
    id: 'components.SearchFilterGroupModal.closeModal',
  },
  error: {
    defaultMessage: 'There was an error while searching for {filterName}.',
    description:
      'Error message when the search for more filter value fails in the search filters modal.',
    id: 'components.SearchFilterGroupModal.error',
  },
  inputLabel: {
    defaultMessage: 'Search for filters to add',
    description: 'Accessible label for the search input in the search filter modal.',
    id: 'components.SearchFilterGroupModal.inputLabel',
  },
  inputPlaceholder: {
    defaultMessage: 'Search in { filterName }',
    description: 'Placeholder message for the search input in the search filter modal.',
    id: 'components.SearchFilterGroupModal.inputPlaceholder',
  },
  modalTitle: {
    defaultMessage: 'Add filters for {filterName}',
    description: 'Title for the modal to add more filter values in the search filters modal.',
    id: 'components.SearchFilterGroupModal.modalTitle',
  },
  moreOptionsButton: {
    defaultMessage: 'More options',
    description:
      'Test for the button to see more filter values than the top N that appear by default.',
    id: 'components.SearchFilterGroupModal.moreOptionsButton',
  },
  queryTooShort: {
    defaultMessage: 'Type at least 3 characters to start searching.',
    description:
      'Users need to enter at least 3 characters to search for more filter values; this message informs them when they start typing.',
    id: 'components.SearchFilterGroupModal.queryTooShort',
  },
});

export const SearchFilterGroupModal = ({ filter }: SearchFilterGroupModalProps) => {
  const intl = useIntl();

  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [values, setValues] = useState([] as FilterValue[]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState(null as Nullable<MessageDescriptor>);

  // We need the current course search params to get the facet counts
  const { courseSearchParams, dispatchCourseSearchParamsUpdate } = useCourseSearchParams();

  // When the modal is closed, reset state so the user gets a brand-new one if they come back
  useEffect(() => {
    if (!modalIsOpen) {
      setValues([]);
      setQuery('');
      setError(null);
    }
  }, [modalIsOpen]);

  useAsyncEffect(async () => {
    // We can't start using full-text search until our text query is at least 3 characters long.
    if (!modalIsOpen || (query.length > 0 && query.length < 3)) {
      return;
    }

    const searchResponse = await fetchList(filter.name, {
      limit: '20',
      offset: '0',
      query,
    });

    if (searchResponse.status === RequestStatus.FAILURE) {
      setValues([]);
      return setError(messages.error);
    }

    const facetResponse = await fetchList('courses', {
      ...courseSearchParams,
      [`${filter.name}_aggs`]: searchResponse.content.objects.map((resource) => resource.id),
      scope: 'filters',
    });

    if (facetResponse.status === RequestStatus.FAILURE) {
      setValues([]);
      return setError(messages.error);
    }

    const newValues = facetResponse.content.filters[filter.name].values;

    setError(null);
    setValues(newValues);
  }, [modalIsOpen, query]);

  return (
    <Fragment>
      <button className="search-filter-group-modal-button" onClick={() => setModalIsOpen(true)}>
        <FormattedMessage {...messages.moreOptionsButton} />
      </button>
      <Modal
        bodyOpenClassName="has-search-filter-group-modal"
        className="search-filter-group-modal modal--stretched"
        isOpen={modalIsOpen}
        onRequestClose={() => setModalIsOpen(false)}
      >
        <fieldset className="search-filter-group-modal__form">
          <legend className="search-filter-group-modal__form__title">
            <FormattedMessage {...messages.modalTitle} values={{ filterName: filter.human_name }} />
          </legend>
          <input
            aria-label={intl.formatMessage(messages.inputLabel)}
            className="search-filter-group-modal__form__input"
            onChange={(event) => {
              setQuery(event.target.value);
            }}
            placeholder={intl.formatMessage(messages.inputPlaceholder, {
              filterName: filter.human_name,
            })}
          />
          {error ? (
            <div className="search-filter-group-modal__form__error">
              <FormattedMessage {...messages.error} values={{ filterName: filter.human_name }} />
            </div>
          ) : query.length > 0 && query.length < 3 ? (
            <div className="search-filter-group-modal__form__error">
              <FormattedMessage {...messages.queryTooShort} />
            </div>
          ) : (
            <ul className="search-filter-group-modal__form__values">
              {values.map((value) => (
                <li className="search-filter-group-modal__form__values__item" key={value.key}>
                  <button
                    onClick={() => {
                      dispatchCourseSearchParamsUpdate({
                        filter,
                        payload: value.key,
                        type: CourseSearchParamsAction.filterAdd,
                      });
                      setModalIsOpen(false);
                    }}
                  >
                    {value.human_name}&nbsp;
                    {value.count || value.count === 0 ? `(${value.count})` : ''}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </fieldset>
        <button className="search-filter-group-modal__close" onClick={() => setModalIsOpen(false)}>
          <FormattedMessage {...messages.closeButton} />
        </button>
      </Modal>
    </Fragment>
  );
};
