import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Building2, RefreshCw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { SchemeCard } from '@/components/schemes/SchemeCard';
import { SchemeDetailsView } from '@/components/schemes/SchemeDetailsView';
import { schemesService, type Scheme, type SchemeSyncSummary } from '@/services/schemesService';
import { useLanguageStore } from '../stores/languageStore';

const ALL_FILTER = '__all__';

export function GovernmentSchemes() {
  const { t } = useLanguageStore();

  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [allSchemes, setAllSchemes] = useState<Scheme[]>([]);
  const [selectedScheme, setSelectedScheme] = useState<Scheme | null>(null);

  const [stateFilter, setStateFilter] = useState(ALL_FILTER);
  const [categoryFilter, setCategoryFilter] = useState(ALL_FILTER);
  const [keyword, setKeyword] = useState('');

  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const loadSchemes = async (withLoader = true): Promise<void> => {
    if (withLoader) {
      setLoading(true);
    }
    setError(null);

    try {
      const data = await schemesService.getAll();
      setAllSchemes(data);
      setSchemes(data);
    } catch (apiError) {
      setError('Unable to load schemes right now. Please try again.');
    } finally {
      if (withLoader) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    void loadSchemes(true);
  }, []);

  useEffect(() => {
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);

      try {
        const filtered = await schemesService.filter({
          state: stateFilter === ALL_FILTER ? undefined : stateFilter,
          category: categoryFilter === ALL_FILTER ? undefined : categoryFilter,
          keyword: keyword.trim() || undefined,
        });
        setSchemes(filtered);
      } catch (apiError) {
        setError('Unable to apply filters right now. Please retry.');
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [stateFilter, categoryFilter, keyword]);

  const recentlyAddedSchemes = useMemo(
    () => [...allSchemes].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).slice(0, 4),
    [allSchemes]
  );

  const stateOptions = useMemo(
    () => Array.from(new Set(allSchemes.map((scheme) => scheme.state))).sort((a, b) => a.localeCompare(b)),
    [allSchemes]
  );

  const categoryOptions = useMemo(
    () => Array.from(new Set(allSchemes.map((scheme) => scheme.category))).sort((a, b) => a.localeCompare(b)),
    [allSchemes]
  );

  const handleViewDetails = async (schemeId: string) => {
    setDetailsLoading(true);
    setError(null);

    try {
      const scheme = await schemesService.getById(schemeId);
      setSelectedScheme(scheme);
    } catch (apiError) {
      setError('Unable to load scheme details. Please try again.');
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleGovernmentSync = async () => {
    setSyncLoading(true);
    setSyncMessage(null);
    setError(null);

    try {
      const summary: SchemeSyncSummary = await schemesService.syncFromGovernmentSource();
      await loadSchemes(false);

      const sourceLabel = summary.sourceMode === 'data_gov' ? 'Data.gov' : 'JSON source';
      setSyncMessage(
        `Sync complete from ${sourceLabel}: fetched ${summary.totalFetched}, inserted ${summary.inserted}, skipped ${summary.skipped}, errors ${summary.errors}.`
      );
    } catch (apiError: any) {
      const message = apiError?.message || 'Unable to sync schemes from government source.';
      setError(message);
    } finally {
      setSyncLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-lime-100 py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <header className="mb-8 rounded-2xl border border-emerald-200 bg-white/90 p-6 shadow-sm backdrop-blur-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="flex items-center gap-3 text-3xl font-bold text-gray-900">
                <Building2 className="h-8 w-8 text-emerald-600" />
                {t('schemes.title')}
              </h1>
              <p className="mt-2 text-gray-600">{t('schemes.subtitle')}</p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={handleGovernmentSync}
                disabled={syncLoading}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {syncLoading ? <Spinner className="mr-2 h-4 w-4" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Refresh From Government Data
              </Button>
            </div>
          </div>

          {syncMessage && (
            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
              {syncMessage}
            </div>
          )}
        </header>

        {selectedScheme ? (
          <SchemeDetailsView scheme={selectedScheme} onBack={() => setSelectedScheme(null)} />
        ) : (
          <div className="space-y-8">
            <Card className="border-emerald-100 shadow-sm">
              <CardHeader className="pb-0">
                <CardTitle className="text-lg">Find Schemes</CardTitle>
              </CardHeader>
              <CardContent className="grid items-center gap-4 p-4 md:grid-cols-12">
                <div className="relative md:col-span-4">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    value={keyword}
                    onChange={(event) => setKeyword(event.target.value)}
                    placeholder="Search schemes by name or description"
                    className="pl-10"
                  />
                </div>

                <div className="md:col-span-4">
                  <Select value={stateFilter} onValueChange={setStateFilter}>
                    <SelectTrigger>
                    <SelectValue placeholder="Filter by state" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_FILTER}>All States</SelectItem>
                      {stateOptions.map((state) => (
                        <SelectItem key={state} value={state}>
                          {state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="md:col-span-3">
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger>
                    <SelectValue placeholder="Filter by category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_FILTER}>All Categories</SelectItem>
                      {categoryOptions.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="text-sm text-gray-600 md:col-span-1 md:text-right">
                  {schemes.length} schemes
                </div>
              </CardContent>
            </Card>

            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900">Recently Added Schemes</h2>
              {recentlyAddedSchemes.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-sm text-gray-600">
                    No recently added schemes available.
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {recentlyAddedSchemes.map((scheme) => (
                    <SchemeCard key={`recent-${scheme._id}`} scheme={scheme} onViewDetails={handleViewDetails} />
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900">All Schemes</h2>

              {(loading || detailsLoading) && (
                <div className="flex items-center gap-2 rounded-lg bg-white p-4 text-gray-700 shadow-sm">
                  <Spinner className="h-5 w-5" />
                  <span>Loading schemes...</span>
                </div>
              )}

              {!loading && !detailsLoading && schemes.length === 0 && (
                <Card>
                  <CardContent className="p-8 text-center text-gray-600">
                    No schemes found for the selected filters. Try changing state, category, or search keyword.
                  </CardContent>
                </Card>
              )}

              {!loading && !detailsLoading && schemes.length > 0 && (
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {schemes.map((scheme) => (
                    <SchemeCard key={scheme._id} scheme={scheme} onViewDetails={handleViewDetails} />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
