import { apiRequest } from './apiClient';

export interface Scheme {
  _id: string;
  name: string;
  state: string;
  category: string;
  description: string;
  eligibility: string;
  documents: string[];
  benefits: string;
  application_link: string;
  createdAt: string;
  updatedAt?: string;
}

export interface SchemeFilterParams {
  state?: string;
  category?: string;
  keyword?: string;
}

export interface CreateSchemeInput {
  name: string;
  state: string;
  category: string;
  description: string;
  eligibility: string;
  documents: string[];
  benefits: string;
  application_link: string;
}

export interface SchemeSyncSummary {
  sourceEnabled: boolean;
  sourceMode?: 'json_url' | 'data_gov';
  sourceUrl?: string;
  totalFetched: number;
  inserted: number;
  skipped: number;
  errors: number;
}

const buildFilterQuery = (params: SchemeFilterParams): string => {
  const query = new URLSearchParams();

  if (params.state) {
    query.set('state', params.state);
  }
  if (params.category) {
    query.set('category', params.category);
  }
  if (params.keyword) {
    query.set('keyword', params.keyword);
  }

  const queryText = query.toString();
  return queryText ? `?${queryText}` : '';
};

export const schemesService = {
  getAll: async (): Promise<Scheme[]> => {
    const response = await apiRequest<{ schemes: Scheme[] }>('/api/schemes');
    return response.schemes || [];
  },

  getById: async (id: string): Promise<Scheme> => {
    const response = await apiRequest<{ scheme: Scheme }>(`/api/schemes/${encodeURIComponent(id)}`);
    return response.scheme;
  },

  filter: async (params: SchemeFilterParams): Promise<Scheme[]> => {
    const query = buildFilterQuery(params);
    const response = await apiRequest<{ schemes: Scheme[] }>(`/api/schemes/filter${query}`);
    return response.schemes || [];
  },

  create: async (payload: CreateSchemeInput): Promise<Scheme> => {
    const response = await apiRequest<{ scheme: Scheme }>('/api/schemes', {
      method: 'POST',
      body: payload,
    });

    return response.scheme;
  },

  syncFromGovernmentSource: async (): Promise<SchemeSyncSummary> => {
    const response = await apiRequest<{ summary: SchemeSyncSummary }>('/api/schemes/sync', {
      method: 'POST',
    });
    return response.summary;
  },
};