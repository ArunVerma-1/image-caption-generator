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

interface CaptionDisplayProps {
  captionData: CaptionData | null;
}

export default function CaptionDisplay({ captionData }: CaptionDisplayProps) {
  if (!captionData) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">Generated Caption</h2>
        <div className="text-center py-16 text-gray-400">
          <div className="text-8xl mb-6">💭</div>
          <p className="text-xl">Upload an image to see the AI-generated caption</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-8">
      <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">Generated Caption</h2>
      
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 mb-8">
        <div className="flex items-start space-x-3">
          <div className="text-3xl">💬</div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-700 mb-3">AI Generated Caption:</h3>
            <p className="text-2xl text-gray-800 font-medium leading-relaxed">
              &ldquo;{captionData.caption}&rdquo;
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-green-50 rounded-xl p-5 border border-green-100">
          <div className="flex items-center space-x-3">
            <span className="text-3xl">🎯</span>
            <div>
              <p className="text-sm text-green-600 font-medium">Confidence</p>
              <p className="text-2xl font-bold text-green-800">
                {(captionData.confidence_score * 100).toFixed(1)}%
              </p>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 rounded-xl p-5 border border-purple-100">
          <div className="flex items-center space-x-3">
            <span className="text-3xl">📝</span>
            <div>
              <p className="text-sm text-purple-600 font-medium">Words</p>
              <p className="text-2xl font-bold text-purple-800">
                {captionData.word_count}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-orange-50 rounded-xl p-5 border border-orange-100">
          <div className="flex items-center space-x-3">
            <span className="text-3xl">⚙️</span>
            <div>
              <p className="text-sm text-orange-600 font-medium">Method</p>
              <p className="text-lg font-bold text-orange-800">
                {captionData.method_used.replace('_', ' ').toUpperCase()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 rounded-xl p-5 border border-blue-100">
          <div className="flex items-center space-x-3">
            <span className="text-3xl">📏</span>
            <div>
              <p className="text-sm text-blue-600 font-medium">Size</p>
              <p className="text-lg font-bold text-blue-800">
                {captionData.image_dimensions[0]} × {captionData.image_dimensions[1]}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm font-medium text-gray-700">Confidence Level</span>
          <span className="text-sm font-semibold text-green-600">
            {(captionData.confidence_score * 100).toFixed(1)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4">
          <div
            className="bg-gradient-to-r from-green-400 to-green-500 h-4 rounded-full transition-all duration-1000"
            style={{ width: `${captionData.confidence_score * 100}%` }}
          ></div>
        </div>
      </div>

      <div className="bg-gray-50 rounded-xl p-4">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-2">
            <span className="text-lg">🤖</span>
            <span className="font-medium text-gray-700">Model Mode:</span>
            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
              captionData.model_mode === 'production' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-blue-100 text-blue-800'
            }`}>
              {captionData.model_mode?.toUpperCase()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
