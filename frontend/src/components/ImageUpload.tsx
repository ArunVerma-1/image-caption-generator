'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Image from 'next/image';
import { generateCaption } from '../../lib/api';

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

// Define error interface
interface APIError {
  message: string;
}

interface ImageUploadProps {
  onCaptionGenerated: (data: CaptionData) => void;
}

export default function ImageUpload({ onCaptionGenerated }: ImageUploadProps) {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [method, setMethod] = useState<string>('beam_search');
  const [beamWidth, setBeamWidth] = useState<number>(3);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.bmp', '.gif'] },
    multiple: false,
    maxSize: 10 * 1024 * 1024
  });

  const handleSubmit = async () => {
    if (!selectedImage) {
      alert('Please select an image first!');
      return;
    }

    setLoading(true);
    try {
      const result = await generateCaption(selectedImage, { method, beamWidth });
      onCaptionGenerated(result as CaptionData);
    } catch (error) {
      const apiError = error as APIError;
      alert(`Error: ${apiError.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-8">
      <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">Upload Image</h2>
      
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
          isDragActive 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-blue-400'
        }`}
      >
        <input {...getInputProps()} />
        
        {imagePreview ? (
          <div className="space-y-4">
            <div className="relative max-w-full max-h-80 mx-auto">
              <Image
                src={imagePreview}
                alt="Preview"
                width={400}
                height={300}
                className="rounded-lg shadow-md object-contain mx-auto"
                style={{ maxWidth: '100%', height: 'auto' }}
              />
            </div>
            <p className="text-sm text-gray-600">Ready to generate caption!</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-6xl text-gray-300">📷</div>
            <p className="text-lg text-gray-600">
              {isDragActive ? 'Drop image here!' : 'Drag & drop an image'}
            </p>
            <p className="text-sm text-gray-400">Max 10MB • JPG, PNG, BMP, GIF</p>
          </div>
        )}
      </div>

      <div className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Generation Method
          </label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="beam_search">Beam Search (Better Quality)</option>
            <option value="greedy_search">Greedy Search (Faster)</option>
          </select>
        </div>

        {method === 'beam_search' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Beam Width: {beamWidth}
            </label>
            <input
              type="range"
              min="1"
              max="5"
              value={beamWidth}
              onChange={(e) => setBeamWidth(parseInt(e.target.value))}
              className="w-full"
            />
          </div>
        )}
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading || !selectedImage}
        className={`w-full mt-6 py-4 px-6 rounded-xl font-semibold text-lg transition-all ${
          loading || !selectedImage
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:shadow-xl'
        }`}
      >
        {loading ? 'Generating Caption...' : '✨ Generate Caption'}
      </button>
    </div>
  );
}
