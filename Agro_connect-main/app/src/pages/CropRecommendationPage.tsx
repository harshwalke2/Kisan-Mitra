import { CropRecommendationForm } from '@/components/crop/CropRecommendationForm';

export function CropRecommendationPage() {
  return (
    <section className="min-h-[calc(100vh-64px)] bg-gradient-to-b from-lime-50 via-green-50 to-emerald-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-emerald-900">AI Crop Recommendation</h1>
        <p className="text-gray-700 mt-3 max-w-2xl">
          Get crop suggestions using nutrient, weather, and soil conditions powered by a trained machine learning model.
        </p>
      </div>
      <CropRecommendationForm />
    </section>
  );
}
