import { ArrowLeft, ExternalLink, FileCheck2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Scheme } from '@/services/schemesService';

type SchemeDetailsViewProps = {
  scheme: Scheme;
  onBack: () => void;
};

export function SchemeDetailsView({ scheme, onBack }: SchemeDetailsViewProps) {
  return (
    <Card className="mx-auto max-w-4xl border-emerald-100 shadow-sm">
      <CardHeader className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Schemes
          </Button>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-emerald-50 text-emerald-700">
              {scheme.category}
            </Badge>
            <Badge variant="outline">{scheme.state}</Badge>
          </div>
        </div>
        <CardTitle className="text-2xl leading-tight">{scheme.name}</CardTitle>
      </CardHeader>

      <CardContent className="grid gap-6 lg:grid-cols-2">
        <section className="lg:col-span-2">
          <h3 className="mb-2 text-lg font-semibold">Description</h3>
          <p className="text-sm text-gray-700 leading-relaxed">{scheme.description}</p>
        </section>

        <section>
          <h3 className="mb-2 text-lg font-semibold">Eligibility</h3>
          <p className="text-sm text-gray-700 leading-relaxed">{scheme.eligibility}</p>
        </section>

        <section>
          <h3 className="mb-2 text-lg font-semibold">Benefits</h3>
          <p className="text-sm text-gray-700 leading-relaxed">{scheme.benefits}</p>
        </section>

        <section className="lg:col-span-2">
          <h3 className="mb-3 text-lg font-semibold">Required Documents</h3>
          <ul className="grid gap-2 sm:grid-cols-2">
            {scheme.documents.map((documentName) => (
              <li
                key={documentName}
                className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm"
              >
                <FileCheck2 className="h-4 w-4 text-emerald-600" />
                <span>{documentName}</span>
              </li>
            ))}
          </ul>
        </section>

        <div className="lg:col-span-2">
          <Button asChild className="bg-emerald-600 hover:bg-emerald-700">
            <a href={scheme.application_link} target="_blank" rel="noreferrer">
              Apply Now
              <ExternalLink className="ml-2 h-4 w-4" />
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}