import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import fetchMock from 'fetch-mock';
import { stringify } from 'query-string';
import { IntlProvider } from 'react-intl';

import { History, HistoryContext } from 'data/useHistory';
import { SearchFilterGroupModal } from '.';

jest.mock('utils/errors/handle', () => ({ handle: jest.fn() }));

const filter = {
  base_path: '0001',
  has_more_values: false,
  human_name: 'Universities',
  is_autocompletable: true,
  is_searchable: true,
  name: 'universities',
  position: 0,
  values: [
    {
      count: 4,
      human_name: 'Value One',
      key: 'P-00010001',
    },
    {
      count: 7,
      human_name: 'Value Two',
      key: 'L-00010002',
    },
  ],
};

describe('<SearchFilterGroupModal />', () => {
  const historyPushState = jest.fn();
  const historyReplaceState = jest.fn();
  const makeHistoryOf: (params: any) => History = (params) => [
    {
      state: { name: 'courseSearch', data: { params } },
      title: '',
      url: `/search?${stringify(params)}`,
    },
    historyPushState,
    historyReplaceState,
  ];

  beforeEach(() => fetchMock.restore());
  beforeEach(jest.resetAllMocks);

  it('renders a button with a modal to search values for a given filter', async () => {
    fetchMock.get('/api/v1.0/universities/?limit=20&offset=0&query=', {
      objects: [{ id: 'L-42' }, { id: 'L-84' }, { id: 'L-99' }],
    });
    fetchMock.get(
      '/api/v1.0/courses/?limit=20&offset=0&scope=filters&universities_aggs=L-42,L-84,L-99',
      {
        filters: {
          universities: {
            values: [
              {
                count: 7,
                human_name: 'Value #42',
                key: '42',
              },
              {
                count: 12,
                human_name: 'Value #84',
                key: '84',
              },
              {
                count: 21,
                human_name: 'Value #99',
                key: '99',
              },
            ],
          },
        },
      },
    );

    const { getByPlaceholderText, getByText, queryByPlaceholderText, queryByText } = render(
      <IntlProvider locale="en">
        <HistoryContext.Provider value={makeHistoryOf({ limit: '20', offset: '0' })}>
          <SearchFilterGroupModal filter={filter} />
        </HistoryContext.Provider>
      </IntlProvider>,
    );

    // The modal is not rendered
    expect(queryByText('Add filters for Universities')).toEqual(null);
    expect(queryByPlaceholderText('Search in Universities')).toEqual(null);

    // The modal is rendered
    const openButton = getByText('More options');
    fireEvent.click(openButton);
    getByText('Add filters for Universities');
    getByPlaceholderText('Search in Universities');

    // Default search results are shown with their facet counts
    await screen.findByText(
      (content) => content.startsWith('Value #42') && content.includes('(7)'),
    );
    getByText((content) => content.startsWith('Value #84') && content.includes('(12)'));
    getByText((content) => content.startsWith('Value #99') && content.includes('(21)'));
  });

  it('searches as the user types', async () => {
    fetchMock.get('/api/v1.0/universities/?limit=20&offset=0&query=', {
      objects: [{ id: 'L-42' }, { id: 'L-84' }, { id: 'L-99' }],
    });
    fetchMock.get(
      '/api/v1.0/courses/?limit=20&offset=0&scope=filters&universities_aggs=L-42,L-84,L-99',
      {
        filters: {
          universities: {
            values: [
              {
                count: 7,
                human_name: 'Value #42',
                key: '42',
              },
              {
                count: 12,
                human_name: 'Value #84',
                key: '84',
              },
            ],
          },
        },
      },
    );

    const { getByPlaceholderText, getByText } = render(
      <IntlProvider locale="en">
        <HistoryContext.Provider value={makeHistoryOf({ limit: '20', offset: '0' })}>
          <SearchFilterGroupModal filter={filter} />
        </HistoryContext.Provider>
      </IntlProvider>,
    );

    // The modal is rendered
    const openButton = getByText('More options');
    fireEvent.click(openButton);
    getByText('Add filters for Universities');
    const field = getByPlaceholderText('Search in Universities');
    fireEvent.focus(field);

    // Default search results are shown with their facet counts
    await screen.findByText(
      (content) => content.startsWith('Value #42') && content.includes('(7)'),
    );
    getByText((content) => content.startsWith('Value #84') && content.includes('(12)'));

    // User starts typing, less than 3 characters
    fetchMock.resetHistory();
    fireEvent.change(field, { target: { value: 'us' } });
    expect(fetchMock.called()).toEqual(false);
    getByText('Type at least 3 characters to start searching.');

    // User inputs a search query
    fetchMock.get('/api/v1.0/universities/?limit=20&offset=0&query=user', {
      objects: [{ id: 'L-12' }, { id: 'L-17' }],
    });
    fetchMock.get(
      '/api/v1.0/courses/?limit=20&offset=0&scope=filters&universities_aggs=L-12,L-17',
      {
        filters: {
          universities: {
            values: [
              {
                count: 7,
                human_name: 'Value #12',
                key: '12',
              },
              {
                count: 12,
                human_name: 'Value #17',
                key: '17',
              },
            ],
          },
        },
      },
    );
    fireEvent.change(field, { target: { value: 'user' } });

    // New search results are shown with their facet counts
    await screen.findByText(
      (content) => content.startsWith('Value #12') && content.includes('(7)'),
    );
    getByText((content) => content.startsWith('Value #17') && content.includes('(12)'));

    // User further refines their search query
    fetchMock.get('/api/v1.0/universities/?limit=20&offset=0&query=user%20input', {
      objects: [{ id: 'L-03' }, { id: 'L-66' }],
    });
    fetchMock.get(
      '/api/v1.0/courses/?limit=20&offset=0&scope=filters&universities_aggs=L-03,L-66',
      {
        filters: {
          universities: {
            values: [
              {
                count: 12,
                human_name: 'Value #03',
                key: '03',
              },
              {
                count: 2,
                human_name: 'Value #17',
                key: '17',
              },
            ],
          },
        },
      },
    );
    fireEvent.change(field, { target: { value: 'user input' } });

    // New search results are shown with their facet counts
    await screen.findByText(
      (content) => content.startsWith('Value #03') && content.includes('(12)'),
    );
    getByText((content) => content.startsWith('Value #17') && content.includes('(2)'));
  });

  it('closes when the user clicks the close button', async () => {
    fetchMock.get('/api/v1.0/universities/?limit=20&offset=0&query=', {
      objects: [{ id: 'L-42' }, { id: 'L-84' }, { id: 'L-99' }],
    });
    fetchMock.get(
      '/api/v1.0/courses/?limit=20&offset=0&scope=filters&universities_aggs=L-42,L-84,L-99',
      {
        filters: {
          universities: {
            values: [],
          },
        },
      },
    );

    const { getByPlaceholderText, getByText, queryByPlaceholderText, queryByText } = render(
      <IntlProvider locale="en">
        <HistoryContext.Provider value={makeHistoryOf({ limit: '20', offset: '0' })}>
          <SearchFilterGroupModal filter={filter} />
        </HistoryContext.Provider>
      </IntlProvider>,
    );

    // The modal is not rendered
    expect(queryByText('Add filters for Universities')).toEqual(null);
    expect(queryByPlaceholderText('Search in Universities')).toEqual(null);
    expect(queryByText('Close')).toEqual(null);

    // The modal is rendered
    const openButton = getByText('More options');
    fireEvent.click(openButton);
    getByText('Add filters for Universities');
    getByPlaceholderText('Search in Universities');

    // User clicks on the close button
    const closeButton = getByText('Close');
    fireEvent.click(closeButton);

    // The modal is not rendered any more
    await waitFor(() => {
      expect(queryByText('Add filters for Universities')).toEqual(null);
    });
    expect(queryByPlaceholderText('Search in Universities')).toEqual(null);
    expect(queryByText('Close')).toEqual(null);
  });

  it('adds the value and closes when the user clicks a filter value', async () => {
    fetchMock.get('/api/v1.0/universities/?limit=20&offset=0&query=', {
      objects: [{ id: 'L-42' }, { id: 'L-84' }, { id: 'L-99' }],
    });
    fetchMock.get(
      '/api/v1.0/courses/?limit=20&offset=0&scope=filters&universities_aggs=L-42,L-84,L-99',
      {
        filters: {
          universities: {
            values: [
              {
                count: 7,
                human_name: 'Value #42',
                key: '42',
              },
              {
                count: 12,
                human_name: 'Value #84',
                key: '84',
              },
            ],
          },
        },
      },
    );

    const { getByPlaceholderText, getByText, queryByPlaceholderText, queryByText } = render(
      <IntlProvider locale="en">
        <HistoryContext.Provider value={makeHistoryOf({ limit: '20', offset: '0' })}>
          <SearchFilterGroupModal filter={filter} />
        </HistoryContext.Provider>
      </IntlProvider>,
    );

    // The modal is not rendered
    expect(queryByText('Add filters for Universities')).toEqual(null);
    expect(queryByPlaceholderText('Search in Universities')).toEqual(null);

    // The modal is rendered
    const openButton = getByText('More options');
    fireEvent.click(openButton);
    getByText('Add filters for Universities');
    getByPlaceholderText('Search in Universities');

    // Default search results are shown with their facet counts
    await screen.findByText(
      (content) => content.startsWith('Value #84') && content.includes('(12)'),
    );
    const value42 = getByText(
      (content) => content.startsWith('Value #42') && content.includes('(7)'),
    );

    // User clicks Value #42, it is added to course search params through pushState
    fireEvent.click(value42);
    expect(historyPushState).toHaveBeenLastCalledWith(
      {
        name: 'courseSearch',
        data: {
          lastDispatchActions: expect.any(Array),
          params: {
            limit: '20',
            offset: '0',
            universities: ['42'],
          },
        },
      },
      '',
      '/?limit=20&offset=0&universities=42',
    );

    // The modal is not rendered any more
    expect(queryByText('Add filters for Universities')).toEqual(null);
    expect(queryByPlaceholderText('Search in Universities')).toEqual(null);
  });

  it('shows an error message when it fails to search for values', async () => {
    fetchMock.get('/api/v1.0/universities/?limit=20&offset=0&query=', {
      throws: new Error('Failed to search for universities'),
    });

    const { getByPlaceholderText, getByText, queryByPlaceholderText, queryByText } = render(
      <IntlProvider locale="en">
        <HistoryContext.Provider value={makeHistoryOf({ limit: '20', offset: '0' })}>
          <SearchFilterGroupModal filter={filter} />
        </HistoryContext.Provider>
      </IntlProvider>,
    );

    // The modal is not rendered
    expect(queryByText('Add filters for Universities')).toEqual(null);
    expect(queryByPlaceholderText('Search in Universities')).toEqual(null);

    // The modal is rendered
    const openButton = getByText('More options');
    fireEvent.click(openButton);
    getByText('Add filters for Universities');
    getByPlaceholderText('Search in Universities');

    // The search request failed, the error is logged and a message is displayed
    await screen.findByText('There was an error while searching for Universities.');
  });

  it('shows an error message when it fails to get the actual filter', async () => {
    fetchMock.get('/api/v1.0/universities/?limit=20&offset=0&query=', {
      objects: [{ id: 'L-42' }, { id: 'L-84' }, { id: 'L-99' }],
    });
    fetchMock.get(
      '/api/v1.0/courses/?limit=20&offset=0&scope=filters&universities_aggs=L-42,L-84,L-99',
      { throws: new Error('Failed to search for universities') },
    );

    const { getByPlaceholderText, getByText, queryByPlaceholderText, queryByText } = render(
      <IntlProvider locale="en">
        <HistoryContext.Provider value={makeHistoryOf({ limit: '20', offset: '0' })}>
          <SearchFilterGroupModal filter={filter} />
        </HistoryContext.Provider>
      </IntlProvider>,
    );

    // The modal is not rendered
    expect(queryByText('Add filters for Universities')).toEqual(null);
    expect(queryByPlaceholderText('Search in Universities')).toEqual(null);

    // The modal is rendered
    const openButton = getByText('More options');
    fireEvent.click(openButton);
    getByText('Add filters for Universities');
    getByPlaceholderText('Search in Universities');

    // The filters request failed, the error is logged and a message is displayed
    await screen.findByText('There was an error while searching for Universities.');
  });
});
