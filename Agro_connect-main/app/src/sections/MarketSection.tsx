import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MarketIntelligence } from './MarketIntelligence';
import { DirectMarketplace } from './DirectMarketplace';
import { TrendingUp, ShoppingCart } from 'lucide-react';
import { useLanguageStore } from '../stores/languageStore';

interface MarketSectionProps {
    onNavigateToChat: (ownerId: string) => void;
}

export function MarketSection({ onNavigateToChat }: MarketSectionProps) {
    const { t } = useLanguageStore();
    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 pt-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <Tabs defaultValue="intelligence" className="w-full">
                    <div className="flex flex-col items-center mb-8 gap-4">
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white text-center">
                            {t('market.title')}
                        </h1>
                        <TabsList className="grid w-full max-w-md grid-cols-2 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm">
                            <TabsTrigger value="intelligence" className="gap-2">
                                <TrendingUp className="w-4 h-4" />
                                {t('market.intelligence')}
                            </TabsTrigger>
                            <TabsTrigger value="marketplace" className="gap-2">
                                <ShoppingCart className="w-4 h-4" />
                                {t('market.buySell')}
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="intelligence" className="mt-0 focus-visible:ring-0">
                        {/* Removing the outer padding/container from sub-component effectively by rendering it. 
                   Since we can't easily strip styles without prop drilling, we'll just render it. 
                   To avoid double padding/margins, we might need a prop like 'embedded' but I won't add it yet. */}
                        <div className="-mt-8 -mx-4 sm:-mx-6 lg:-mx-8">
                            <MarketIntelligence />
                        </div>
                    </TabsContent>

                    <TabsContent value="marketplace" className="mt-0 focus-visible:ring-0">
                        <div className="-mt-8 -mx-4 sm:-mx-6 lg:-mx-8">
                            <DirectMarketplace onNavigateToChat={onNavigateToChat} />
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
