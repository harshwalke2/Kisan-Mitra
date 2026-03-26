import { MapPin, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Scheme } from '@/services/schemesService';

type SchemeCardProps = {
  scheme: Scheme;
  onViewDetails: (schemeId: string) => void;
};

export function SchemeCard({ scheme, onViewDetails }: SchemeCardProps) {
  return (
    <Card className="h-full border-emerald-100 transition-all hover:-translate-y-0.5 hover:shadow-md">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="bg-emerald-50 text-emerald-700">
            {scheme.category}
          </Badge>
          <Badge variant="outline" className="border-blue-200 text-blue-700">
            {scheme.state}
          </Badge>
        </div>
        <CardTitle className="text-lg leading-snug">{scheme.name}</CardTitle>
      </CardHeader>
      <CardContent className="flex h-full flex-col space-y-4">
        <p className="text-sm text-gray-600 line-clamp-3">{scheme.description}</p>
        <div className="space-y-1 text-xs text-gray-500">
          <p className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5" />
            <span>{scheme.state}</span>
          </p>
          <p className="flex items-center gap-2">
            <Tag className="h-3.5 w-3.5" />
            <span>{scheme.category}</span>
          </p>
        </div>
        <Button className="mt-auto w-full" onClick={() => onViewDetails(scheme._id)}>
          View Details
        </Button>
      </CardContent>
    </Card>
  );
}