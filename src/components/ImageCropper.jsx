import React, { useState, useRef } from 'react';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { X, RotateCw, Check, Download } from 'lucide-react';

export default function ImageCropper({ 
  imageFile, 
  onCropComplete, 
  onCancel, 
  aspectRatio = 1 
}) {
  const [crop, setCrop] = useState({
    unit: '%',
    width: 80,
    height: 80,
    x: 10,
    y: 10
  });
  const [rotation, setRotation] = useState(0);
  const [imageSrc, setImageSrc] = useState(null);
  const imgRef = useRef(null);

  // Load image when component mounts
  React.useEffect(() => {
    if (imageFile) {
      const reader = new FileReader();
      reader.onload = () => {
        setImageSrc(reader.result);
      };
      reader.readAsDataURL(imageFile);
    }
  }, [imageFile]);

  const getCroppedImg = (image, crop, rotation = 0) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('No 2d context');
    }

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    const pixelRatio = window.devicePixelRatio;

    canvas.width = Math.floor(crop.width * scaleX);
    canvas.height = Math.floor(crop.height * scaleY);

    ctx.scale(1, 1);
    ctx.imageSmoothingQuality = 'high';

    const cropX = crop.x * scaleX;
    const cropY = crop.y * scaleY;

    const centerX = image.naturalWidth / 2;
    const centerY = image.naturalHeight / 2;

    ctx.save();

    // Move to center of image
    ctx.translate(centerX, centerY);
    
    // Rotate around the center
    ctx.rotate((rotation * Math.PI) / 180);
    
    // Move back
    ctx.translate(-centerX, -centerY);

    ctx.drawImage(
      image,
      cropX,
      cropY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      crop.width * scaleX,
      crop.height * scaleY
    );

    ctx.restore();

    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            console.error('Canvas is empty');
            return;
          }
          blob.name = 'cropped.jpg';
          const fileUrl = window.URL.createObjectURL(blob);
          resolve({ blob, fileUrl });
        },
        'image/jpeg',
        0.95
      );
    });
  };

  const handleCropComplete = async () => {
    if (!imgRef.current) return;

    try {
      const { blob, fileUrl } = await getCroppedImg(imgRef.current, crop, rotation);
      onCropComplete(blob, fileUrl);
    } catch (error) {
      console.error('Error cropping image:', error);
      alert('Fehler beim Zuschneiden des Bildes');
    }
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  if (!imageSrc) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Bild wird geladen...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Profilbild zuschneiden</h2>
          <button
            onClick={onCancel}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Cropping Area */}
        <div className="p-6 overflow-auto max-h-[calc(90vh-140px)]">
          <div className="flex flex-col items-center">
            <div className="mb-4 text-sm text-gray-600 text-center">
              Ziehe die Ecken, um den Bereich auszuwählen, der als Profilbild verwendet werden soll
            </div>
            
            <div className="relative inline-block">
              <ReactCrop
                crop={crop}
                onChange={(c) => setCrop(c)}
                aspect={aspectRatio}
                circularCrop
                minWidth={100}
                minHeight={100}
              >
                <img
                  ref={imgRef}
                  src={imageSrc}
                  alt="Crop preview"
                  style={{
                    transform: `rotate(${rotation}deg)`,
                    maxWidth: '100%',
                    maxHeight: '60vh',
                    objectFit: 'contain'
                  }}
                />
              </ReactCrop>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3">
            <button
              onClick={handleRotate}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <RotateCw className="h-4 w-4" />
              <span className="text-sm font-medium">Drehen</span>
            </button>
            
            <div className="text-sm text-gray-600">
              Rotation: {rotation}°
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onCancel}
              className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Abbrechen
            </button>
            
            <button
              onClick={handleCropComplete}
              className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
            >
              <Check className="h-4 w-4" />
              Zuschneiden & Hochladen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

