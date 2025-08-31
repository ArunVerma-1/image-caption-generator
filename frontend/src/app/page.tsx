'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { checkHealth } from '../../lib/api';

// Define the interface for caption data
interface CaptionData {
  success: boolean;
  caption: string;
  confidence_score: number;
  method_used: string;
  word_count: number;
  image_dimensions: number[];
  filename: string;
  model_mode: string;
}

const ImageUpload = dynamic(() => import('../components/ImageUpload'), {
  loading: () => <div className="animate-pulse bg-gray-200 h-96 rounded-xl"></div>
});

const CaptionDisplay = dynamic(() => import('../components/CaptionDisplay'), {
  loading: () => <div className="animate-pulse bg-gray-200 h-96 rounded-xl"></div>
});

export default function Home() {
  const [captionData, setCaptionData] = useState<CaptionData | null>(null);
  const [apiStatus, setApiStatus] = useState<string>('checking');

  useEffect(() => {
    checkHealth()
      .then(health => setApiStatus(health.status))
      .catch(() => setApiStatus('error'));
  }, []);

  const handleCaptionGenerated = useCallback((data: CaptionData) => {
    setCaptionData(data);
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-800 mb-4 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            🖼️ Enhanced Image Caption Generator
          </h1>
          <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            AI-powered image analysis with advanced deep learning
          </p>
        </div>

        {apiStatus === 'error' && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            <h4 className="font-semibold">⚠️ Service Unavailable</h4>
            <p className="text-sm">Backend service is currently unavailable.</p>
          </div>
        )}

        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            <ImageUpload onCaptionGenerated={handleCaptionGenerated} />
            <CaptionDisplay captionData={captionData} />
          </div>
        </div>
      </div>
    </main>
  );
}
