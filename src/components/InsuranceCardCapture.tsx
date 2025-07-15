import { useState, useRef } from "react";
import { Button } from "./ui/button";
import { 
  Camera, 
  Upload, 
  FileText, 
  CheckCircle, 
  X, 
  Loader2,
  CreditCard,
  Scan,
  AlertCircle
} from "lucide-react";

interface InsuranceData {
  provider: string;
  policyNumber: string;
  memberId: string;
  groupNumber: string;
  memberName: string;
  effectiveDate: string;
}

interface InsuranceCardCaptureProps {
  onDataExtracted: (data: InsuranceData) => void;
  onSkip: () => void;
  onOCRProcess?: (file: File | Blob) => Promise<InsuranceData>;
}

export function InsuranceCardCapture({ 
  onDataExtracted, 
  onSkip, 
  onOCRProcess 
}: InsuranceCardCaptureProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [captureMethod, setCaptureMethod] = useState<'camera' | 'upload' | null>(null);
  const [extractedData, setExtractedData] = useState<InsuranceData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      setError('Please upload a valid image (JPG, PNG) or PDF file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    setError(null);
    setIsProcessing(true);

    try {
      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setPreviewImage(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      }

      // Process with OCR if handler is provided
      if (onOCRProcess) {
        const data = await onOCRProcess(file);
        setExtractedData(data);
      } else {
        setError('OCR processing is not available. Please enter information manually.');
      }
    } catch (err) {
      setError('Failed to extract insurance information. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } // Use back camera on mobile
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      setError('Unable to access camera. Please use file upload instead.');
    }
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0);

    // Convert to blob and process
    canvas.toBlob(async (blob) => {
      if (!blob) return;

      setIsProcessing(true);
      setError(null);

      try {
        // Create preview
        const dataUrl = canvas.toDataURL();
        setPreviewImage(dataUrl);

        // Process with OCR if handler is provided
        if (onOCRProcess) {
          const data = await onOCRProcess(blob);
          setExtractedData(data);
        } else {
          setError('OCR processing is not available. Please enter information manually.');
        }

        // Stop camera
        const stream = video.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      } catch (err) {
        setError('Failed to extract insurance information. Please try again.');
      } finally {
        setIsProcessing(false);
      }
    }, 'image/jpeg', 0.8);
  };

  const handleConfirmData = () => {
    if (extractedData) {
      onDataExtracted(extractedData);
    }
  };

  const handleRetry = () => {
    setExtractedData(null);
    setPreviewImage(null);
    setCaptureMethod(null);
    setError(null);
    
    // Stop camera if active
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
  };

  return (
    <div className="space-y-6">
      {!captureMethod && !extractedData && (
        <div className="space-y-4">
          <div className="text-center mb-6">
            <CreditCard 
              size={48} 
              className="mx-auto mb-4 text-accent-blue"
            />
            <h3 
              className="text-lg font-semibold mb-2 text-text-primary"
            >
              Capture Your Insurance Card
            </h3>
            <p 
              className="opacity-80 text-text-secondary"
            >
              Take a photo or upload your insurance card to automatically extract your coverage information
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Camera Capture */}
            <button
              onClick={() => {
                setCaptureMethod('camera');
                startCamera();
              }}
              className="ice-glass p-6 rounded-xl text-center interactive-scale transition-all duration-200 hover:scale-105 bg-ice-base"
            >
              <Camera 
                size={32} 
                className="mx-auto mb-3 text-accent-blue"
              />
              <h4 
                className="font-semibold mb-2 text-text-primary"
              >
                Take Photo
              </h4>
              <p 
                className="text-sm opacity-80 text-text-secondary"
              >
                Use your device camera to capture your insurance card
              </p>
            </button>

            {/* File Upload */}
            <button
              onClick={() => {
                setCaptureMethod('upload');
                fileInputRef.current?.click();
              }}
              className="ice-glass p-6 rounded-xl text-center interactive-scale transition-all duration-200 hover:scale-105 bg-ice-base"
            >
              <Upload 
                size={32} 
                className="mx-auto mb-3 text-accent-blue"
              />
              <h4 
                className="font-semibold mb-2 text-text-primary"
              >
                Upload File
              </h4>
              <p 
                className="text-sm opacity-80 text-text-secondary"
              >
                Upload a photo or PDF of your insurance card
              </p>
            </button>
          </div>

          <div className="text-center">
            <Button
              onClick={onSkip}
              variant="outline"
              className="ice-glass border-0 bg-ice-base text-text-secondary"
            >
              Skip for now - I'll enter manually
            </Button>
          </div>
        </div>
      )}

      {/* Camera View */}
      {captureMethod === 'camera' && !extractedData && (
        <div className="space-y-4">
          <div className="text-center">
            <h3 
              className="text-lg font-semibold mb-2 text-text-primary"
            >
              Position Your Insurance Card
            </h3>
            <p 
              className="text-sm opacity-80 text-text-secondary"
            >
              Align your insurance card within the frame and tap capture
            </p>
          </div>

          <div 
            className="relative rounded-xl overflow-hidden ice-glass-elevated bg-ice-base"
          >
            <video
              ref={videoRef}
              className="w-full h-64 object-cover"
              playsInline
              muted
            />
            
            {/* Capture overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div 
                className="border-2 border-dashed rounded-xl w-80 h-48 flex items-center justify-center border-accent-blue"
              >
                <span 
                  className="text-sm font-medium px-4 py-2 rounded-lg bg-black bg-opacity-70 text-white"
                >
                  Align insurance card here
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-center gap-4">
            <Button
              onClick={handleRetry}
              variant="outline"
              className="ice-glass border-0 bg-ice-base text-text-secondary"
            >
              Cancel
            </Button>
            
            <Button
              onClick={capturePhoto}
              disabled={isProcessing}
              className="interactive-scale bg-gradient-to-r from-blue-500 to-blue-600 text-white border-none"
            >
              {isProcessing ? (
                <div className="flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  Processing...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Camera size={16} />
                  Capture
                </div>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Processing State */}
      {isProcessing && (
        <div 
          className="text-center py-8 ice-glass rounded-xl bg-ice-base"
        >
          <Scan 
            size={48} 
            className="mx-auto mb-4 animate-pulse text-accent-blue"
          />
          <h3 
            className="text-lg font-semibold mb-2 text-text-primary"
          >
            Extracting Insurance Information
          </h3>
          <p 
            className="text-sm opacity-80 text-text-secondary"
          >
            AI is reading your insurance card details...
          </p>
          <div className="flex justify-center mt-4">
            <div className="flex space-x-1">
              {[0, 1, 2].map((i) => (
                <div 
                  key={i}
                  className="w-2 h-2 rounded-full animate-bounce bg-accent-blue"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div 
          className="ice-glass p-4 rounded-xl flex items-center gap-3 bg-red-500 bg-opacity-10 border border-red-500 border-opacity-30"
        >
          <AlertCircle size={20} className="text-red-500" />
          <div>
            <p 
              className="font-medium text-red-500"
            >
              {error}
            </p>
          </div>
        </div>
      )}

      {/* Extracted Data Review */}
      {extractedData && (
        <div className="space-y-4">
          <div className="text-center mb-6">
            <CheckCircle 
              size={48} 
              className="mx-auto mb-4 text-green-500"
            />
            <h3 
              className="text-lg font-semibold mb-2 text-text-primary"
            >
              Information Extracted Successfully
            </h3>
            <p 
              className="text-sm opacity-80 text-text-secondary"
            >
              Please review the extracted information and make any necessary corrections
            </p>
          </div>

          {/* Preview Image */}
          {previewImage && (
            <div 
              className="ice-glass p-4 rounded-xl bg-ice-base"
            >
              <img 
                src={previewImage} 
                alt="Insurance card preview" 
                className="w-full h-32 object-cover rounded-lg"
              />
            </div>
          )}

          {/* Extracted Data */}
          <div 
            className="ice-glass p-6 rounded-xl space-y-4 bg-ice-base"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label 
                  className="block text-sm font-medium mb-2 text-text-primary"
                >
                  Insurance Provider
                </label>
                <p 
                  className="font-semibold text-text-primary"
                >
                  {extractedData.provider}
                </p>
              </div>
              
              <div>
                <label 
                  className="block text-sm font-medium mb-2 text-text-primary"
                >
                  Policy Number
                </label>
                <p 
                  className="font-semibold text-text-primary"
                >
                  {extractedData.policyNumber}
                </p>
              </div>
              
              <div>
                <label 
                  className="block text-sm font-medium mb-2 text-text-primary"
                >
                  Member ID
                </label>
                <p 
                  className="font-semibold text-text-primary"
                >
                  {extractedData.memberId}
                </p>
              </div>
              
              <div>
                <label 
                  className="block text-sm font-medium mb-2 text-text-primary"
                >
                  Group Number
                </label>
                <p 
                  className="font-semibold text-text-primary"
                >
                  {extractedData.groupNumber}
                </p>
              </div>
              
              <div>
                <label 
                  className="block text-sm font-medium mb-2 text-text-primary"
                >
                  Member Name
                </label>
                <p 
                  className="font-semibold text-text-primary"
                >
                  {extractedData.memberName}
                </p>
              </div>
              
              <div>
                <label 
                  className="block text-sm font-medium mb-2 text-text-primary"
                >
                  Effective Date
                </label>
                <p 
                  className="font-semibold text-text-primary"
                >
                  {extractedData.effectiveDate}
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-center gap-4">
            <Button
              onClick={handleRetry}
              variant="outline"
              className="ice-glass border-0 bg-ice-base text-text-secondary"
            >
              Try Again
            </Button>
            
            <Button
              onClick={handleConfirmData}
              className="interactive-scale bg-gradient-to-r from-green-500 to-green-600 text-white border-none"
            >
              <div className="flex items-center gap-2">
                <CheckCircle size={16} />
                Confirm & Continue
              </div>
            </Button>
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <label htmlFor="file-upload" className="sr-only">
        Upload insurance card
      </label>
      <input
        id="file-upload"
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf"
        onChange={handleFileUpload}
        className="hidden"
        title="Insurance Card Upload"
      />

      {/* Hidden canvas for camera capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
